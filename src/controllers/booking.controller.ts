import { Response, NextFunction, Request } from 'express'
import { Booking } from '../models/Booking.model'
import { User } from '../models/User.model'
import { AuthRequest } from '../middlewares/auth.middleware'

export const createBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const bookingData = {
      ...req.body,
      customer: req.user.userId,
      contactEmail: req.user.email,
    }

    const booking = await Booking.create(bookingData)

    // Populate customer info
    await booking.populate('customer', 'name email phone')

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

export const getCustomerBookings = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { status, page = 1, limit = 10 } = req.query
    const skip = (Number(page) - 1) * Number(limit)

    const query: any = { customer: req.user.userId }
    if (status) {
      query.status = status
    }

    const bookings = await Booking.find(query)
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

export const getBookingById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { id } = req.params

    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.userId,
    }).populate('customer', 'name email phone').populate('driver', 'name email phone')

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    res.json(booking)
  } catch (error) {
    next(error)
  }
}

export const updateBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { id } = req.params

    // Only allow customers to update pending bookings
    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.userId,
      status: 'pending',
    })

    if (!booking) {
      res.status(404).json({ message: 'Booking not found or cannot be updated' })
      return
    }

    // Only allow updating certain fields
    const allowedUpdates = [
      'pickupDate',
      'pickupTime',
      'pickupAddress',
      'pickupCity',
      'pickupState',
      'pickupZipCode',
      'deliveryAddress',
      'deliveryCity',
      'deliveryState',
      'deliveryZipCode',
      'items',
      'specialInstructions',
      'contactPhone',
    ]

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        ;(booking as any)[field] = req.body[field]
      }
    })

    await booking.save()

    res.json({
      message: 'Booking updated successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

export const cancelBooking = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { id } = req.params

    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.userId,
    })

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    if (booking.status === 'completed') {
      res.status(400).json({ message: 'Cannot cancel a completed booking' })
      return
    }

    if (booking.status === 'cancelled') {
      res.status(400).json({ message: 'Booking is already cancelled' })
      return
    }

    booking.status = 'cancelled'
    await booking.save()

    res.json({
      message: 'Booking cancelled successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Public endpoint to create booking via email
export const createPublicBooking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, name, phone, ...bookingData } = req.body

    // Validate email is provided
    if (!email) {
      res.status(400).json({ message: 'Email is required' })
      return
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim()

    // Find or create user by email
    let user = await User.findOne({ email: normalizedEmail })

    if (!user) {
      // Create a new customer account if user doesn't exist
      // Generate a random password (user can reset it later)
      const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + '1A!'
      
      user = await User.create({
        email: normalizedEmail,
        password: randomPassword, // Will be hashed by pre-save hook
        name: name || normalizedEmail.split('@')[0], // Use name from request or email prefix
        role: 'customer',
        phone: phone || bookingData.contactPhone,
      })
    } else {
      // Update phone if provided and user exists
      if (phone || bookingData.contactPhone) {
        user.phone = phone || bookingData.contactPhone
        await user.save()
      }
    }

    // Determine payment status based on amountPaid
    let paymentStatus: 'pending' | 'paid' | 'refunded' = 'pending'
    if (bookingData.amountPaid && bookingData.amountPaid > 0) {
      paymentStatus = 'paid'
    }

    // Create booking associated with the user
    const booking = await Booking.create({
      ...bookingData,
      customer: user._id,
      contactEmail: normalizedEmail,
      contactPhone: phone || bookingData.contactPhone || user.phone || '',
      paymentStatus,
      // Set finalPrice to amountPaid if provided
      finalPrice: bookingData.amountPaid || bookingData.estimatedPrice,
    })

    // Populate customer info
    await booking.populate('customer', 'name email phone')

    res.status(201).json({
      message: 'Booking created successfully',
      booking,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    next(error)
  }
}

