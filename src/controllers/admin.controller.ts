import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/User.model'
import { Booking } from '../models/Booking.model'
import { AuthRequest } from '../middlewares/auth.middleware'
import {
  applyStatusSideEffects,
  BookingStatus,
  canDirectAssign,
  hasAssignedDriver,
  isOfferable,
  supersedePendingOffers,
} from '../utils/bookingAssignment'
import { AdminNotification } from '../models/AdminNotification.model'
import { resendOnboardingInviteByEmail, sendOnboardingInvite, createRandomBootstrapPassword } from '../services/paidBookingIntegration.service'
import {
  approveDriverApplication,
  rejectDriverApplication,
} from '../services/driverApplication.service'
import { createManualBooking } from '../services/manualBooking.service'

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
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ role: 'driver', isActive: true }),
      User.countDocuments({ role: 'customer', isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'offered' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'in-progress' }),
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
            status: { $in: ['confirmed', 'in-progress'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$finalPrice', '$estimatedPrice'] } },
          },
        },
      ]),
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
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await User.countDocuments(query)

    res.json({
      users,
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
    })

    let inviteStatus: 'not_required' | 'sent' | 'failed' = 'not_required'
    if (sendInvite) {
      inviteStatus = await sendOnboardingInvite(user)
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
    const { status, page = 1, limit = 10, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const query: any = {}
    if (status) {
      query.status = status
    }
    if (search) {
      query.$or = [
        { pickupAddress: { $regex: search, $options: 'i' } },
        { deliveryAddress: { $regex: search, $options: 'i' } },
        { orderCode: { $regex: search, $options: 'i' } },
      ]
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('driver', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))

    const total = await Booking.countDocuments(query)

    res.json({
      bookings,
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

    res.status(201).json({
      message: 'Booking created successfully',
      booking: result.booking,
      customerStatus: result.customerStatus,
      emails: result.emails,
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

    const { status, driver, driverOffers, offeredToDrivers, assignedAt, assignedBy, ...safeUpdates } =
      updateData

    Object.assign(booking, safeUpdates)

    if (status !== undefined && status !== booking.status) {
      const sideEffectResult = applyStatusSideEffects(
        booking,
        status as BookingStatus,
        booking.status as BookingStatus
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

    res.json({
      message: 'Booking updated successfully',
      booking,
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

    if (['pending', 'offered'].includes(booking.status)) {
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

// Get all drivers
export const getAllDrivers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const query: any = { role: 'driver', isActive: true }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ]
    }

    const drivers = await User.find(query)
      .select('-password')
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
            status: { $in: ['confirmed', 'in-progress'] },
          }),
        ])

        return {
          ...driver.toObject(),
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
        pages: Math.ceil(total / Number(limit)),
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

    const booking = await Booking.findById(id)
      .populate('customer', 'name email phone')
      .populate('driver', 'name email phone')

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    // TODO: Implement email sending
    // For now, just return success
    res.json({
      message: `Email reminder sent to ${type}`,
      booking,
    })
  } catch (error) {
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

