import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/User.model'
import { Booking } from '../models/Booking.model'
import { AuthRequest } from '../middlewares/auth.middleware'
import {
  applyStatusSideEffects,
  BookingStatus,
  canDirectAssign,
  canReclaimForReoffer,
  hasAssignedDriver,
  isOfferable,
  reclaimBookingFromDriver,
  supersedePendingOffers,
} from '../utils/bookingAssignment'
import { AdminNotification } from '../models/AdminNotification.model'
import { resendOnboardingInviteByEmail, sendOnboardingInvite, createRandomBootstrapPassword } from '../services/paidBookingIntegration.service'
import {
  approveDriverApplication,
  rejectDriverApplication,
  resendDriverApprovalInvite,
  sendDriverApprovedInvite,
} from '../services/driverApplication.service'
import { createManualBooking, sendBookingConfirmationById } from '../services/manualBooking.service'
import {
  createAndSendInvoice,
  getInvoiceAmount,
} from '../services/payment.service'
import { buildInvoiceLinkEmail } from '../emails/invoiceLink.template'
import { notificationService } from '../services/notification.service'
import {
  deriveVehicleTypeFromVanCounts,
  mapStopsForStorage,
  normalizeServiceExtras,
  normalizeVanCounts,
  totalVans,
  validateStops,
} from '../utils/manualBookingExtras'

// Get dashboard statistics
export const getAdminStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalAdmins,
      totalDrivers,
      totalCustomers,
      totalBookings,
      pendingBookings,
      offeredBookings,
      confirmedBookings,
      inProgressBookings,
      completedBookings,
      disputedBookings,
      cancelledBookings,
      totalRevenue,
      totalSpent,
      pipelineValue,
      recentCompleted,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'driver', isActive: true }),
      User.countDocuments({ role: 'customer', isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'offered' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: { $in: ['in-progress', 'job-started'] } }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'disputed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      // Recognized revenue = completed jobs (price booked/final)
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$finalPrice', '$estimatedPrice'] } },
          },
        },
      ]),
      // Money marked as paid (any status)
      Booking.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ['$amountPaid', { $ifNull: ['$finalPrice', '$estimatedPrice'] }],
              },
            },
          },
        },
      ]),
      // Open pipeline = confirmed + in-progress job value
      Booking.aggregate([
        {
          $match: {
            status: { $in: ['confirmed', 'in-progress', 'job-started'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$finalPrice', '$estimatedPrice'] } },
          },
        },
      ]),
      Booking.find({ status: 'completed' })
        .sort({ completedAt: -1, updatedAt: -1 })
        .limit(5)
        .select(
          'orderCode pickupCity deliveryCity serviceType finalPrice estimatedPrice completedAt paymentStatus customer'
        )
        .populate('customer', 'name')
        .lean(),
    ])

    const revenue = totalRevenue[0]?.total || 0
    const spent = totalSpent[0]?.total || 0
    const pipeline = pipelineValue[0]?.total || 0

    res.json({
      users: {
        total: totalUsers,
        admins: totalAdmins,
        drivers: totalDrivers,
        customers: totalCustomers,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        offered: offeredBookings,
        confirmed: confirmedBookings,
        inProgress: inProgressBookings,
        completed: completedBookings,
        disputed: disputedBookings,
        cancelled: cancelledBookings,
        new: pendingBookings,
        // Active assigned work often appears as "confirmed" before "in-progress"
        activeAssigned: confirmedBookings + inProgressBookings,
      },
      revenue: {
        total: revenue,
        totalSpent: spent,
        pipeline,
      },
      recentTransactions: (recentCompleted || []).map((job: any) => ({
        _id: job._id,
        orderCode: job.orderCode,
        customerName:
          (job.customer && typeof job.customer === 'object' && job.customer.name) ||
          'Customer',
        pickupCity: job.pickupCity,
        deliveryCity: job.deliveryCity,
        serviceType: job.serviceType,
        amount: job.finalPrice ?? job.estimatedPrice ?? 0,
        completedAt: job.completedAt,
        paymentStatus: job.paymentStatus,
      })),
    })
  } catch (error) {
    next(error)
  }
}

// Get all users with filters
export const getAllUsers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { role, page = 1, limit = 10, search, applicationStatus } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const query: any = {}
    if (role) {
      query.role = role
    }
    if (applicationStatus) {
      query.applicationStatus = applicationStatus
    }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ]
    }

    const users = await User.find(query)
      .select('-password +firstAccessToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await User.countDocuments(query)

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const obj = user.toObject() as unknown as Record<string, unknown>
        const awaitingSetup =
          Boolean(obj.passwordSetupPending) || Boolean(obj.firstAccessToken)
        delete obj.firstAccessToken

        const base = {
          ...obj,
          passwordSetupPending: awaitingSetup,
        }

        if (user.role !== 'customer') {
          return base
        }

        const [totalOrders, pendingOrders, inProgressOrders, completedOrders] =
          await Promise.all([
            Booking.countDocuments({ customer: user._id }),
            Booking.countDocuments({
              customer: user._id,
              status: { $in: ['pending', 'offered'] },
            }),
            Booking.countDocuments({
              customer: user._id,
              status: { $in: ['confirmed', 'in-progress', 'job-started'] },
            }),
            Booking.countDocuments({ customer: user._id, status: 'completed' }),
          ])

        return {
          ...base,
          bookingStats: {
            total: totalOrders,
            pending: pendingOrders,
            inProgress: inProgressOrders,
            completed: completedOrders,
          },
        }
      })
    )

    res.json({
      users: usersWithDetails,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Get single user
export const getUserById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findById(id).select('-password')
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    res.json(user)
  } catch (error) {
    next(error)
  }
}

// Update user
export const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { 
      name, 
      email, 
      phone, 
      role, 
      isActive, 
      username, 
      address, 
      businessName,
      bankDetails 
    } = req.body

    const user = await User.findById(id)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    // Update allowed fields
    if (name !== undefined) user.name = name
    if (email !== undefined) user.email = email
    if (phone !== undefined) user.phone = phone
    if (role !== undefined) user.role = role
    if (isActive !== undefined) user.isActive = isActive
    if (username !== undefined) user.username = username
    if (address !== undefined) user.address = address
    if (businessName !== undefined) user.businessName = businessName
    if (bankDetails !== undefined) {
      user.bankDetails = {
        ...user.bankDetails,
        ...bankDetails,
      }
    }

    await user.save()

    const { password: _password, ...userResponse } = user.toObject()

    res.json({
      message: 'User updated successfully',
      user: userResponse,
    })
  } catch (error) {
    next(error)
  }
}

export const createUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, role, phone, sendInvite = true } = req.body

    if (!['admin', 'driver', 'customer'].includes(role)) {
      res.status(400).json({ message: 'Role must be admin, driver, or customer' })
      return
    }

    const normalizedEmail = String(email).trim().toLowerCase()
    const existing = await User.findOne({ email: normalizedEmail })
    if (existing) {
      res.status(400).json({ message: 'User with this email already exists' })
      return
    }

    const user = await User.create({
      email: normalizedEmail,
      password: createRandomBootstrapPassword(),
      name: String(name).trim(),
      role,
      phone: phone?.trim() || undefined,
      isActive: true,
      applicationStatus: role === 'driver' ? 'approved' : undefined,
      applicationReviewedAt: role === 'driver' ? new Date() : undefined,
      passwordSetupPending: role === 'driver' && Boolean(sendInvite),
    })

    let inviteStatus: 'not_required' | 'sent' | 'failed' = 'not_required'
    if (sendInvite) {
      inviteStatus =
        role === 'driver'
          ? await sendDriverApprovedInvite(user)
          : await sendOnboardingInvite(user)
    }

    const userResponse = user.toObject()
    delete (userResponse as any).password

    res.status(201).json({
      message: 'User created successfully',
      user: userResponse,
      inviteStatus,
    })
  } catch (error) {
    next(error)
  }
}

export const approveDriverApplicationAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const result = await approveDriverApplication(id)
    res.json({
      message:
        result.inviteStatus === 'sent'
          ? 'Application approved and setup email sent'
          : 'Application approved but setup email failed to send',
      ...result,
    })
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

export const rejectDriverApplicationAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { note } = req.body
    const result = await rejectDriverApplication(id, note)
    res.json({
      message:
        result.emailStatus === 'sent'
          ? 'Application rejected and applicant notified'
          : 'Application rejected but notification email failed',
      ...result,
    })
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

export const resendDriverApprovalInviteAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const result = await resendDriverApprovalInvite(id)
    res.json({
      message:
        result.inviteStatus === 'sent'
          ? 'Approval setup email resent'
          : 'Approval setup email failed to send',
      ...result,
    })
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

// Delete user (soft delete by setting isActive to false)
export const deleteUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params

    const user = await User.findById(id)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    // Soft delete
    user.isActive = false
    await user.save()

    res.json({
      message: 'User deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

// Get all bookings with filters
export const getAllBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      status,
      page = 1,
      limit = 10,
      search,
      pickupDate,
      pickupDateFrom,
      pickupDateTo,
    } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const query: any = {}
    if (status) {
      query.status = status
    }
    if (search) {
      const searchTerm = String(search).trim()
      const matchingCustomers = await User.find({
        role: 'customer',
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
        ],
      })
        .select('_id')
        .lean()

      const customerIds = matchingCustomers.map((user) => user._id)

      query.$or = [
        { orderCode: { $regex: searchTerm, $options: 'i' } },
        { externalOrderCode: { $regex: searchTerm, $options: 'i' } },
        { contactEmail: { $regex: searchTerm, $options: 'i' } },
        { contactPhone: { $regex: searchTerm, $options: 'i' } },
        { pickupAddress: { $regex: searchTerm, $options: 'i' } },
        { deliveryAddress: { $regex: searchTerm, $options: 'i' } },
        ...(customerIds.length > 0 ? [{ customer: { $in: customerIds } }] : []),
      ]
    }

    const { ukDayBounds } = await import('../utils/addressFormat')
    if (pickupDate) {
      const { from, to } = ukDayBounds(String(pickupDate))
      query.pickupDate = { $gte: from, $lt: to }
    } else if (pickupDateFrom || pickupDateTo) {
      query.pickupDate = {}
      if (pickupDateFrom) {
        query.pickupDate.$gte = ukDayBounds(String(pickupDateFrom)).from
      }
      if (pickupDateTo) {
        query.pickupDate.$lt = ukDayBounds(String(pickupDateTo)).to
      }
    }

    const bookings = await Booking.aggregate([
      { $match: query },
      {
        $addFields: {
          _statusRank: {
            $switch: {
              branches: [
                { case: { $in: ['$status', ['pending', 'offered', 'survey']] }, then: 0 },
                {
                  case: { $in: ['$status', ['confirmed', 'in-progress', 'job-started']] },
                  then: 1,
                },
                {
                  case: { $in: ['$status', ['completed', 'cancelled', 'disputed']] },
                  then: 2,
                },
              ],
              default: 1,
            },
          },
        },
      },
      { $sort: { _statusRank: 1, pickupDate: 1, createdAt: -1 } },
      { $skip: skip },
      { $limit: Number(limit) },
      {
        $lookup: {
          from: 'users',
          localField: 'customer',
          foreignField: '_id',
          as: 'customer',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'driver',
          foreignField: '_id',
          as: 'driver',
        },
      },
      {
        $addFields: {
          customer: { $arrayElemAt: ['$customer', 0] },
          driver: { $arrayElemAt: ['$driver', 0] },
        },
      },
      {
        $project: {
          _statusRank: 0,
          'customer.password': 0,
          'customer.firstAccessToken': 0,
          'driver.password': 0,
          'driver.firstAccessToken': 0,
        },
      },
    ])

    // Shape populated refs like .populate('…', 'name email phone …')
    const shaped = bookings.map((b: any) => ({
      ...b,
      customer: b.customer
        ? {
            _id: b.customer._id,
            name: b.customer.name,
            email: b.customer.email,
            phone: b.customer.phone,
          }
        : b.customer,
      driver: b.driver
        ? {
            _id: b.driver._id,
            name: b.driver.name,
            email: b.driver.email,
            phone: b.driver.phone,
            vehicleRegistration: b.driver.vehicleRegistration,
          }
        : b.driver,
    }))

    const total = await Booking.countDocuments(query)

    res.json({
      bookings: shaped,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    })
  } catch (error) {
    next(error)
  }
}

// Create booking manually (admin — phone/direct-pay orders)
export const createBookingAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await createManualBooking(req.body)
    let paymentLink: 'sent' | 'failed' | 'skipped' = 'skipped'

    if (req.body.sendPaymentLink === true && result.booking.paymentStatus === 'pending') {
      try {
        const booking = await Booking.findById(result.booking._id).populate(
          'customer',
          'name email phone'
        )
        if (booking && booking.contactEmail) {
          const amount = getInvoiceAmount(booking)
          if (amount > 0) {
            const customerDoc =
              booking.customer && typeof booking.customer === 'object'
                ? (booking.customer as { name?: string; email?: string })
                : null
            const customerName =
              customerDoc?.name || booking.contactEmail.split('@')[0] || 'Customer'
            const { invoiceId, href } = await createAndSendInvoice(booking as any, customerName)
            booking.paypalInvoiceId = invoiceId
            booking.paypalInvoiceUrl = href
            booking.invoiceSentAt = new Date()
            booking.paymentMethod = 'paypal'
            booking.paymentReference = invoiceId
            await booking.save()

            const orderCode = booking.orderCode || booking._id.toString()
            const emailContent = buildInvoiceLinkEmail({
              customerName,
              orderCode,
              amount,
              invoiceUrl: href,
              pickupCity: booking.pickupCity,
              deliveryCity: booking.deliveryCity,
              pickupDate: booking.pickupDate
                ? new Date(booking.pickupDate).toLocaleDateString('en-GB')
                : undefined,
              supportEmail: process.env.SMTP_FROM_EMAIL || 'info@local-van.com',
              websiteUrl: 'https://local-van.com',
            })
            await notificationService.sendEmail(
              booking.contactEmail,
              emailContent.subject,
              emailContent.text,
              emailContent.html
            )
            paymentLink = 'sent'
            result.booking = booking
          }
        }
      } catch (err) {
        console.error('Payment link send failed after manual create:', err)
        paymentLink = 'failed'
      }
    }

    if (result.booking.status === 'survey' && req.body.sendConfirmationEmail !== false) {
      try {
        const { buildSurveyConfirmationEmail } = await import(
          '../emails/surveyConfirmation.template'
        )
        const { formatFullAddress } = await import('../utils/addressFormat')
        const b = result.booking
        const emailContent = buildSurveyConfirmationEmail({
          customerName: req.body.customer?.name || b.contactEmail,
          orderCode: b.orderCode || b._id.toString(),
          surveyType: b.surveyType === 'video' ? 'video' : 'home',
          pickupDate: b.pickupDate
            ? new Date(b.pickupDate).toLocaleDateString('en-GB')
            : '—',
          pickupTime: b.pickupTime,
          address: formatFullAddress({
            houseName: b.pickupHouseName,
            houseNumber: b.pickupHouseNumber,
            address: b.pickupAddress,
            city: b.pickupCity,
            zipCode: b.pickupZipCode,
          }),
        })
        await notificationService.sendEmail(
          b.contactEmail,
          emailContent.subject,
          emailContent.text,
          emailContent.html
        )
      } catch (err) {
        console.error('Survey confirmation email failed:', err)
      }
    }

    res.status(201).json({
      message: 'Booking created successfully',
      booking: result.booking,
      customerStatus: result.customerStatus,
      emails: { ...result.emails, paymentLink },
    })
  } catch (error: any) {
    if (error.statusCode) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

// Update booking (admin can update any booking)
export const updateBookingAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const updateData = req.body

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    const { status, driver, driverOffers, offeredToDrivers, assignedAt, assignedBy, sendConfirmationEmail, ...safeUpdates } =
      updateData

    const previousStatus = booking.status as BookingStatus

    // Avoid writing null paymentReference — unique indexes treat null as a real key
    if (
      safeUpdates.paymentReference === null ||
      safeUpdates.paymentReference === undefined ||
      String(safeUpdates.paymentReference || '').trim() === ''
    ) {
      delete safeUpdates.paymentReference
      booking.set('paymentReference', undefined)
    }

    if (safeUpdates.paymentMethod === null || safeUpdates.paymentMethod === '') {
      delete safeUpdates.paymentMethod
      booking.set('paymentMethod', undefined)
    }

    if (safeUpdates.vanCounts !== undefined) {
      const vanCounts = normalizeVanCounts(safeUpdates.vanCounts)
      const vansTotal = totalVans(vanCounts)
      if (vansTotal < 1) {
        res.status(400).json({ message: 'At least one van is required' })
        return
      }
      const helpers = Math.max(0, Math.floor(Number(safeUpdates.helpers ?? booking.helpers) || 0))
      const drivers = vansTotal
      safeUpdates.vanCounts = vanCounts
      safeUpdates.vans = vansTotal
      safeUpdates.drivers = drivers
      safeUpdates.helpers = helpers
      safeUpdates.men = drivers + helpers
      safeUpdates.manRequired =
        drivers + helpers === 1 ? '1 person' : `${drivers + helpers} people`
      safeUpdates.vehicleType = deriveVehicleTypeFromVanCounts(vanCounts)
    } else if (safeUpdates.helpers !== undefined) {
      const helpers = Math.max(0, Math.floor(Number(safeUpdates.helpers) || 0))
      const drivers = Number(booking.drivers) || Number(booking.vans) || 1
      safeUpdates.helpers = helpers
      safeUpdates.drivers = drivers
      safeUpdates.men = drivers + helpers
      safeUpdates.manRequired =
        drivers + helpers === 1 ? '1 person' : `${drivers + helpers} people`
    }

    if (safeUpdates.stops !== undefined) {
      const stopsError = validateStops(safeUpdates.stops)
      if (stopsError) {
        res.status(400).json({ message: stopsError })
        return
      }
      safeUpdates.stops = mapStopsForStorage(safeUpdates.stops)
    }

    if (safeUpdates.serviceExtras !== undefined) {
      const extras = normalizeServiceExtras(safeUpdates.serviceExtras)
      if (extras.packingBoxes % 5 !== 0) {
        res.status(400).json({ message: 'Packing boxes must be in steps of 5' })
        return
      }
      safeUpdates.serviceExtras = extras
    }

    if (safeUpdates.hours !== undefined && safeUpdates.hours != null) {
      const hours = Number(safeUpdates.hours)
      if (!Number.isFinite(hours) || hours < 1) {
        res.status(400).json({ message: 'Hours must be at least 1' })
        return
      }
      safeUpdates.hours = hours
      if (safeUpdates.durationRequired === undefined) {
        safeUpdates.durationRequired = String(hours)
      }
    }

    // Call-tracking toggles from admin UI
    if (safeUpdates.detailsConfirmed === true) {
      booking.detailsConfirmedAt = new Date()
      booking.detailsConfirmedBy = new mongoose.Types.ObjectId(req.user!.userId)
      delete safeUpdates.detailsConfirmed
    } else if (safeUpdates.detailsConfirmed === false) {
      booking.set('detailsConfirmedAt', undefined)
      booking.set('detailsConfirmedBy', undefined)
      delete safeUpdates.detailsConfirmed
      delete safeUpdates.detailsConfirmedAt
      delete safeUpdates.detailsConfirmedBy
    }

    if (safeUpdates.feedbackCalled === true) {
      booking.feedbackCalledAt = new Date()
      booking.feedbackCalledBy = new mongoose.Types.ObjectId(req.user!.userId)
      delete safeUpdates.feedbackCalled
    } else if (safeUpdates.feedbackCalled === false) {
      booking.set('feedbackCalledAt', undefined)
      booking.set('feedbackCalledBy', undefined)
      delete safeUpdates.feedbackCalled
      delete safeUpdates.feedbackCalledAt
      delete safeUpdates.feedbackCalledBy
    }

    // Never allow clients to rewrite booked-on
    delete safeUpdates.createdAt
    delete safeUpdates.updatedAt

    Object.assign(booking, safeUpdates)

    if (
      booking.paymentReference == null ||
      String(booking.paymentReference || '').trim() === ''
    ) {
      booking.set('paymentReference', undefined)
    }

    if (status !== undefined && status !== previousStatus) {
      const sideEffectResult = applyStatusSideEffects(
        booking,
        status as BookingStatus,
        previousStatus
      )
      if (sideEffectResult.error) {
        res.status(400).json({ message: sideEffectResult.error })
        return
      }
      booking.status = status
    }

    await booking.save()

    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    let confirmationEmail: 'sent' | 'failed' | 'skipped' = 'skipped'
    if (sendConfirmationEmail === true) {
      confirmationEmail = await sendBookingConfirmationById(booking._id.toString())
    }

    res.json({
      message:
        confirmationEmail === 'sent'
          ? 'Booking updated successfully and confirmation email sent'
          : confirmationEmail === 'failed'
            ? 'Booking updated, but confirmation email failed to send'
            : 'Booking updated successfully',
      booking,
      emails: { confirmation: confirmationEmail },
    })
  } catch (error) {
    next(error)
  }
}

// Delete booking (admin)
export const deleteBookingAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    await Booking.findByIdAndDelete(id)

    res.json({
      message: 'Booking deleted successfully',
      bookingId: id,
    })
  } catch (error) {
    next(error)
  }
}

// Assign driver to booking
export const assignDriver = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { driverId, finalPrice } = req.body

    if (!driverId) {
      res.status(400).json({ message: 'Driver ID is required' })
      return
    }

    // Verify driver exists and is a driver
    const driver = await User.findById(driverId)
    if (!driver || driver.role !== 'driver') {
      res.status(400).json({ message: 'Invalid driver ID' })
      return
    }

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (!canDirectAssign(booking)) {
      res.status(400).json({ message: 'Cannot assign a driver to a completed or cancelled booking' })
      return
    }

    const isReassignment = hasAssignedDriver(booking)
    if (!isReassignment && !isOfferable(booking) && booking.status !== 'confirmed') {
      res.status(400).json({
        message: 'Booking must be pending or offered before assigning a driver directly',
      })
      return
    }

    const now = new Date()
    const driverObjectId = new mongoose.Types.ObjectId(driverId)

    booking.driver = driverObjectId
    booking.assignedAt = now
    booking.assignedBy = new mongoose.Types.ObjectId(req.user!.userId)

    if (finalPrice !== undefined && finalPrice !== null && finalPrice !== '') {
      booking.finalPrice = Number(finalPrice)
    } else if (!booking.finalPrice) {
      const driverOffer = booking.driverOffers?.find(
        (offer) => offer.driver.toString() === driverId && offer.status === 'pending'
      )
      booking.finalPrice = driverOffer?.offeredPrice ?? booking.estimatedPrice
    }

    supersedePendingOffers(booking, { acceptedDriverId: driverId, now })
    booking.offeredToDrivers = []
    booking.offerExpiresAt = undefined

    if (['pending', 'offered', 'survey'].includes(booking.status)) {
      booking.status = 'confirmed'
    }

    await booking.save()

    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    res.json({
      message: 'Driver assigned successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Take booking back from assigned driver so it can be re-offered
export const reclaimBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { note } = req.body as { note?: string }

    const booking = await Booking.findById(id).populate('driver', 'name email')
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (!canReclaimForReoffer(booking)) {
      res.status(400).json({
          message: hasAssignedDriver(booking)
          ? 'Only confirmed, in-progress, or offered bookings with an assigned driver can be taken back for re-offer'
          : 'This booking has no assigned driver to reclaim',
      })
      return
    }

    const previousDriver = booking.driver as any
    const previousDriverName =
      previousDriver && typeof previousDriver === 'object' && previousDriver.name
        ? previousDriver.name
        : 'previous driver'

    reclaimBookingFromDriver(booking)

    if (!booking.notes) {
      booking.notes = []
    }

    booking.notes.push({
      text:
        note?.trim() ||
        `Job taken back from ${previousDriverName} for re-offer`,
      createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      createdAt: new Date(),
      type: 'general',
    })

    await booking.save()
    await booking.populate('customer', 'name email phone')
    await booking.populate('notes.createdBy', 'name email')

    res.json({
      message: 'Booking reclaimed successfully. You can now re-offer the job.',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Get all drivers
export const getAllDrivers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    // Show all drivers (active and inactive)
    const query: any = { role: 'driver' }
    if (search) {
      query.$or = [
        { email: { $regex: String(search), $options: 'i' } },
        { name: { $regex: String(search), $options: 'i' } },
      ]
    }

    const drivers = await User.find(query)
      .select('-password +firstAccessToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await User.countDocuments(query)

    // Get driver stats (jobs assigned, completed, etc.)
    const driversWithStats = await Promise.all(
      drivers.map(async (driver) => {
        const [totalJobs, completedJobs, activeJobs] = await Promise.all([
          Booking.countDocuments({ driver: driver._id }),
          Booking.countDocuments({ driver: driver._id, status: 'completed' }),
          Booking.countDocuments({
            driver: driver._id,
            status: { $in: ['confirmed', 'in-progress', 'job-started'] },
          }),
        ])

        const obj = driver.toObject() as unknown as Record<string, unknown>
        const awaitingSetup =
          Boolean(obj.passwordSetupPending) || Boolean(obj.firstAccessToken)
        delete obj.firstAccessToken

        return {
          ...obj,
          passwordSetupPending: awaitingSetup,
          stats: {
            totalJobs,
            completedJobs,
            activeJobs,
          },
        }
      })
    )

    res.json({
      drivers: driversWithStats,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)) || 1,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Handle dispute
export const handleDispute = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { resolved, status } = req.body

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (!booking.isDisputed) {
      res.status(400).json({ message: 'Booking is not disputed' })
      return
    }

    booking.disputeResolved = resolved || false
    if (resolved && status) {
      booking.status = status
    }

    await booking.save()
    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    // TODO: Send email notification to customer and driver

    res.json({
      message: 'Dispute handled successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Send email reminder
export const sendEmailReminder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { type } = req.body // 'customer' or 'driver'

    if (type !== 'customer' && type !== 'driver') {
      res.status(400).json({ message: 'type must be customer or driver' })
      return
    }

    const booking = await Booking.findById(id)
      .populate('customer', 'name email phone')
      .populate('driver', 'name email phone')

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    const {
      buildJobReminderEmail,
      bookingAddressesForEmail,
    } = await import('../emails/jobReminder.template')
    const addresses = bookingAddressesForEmail(booking)
    const pickupDate = booking.pickupDate
      ? new Date(booking.pickupDate).toLocaleDateString('en-GB')
      : '—'
    const orderCode = booking.orderCode || booking._id.toString().slice(-6).toUpperCase()
    const supportEmail = process.env.SMTP_FROM_EMAIL || 'info@local-van.com'

    if (type === 'customer') {
      const customerDoc =
        booking.customer && typeof booking.customer === 'object'
          ? (booking.customer as { name?: string; email?: string })
          : null
      const to = booking.contactEmail || customerDoc?.email
      if (!to) {
        res.status(400).json({ message: 'Booking has no customer email' })
        return
      }
      const name = customerDoc?.name || to.split('@')[0] || 'Customer'
      const emailContent = buildJobReminderEmail({
        recipientName: name,
        orderCode,
        pickupDate,
        pickupTime: booking.pickupTime,
        pickupAddress: addresses.pickup,
        deliveryAddress: addresses.delivery,
        contactPhone: booking.contactPhone,
        role: 'customer',
        supportEmail,
      })
      await notificationService.sendEmail(
        to,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      )
      res.json({ message: 'Email reminder sent to customer', booking })
      return
    }

    const driverDoc =
      booking.driver && typeof booking.driver === 'object'
        ? (booking.driver as { name?: string; email?: string })
        : null
    if (!driverDoc?.email) {
      res.status(400).json({ message: 'No driver assigned with an email address' })
      return
    }
    const emailContent = buildJobReminderEmail({
      recipientName: driverDoc.name || 'Driver',
      orderCode,
      pickupDate,
      pickupTime: booking.pickupTime,
      pickupAddress: addresses.pickup,
      deliveryAddress: addresses.delivery,
      contactPhone: booking.contactPhone,
      contactEmail: booking.contactEmail,
      role: 'driver',
      supportEmail,
    })
    await notificationService.sendEmail(
      driverDoc.email,
      emailContent.subject,
      emailContent.text,
      emailContent.html
    )
    res.json({ message: 'Email reminder sent to driver', booking })
  } catch (error) {
    next(error)
  }
}

// Create PayPal invoice and email pay link to customer
export const sendInvoiceLink = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params

    const booking = await Booking.findById(id).populate('customer', 'name email phone')
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (booking.paymentStatus === 'paid') {
      res.status(400).json({ message: 'This booking is already paid' })
      return
    }

    if (booking.paymentStatus === 'refunded') {
      res.status(400).json({ message: 'Cannot invoice a refunded booking' })
      return
    }

    const amount = getInvoiceAmount(booking)
    if (!(amount > 0)) {
      res.status(400).json({ message: 'Invoice amount must be greater than zero' })
      return
    }

    if (!booking.contactEmail) {
      res.status(400).json({ message: 'Booking has no contact email' })
      return
    }

    const customerDoc =
      booking.customer && typeof booking.customer === 'object'
        ? (booking.customer as { name?: string; email?: string })
        : null
    const customerName =
      customerDoc?.name || booking.contactEmail.split('@')[0] || 'Customer'

    const { invoiceId, href } = await createAndSendInvoice(
      booking as any,
      customerName
    )

    booking.paypalInvoiceId = invoiceId
    booking.paypalInvoiceUrl = href
    booking.invoiceSentAt = new Date()
    booking.paymentMethod = 'paypal'
    booking.paymentReference = invoiceId
    booking.paymentStatus = 'pending'
    await booking.save()

    const orderCode = booking.orderCode || booking._id.toString()
    const emailContent = buildInvoiceLinkEmail({
      customerName,
      orderCode,
      amount,
      invoiceUrl: href,
      pickupCity: booking.pickupCity,
      deliveryCity: booking.deliveryCity,
      pickupDate: booking.pickupDate
        ? new Date(booking.pickupDate).toLocaleDateString('en-GB')
        : undefined,
      supportEmail: process.env.SMTP_FROM_EMAIL || 'info@local-van.com',
      websiteUrl: 'https://local-van.com',
    })

    try {
      await notificationService.sendEmail(
        booking.contactEmail,
        emailContent.subject,
        emailContent.text,
        emailContent.html
      )
    } catch (emailError) {
      console.error('Invoice email failed after PayPal invoice created:', emailError)
      res.status(502).json({
        message:
          'PayPal invoice was created but the email failed to send. You can copy the invoice link and send it manually.',
        booking,
        invoiceUrl: href,
      })
      return
    }

    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    res.json({
      message: 'Invoice sent to customer',
      booking,
      invoiceUrl: href,
    })
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

export const resendCustomerInvite = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const user = await User.findById(id)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    const result = await resendOnboardingInviteByEmail(user.email)
    res.json({
      message:
        result.inviteStatus === 'sent'
          ? 'Onboarding invite resent'
          : 'Invite email failed to send',
      ...result,
    })
  } catch (error: any) {
    if (error?.statusCode === 404 || error?.statusCode === 400) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

// Offer job to drivers with percentage-based pricing
export const offerJobToDrivers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { driverIds, percentage } = req.body // Array of driver IDs and percentage (e.g., 50 for 50%)

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      res.status(400).json({ message: 'Driver IDs are required' })
      return
    }

    if (!percentage || percentage < 0 || percentage > 100) {
      res.status(400).json({ message: 'Percentage must be between 0 and 100' })
      return
    }

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (!isOfferable(booking)) {
      res.status(400).json({
        message: hasAssignedDriver(booking)
          ? 'This booking already has an assigned driver'
          : 'Only pending or unassigned offered bookings can receive new job offers',
      })
      return
    }

    const basePrice = booking.finalPrice || booking.estimatedPrice
    const offeredPrice = (basePrice * percentage) / 100

    // Initialize driverOffers if it doesn't exist
    if (!booking.driverOffers) {
      booking.driverOffers = []
    }

    // Add offers for each driver
    const driverObjectIds = driverIds.map((driverId: string) => new mongoose.Types.ObjectId(driverId))
    
    for (const driverId of driverObjectIds) {
      // Check if offer already exists
      const existingOffer = booking.driverOffers.find(
        (offer: any) => offer.driver.toString() === driverId.toString()
      )

      if (!existingOffer) {
        booking.driverOffers.push({
          driver: driverId,
          offeredPrice,
          status: 'pending',
          offeredAt: new Date(),
        })
      } else {
        // Update existing offer
        existingOffer.offeredPrice = offeredPrice
        existingOffer.status = 'pending'
        existingOffer.offeredAt = new Date()
      }
    }

    // Update offeredToDrivers array
    booking.offeredToDrivers = [
      ...new Set([
        ...(booking.offeredToDrivers || []).map((id: any) => id.toString()),
        ...driverIds,
      ]),
    ].map((id: string) => new mongoose.Types.ObjectId(id))

    const offerExpiryHours = 48
    booking.offerExpiresAt = new Date(Date.now() + offerExpiryHours * 60 * 60 * 1000)
    booking.status = 'offered'

    await booking.save()
    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')
    await booking.populate('driverOffers.driver', 'name email phone')

    res.json({
      message: 'Job offers sent to drivers successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Add note to user
export const addUserNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { text, type } = req.body

    if (!text) {
      res.status(400).json({ message: 'Note text is required' })
      return
    }

    const user = await User.findById(id)
    if (!user) {
      res.status(404).json({ message: 'User not found' })
      return
    }

    if (!user.notes) {
      user.notes = []
    }

    user.notes.push({
      text,
      createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      createdAt: new Date(),
      type: type || 'general',
    })

    await user.save()
    await user.populate('notes.createdBy', 'name email')

    res.json({
      message: 'Note added successfully',
      user,
    })
  } catch (error) {
    next(error)
  }
}

// Add note to booking
export const addBookingNote = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { text, type } = req.body

    if (!text) {
      res.status(400).json({ message: 'Note text is required' })
      return
    }

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (!booking.notes) {
      booking.notes = []
    }

    booking.notes.push({
      text,
      createdBy: new mongoose.Types.ObjectId(req.user!.userId),
      createdAt: new Date(),
      type: type || 'general',
    })

    await booking.save()
    await booking.populate('notes.createdBy', 'name email')
    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    res.json({
      message: 'Note added successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Record additional work payment
export const recordAdditionalWorkPayment = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { amount, description } = req.body

    if (!amount || amount < 0) {
      res.status(400).json({ message: 'Valid payment amount is required' })
      return
    }

    const note = typeof description === 'string' ? description.trim() : ''
    if (!note) {
      res.status(400).json({ message: 'A note explaining the additional amount is required' })
      return
    }

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    booking.additionalWorkPayment = amount
    booking.additionalWorkDescription = note

    // Update final price to include additional work
    const basePrice = booking.finalPrice || booking.estimatedPrice
    booking.finalPrice = basePrice + amount

    await booking.save()
    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    res.json({
      message: 'Additional work payment recorded successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Admin in-app notifications (e.g. driver accepted offer)
export const getAdminNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query
    const pageNum = Math.max(1, Number(page))
    const limitNum = Math.min(50, Math.max(1, Number(limit)))
    const skip = (pageNum - 1) * limitNum

    const query: Record<string, unknown> = {}
    if (unreadOnly === 'true') {
      query.isRead = false
    }

    const [notifications, total, unreadCount] = await Promise.all([
      AdminNotification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('driver', 'name email')
        .populate('booking', 'orderCode status pickupCity deliveryCity')
        .lean(),
      AdminNotification.countDocuments(query),
      AdminNotification.countDocuments({ isRead: false }),
    ])

    res.json({
      notifications,
      unreadCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum) || 1,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const markAdminNotificationRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const notification = await AdminNotification.findByIdAndUpdate(
      id,
      { isRead: true },
      { new: true }
    )

    if (!notification) {
      res.status(404).json({ message: 'Notification not found' })
      return
    }

    res.json({ message: 'Notification marked as read', notification })
  } catch (error) {
    next(error)
  }
}

export const markAllAdminNotificationsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await AdminNotification.updateMany({ isRead: false }, { isRead: true })
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    next(error)
  }
}

/** Calendar range of jobs (admin). */
export const getBookingsCalendar = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to = req.query.to ? new Date(String(req.query.to)) : null
    if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      res.status(400).json({ message: 'from and to query params (ISO dates) are required' })
      return
    }

    const bookings = await Booking.find({
      pickupDate: { $gte: from, $lte: to },
    })
      .select(
        'orderCode status pickupDate pickupTime pickupCity deliveryCity pickupAddress deliveryAddress surveyType contactEmail contactPhone estimatedPrice finalPrice'
      )
      .populate('customer', 'name')
      .populate('driver', 'name')
      .sort({ pickupDate: 1 })
      .lean()

    res.json({ bookings })
  } catch (error) {
    next(error)
  }
}

export const listWithdrawals = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Withdrawal } = await import('../models/Withdrawal.model')
    const status = req.query.status ? String(req.query.status) : undefined
    const query: Record<string, unknown> = {}
    if (status) query.status = status

    const withdrawals = await Withdrawal.find(query)
      .populate('driver', 'name email phone')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    res.json({ withdrawals })
  } catch (error) {
    next(error)
  }
}

export const processWithdrawal = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { Withdrawal } = await import('../models/Withdrawal.model')
    const { id } = req.params
    const { status, adminNote } = req.body as {
      status: 'approved' | 'rejected' | 'paid'
      adminNote?: string
    }

    if (!['approved', 'rejected', 'paid'].includes(status)) {
      res.status(400).json({ message: 'status must be approved, rejected, or paid' })
      return
    }

    const withdrawal = await Withdrawal.findById(id)
    if (!withdrawal) {
      res.status(404).json({ message: 'Withdrawal not found' })
      return
    }

    withdrawal.status = status
    if (adminNote !== undefined) withdrawal.adminNote = adminNote
    withdrawal.processedBy = new mongoose.Types.ObjectId(req.user!.userId)
    withdrawal.processedAt = new Date()
    await withdrawal.save()
    await withdrawal.populate('driver', 'name email phone')

    res.json({ message: 'Withdrawal updated', withdrawal })
  } catch (error) {
    next(error)
  }
}

