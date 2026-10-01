import { Router } from 'express'
import { body } from 'express-validator'
import {
  authenticateIntegrationRequest,
  integrationRateLimiter,
} from '../middlewares/integrationAuth.middleware'
import { upsertPaidBookingController, resendInviteController } from '../controllers/internalIntegration.controller'
import { SAFE_EMAIL_NORMALIZE } from '../utils/emailNormalize'

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
  body('customer.email').isEmail().normalizeEmail(SAFE_EMAIL_NORMALIZE),
  body('customer.name').isString().trim().notEmpty(),
  body('customer.phone').isString().trim().notEmpty(),
  body('booking.pickupAddress').isString().trim().notEmpty(),
  body('booking.pickupHouseNumber').optional().isString().trim(),
  body('booking.pickupHouseName').optional().isString().trim(),
  body('booking.pickupCity').isString().trim().notEmpty(),
  body('booking.pickupZipCode').isString().trim().notEmpty(),
  body('booking.pickupDate').isISO8601(),
  body('booking.pickupTime').isString().trim().notEmpty(),
  body('booking.deliveryAddress').isString().trim().notEmpty(),
  body('booking.deliveryHouseNumber').optional().isString().trim(),
  body('booking.deliveryHouseName').optional().isString().trim(),
  body('booking.deliveryCity').isString().trim().notEmpty(),
  body('booking.deliveryZipCode').isString().trim().notEmpty(),
  body('booking.serviceType').isIn(['local', 'long-distance', 'interstate']),
  body('booking.vehicleType').isIn(['small-van', 'medium-van', 'large-van', 'truck']),
  body('booking.estimatedPrice').isFloat({ min: 0 }),
  body('booking.amountPaid').isFloat({ min: 0 }),
  body('booking.discountApplied').optional({ nullable: true }).isBoolean(),
  body('booking.discountCode').optional({ nullable: true }).isString().trim(),
  body('booking.discountPercent').optional({ nullable: true }).isInt({ min: 0, max: 100 }),
  body('booking.durationRequired').optional({ nullable: true }),
  body('booking.vanTime').optional({ nullable: true }).isString(),
  body('booking.hours').optional({ nullable: true }).isFloat({ min: 1 }),
  body('booking.hoursBooked').optional({ nullable: true }).isFloat({ min: 0 }),
  body('booking.pickupStreet').optional({ nullable: true }).isString().trim(),
  body('booking.deliveryStreet').optional({ nullable: true }).isString().trim(),
  body('booking.vehicleName').optional({ nullable: true }).isString().trim(),
  body('booking.vanSize')
    .optional({ nullable: true, checkFalsy: true })
    .isIn(['small', 'medium', 'large', 'luton']),
  body('booking.vans').optional({ nullable: true }).isObject(),
  body('booking.vans.small').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.vans.medium').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.vans.large').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.vans.luton').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.vansLabel').optional({ nullable: true }).isString().trim(),
  body('booking.drivers').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.additionalHelpers').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.totalCrew').optional({ nullable: true }).isInt({ min: 0 }),
  body('booking.helpersRateTier').optional({ nullable: true }).isInt({ min: 1, max: 3 }),
  body('booking.helpersLabel').optional({ nullable: true }).isString().trim(),
  body('booking.manRequired').optional({ nullable: true }).isString().trim(),
  body('booking.specialInstructions').optional({ nullable: true }).isString(),
  body('booking.packingBoxes').optional({ nullable: true }),
  body('booking.dismantleQty').optional({ nullable: true }),
  body('booking.assembleQty').optional({ nullable: true }),
  body('booking.stops').optional({ nullable: true }).isArray({ max: 3 }),
  body('booking.stops.*.street').optional({ nullable: true }).isString(),
  body('booking.stops.*.address').optional({ nullable: true }).isString(),
  body('booking.stops.*.city').optional({ nullable: true }).isString(),
  body('booking.stops.*.postcode').optional({ nullable: true }).isString(),
  body('booking.stops.*.postal_code').optional({ nullable: true }).isString(),
  body('booking.stops.*.post_code').optional({ nullable: true }).isString(),
  body('booking.stops.*.zipCode').optional({ nullable: true }).isString(),
  body('booking.stops.*.zip').optional({ nullable: true }).isString(),
  body('booking.stops.*.stairs').optional({ nullable: true }),
  body('booking.stops.*.houseNumber').optional({ nullable: true }).isString(),
  body('booking.stops.*.houseName').optional({ nullable: true }).isString(),
  body('booking.items').optional({ nullable: true }).isArray(),
]

const resendInviteValidation = [body('email').isEmail().normalizeEmail(SAFE_EMAIL_NORMALIZE)]

router.post(
  '/bookings/upsert-paid',
  integrationRateLimiter,
  authenticateIntegrationRequest,
  upsertPaidValidation,
  upsertPaidBookingController
)

router.post(
  '/customers/resend-invite',
  integrationRateLimiter,
  authenticateIntegrationRequest,
  resendInviteValidation,
  resendInviteController
)

export default router
