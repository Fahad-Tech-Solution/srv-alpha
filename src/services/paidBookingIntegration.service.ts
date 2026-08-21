import crypto from 'crypto'
import mongoose from 'mongoose'
import { Booking, IBooking } from '../models/Booking.model'
import { User, IUser } from '../models/User.model'
import { buildOnboardingInviteEmail } from '../emails/onboardingInvite.template'
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

function resolveCustomerAppUrl(): string {
  const productionDefault = 'https://fahad-tech-solution.github.io/Local-Van/#'
  const configured = (process.env.CUSTOMER_APP_URL || '').trim()
  const isLocalhost = /localhost|127\.0\.0\.1/i.test(configured)

  // Never ship localhost invite links from production (common Render misconfig)
  if (process.env.NODE_ENV === 'production') {
    if (!configured || isLocalhost) {
      console.warn(
        JSON.stringify({
          scope: 'integration.booking.upsertPaid',
          event: 'customer_app_url_fallback',
          reason: !configured ? 'missing' : 'localhost_in_production',
          configured: configured || null,
          using: productionDefault,
          at: new Date().toISOString(),
        })
      )
      return productionDefault
    }
    return configured
  }

  return configured || 'http://localhost:3000/#'
}

function buildFirstAccessInviteUrl(email: string, token: string): string {
  let base = resolveCustomerAppUrl().replace(/\/+$/, '')
  // HashRouter links must be .../#/first-access?...
  if (!base.includes('#')) {
    base = `${base}/#`
  } else if (!base.endsWith('#')) {
    base = `${base.replace(/#.*$/, '')}/#`
  }

  return `${base}/first-access?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
}

export async function sendOnboardingInvite(user: IUser): Promise<'sent' | 'failed'> {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.firstAccessToken = tokenHash
    user.firstAccessExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await user.save()

    const inviteUrl = buildFirstAccessInviteUrl(user.email, rawToken)
    const emailContent = buildOnboardingInviteEmail({
      customerName: user.name,
      inviteUrl,
      supportEmail: process.env.SMTP_FROM_EMAIL || 'info@local-van.com',
      websiteUrl: 'https://local-van.com',
    })

    await notificationService.sendEmail(
      user.email,
      emailContent.subject,
      emailContent.text,
      emailContent.html
    )

    return 'sent'
  } catch (error) {
    console.error('Failed to send onboarding invite:', error)
    return 'failed'
  }
}

export async function resendOnboardingInviteByEmail(
  email: string
): Promise<{ inviteStatus: 'sent' | 'failed'; customerId: string }> {
  const normalizedEmail = normalizeEmail(email)
  const user = await User.findOne({ email: normalizedEmail })
  if (!user) {
    throw Object.assign(new Error('Customer not found'), { statusCode: 404 })
  }
  if (user.role !== 'customer') {
    throw Object.assign(new Error('User is not a customer'), { statusCode: 400 })
  }

  const inviteStatus = await sendOnboardingInvite(user)
  return { inviteStatus, customerId: user._id.toString() }
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
