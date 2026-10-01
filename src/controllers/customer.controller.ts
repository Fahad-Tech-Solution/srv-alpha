import { Response, NextFunction } from 'express'
import { Booking } from '../models/Booking.model'
import { User } from '../models/User.model'
import { AuthRequest } from '../middlewares/auth.middleware'
import { notificationService } from '../services/notification.service'

// Send customer message to info@local-van.com
export const sendCustomerMessage = async (
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

    // Get customer details
    const customer = await User.findById(req.user.userId).select('name email phone')

    if (!customer) {
      res.status(404).json({ message: 'Customer not found' })
      return
    }

    // Format email body
    const emailBody = `
Customer Message

From: ${customer.name} (${customer.email})
${customer.phone ? `Phone: ${customer.phone}` : ''}

Subject: ${subject}

Message:
${message}

---
This message was sent from the Customer Portal.
    `

    await notificationService.sendEmail('info@local-van.com', `Customer Message: ${subject}`, emailBody)

    res.json({
      message: 'Message sent successfully',
    })
  } catch (error) {
    next(error)
  }
}

// Amend booking (update hours/men/vans with price recalculation)
export const amendBooking = async (
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
    const { hours, men, vans, pickupDate, pickupTime } = req.body

    // Find booking
    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.userId,
    })

    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    // Check if booking can be amended (not cancelled or completed)
    if (booking.status === 'cancelled' || booking.status === 'completed') {
      res.status(400).json({
        message: `Cannot amend booking with status: ${booking.status}`,
      })
      return
    }

    // Update fields if provided
    const updates: any = {}
    
    if (hours !== undefined) {
      updates.hours = hours
    }
    
    if (men !== undefined) {
      updates.men = men
    }
    
    if (vans !== undefined) {
      updates.vans = vans
    }
    
    if (pickupDate !== undefined) {
      updates.pickupDate = pickupDate
    }
    
    if (pickupTime !== undefined) {
      updates.pickupTime = pickupTime
    }

    // Recalculate price if hours/men/vans changed
    if (hours !== undefined || men !== undefined || vans !== undefined) {
      // Basic price calculation (adjust based on your pricing model)
      const basePrice = booking.estimatedPrice || 0
      const hourlyRate = 50 // Base hourly rate per man
      const vanRate = 30 // Additional rate per van
      
      const newHours = hours !== undefined ? hours : (booking.hours || 2)
      const newMen = men !== undefined ? men : (booking.men || 2)
      const newVans = vans !== undefined ? vans : (booking.vans || 1)
      
      // Calculate new price
      const laborCost = newHours * newMen * hourlyRate
      const vanCost = (newVans - 1) * vanRate * newHours // Additional vans cost
      const newPrice = laborCost + vanCost
      
      updates.estimatedPrice = newPrice
      // Reset final price as it needs to be recalculated
      updates.finalPrice = undefined
    }

    // Update booking
    Object.assign(booking, updates)
    await booking.save()

    // Populate customer info
    await booking.populate('customer', 'name email phone')

    res.json({
      message: 'Booking amended successfully',
      booking,
      newPrice: updates.estimatedPrice,
    })
  } catch (error) {
    next(error)
  }
}

/** Customer signs waiver (signature image URL + optional GPS). */
export const signWaiver = async (
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
    const { signatureUrl, lat, lng, signedByName } = req.body

    if (!signatureUrl || typeof signatureUrl !== 'string') {
      res.status(400).json({ message: 'signatureUrl is required' })
      return
    }

    const booking = await Booking.findOne({
      _id: id,
      customer: req.user.userId,
    })
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }

    booking.waiver = {
      signatureUrl,
      signedAt: new Date(),
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      signedByName: signedByName || undefined,
    }
    await booking.save()

    res.json({ message: 'Waiver signed', booking })
  } catch (error) {
    next(error)
  }
}

/**
 * Public/on-site waiver signing via order code verification
 * (for mobile link without forcing login).
 */
export const signWaiverPublic = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params
    const { orderCode, signatureUrl, lat, lng, signedByName } = req.body

    if (!signatureUrl || !orderCode) {
      res.status(400).json({ message: 'orderCode and signatureUrl are required' })
      return
    }

    const booking = await Booking.findById(id)
    if (!booking) {
      res.status(404).json({ message: 'Booking not found' })
      return
    }
    if (
      String(booking.orderCode || '').toUpperCase() !== String(orderCode).trim().toUpperCase()
    ) {
      res.status(403).json({ message: 'Invalid order code' })
      return
    }

    booking.waiver = {
      signatureUrl,
      signedAt: new Date(),
      lat: typeof lat === 'number' ? lat : undefined,
      lng: typeof lng === 'number' ? lng : undefined,
      signedByName: signedByName || undefined,
    }
    await booking.save()

    res.json({
      message: 'Waiver signed',
      orderCode: booking.orderCode,
      signedAt: booking.waiver.signedAt,
    })
  } catch (error) {
    next(error)
  }
}
