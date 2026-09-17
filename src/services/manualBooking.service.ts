import crypto from 'crypto'
import mongoose from 'mongoose'
import { Booking, IBooking } from '../models/Booking.model'
import { IUser } from '../models/User.model'
import { buildOrderConfirmationEmail } from '../emails/orderConfirmation.template'
import { notificationService } from './notification.service'
import {
  findOrCreateCustomer,
  normalizeEmail,
  resolveCustomerAppUrl,
} from './paidBookingIntegration.service'
import {
  AccessType,
  formatAccessFromAdmin,
  formatStairsDisplay,
} from '../utils/stairsAccess'
import {
  BookingStopInput,
  ServiceExtrasInput,
  VanCounts,
  deriveVehicleTypeFromVanCounts,
  formatServiceExtrasLabel,
  formatVanCountsLabel,
  mapStopsForStorage,
  normalizeServiceExtras,
  normalizeVanCounts,
  totalVans,
  validateStops,
} from '../utils/manualBookingExtras'

export type ManualBookingPaymentMethod = 'bank-transfer' | 'cash' | 'card' | 'other'
export type { AccessType }

export type ManualBookingInput = {
  customer: {
    name: string
    email: string
    phone: string
  }
  pickupAddress: string
  pickupCity: string
  pickupZipCode: string
  pickupDate: string
  pickupTime: string
  deliveryAddress: string
  deliveryCity: string
  deliveryZipCode: string
  serviceType: 'local' | 'long-distance' | 'interstate'
  /** @deprecated Prefer vanCounts; kept for backward compatibility */
  vehicleType?: 'small' | 'medium' | 'large' | 'luton' | 'multi-van'
  vanCounts?: Partial<VanCounts>
  drivers?: number
  helpers?: number
  stops?: BookingStopInput[]
  serviceExtras?: ServiceExtrasInput
  price: number
  paymentStatus: 'paid' | 'pending'
  paymentMethod?: ManualBookingPaymentMethod
  paymentReference?: string
  specialInstructions?: string
  sendConfirmationEmail?: boolean
  status?: 'pending' | 'survey'
  pickupAccess?: AccessType
  pickupStairsCount?: number
  deliveryAccess?: AccessType
  deliveryStairsCount?: number
  /** @deprecated Prefer drivers + helpers */
  men?: number
}

export function formatAccessLabel(access?: AccessType, stairsCount?: number): string | undefined {
  return formatAccessFromAdmin(access, stairsCount)
}

function formatPeopleRequired(men?: number): string | undefined {
  if (!men || men < 1) return undefined
  return men === 1 ? '1 person' : `${men} people`
}

function adminNotifyEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_FROM_EMAIL || 'info@local-van.com'
}

export type ManualBookingResult = {
  booking: IBooking
  customerStatus: 'existing' | 'created'
  emails: {
    confirmation: 'sent' | 'failed' | 'skipped'
    onboardingInvite: 'sent' | 'failed' | 'not_required'
  }
}

function generateOrderCode(): string {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = crypto.randomBytes(2).toString('hex').toUpperCase()
  return `MAN-${ymd}-${suffix}`
}

function generatePaymentReference(): string {
  const suffix = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `MAN-PAY-${Date.now()}-${suffix}`
}

function formatPickupDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

async function generateUniqueOrderCode(): Promise<string> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const orderCode = generateOrderCode()
    const existing = await Booking.findOne({ orderCode }).select('_id').lean()
    if (!existing) {
      return orderCode
    }
  }
  throw Object.assign(new Error('Failed to generate unique order code'), { statusCode: 500 })
}

function resolvePeopleAndVans(input: ManualBookingInput) {
  const vanCounts = normalizeVanCounts(input.vanCounts)
  let vansTotal = totalVans(vanCounts)

  // Legacy single vehicleType fallback when vanCounts omitted
  if (vansTotal === 0 && input.vehicleType && input.vehicleType !== 'multi-van') {
    vanCounts[input.vehicleType] = 1
    vansTotal = 1
  }

  const drivers = vansTotal
  const helpers = Math.max(0, Math.floor(Number(input.helpers) || 0))
  const men = drivers + helpers

  return {
    vanCounts,
    vansTotal,
    drivers,
    helpers,
    men,
    vehicleType: vansTotal > 0 ? deriveVehicleTypeFromVanCounts(vanCounts) : input.vehicleType || 'multi-van',
  }
}

async function sendOrderConfirmationEmail(
  booking: IBooking,
  customer: IUser
): Promise<'sent' | 'failed'> {
  try {
    const vanLabel = booking.vanCounts
      ? formatVanCountsLabel(booking.vanCounts)
      : undefined
    const peopleParts: string[] = []
    if (booking.drivers != null) peopleParts.push(`${booking.drivers} driver${booking.drivers === 1 ? '' : 's'}`)
    if (booking.helpers != null && booking.helpers > 0) {
      peopleParts.push(`${booking.helpers} helper${booking.helpers === 1 ? '' : 's'}`)
    }
    const peopleRequired =
      peopleParts.length > 0
        ? peopleParts.join(' + ')
        : booking.manRequired

    const emailContent = buildOrderConfirmationEmail({
      customerName: customer.name,
      orderCode: booking.orderCode || '',
      pickupAddress: booking.pickupAddress,
      pickupCity: booking.pickupCity,
      pickupZipCode: booking.pickupZipCode,
      pickupDate: formatPickupDate(booking.pickupDate),
      pickupTime: booking.pickupTime,
      deliveryAddress: booking.deliveryAddress,
      deliveryCity: booking.deliveryCity,
      deliveryZipCode: booking.deliveryZipCode,
      serviceType: booking.serviceType,
      vehicleType: booking.vehicleType,
      vanCountsLabel: vanLabel && vanLabel !== '—' ? vanLabel : undefined,
      price: booking.finalPrice ?? booking.estimatedPrice,
      paymentStatus: booking.paymentStatus === 'paid' ? 'paid' : 'pending',
      paymentMethod: booking.paymentMethod,
      collectionStairs: booking.collectionStairs
        ? formatStairsDisplay(booking.collectionStairs)
        : undefined,
      deliveryStairs: booking.deliveryStairs
        ? formatStairsDisplay(booking.deliveryStairs)
        : undefined,
      peopleRequired,
      drivers: booking.drivers,
      helpers: booking.helpers,
      stops: (booking.stops || []).map((stop) => ({
        address: stop.address,
        city: stop.city,
        zipCode: stop.zipCode,
        accessLabel: stop.accessLabel
          ? formatStairsDisplay(stop.accessLabel)
          : undefined,
      })),
      serviceExtrasLabel: formatServiceExtrasLabel(booking.serviceExtras),
      customerPortalUrl: resolveCustomerAppUrl(),
      supportEmail: process.env.SMTP_FROM_EMAIL || 'info@local-van.com',
      websiteUrl: 'https://local-van.com',
    })

    const adminEmail = adminNotifyEmail()
    const toEmail = booking.contactEmail || customer.email
    const cc =
      adminEmail.toLowerCase() !== toEmail.toLowerCase() ? adminEmail : undefined

    await notificationService.sendEmail(
      toEmail,
      emailContent.subject,
      emailContent.text,
      emailContent.html,
      cc
    )

    return 'sent'
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    return 'failed'
  }
}

export async function sendBookingConfirmationById(
  bookingId: string
): Promise<'sent' | 'failed'> {
  const booking = await Booking.findById(bookingId).populate('customer', 'name email phone')
  if (!booking) {
    throw Object.assign(new Error('Booking not found'), { statusCode: 404 })
  }

  const customer =
    booking.customer && typeof booking.customer === 'object' && 'email' in (booking.customer as object)
      ? (booking.customer as unknown as IUser)
      : null

  if (!customer && !booking.contactEmail) {
    throw Object.assign(new Error('Booking has no customer email'), { statusCode: 400 })
  }

  if (customer) {
    return sendOrderConfirmationEmail(booking, customer)
  }

  return sendOrderConfirmationEmail(booking, {
    name: booking.contactEmail.split('@')[0],
    email: booking.contactEmail,
  } as IUser)
}

function toManualBookingData(
  input: ManualBookingInput,
  customerId: string,
  orderCode: string,
  paymentReference?: string
): Partial<IBooking> {
  const isPaid = input.paymentStatus === 'paid'
  const normalizedEmail = normalizeEmail(input.customer.email)
  const { vanCounts, vansTotal, drivers, helpers, men, vehicleType } =
    resolvePeopleAndVans(input)
  const serviceExtras = normalizeServiceExtras(input.serviceExtras)
  const stops = mapStopsForStorage(input.stops)

  return {
    customer: new mongoose.Types.ObjectId(customerId),
    status: input.status === 'survey' ? 'survey' : 'pending',
    contactEmail: normalizedEmail,
    contactPhone: input.customer.phone || '',
    pickupAddress: input.pickupAddress,
    pickupCity: input.pickupCity,
    pickupZipCode: input.pickupZipCode,
    pickupDate: new Date(input.pickupDate),
    pickupTime: input.pickupTime,
    deliveryAddress: input.deliveryAddress,
    deliveryCity: input.deliveryCity,
    deliveryZipCode: input.deliveryZipCode,
    serviceType: input.serviceType,
    vehicleType,
    vanCounts,
    vans: vansTotal,
    drivers,
    helpers,
    stops,
    serviceExtras,
    estimatedPrice: input.price,
    finalPrice: input.price,
    paymentStatus: input.paymentStatus,
    paymentMethod: isPaid ? input.paymentMethod : undefined,
    paymentReference: isPaid ? paymentReference : undefined,
    amountPaid: isPaid ? input.price : undefined,
    paymentDate: isPaid ? new Date() : undefined,
    orderCode,
    sourceSystem: 'admin-manual',
    specialInstructions: input.specialInstructions,
    collectionStairs: formatAccessLabel(input.pickupAccess, input.pickupStairsCount),
    deliveryStairs: formatAccessLabel(input.deliveryAccess, input.deliveryStairsCount),
    men,
    manRequired: formatPeopleRequired(men),
    items: [],
  }
}

export async function createManualBooking(input: ManualBookingInput): Promise<ManualBookingResult> {
  if (input.paymentStatus === 'paid' && !input.paymentMethod) {
    throw Object.assign(new Error('Payment method is required when payment status is paid'), {
      statusCode: 400,
    })
  }

  const { vansTotal, drivers, helpers, men } = resolvePeopleAndVans(input)
  if (vansTotal < 1) {
    throw Object.assign(new Error('At least one van is required'), { statusCode: 400 })
  }
  if (drivers < 1 || men < 1) {
    throw Object.assign(new Error('Drivers must equal the number of vans'), { statusCode: 400 })
  }
  if (helpers < 0) {
    throw Object.assign(new Error('Helpers cannot be negative'), { statusCode: 400 })
  }

  const extras = normalizeServiceExtras(input.serviceExtras)
  if (extras.packingBoxes % 5 !== 0) {
    throw Object.assign(new Error('Packing boxes must be in steps of 5'), { statusCode: 400 })
  }

  const stopsError = validateStops(input.stops)
  if (stopsError) {
    throw Object.assign(new Error(stopsError), { statusCode: 400 })
  }

  if (input.pickupAccess === 'stairs' && (!input.pickupStairsCount || input.pickupStairsCount < 1)) {
    throw Object.assign(new Error('Pickup stairs count is required when pickup access is stairs'), {
      statusCode: 400,
    })
  }

  if (
    input.deliveryAccess === 'stairs' &&
    (!input.deliveryStairsCount || input.deliveryStairsCount < 1)
  ) {
    throw Object.assign(new Error('Delivery stairs count is required when delivery access is stairs'), {
      statusCode: 400,
    })
  }

  const orderCode = await generateUniqueOrderCode()
  const paymentReference =
    input.paymentStatus === 'paid'
      ? (input.paymentReference?.trim() || generatePaymentReference())
      : undefined

  if (paymentReference) {
    const existingPayment = await Booking.findOne({ paymentReference }).select('_id').lean()
    if (existingPayment) {
      throw Object.assign(new Error('Payment reference already exists'), { statusCode: 409 })
    }
  }

  const { customer, customerStatus, inviteStatus } = await findOrCreateCustomer(input.customer, {
    sendInviteOnCreate: true,
    auditScope: 'admin.booking.manualCreate',
    auditContext: { orderCode },
  })

  const booking = await Booking.create(
    toManualBookingData(input, customer._id.toString(), orderCode, paymentReference)
  )

  await booking.populate('customer', 'name email phone')

  const sendConfirmationEmail = input.sendConfirmationEmail !== false
  let confirmation: 'sent' | 'failed' | 'skipped' = 'skipped'

  if (sendConfirmationEmail) {
    confirmation = await sendOrderConfirmationEmail(booking, customer)
  }

  console.log(
    JSON.stringify({
      scope: 'admin.booking.manualCreate',
      event: 'booking_created',
      orderCode,
      paymentReference: paymentReference ?? null,
      customerEmail: normalizeEmail(input.customer.email),
      customerId: customer._id.toString(),
      bookingId: booking._id.toString(),
      confirmation,
      onboardingInvite: customerStatus === 'created' ? inviteStatus : 'not_required',
      at: new Date().toISOString(),
    })
  )

  return {
    booking,
    customerStatus,
    emails: {
      confirmation,
      onboardingInvite: customerStatus === 'created' ? inviteStatus : 'not_required',
    },
  }
}
