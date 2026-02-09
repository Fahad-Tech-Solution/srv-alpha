import { Response, NextFunction } from 'express'
import mongoose from 'mongoose'
import { User } from '../models/User.model'
import { Booking } from '../models/Booking.model'
import { AuthRequest } from '../middlewares/auth.middleware'

// Get dashboard statistics
export const getAdminStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalDrivers,
      totalCustomers,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      inProgressBookings,
      completedBookings,
      disputedBookings,
      totalRevenue,
      totalSpent,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'driver', isActive: true }),
      User.countDocuments({ role: 'customer', isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'in-progress' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'disputed' }),
      Booking.aggregate([
        {
          $match: {
            status: 'completed',
            paymentStatus: 'paid',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$finalPrice' },
          },
        },
      ]),
      Booking.aggregate([
        {
          $match: {
            paymentStatus: 'paid',
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

    res.json({
      users: {
        total: totalUsers,
        drivers: totalDrivers,
        customers: totalCustomers,
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        confirmed: confirmedBookings,
        inProgress: inProgressBookings,
        completed: completedBookings,
        disputed: disputedBookings,
        new: pendingBookings, // New bookings are pending ones
      },
      revenue: {
        total: revenue,
        totalSpent: spent,
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
    const { role, page = 1, limit = 10, search } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const query: any = {}
    if (role) {
      query.role = role
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

    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      message: 'User updated successfully',
      user: userResponse,
    })
  } catch (error) {
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

    // Update all fields
    Object.assign(booking, updateData)
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
    const { driverId } = req.body

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

    booking.driver = driver._id
    if (booking.status === 'pending') {
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

