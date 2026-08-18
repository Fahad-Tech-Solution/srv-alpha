import crypto from 'crypto'
import mongoose from 'mongoose'
import { Booking, IBooking } from '../models/Booking.model'
import { User, IUser } from '../models/User.model'
import { notificationService } from './notification.service'

type IntegrationPayload = {
  sourceSystem: string
  eventType: 'booking.paid'
  eventVersion: string
  idempotencyKey: string
  orderCode: string
  paymentReference: string
  paymentProvider: string
  paidAt: string
  customer: {
    email: string
    name: string
    phone: string
  }
  booking: {
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
    estimatedPrice: number
    amountPaid: number
    miles?: number
    durationRequired?: string
    collectionStairs?: string
    deliveryStairs?: string
    helpersLabel?: string
    manRequired?: string
    specialInstructions?: string
    items?: { name: string; quantity: number; description?: string }[]
  }
}

type UpsertResult = {
  success: true
  customerId: string
  bookingId: string
  customerStatus: 'existing' | 'created'
  inviteStatus: 'not_required' | 'sent' | 'failed'
  idempotentReplay: boolean
}

function logAudit(event: string, payload: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      scope: 'integration.booking.upsertPaid',
      event,
      ...payload,
      at: new Date().toISOString(),
    })
  )
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function createRandomBootstrapPassword(): string {
  return `${crypto.randomBytes(16).toString('hex')}1A!`
}

async function sendOnboardingInvite(user: IUser): Promise<'sent' | 'failed'> {
  try {
    const tokenSecret = process.env.MAGIC_LINK_SECRET || process.env.JWT_SECRET
    if (!tokenSecret) {
      return 'failed'
    }

    const token = crypto
      .createHmac('sha256', tokenSecret)
      .update(`${user.email}.${Date.now().toString()}.${crypto.randomBytes(8).toString('hex')}`)
      .digest('hex')

    const frontendBase = process.env.CUSTOMER_APP_URL || 'http://localhost:5173'
    const inviteUrl = `${frontendBase}/first-access?token=${token}&email=${encodeURIComponent(user.email)}`
    await notificationService.sendEmail(
      user.email,
      'Complete your account setup',
      `Welcome ${user.name},\n\nSet your password using this secure link:\n${inviteUrl}\n\nIf you did not expect this email, please ignore it.`
    )

    return 'sent'
  } catch (error) {
    return 'failed'
  }
}

function toBookingCreateData(payload: IntegrationPayload, customerId: string): Partial<IBooking> {
  return {
    customer: new mongoose.Types.ObjectId(customerId),
    contactEmail: normalizeEmail(payload.customer.email),
    contactPhone: payload.customer.phone || '',
    pickupAddress: payload.booking.pickupAddress,
    pickupCity: payload.booking.pickupCity,
    pickupZipCode: payload.booking.pickupZipCode,
    pickupDate: new Date(payload.booking.pickupDate),
    pickupTime: payload.booking.pickupTime,
    deliveryAddress: payload.booking.deliveryAddress,
    deliveryCity: payload.booking.deliveryCity,
    deliveryZipCode: payload.booking.deliveryZipCode,
    serviceType: payload.booking.serviceType,
    vehicleType: payload.booking.vehicleType,
    estimatedPrice: payload.booking.estimatedPrice,
    finalPrice: payload.booking.amountPaid || payload.booking.estimatedPrice,
    amountPaid: payload.booking.amountPaid,
    paymentStatus: payload.booking.amountPaid > 0 ? 'paid' : 'pending',
    paymentMethod: payload.paymentProvider,
    paymentDate: new Date(payload.paidAt),
    orderCode: payload.orderCode,
    paymentReference: payload.paymentReference,
    idempotencyKey: payload.idempotencyKey,
    sourceSystem: payload.sourceSystem,
    eventVersion: payload.eventVersion,
    miles: payload.booking.miles,
    durationRequired: payload.booking.durationRequired,
    collectionStairs: payload.booking.collectionStairs,
    deliveryStairs: payload.booking.deliveryStairs,
    helpersLabel: payload.booking.helpersLabel,
    manRequired: payload.booking.manRequired,
    specialInstructions: payload.booking.specialInstructions,
    items: payload.booking.items || [],
  }
}

export async function upsertPaidBooking(payload: IntegrationPayload): Promise<UpsertResult> {
  const normalizedEmail = normalizeEmail(payload.customer.email)

  const existingBooking = await Booking.findOne({
    $or: [{ paymentReference: payload.paymentReference }, { idempotencyKey: payload.idempotencyKey }],
  })

  if (existingBooking) {
    logAudit('idempotent_replay', {
      orderCode: payload.orderCode,
      paymentReference: payload.paymentReference,
      idempotencyKey: payload.idempotencyKey,
      customerEmail: normalizedEmail,
      customerId: existingBooking.customer.toString(),
      bookingId: existingBooking._id.toString(),
    })

    return {
      success: true,
      customerId: existingBooking.customer.toString(),
      bookingId: existingBooking._id.toString(),
      customerStatus: 'existing',
      inviteStatus: 'not_required',
      idempotentReplay: true,
    }
  }

  let customer = await User.findOne({ email: normalizedEmail })
  let customerStatus: 'existing' | 'created' = 'existing'
  let inviteStatus: 'not_required' | 'sent' | 'failed' = 'not_required'

  if (!customer) {
    customerStatus = 'created'
    customer = await User.create({
      email: normalizedEmail,
      password: createRandomBootstrapPassword(),
      name: payload.customer.name || normalizedEmail.split('@')[0],
      role: 'customer',
      phone: payload.customer.phone || '',
    })

    inviteStatus = await sendOnboardingInvite(customer)
    logAudit('customer_created', {
      orderCode: payload.orderCode,
      paymentReference: payload.paymentReference,
      idempotencyKey: payload.idempotencyKey,
      customerEmail: normalizedEmail,
      customerId: customer._id.toString(),
      inviteStatus,
    })
  } else {
    if (payload.customer.phone && customer.phone !== payload.customer.phone) {
      customer.phone = payload.customer.phone
      await customer.save()
    }

    logAudit('customer_matched', {
      orderCode: payload.orderCode,
      paymentReference: payload.paymentReference,
      idempotencyKey: payload.idempotencyKey,
      customerEmail: normalizedEmail,
      customerId: customer._id.toString(),
    })
  }

  const booking = await Booking.create(toBookingCreateData(payload, customer._id.toString()))

  logAudit('booking_created', {
    orderCode: payload.orderCode,
    paymentReference: payload.paymentReference,
    idempotencyKey: payload.idempotencyKey,
    customerEmail: normalizedEmail,
    customerId: customer._id.toString(),
    bookingId: booking._id.toString(),
  })

  return {
    success: true,
    customerId: customer._id.toString(),
    bookingId: booking._id.toString(),
    customerStatus,
    inviteStatus,
    idempotentReplay: false,
  }
}
