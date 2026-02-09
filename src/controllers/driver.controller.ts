import { Response, NextFunction } from 'express'
import { Booking } from '../models/Booking.model'
import { User } from '../models/User.model'
import { Vehicle } from '../models/Vehicle.model'
import { AuthRequest } from '../middlewares/auth.middleware'
import mongoose from 'mongoose'

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
      vehiclePhoto: user.vehiclePhoto,
      vehicleRegistration: user.vehicleRegistration,
      vehicleCategory: user.vehicleCategory,
      vehicleMake: user.vehicleMake,
      vehicleModel: user.vehicleModel,
      vehicleSeats: user.vehicleSeats,
      vehicleBaseLocation: user.vehicleBaseLocation,
      vehicleRegistrationDocumentType: user.vehicleRegistrationDocumentType,
      vehicleRegistrationDocument: user.vehicleRegistrationDocument,
      vehicleType: user.vehicleType,
      vehicleTotalPayload: user.vehicleTotalPayload,
      vehicleLoadingCapacity: user.vehicleLoadingCapacity,
      vehicleMaxLength: user.vehicleMaxLength,
      vehicleMotorbikeCapacity: user.vehicleMotorbikeCapacity,
      vehicleTailLift: user.vehicleTailLift,
      vehicleTrailer: user.vehicleTrailer,
      vehiclePayload: user.vehiclePayload,
      vehicleFuelType: user.vehicleFuelType,
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

    // Log request body for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Vehicle update request body:', JSON.stringify(req.body, null, 2))
      console.log('User ID:', req.user.userId)
    }

    const {
      drivingLicence,
      goodsInTransitInsurance,
      publicLiability,
      proofOfAddress,
      vehiclePhoto,
      vehicleRegistration,
      vehicleCategory,
      vehicleMake,
      vehicleModel,
      vehicleSeats,
      vehicleBaseLocation,
      vehicleRegistrationDocumentType,
      vehicleRegistrationDocument,
      vehicleType,
      vehicleTotalPayload,
      vehicleLoadingCapacity,
      vehicleMaxLength,
      vehicleMotorbikeCapacity,
      vehicleTailLift,
      vehicleTrailer,
      vehiclePayload,
      vehicleFuelType,
    } = req.body

    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    // Helper to convert empty strings to undefined
    const cleanString = (value: any) => (value === '' || value === null ? undefined : value)
    
    // Helper to parse number safely
    const parseNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined
      const num = typeof value === 'string' ? parseFloat(value) : value
      return isNaN(num) ? undefined : num
    }
    
    if (drivingLicence !== undefined) user.drivingLicence = cleanString(drivingLicence)
    if (goodsInTransitInsurance !== undefined) user.goodsInTransitInsurance = cleanString(goodsInTransitInsurance)
    if (publicLiability !== undefined) user.publicLiability = cleanString(publicLiability)
    if (proofOfAddress !== undefined) user.proofOfAddress = cleanString(proofOfAddress)
    if (vehiclePhoto !== undefined) user.vehiclePhoto = cleanString(vehiclePhoto)
    if (vehicleRegistration !== undefined) user.vehicleRegistration = cleanString(vehicleRegistration)
    
    // Validate enum values
    const validCategories = ['small-van', 'medium-van', 'large-van', 'truck']
    if (vehicleCategory !== undefined) {
      if (vehicleCategory && !validCategories.includes(vehicleCategory)) {
        res.status(400).json({ message: `Invalid vehicle category. Must be one of: ${validCategories.join(', ')}` })
        return
      }
      user.vehicleCategory = cleanString(vehicleCategory) as any
    }
    
    if (vehicleMake !== undefined) user.vehicleMake = cleanString(vehicleMake)
    if (vehicleModel !== undefined) user.vehicleModel = cleanString(vehicleModel)
    if (vehicleSeats !== undefined) {
      const numValue = parseNumber(vehicleSeats)
      user.vehicleSeats = numValue
    }
    if (vehicleBaseLocation !== undefined) user.vehicleBaseLocation = cleanString(vehicleBaseLocation)
    
    // Validate registration document type enum
    const validDocTypes = ['logbook', 'mot', 'v5']
    if (vehicleRegistrationDocumentType !== undefined) {
      if (vehicleRegistrationDocumentType && !validDocTypes.includes(vehicleRegistrationDocumentType)) {
        res.status(400).json({ message: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}` })
        return
      }
      user.vehicleRegistrationDocumentType = cleanString(vehicleRegistrationDocumentType) as any
    }
    
    if (vehicleRegistrationDocument !== undefined) user.vehicleRegistrationDocument = cleanString(vehicleRegistrationDocument)
    if (vehicleType !== undefined) user.vehicleType = cleanString(vehicleType)
    
    // Handle nested objects - only set if value is provided and valid
    if (vehicleTotalPayload !== undefined && vehicleTotalPayload !== null) {
      const numValue = parseNumber(vehicleTotalPayload?.value)
      if (numValue !== undefined && numValue > 0) {
        user.vehicleTotalPayload = {
          value: numValue,
          unit: vehicleTotalPayload.unit || 'kg',
        }
        user.markModified('vehicleTotalPayload')
      }
      // If value is empty/null, don't update the field (leave existing value)
    }
    
    if (vehicleLoadingCapacity !== undefined && vehicleLoadingCapacity !== null) {
      const numValue = parseNumber(vehicleLoadingCapacity?.value)
      if (numValue !== undefined && numValue > 0) {
        user.vehicleLoadingCapacity = {
          value: numValue,
          unit: vehicleLoadingCapacity.unit || 'm³',
        }
        user.markModified('vehicleLoadingCapacity')
      }
      // If value is empty/null, don't update the field (leave existing value)
    }
    
    if (vehicleMaxLength !== undefined && vehicleMaxLength !== null) {
      const numValue = parseNumber(vehicleMaxLength?.value)
      if (numValue !== undefined && numValue > 0) {
        user.vehicleMaxLength = {
          value: numValue,
          unit: vehicleMaxLength.unit || 'm',
        }
        user.markModified('vehicleMaxLength')
      }
      // If value is empty/null, don't update the field (leave existing value)
    }
    
    if (vehicleMotorbikeCapacity !== undefined) {
      const numValue = parseNumber(vehicleMotorbikeCapacity)
      user.vehicleMotorbikeCapacity = numValue !== undefined ? numValue : 0
    }
    
    if (vehicleTailLift !== undefined) {
      user.vehicleTailLift = typeof vehicleTailLift === 'boolean' ? vehicleTailLift : vehicleTailLift === 'yes' || vehicleTailLift === true
    }
    
    if (vehicleTrailer !== undefined) {
      user.vehicleTrailer = typeof vehicleTrailer === 'boolean' ? vehicleTrailer : vehicleTrailer === 'yes' || vehicleTrailer === true
    }
    
    if (vehiclePayload !== undefined && vehiclePayload !== null) {
      const numValue = parseNumber(vehiclePayload?.value)
      if (numValue !== undefined && numValue > 0) {
        user.vehiclePayload = {
          value: numValue,
          unit: vehiclePayload.unit || 'kg',
        }
        user.markModified('vehiclePayload')
      }
      // If value is empty/null, don't update the field (leave existing value)
    }
    
    // Validate fuel type enum
    const validFuelTypes = ['petrol', 'diesel', 'lpg', 'hybrid', 'electric']
    if (vehicleFuelType !== undefined) {
      if (vehicleFuelType && !validFuelTypes.includes(vehicleFuelType)) {
        res.status(400).json({ message: `Invalid fuel type. Must be one of: ${validFuelTypes.join(', ')}` })
        return
      }
      user.vehicleFuelType = cleanString(vehicleFuelType) as any
    }

    try {
      await user.save()
    } catch (saveError: any) {
      console.error('Error saving vehicle data:', saveError)
      console.error('Error details:', {
        name: saveError.name,
        message: saveError.message,
        errors: saveError.errors,
        stack: saveError.stack
      })
      
      if (saveError.name === 'ValidationError') {
        const errors = saveError.errors ? Object.keys(saveError.errors).map(key => ({
          field: key,
          message: saveError.errors[key].message
        })) : []
        res.status(400).json({ 
          message: 'Validation error', 
          errors
        })
        return
      }
      
      // Return detailed error in development
      res.status(500).json({
        message: saveError.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && {
          error: saveError.toString(),
          stack: saveError.stack
        })
      })
      return
    }

    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      message: 'Vehicle information updated successfully',
      vehicle: {
        drivingLicence: user.drivingLicence,
        goodsInTransitInsurance: user.goodsInTransitInsurance,
        publicLiability: user.publicLiability,
        proofOfAddress: user.proofOfAddress,
        vehiclePhoto: user.vehiclePhoto,
        vehicleRegistration: user.vehicleRegistration,
        vehicleCategory: user.vehicleCategory,
        vehicleMake: user.vehicleMake,
        vehicleModel: user.vehicleModel,
        vehicleSeats: user.vehicleSeats,
        vehicleBaseLocation: user.vehicleBaseLocation,
        vehicleRegistrationDocumentType: user.vehicleRegistrationDocumentType,
        vehicleRegistrationDocument: user.vehicleRegistrationDocument,
        vehicleType: user.vehicleType,
        vehicleTotalPayload: user.vehicleTotalPayload,
        vehicleLoadingCapacity: user.vehicleLoadingCapacity,
        vehicleMaxLength: user.vehicleMaxLength,
        vehicleMotorbikeCapacity: user.vehicleMotorbikeCapacity,
        vehicleTailLift: user.vehicleTailLift,
        vehicleTrailer: user.vehicleTrailer,
        vehiclePayload: user.vehiclePayload,
        vehicleFuelType: user.vehicleFuelType,
      },
    })
  } catch (error) {
    next(error)
  }
}

// Update driver profile (username, businessName, address)
export const updateDriverProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { username, businessName, address, name, phone } = req.body

    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    if (username !== undefined) {
      // Check if username is already taken by another user
      const existingUser = await User.findOne({ username, _id: { $ne: user._id } })
      if (existingUser) {
        res.status(400).json({ message: 'Username already taken' })
        return
      }
      user.username = username
    }
    if (businessName !== undefined) user.businessName = businessName
    if (address !== undefined) user.address = address
    if (name !== undefined) user.name = name
    if (phone !== undefined) user.phone = phone

    await user.save()

    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      message: 'Profile updated successfully',
      user: userResponse,
    })
  } catch (error) {
    next(error)
  }
}

// Update bank details
export const updateBankDetails = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { bankDetails } = req.body

    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    user.bankDetails = { ...user.bankDetails, ...bankDetails }
    await user.save()

    const userResponse = user.toObject()
    delete userResponse.password

    res.json({
      message: 'Bank details updated successfully',
      bankDetails: userResponse.bankDetails,
    })
  } catch (error) {
    next(error)
  }
}

// Accept pricing rules
export const acceptPricingRules = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const user = await User.findById(req.user.userId)
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    user.pricingRulesAccepted = true
    user.pricingRulesAcceptedAt = new Date()
    await user.save()

    res.json({
      message: 'Pricing rules accepted successfully',
      pricingRulesAccepted: user.pricingRulesAccepted,
      pricingRulesAcceptedAt: user.pricingRulesAcceptedAt,
    })
  } catch (error) {
    next(error)
  }
}

// Send message to info@local-van.com
export const sendDriverMessage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const { subject, message } = req.body

    if (!subject || !message) {
      res.status(400).json({ message: 'Subject and message are required' })
      return
    }

    const user = await User.findById(req.user.userId).select('name email')
    if (!user || user.role !== 'driver') {
      res.status(403).json({ message: 'Driver access required' })
      return
    }

    // Send email to info@local-van.com
    const { NotificationService } = await import('../services/notification.service')
    const notificationService = new NotificationService()
    
    const emailBody = `
Message from Driver: ${user.name} (${user.email})

Subject: ${subject}

Message:
${message}

---
This message was sent from the Driver Dashboard.
    `

    await notificationService.sendEmail('info@local-van.com', `Driver Message: ${subject}`, emailBody)

    res.json({
      message: 'Message sent successfully',
    })
  } catch (error) {
    next(error)
  }
}

// Get available jobs (jobs offered to driver)
export const getAvailableJobs = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const bookings = await Booking.find({
      $or: [
        { 'driverOffers.driver': req.user.userId, 'driverOffers.status': 'pending' },
        { offeredToDrivers: req.user.userId, driver: { $exists: false } },
      ],
      status: 'pending',
    })
      .populate('customer', 'name email phone')
      .sort({ createdAt: -1 })

    res.json({ bookings })
  } catch (error) {
    next(error)
  }
}

// Accept job offer
export const acceptJobOffer = async (
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

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Job not found' })
      return
    }

    // Find driver's offer
    const driverOffer = booking.driverOffers?.find(
      (offer) => offer.driver.toString() === req.user.userId && offer.status === 'pending'
    )

    if (!driverOffer) {
      res.status(400).json({ message: 'No pending offer found for this driver' })
      return
    }

    // Update offer status
    driverOffer.status = 'accepted'
    driverOffer.respondedAt = new Date()

    // Assign driver to booking
    booking.driver = new mongoose.Types.ObjectId(req.user.userId)
    booking.status = 'confirmed'
    booking.finalPrice = driverOffer.offeredPrice

    // Reject other pending offers
    if (booking.driverOffers) {
      booking.driverOffers.forEach((offer) => {
        if (offer.status === 'pending' && offer.driver.toString() !== req.user.userId) {
          offer.status = 'rejected'
          offer.respondedAt = new Date()
        }
      })
    }

    await booking.save()
    await booking.populate('customer', 'name email phone')
    await booking.populate('driver', 'name email phone')

    res.json({
      message: 'Job offer accepted successfully',
      booking,
    })
  } catch (error) {
    next(error)
  }
}

// Reject job offer
export const rejectJobOffer = async (
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

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Job not found' })
      return
    }

    // Find driver's offer
    const driverOffer = booking.driverOffers?.find(
      (offer) => offer.driver.toString() === req.user.userId && offer.status === 'pending'
    )

    if (!driverOffer) {
      res.status(400).json({ message: 'No pending offer found for this driver' })
      return
    }

    // Update offer status
    driverOffer.status = 'rejected'
    driverOffer.respondedAt = new Date()

    await booking.save()

    res.json({
      message: 'Job offer rejected successfully',
    })
  } catch (error) {
    next(error)
  }
}

// ==================== Multiple Vehicles Management ====================

// Get all vehicles for the driver
export const getDriverVehicles = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const driverId = new mongoose.Types.ObjectId(req.user.userId)
    
    console.log('Fetching vehicles for driver:', driverId.toString())
    
    const vehicles = await Vehicle.find({ driver: driverId })
      .sort({ createdAt: -1 })
      .lean()

    console.log(`Found ${vehicles.length} vehicles`)
    
    res.json({ vehicles })
  } catch (error) {
    console.error('Error fetching vehicles:', error)
    next(error)
  }
}

// Get a single vehicle by ID
export const getDriverVehicleById = async (
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' })
      return
    }

    const driverId = new mongoose.Types.ObjectId(req.user.userId)
    const vehicle = await Vehicle.findOne({
      _id: id,
      driver: driverId,
    }).lean()

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' })
      return
    }

    res.json({ vehicle })
  } catch (error) {
    next(error)
  }
}

// Create a new vehicle
export const createDriverVehicle = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }

    const {
      vehicleRegistration,
      vehicleCategory,
      vehicleMake,
      vehicleModel,
      vehicleSeats,
      vehicleBaseLocation,
      vehicleRegistrationDocumentType,
      vehicleRegistrationDocument,
      vehiclePhoto,
      vehicleType,
      vehicleTotalPayload,
      vehicleLoadingCapacity,
      vehicleMaxLength,
      vehicleMotorbikeCapacity,
      vehicleTailLift,
      vehicleTrailer,
      vehiclePayload,
      vehicleFuelType,
    } = req.body

    // Validate required fields
    if (!vehicleRegistration || !vehicleCategory || !vehicleMake || !vehicleModel) {
      res.status(400).json({
        message: 'Vehicle registration, category, make, and model are required',
      })
      return
    }

    // Validate category enum
    const validCategories = ['small-van', 'medium-van', 'large-van', 'truck']
    if (!validCategories.includes(vehicleCategory)) {
      res.status(400).json({
        message: `Invalid vehicle category. Must be one of: ${validCategories.join(', ')}`,
      })
      return
    }

    // Validate fuel type enum if provided
    if (vehicleFuelType) {
      const validFuelTypes = ['petrol', 'diesel', 'lpg', 'hybrid', 'electric']
      if (!validFuelTypes.includes(vehicleFuelType)) {
        res.status(400).json({
          message: `Invalid fuel type. Must be one of: ${validFuelTypes.join(', ')}`,
        })
        return
      }
    }

    // Check if vehicle registration already exists for this driver
    const driverId = new mongoose.Types.ObjectId(req.user.userId)
    const existingVehicle = await Vehicle.findOne({
      driver: driverId,
      vehicleRegistration: vehicleRegistration.toUpperCase().trim(),
    })

    if (existingVehicle) {
      res.status(400).json({
        message: 'A vehicle with this registration number already exists',
      })
      return
    }

    // Helper function to parse numbers safely
    const parseNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined
      const num = typeof value === 'string' ? parseFloat(value) : value
      return isNaN(num) ? undefined : num
    }

    // Create vehicle object
    const vehicleData: any = {
      driver: driverId,
      vehicleRegistration: vehicleRegistration.toUpperCase().trim(),
      vehicleCategory,
      vehicleMake: vehicleMake.trim(),
      vehicleModel: vehicleModel.trim(),
    }

    if (vehicleSeats !== undefined) {
      const seats = parseNumber(vehicleSeats)
      if (seats !== undefined) vehicleData.vehicleSeats = seats
    }

    if (vehicleBaseLocation) {
      vehicleData.vehicleBaseLocation = vehicleBaseLocation.trim()
    }

    if (vehicleRegistrationDocumentType) {
      vehicleData.vehicleRegistrationDocumentType = vehicleRegistrationDocumentType
    }

    if (vehicleRegistrationDocument) {
      vehicleData.vehicleRegistrationDocument = vehicleRegistrationDocument
    }

    if (vehiclePhoto) {
      vehicleData.vehiclePhoto = vehiclePhoto
    }

    if (vehicleType) {
      vehicleData.vehicleType = vehicleType.trim()
    }

    // Handle nested objects
    if (vehicleTotalPayload?.value !== undefined) {
      const numValue = parseNumber(vehicleTotalPayload.value)
      if (numValue !== undefined && numValue > 0) {
        vehicleData.vehicleTotalPayload = {
          value: numValue,
          unit: vehicleTotalPayload.unit || 'kg',
        }
      }
    }

    if (vehicleLoadingCapacity?.value !== undefined) {
      const numValue = parseNumber(vehicleLoadingCapacity.value)
      if (numValue !== undefined && numValue > 0) {
        vehicleData.vehicleLoadingCapacity = {
          value: numValue,
          unit: vehicleLoadingCapacity.unit || 'm³',
        }
      }
    }

    if (vehicleMaxLength?.value !== undefined) {
      const numValue = parseNumber(vehicleMaxLength.value)
      if (numValue !== undefined && numValue > 0) {
        vehicleData.vehicleMaxLength = {
          value: numValue,
          unit: vehicleMaxLength.unit || 'm',
        }
      }
    }

    if (vehicleMotorbikeCapacity !== undefined) {
      const numValue = parseNumber(vehicleMotorbikeCapacity)
      vehicleData.vehicleMotorbikeCapacity = numValue !== undefined ? numValue : 0
    }

    if (vehicleTailLift !== undefined) {
      vehicleData.vehicleTailLift =
        typeof vehicleTailLift === 'boolean'
          ? vehicleTailLift
          : vehicleTailLift === 'yes' || vehicleTailLift === true
    }

    if (vehicleTrailer !== undefined) {
      vehicleData.vehicleTrailer =
        typeof vehicleTrailer === 'boolean'
          ? vehicleTrailer
          : vehicleTrailer === 'yes' || vehicleTrailer === true
    }

    if (vehiclePayload?.value !== undefined) {
      const numValue = parseNumber(vehiclePayload.value)
      if (numValue !== undefined && numValue > 0) {
        vehicleData.vehiclePayload = {
          value: numValue,
          unit: vehiclePayload.unit || 'kg',
        }
      }
    }

    if (vehicleFuelType) {
      vehicleData.vehicleFuelType = vehicleFuelType
    }

    const vehicle = await Vehicle.create(vehicleData)

    res.status(201).json({
      message: 'Vehicle created successfully',
      vehicle,
    })
  } catch (error: any) {
    console.error('Error creating vehicle:', error)
    if (error.name === 'ValidationError') {
      const errors = error.errors
        ? Object.keys(error.errors).map((key) => ({
            field: key,
            message: error.errors[key].message,
          }))
        : []
      res.status(400).json({
        message: 'Validation error',
        errors,
      })
      return
    }
    next(error)
  }
}

// Update a vehicle
export const updateDriverVehicleById = async (
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' })
      return
    }

    const driverId = new mongoose.Types.ObjectId(req.user.userId)
    const vehicle = await Vehicle.findOne({
      _id: id,
      driver: driverId,
    })

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' })
      return
    }

    const {
      vehicleRegistration,
      vehicleCategory,
      vehicleMake,
      vehicleModel,
      vehicleSeats,
      vehicleBaseLocation,
      vehicleRegistrationDocumentType,
      vehicleRegistrationDocument,
      vehiclePhoto,
      vehicleType,
      vehicleTotalPayload,
      vehicleLoadingCapacity,
      vehicleMaxLength,
      vehicleMotorbikeCapacity,
      vehicleTailLift,
      vehicleTrailer,
      vehiclePayload,
      vehicleFuelType,
    } = req.body

    // Helper function to parse numbers safely
    const parseNumber = (value: any): number | undefined => {
      if (value === undefined || value === null || value === '') return undefined
      const num = typeof value === 'string' ? parseFloat(value) : value
      return isNaN(num) ? undefined : num
    }

    // Update fields if provided
    if (vehicleRegistration !== undefined) {
      // Check if registration already exists for another vehicle
      const existingVehicle = await Vehicle.findOne({
        driver: driverId,
        vehicleRegistration: vehicleRegistration.toUpperCase().trim(),
        _id: { $ne: id },
      })

      if (existingVehicle) {
        res.status(400).json({
          message: 'A vehicle with this registration number already exists',
        })
        return
      }
      vehicle.vehicleRegistration = vehicleRegistration.toUpperCase().trim()
    }

    if (vehicleCategory !== undefined) {
      const validCategories = ['small-van', 'medium-van', 'large-van', 'truck']
      if (!validCategories.includes(vehicleCategory)) {
        res.status(400).json({
          message: `Invalid vehicle category. Must be one of: ${validCategories.join(', ')}`,
        })
        return
      }
      vehicle.vehicleCategory = vehicleCategory
    }

    if (vehicleMake !== undefined) {
      vehicle.vehicleMake = vehicleMake.trim()
    }

    if (vehicleModel !== undefined) {
      vehicle.vehicleModel = vehicleModel.trim()
    }

    if (vehicleSeats !== undefined) {
      const seats = parseNumber(vehicleSeats)
      if (seats !== undefined) vehicle.vehicleSeats = seats
    }

    if (vehicleBaseLocation !== undefined) {
      vehicle.vehicleBaseLocation = vehicleBaseLocation ? vehicleBaseLocation.trim() : undefined
    }

    if (vehicleRegistrationDocumentType !== undefined) {
      vehicle.vehicleRegistrationDocumentType = vehicleRegistrationDocumentType
    }

    if (vehicleRegistrationDocument !== undefined) {
      vehicle.vehicleRegistrationDocument = vehicleRegistrationDocument
    }

    if (vehiclePhoto !== undefined) {
      vehicle.vehiclePhoto = vehiclePhoto
    }

    if (vehicleType !== undefined) {
      vehicle.vehicleType = vehicleType ? vehicleType.trim() : undefined
    }

    // Handle nested objects
    if (vehicleTotalPayload !== undefined && vehicleTotalPayload !== null) {
      const numValue = parseNumber(vehicleTotalPayload?.value)
      if (numValue !== undefined && numValue > 0) {
        vehicle.vehicleTotalPayload = {
          value: numValue,
          unit: vehicleTotalPayload.unit || 'kg',
        }
        vehicle.markModified('vehicleTotalPayload')
      }
    }

    if (vehicleLoadingCapacity !== undefined && vehicleLoadingCapacity !== null) {
      const numValue = parseNumber(vehicleLoadingCapacity?.value)
      if (numValue !== undefined && numValue > 0) {
        vehicle.vehicleLoadingCapacity = {
          value: numValue,
          unit: vehicleLoadingCapacity.unit || 'm³',
        }
        vehicle.markModified('vehicleLoadingCapacity')
      }
    }

    if (vehicleMaxLength !== undefined && vehicleMaxLength !== null) {
      const numValue = parseNumber(vehicleMaxLength?.value)
      if (numValue !== undefined && numValue > 0) {
        vehicle.vehicleMaxLength = {
          value: numValue,
          unit: vehicleMaxLength.unit || 'm',
        }
        vehicle.markModified('vehicleMaxLength')
      }
    }

    if (vehicleMotorbikeCapacity !== undefined) {
      const numValue = parseNumber(vehicleMotorbikeCapacity)
      vehicle.vehicleMotorbikeCapacity = numValue !== undefined ? numValue : 0
    }

    if (vehicleTailLift !== undefined) {
      vehicle.vehicleTailLift =
        typeof vehicleTailLift === 'boolean'
          ? vehicleTailLift
          : vehicleTailLift === 'yes' || vehicleTailLift === true
    }

    if (vehicleTrailer !== undefined) {
      vehicle.vehicleTrailer =
        typeof vehicleTrailer === 'boolean'
          ? vehicleTrailer
          : vehicleTrailer === 'yes' || vehicleTrailer === true
    }

    if (vehiclePayload !== undefined && vehiclePayload !== null) {
      const numValue = parseNumber(vehiclePayload?.value)
      if (numValue !== undefined && numValue > 0) {
        vehicle.vehiclePayload = {
          value: numValue,
          unit: vehiclePayload.unit || 'kg',
        }
        vehicle.markModified('vehiclePayload')
      }
    }

    // Validate fuel type enum if provided
    if (vehicleFuelType !== undefined) {
      const validFuelTypes = ['petrol', 'diesel', 'lpg', 'hybrid', 'electric']
      if (vehicleFuelType && !validFuelTypes.includes(vehicleFuelType)) {
        res.status(400).json({
          message: `Invalid fuel type. Must be one of: ${validFuelTypes.join(', ')}`,
        })
        return
      }
      vehicle.vehicleFuelType = vehicleFuelType || undefined
    }

    await vehicle.save()

    res.json({
      message: 'Vehicle updated successfully',
      vehicle,
    })
  } catch (error: any) {
    console.error('Error updating vehicle:', error)
    if (error.name === 'ValidationError') {
      const errors = error.errors
        ? Object.keys(error.errors).map((key) => ({
            field: key,
            message: error.errors[key].message,
          }))
        : []
      res.status(400).json({
        message: 'Validation error',
        errors,
      })
      return
    }
    next(error)
  }
}

// Delete a vehicle
export const deleteDriverVehicle = async (
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

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid vehicle ID' })
      return
    }

    const driverId = new mongoose.Types.ObjectId(req.user.userId)
    const vehicle = await Vehicle.findOneAndDelete({
      _id: id,
      driver: driverId,
    })

    if (!vehicle) {
      res.status(404).json({ message: 'Vehicle not found' })
      return
    }

    res.json({
      message: 'Vehicle deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

