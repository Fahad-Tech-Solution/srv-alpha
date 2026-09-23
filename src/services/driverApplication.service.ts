import crypto from 'crypto'
import { IUser, User } from '../models/User.model'
import { AdminNotification } from '../models/AdminNotification.model'
import {
  buildDriverApplicationAdminNotifyEmail,
  buildDriverApplicationApprovedEmail,
  buildDriverApplicationReceivedEmail,
  buildDriverApplicationRejectedEmail,
} from '../emails/driverApplication.template'
import { notificationService } from './notification.service'
import { buildFirstAccessInviteUrl, createRandomBootstrapPassword } from './paidBookingIntegration.service'
import { emitAdminNotification } from '../utils/realtime'

export type DriverApplicationInput = {
  name: string
  email: string
  phone?: string
  username?: string
  address?: string
  businessName?: string
  drivingLicence?: string
  goodsInTransitInsurance?: string
  publicLiability?: string
  proofOfAddress?: string
  vehicleRegistration?: string
  vehicleCategory?: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  vehicleMake?: string
  vehicleModel?: string
  vehicleSeats?: number
  vehicleBaseLocation?: string
  vehicleRegistrationDocumentType?: 'logbook' | 'mot' | 'v5'
  vehicleRegistrationDocument?: string
  vehiclePhoto?: string
  vehicleType?: string
  vehicleTotalPayload?: {
    value?: number
    unit?: 'kg' | 'tonnes'
  }
  vehicleLoadingCapacity?: {
    value?: number
    unit?: 'm³' | 'ft³'
  }
  vehicleMaxLength?: {
    value?: number
    unit?: 'm' | 'ft'
  }
  vehicleMotorbikeCapacity?: number
  vehiclePayload?: {
    value?: number
    unit?: 'kg' | 'tonnes'
  }
  vehicleFuelType?: 'petrol' | 'diesel' | 'lpg' | 'hybrid' | 'electric'
  vehicleTailLift?: boolean
  vehicleTrailer?: boolean
  introductionVideoUrl?: string
  bankDetails?: {
    accountName?: string
    accountNumber?: string
    sortCode?: string
    bankName?: string
    bankStatement?: string
  }
}

function parseMeasure(
  measure?: { value?: number | string; unit?: string },
  defaultUnit?: string
): { value: number; unit: string } | undefined {
  if (measure == null || measure.value === undefined || measure.value === '') return undefined
  const num = typeof measure.value === 'number' ? measure.value : parseFloat(String(measure.value))
  if (Number.isNaN(num)) return undefined
  return { value: num, unit: measure.unit || defaultUnit || '' }
}

function normalizeVehicleFields(input: DriverApplicationInput): Partial<IUser> {
  return {
    vehicleRegistration: input.vehicleRegistration?.trim().toUpperCase(),
    vehicleCategory: input.vehicleCategory,
    vehicleMake: input.vehicleMake?.trim(),
    vehicleModel: input.vehicleModel?.trim(),
    vehicleSeats: Number(input.vehicleSeats) || 1,
    vehicleBaseLocation: input.vehicleBaseLocation?.trim(),
    vehicleRegistrationDocumentType: input.vehicleRegistrationDocumentType,
    vehicleRegistrationDocument: input.vehicleRegistrationDocument,
    vehiclePhoto: input.vehiclePhoto,
    vehicleType: input.vehicleType?.trim(),
    vehicleTotalPayload: parseMeasure(input.vehicleTotalPayload, 'kg') as IUser['vehicleTotalPayload'],
    vehicleLoadingCapacity: parseMeasure(
      input.vehicleLoadingCapacity,
      'm³'
    ) as IUser['vehicleLoadingCapacity'],
    vehicleMaxLength: parseMeasure(input.vehicleMaxLength, 'm') as IUser['vehicleMaxLength'],
    vehicleMotorbikeCapacity: Number(input.vehicleMotorbikeCapacity) || 0,
    vehiclePayload: parseMeasure(input.vehiclePayload, 'kg') as IUser['vehiclePayload'],
    vehicleFuelType: input.vehicleFuelType,
    vehicleTailLift: Boolean(input.vehicleTailLift),
    vehicleTrailer: Boolean(input.vehicleTrailer),
  }
}

function supportEmail(): string {
  return process.env.SMTP_FROM_EMAIL || 'info@local-van.com'
}

function adminNotifyEmail(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || supportEmail()
}

function adminPortalUrl(): string {
  return (
    process.env.ADMIN_APP_URL ||
    'https://fahad-tech-solution.github.io/Local-Van/#/admin/driver-applications'
  )
}

export async function sendDriverApprovedInvite(user: IUser): Promise<'sent' | 'failed'> {
  try {
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')

    user.firstAccessToken = tokenHash
    user.firstAccessExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    await user.save()

    const inviteUrl = buildFirstAccessInviteUrl(user.email, rawToken)
    const emailContent = buildDriverApplicationApprovedEmail({
      name: user.name,
      inviteUrl,
      supportEmail: supportEmail(),
    })

    await notificationService.sendEmail(
      user.email,
      emailContent.subject,
      emailContent.text,
      emailContent.html,
      adminNotifyEmail()
    )

    return 'sent'
  } catch (error) {
    console.error('Failed to send driver approved invite:', error)
    return 'failed'
  }
}

export async function submitDriverApplication(
  input: DriverApplicationInput
): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase()
  const existing = await User.findOne({ email })
  const vehicleFields = normalizeVehicleFields(input)

  const applicationFields = {
    name: input.name.trim(),
    phone: input.phone?.trim(),
    username: input.username?.trim()?.toLowerCase(),
    address: input.address?.trim(),
    businessName: input.businessName?.trim(),
    drivingLicence: input.drivingLicence,
    goodsInTransitInsurance: input.goodsInTransitInsurance,
    publicLiability: input.publicLiability,
    proofOfAddress: input.proofOfAddress,
    introductionVideoUrl: input.introductionVideoUrl,
    bankDetails: input.bankDetails,
    ...vehicleFields,
  }

  if (existing) {
    if (existing.role === 'driver' && existing.applicationStatus === 'rejected') {
      // Allow re-application
      Object.assign(existing, {
        ...applicationFields,
        email,
        role: 'driver',
        isActive: false,
        applicationStatus: 'pending',
        applicationSubmittedAt: new Date(),
        applicationReviewedAt: undefined,
        applicationReviewNote: undefined,
        password: createRandomBootstrapPassword(),
      })
      existing.markModified('vehicleTotalPayload')
      existing.markModified('vehicleLoadingCapacity')
      existing.markModified('vehicleMaxLength')
      existing.markModified('vehiclePayload')
      existing.markModified('bankDetails')
      await existing.save()
    } else {
      throw Object.assign(new Error('An account with this email already exists'), { statusCode: 400 })
    }

    await notifyApplicationSubmitted(existing)
    return { userId: existing._id.toString() }
  }

  const user = await User.create({
    ...applicationFields,
    email,
    role: 'driver',
    isActive: false,
    applicationStatus: 'pending',
    applicationSubmittedAt: new Date(),
    password: createRandomBootstrapPassword(),
  })

  await notifyApplicationSubmitted(user)
  return { userId: user._id.toString() }
}

async function notifyApplicationSubmitted(user: IUser): Promise<void> {
  const received = buildDriverApplicationReceivedEmail({
    name: user.name,
    supportEmail: supportEmail(),
  })

  const admin = buildDriverApplicationAdminNotifyEmail({
    applicantName: user.name,
    applicantEmail: user.email,
    adminPortalUrl: adminPortalUrl(),
    supportEmail: supportEmail(),
  })

  await Promise.allSettled([
    notificationService.sendEmail(user.email, received.subject, received.text, received.html),
    notificationService.sendEmail(adminNotifyEmail(), admin.subject, admin.text, admin.html),
    createDriverApplicationNotification(user),
  ])
}

async function createDriverApplicationNotification(user: IUser): Promise<void> {
  try {
    const notification = await AdminNotification.create({
      type: 'driver_application',
      title: 'New driver application',
      message: `${user.name} (${user.email}) submitted a driver application.`,
      driver: user._id,
      driverName: user.name,
      isRead: false,
    })

    const populated = await AdminNotification.findById(notification._id)
      .populate('driver', 'name email')
      .lean()

    if (populated) {
      emitAdminNotification(populated as Record<string, unknown>)
    }
  } catch (error) {
    console.error('Failed to create driver application admin notification:', error)
  }
}

export async function approveDriverApplication(userId: string): Promise<{
  inviteStatus: 'sent' | 'failed'
}> {
  const user = await User.findById(userId)
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 })
  }
  if (user.role !== 'driver' || user.applicationStatus !== 'pending') {
    throw Object.assign(new Error('User is not a pending driver application'), { statusCode: 400 })
  }

  user.isActive = true
  user.applicationStatus = 'approved'
  user.passwordSetupPending = true
  user.applicationReviewedAt = new Date()
  await user.save()

  const inviteStatus = await sendDriverApprovedInvite(user)
  return { inviteStatus }
}

export async function resendDriverApprovalInvite(userId: string): Promise<{
  inviteStatus: 'sent' | 'failed'
}> {
  const user = await User.findById(userId).select('+firstAccessToken +firstAccessExpires')
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 })
  }
  if (user.role !== 'driver' || user.applicationStatus !== 'approved') {
    throw Object.assign(new Error('User is not an approved driver'), { statusCode: 400 })
  }
  if (!user.passwordSetupPending && !user.firstAccessToken) {
    throw Object.assign(
      new Error('Driver has already completed password setup'),
      { statusCode: 400 }
    )
  }

  user.passwordSetupPending = true
  await user.save()

  const inviteStatus = await sendDriverApprovedInvite(user)
  return { inviteStatus }
}

export async function rejectDriverApplication(
  userId: string,
  note?: string
): Promise<{ emailStatus: 'sent' | 'failed' }> {
  const user = await User.findById(userId)
  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 })
  }
  if (user.role !== 'driver' || user.applicationStatus !== 'pending') {
    throw Object.assign(new Error('User is not a pending driver application'), { statusCode: 400 })
  }

  user.isActive = false
  user.applicationStatus = 'rejected'
  user.applicationReviewedAt = new Date()
  user.applicationReviewNote = note?.trim() || undefined
  await user.save()

  const rejected = buildDriverApplicationRejectedEmail({
    name: user.name,
    note,
    supportEmail: supportEmail(),
  })

  try {
    await notificationService.sendEmail(
      user.email,
      rejected.subject,
      rejected.text,
      rejected.html
    )
    return { emailStatus: 'sent' }
  } catch (error) {
    console.error('Failed to send rejection email:', error)
    return { emailStatus: 'failed' }
  }
}
