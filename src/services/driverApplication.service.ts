import crypto from 'crypto'
import { IUser, User } from '../models/User.model'
import {
  buildDriverApplicationAdminNotifyEmail,
  buildDriverApplicationApprovedEmail,
  buildDriverApplicationReceivedEmail,
  buildDriverApplicationRejectedEmail,
} from '../emails/driverApplication.template'
import { notificationService } from './notification.service'
import { buildFirstAccessInviteUrl, createRandomBootstrapPassword } from './paidBookingIntegration.service'

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
      emailContent.html
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

  if (existing) {
    if (existing.role === 'driver' && existing.applicationStatus === 'rejected') {
      // Allow re-application
      Object.assign(existing, {
        ...input,
        email,
        role: 'driver',
        isActive: false,
        applicationStatus: 'pending',
        applicationSubmittedAt: new Date(),
        applicationReviewedAt: undefined,
        applicationReviewNote: undefined,
        password: createRandomBootstrapPassword(),
      })
      await existing.save()
    } else {
      throw Object.assign(new Error('An account with this email already exists'), { statusCode: 400 })
    }

    await notifyApplicationSubmitted(existing)
    return { userId: existing._id.toString() }
  }

  const user = await User.create({
    ...input,
    email,
    name: input.name.trim(),
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
  ])
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
  user.applicationReviewedAt = new Date()
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
