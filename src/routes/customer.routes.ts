import { Router } from 'express'
import { body } from 'express-validator'
import {
  sendCustomerMessage,
  amendBooking,
} from '../controllers/customer.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

// All customer routes require authentication
router.use(authenticate)

// Message
router.post('/message', [
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
], sendCustomerMessage)

// Amend booking
router.put('/bookings/:id/amend', [
  body('hours').optional().isInt({ min: 1 }).withMessage('Hours must be a positive integer'),
  body('men').optional().isInt({ min: 1 }).withMessage('Men must be a positive integer'),
  body('vans').optional().isInt({ min: 1 }).withMessage('Vans must be a positive integer'),
  body('pickupDate').optional().isISO8601().withMessage('Valid pickup date is required'),
  body('pickupTime').optional().trim().notEmpty().withMessage('Pickup time is required'),
], amendBooking)

export default router
