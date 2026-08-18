import { NextFunction, Request, Response } from 'express'
import { validationResult } from 'express-validator'
import { upsertPaidBooking } from '../services/paidBookingIntegration.service'
import { Booking } from '../models/Booking.model'

export async function upsertPaidBookingController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: errors.array()[0]?.msg || 'Payload validation failed',
        },
        errors: errors.array(),
      })
      return
    }

    const result = await upsertPaidBooking(req.body)
    res.status(200).json(result)
  } catch (error: any) {
    if (error?.code === 11000) {
      const fallback = await Booking.findOne({
        $or: [
          { paymentReference: req.body.paymentReference },
          { idempotencyKey: req.body.idempotencyKey },
        ],
      })

      if (fallback) {
        res.status(200).json({
          success: true,
          customerId: fallback.customer.toString(),
          bookingId: fallback._id.toString(),
          customerStatus: 'existing',
          inviteStatus: 'not_required',
          idempotentReplay: true,
        })
        return
      }
    }

    next(error)
  }
}
