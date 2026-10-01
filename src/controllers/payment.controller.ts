import { Request, Response, NextFunction } from 'express'
import { Booking } from '../models/Booking.model'
import {
  verifyPayPalWebhook,
  isInvoicePaidEvent,
  extractPaidInvoiceId,
  extractPaidAmount,
  extractBookingIdFromInvoiceEvent,
  getInvoiceAmount,
} from '../services/payment.service'

/**
 * PayPal webhook — marks booking paid when invoice is paid.
 * Mounted publicly at POST /api/payments/paypal/webhook
 */
export const paypalWebhook = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const event = req.body
    const valid = await verifyPayPalWebhook(
      {
        authAlgo: req.header('paypal-auth-algo') || undefined,
        certUrl: req.header('paypal-cert-url') || undefined,
        transmissionId: req.header('paypal-transmission-id') || undefined,
        transmissionSig: req.header('paypal-transmission-sig') || undefined,
        transmissionTime: req.header('paypal-transmission-time') || undefined,
      },
      event
    )

    if (!valid) {
      res.status(400).json({ message: 'Invalid PayPal webhook signature' })
      return
    }

    const eventType = event?.event_type as string | undefined
    if (!isInvoicePaidEvent(eventType)) {
      res.json({ message: 'Ignored event', eventType })
      return
    }

    const invoiceId = extractPaidInvoiceId(event)
    const bookingIdHint = extractBookingIdFromInvoiceEvent(event)

    let booking = null
    if (invoiceId) {
      booking = await Booking.findOne({ paypalInvoiceId: invoiceId })
    }
    if (!booking && bookingIdHint) {
      booking = await Booking.findById(bookingIdHint)
    }
    if (!booking && invoiceId) {
      booking = await Booking.findOne({ paymentReference: invoiceId })
    }

    if (!booking) {
      console.warn('PayPal invoice paid but no booking matched', {
        invoiceId,
        bookingIdHint,
        eventType,
      })
      // Acknowledge so PayPal does not retry endlessly
      res.json({ message: 'No matching booking', invoiceId })
      return
    }

    if (booking.paymentStatus === 'paid') {
      res.json({ message: 'Booking already paid', bookingId: booking._id })
      return
    }

    const paidAmount = extractPaidAmount(event) ?? getInvoiceAmount(booking)
    booking.paymentStatus = 'paid'
    booking.paymentMethod = 'paypal'
    booking.amountPaid = paidAmount
    booking.paymentDate = new Date()
    if (invoiceId) {
      booking.paypalInvoiceId = booking.paypalInvoiceId || invoiceId
      booking.paymentReference = invoiceId
    }
    await booking.save()

    res.json({
      message: 'Booking marked as paid',
      bookingId: booking._id,
      orderCode: booking.orderCode,
    })
  } catch (error) {
    next(error)
  }
}
