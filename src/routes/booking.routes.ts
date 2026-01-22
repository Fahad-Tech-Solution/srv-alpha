import { Router } from 'express'
import { body } from 'express-validator'
import {
  createBooking,
  createPublicBooking,
  getCustomerBookings,
  getBookingById,
  updateBooking,
  cancelBooking,
} from '../controllers/booking.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

// Validation middleware for authenticated bookings
const createBookingValidation = [
  body('pickupAddress').trim().notEmpty().withMessage('Pickup address is required'),
  body('pickupCity').trim().notEmpty().withMessage('Pickup city is required'),
  body('pickupState').trim().notEmpty().withMessage('Pickup state is required'),
  body('pickupZipCode').trim().notEmpty().withMessage('Pickup zip code is required'),
  body('pickupDate').isISO8601().withMessage('Valid pickup date is required'),
  body('pickupTime').trim().notEmpty().withMessage('Pickup time is required'),
  body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required'),
  body('deliveryCity').trim().notEmpty().withMessage('Delivery city is required'),
  body('deliveryState').trim().notEmpty().withMessage('Delivery state is required'),
  body('deliveryZipCode').trim().notEmpty().withMessage('Delivery zip code is required'),
  body('serviceType').isIn(['local', 'long-distance', 'interstate']).withMessage('Invalid service type'),
  body('vehicleType').isIn(['small-van', 'medium-van', 'large-van', 'truck']).withMessage('Invalid vehicle type'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('estimatedPrice').isFloat({ min: 0 }).withMessage('Valid estimated price is required'),
  body('contactPhone').trim().notEmpty().withMessage('Contact phone is required'),
]

// Validation middleware for public bookings (matches calculator JSON structure)
const createPublicBookingValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('name').optional().trim(),
  body('phone').optional().trim(),
  body('pickupAddress').trim().notEmpty().withMessage('Pickup address is required'),
  body('pickupCity').trim().notEmpty().withMessage('Pickup city is required'),
  body('pickupState').optional().trim(),
  body('pickupZipCode').trim().notEmpty().withMessage('Pickup zip code is required'),
  body('pickupDate').isISO8601().withMessage('Valid pickup date is required'),
  body('pickupTime').trim().notEmpty().withMessage('Pickup time is required'),
  body('deliveryAddress').trim().notEmpty().withMessage('Delivery address is required'),
  body('deliveryCity').trim().notEmpty().withMessage('Delivery city is required'),
  body('deliveryState').optional().trim(),
  body('deliveryZipCode').trim().notEmpty().withMessage('Delivery zip code is required'),
  body('serviceType').isIn(['local', 'long-distance', 'interstate']).withMessage('Invalid service type'),
  body('vehicleType').isIn(['small-van', 'medium-van', 'large-van', 'truck']).withMessage('Invalid vehicle type'),
  body('estimatedPrice').isFloat({ min: 0 }).withMessage('Valid estimated price is required'),
  // Optional fields
  body('amountPaid').optional().isFloat({ min: 0 }),
  body('paymentDate').optional().isISO8601(),
  body('orderCode').optional().trim(),
  body('miles').optional().isFloat({ min: 0 }),
  body('durationRequired').optional().trim(),
  body('collectionStairs').optional().trim(),
  body('deliveryStairs').optional().trim(),
  body('helpersLabel').optional().trim(),
  body('vanSize').optional().trim(),
  body('manRequired').optional().trim(),
  body('specialInstructions').optional().trim(),
]

// PUBLIC ROUTE - No authentication required
router.post('/public', createPublicBookingValidation, createPublicBooking)

// All routes below require authentication
router.use(authenticate)

// Authenticated routes
router.post('/', createBookingValidation, createBooking)
router.get('/', getCustomerBookings)
router.get('/:id', getBookingById)
router.put('/:id', updateBooking)
router.post('/:id/cancel', cancelBooking)

export default router

