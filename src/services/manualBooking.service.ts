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

export type ManualBookingPaymentMethod = 'bank-transfer' | 'cash' | 'card' | 'other'
export type AccessType = 'lift' | 'stairs' | 'ground'

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
  vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  price: number
  paymentStatus: 'paid' | 'pending'
  paymentMethod?: ManualBookingPaymentMethod
  paymentReference?: string
  specialInstructions?: string
  sendConfirmationEmail?: boolean
  pickupAccess?: AccessType
  pickupStairsCount?: number
  deliveryAccess?: AccessType
  deliveryStairsCount?: number
  men?: number
}

export function formatAccessLabel(access?: AccessType, stairsCount?: number): string | undefined {
  if (!access) return undefined
  if (access === 'lift') return 'Lift'
  if (access === 'ground') return 'Ground floor'
  if (access === 'stairs') {
    const count = Math.max(1, stairsCount ?? 1)
    return count === 1 ? '1 flight of stairs' : `${count} flights of stairs`
  }
  return undefined
}

function formatPeopleRequired(men?: number): string | undefined {
  if (!men || men < 1) return undefined
  return men === 1 ? '1 person' : `${men} people`
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

async function sendOrderConfirmationEmail(
  booking: IBooking,
  customer: IUser
): Promise<'sent' | 'failed'> {
  try {
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
      price: booking.finalPrice ?? booking.estimatedPrice,
      paymentStatus: booking.paymentStatus === 'paid' ? 'paid' : 'pending',
      paymentMethod: booking.paymentMethod,
      collectionStairs: booking.collectionStairs,
      deliveryStairs: booking.deliveryStairs,
      peopleRequired: booking.manRequired,
      customerPortalUrl: resolveCustomerAppUrl(),
      supportEmail: process.env.SMTP_FROM_EMAIL || 'info@local-van.com',
      websiteUrl: 'https://local-van.com',
    })

    await notificationService.sendEmail(
      booking.contactEmail,
      emailContent.subject,
      emailContent.text,
      emailContent.html
    )

    return 'sent'
  } catch (error) {
    console.error('Failed to send order confirmation email:', error)
    return 'failed'
  }
}

function toManualBookingData(
  input: ManualBookingInput,
  customerId: string,
  orderCode: string,
  paymentReference?: string
): Partial<IBooking> {
  const isPaid = input.paymentStatus === 'paid'
  const normalizedEmail = normalizeEmail(input.customer.email)

  return {
    customer: new mongoose.Types.ObjectId(customerId),
    status: 'pending',
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
    vehicleType: input.vehicleType,
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
    men: input.men,
    manRequired: formatPeopleRequired(input.men),
    items: [],
  }
}

export async function createManualBooking(input: ManualBookingInput): Promise<ManualBookingResult> {
  if (input.paymentStatus === 'paid' && !input.paymentMethod) {
    throw Object.assign(new Error('Payment method is required when payment status is paid'), {
      statusCode: 400,
    })
  }

  if (!input.men || input.men < 1) {
    throw Object.assign(new Error('Number of people required must be at least 1'), {
      statusCode: 400,
    })
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
