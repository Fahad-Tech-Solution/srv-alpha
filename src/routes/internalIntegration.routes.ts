import { Router } from 'express'
import { body } from 'express-validator'
import {
  authenticateIntegrationRequest,
  integrationRateLimiter,
} from '../middlewares/integrationAuth.middleware'
import { upsertPaidBookingController } from '../controllers/internalIntegration.controller'

const router = Router()

const upsertPaidValidation = [
  body('sourceSystem').isString().trim().notEmpty(),
  body('eventType').equals('booking.paid'),
  body('eventVersion').isString().trim().notEmpty(),
  body('idempotencyKey').isString().trim().notEmpty(),
  body('orderCode').isString().trim().notEmpty(),
  body('paymentReference').isString().trim().notEmpty(),
  body('paymentProvider').isString().trim().notEmpty(),
  body('paidAt').isISO8601(),
  body('customer.email').isEmail().normalizeEmail(),
  body('customer.name').isString().trim().notEmpty(),
  body('customer.phone').isString().trim().notEmpty(),
  body('booking.pickupAddress').isString().trim().notEmpty(),
  body('booking.pickupCity').isString().trim().notEmpty(),
  body('booking.pickupZipCode').isString().trim().notEmpty(),
  body('booking.pickupDate').isISO8601(),
  body('booking.pickupTime').isString().trim().notEmpty(),
  body('booking.deliveryAddress').isString().trim().notEmpty(),
  body('booking.deliveryCity').isString().trim().notEmpty(),
  body('booking.deliveryZipCode').isString().trim().notEmpty(),
  body('booking.serviceType').isIn(['local', 'long-distance', 'interstate']),
  body('booking.vehicleType').isIn(['small-van', 'medium-van', 'large-van', 'truck']),
  body('booking.estimatedPrice').isFloat({ min: 0 }),
  body('booking.amountPaid').isFloat({ min: 0 }),
  body('booking.items').optional().isArray(),
]

router.post(
  '/bookings/upsert-paid',
  integrationRateLimiter,
  authenticateIntegrationRequest,
  upsertPaidValidation,
  upsertPaidBookingController
)

export default router
