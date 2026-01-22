import { Response, NextFunction } from 'express'
import { Booking } from '../models/Booking.model'
import { User } from '../models/User.model'
import { AuthRequest } from '../middlewares/auth.middleware'

// Get driver's jobs
export const getDriverJobs = async (
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

    const query: any = { driver: req.user.userId }
    if (status) {
      query.status = status
    }

    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
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

// Get driver stats
export const getDriverStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const [
      totalJobs,
      activeJobs,
      completedJobs,
      pendingJobs,
    ] = await Promise.all([
      Booking.countDocuments({ driver: req.user.userId }),
      Booking.countDocuments({
        driver: req.user.userId,
        status: { $in: ['confirmed', 'in-progress'] },
      }),
      Booking.countDocuments({
        driver: req.user.userId,
        status: 'completed',
      }),
      Booking.countDocuments({
        driver: req.user.userId,
        status: 'pending',
      }),
    ])

    res.json({
      totalJobs,
      activeJobs,
      completedJobs,
      pendingJobs,
    })
  } catch (error) {
    next(error)
  }
}

// Get single job
export const getDriverJob = async (
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
      driver: req.user.userId,
    }).populate('customer', 'name email phone')

    if (!booking) {
      res.status(404).json({ message: 'Job not found' })
      return
    }

    res.json(booking)
  } catch (error) {
    next(error)
  }
}

// Update job status
export const updateJobStatus = async (
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
    const { status } = req.body

    const booking = await Booking.findOne({
      _id: id,
      driver: req.user.userId,
    })

    if (!booking) {
      res.status(404).json({ message: 'Job not found' })
      return
    }

    // Validate status transition
    const allowedStatuses = ['confirmed', 'in-progress', 'completed']
    if (!allowedStatuses.includes(status)) {
      res.status(400).json({ message: 'Invalid status transition' })
      return
    }

    booking.status = status
    if (status === 'completed') {
      booking.completedAt = new Date()
    }

    await booking.save()
    await booking.populate('customer', 'name email phone')

    res.json({
      message: 'Job status updated successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Add completion pictures and notes
export const addCompletionDetails = async (
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
    const { pictures, notes } = req.body

    const booking = await Booking.findOne({
      _id: id,
      driver: req.user.userId,
    })

    if (!booking) {
      res.status(404).json({ message: 'Job not found' })
      return
    }

    if (pictures && Array.isArray(pictures)) {
      booking.completionPictures = pictures
    }
    if (notes) {
      booking.driverNotes = notes
    }

    await booking.save()
    await booking.populate('customer', 'name email phone')

    res.json({
      message: 'Completion details added successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Dispute a job
export const disputeJob = async (
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
    const { reason } = req.body

    if (!reason) {
      res.status(400).json({ message: 'Dispute reason is required' })
      return
    }

    const booking = await Booking.findOne({
      _id: id,
      driver: req.user.userId,
    })

    if (!booking) {
      res.status(404).json({ message: 'Job not found' })
      return
    }

    booking.status = 'disputed'
    booking.isDisputed = true
    booking.disputeReason = reason
    booking.disputeResolved = false

    await booking.save()
    await booking.populate('customer', 'name email phone')

    res.json({
      message: 'Job disputed successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Get driver vehicle info
export const getDriverVehicle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await User.findById(req.user.userId).select('-password')
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    res.json({
      drivingLicence: user.drivingLicence,
      goodsInTransitInsurance: user.goodsInTransitInsurance,
      publicLiability: user.publicLiability,
      proofOfAddress: user.proofOfAddress,
    })
  } catch (error) {
    next(error)
  }
}

// Update driver vehicle info
export const updateDriverVehicle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { drivingLicence, goodsInTransitInsurance, publicLiability, proofOfAddress } = req.body

    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    if (drivingLicence !== undefined) user.drivingLicence = drivingLicence
    if (goodsInTransitInsurance !== undefined) user.goodsInTransitInsurance = goodsInTransitInsurance
    if (publicLiability !== undefined) user.publicLiability = publicLiability
    if (proofOfAddress !== undefined) user.proofOfAddress = proofOfAddress

    await user.save()

    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      message: 'Vehicle information updated successfully',
      vehicle: {
        drivingLicence: user.drivingLicence,
        goodsInTransitInsurance: user.goodsInTransitInsurance,
        publicLiability: user.publicLiability,
        proofOfAddress: user.proofOfAddress,
      },
    })
  } catch (error) {
    next(error)
  }
}

