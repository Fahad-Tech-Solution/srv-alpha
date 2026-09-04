import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import {
  getAdminStats,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  approveDriverApplicationAdmin,
  rejectDriverApplicationAdmin,
  getAllBookings,
  createBookingAdmin,
  updateBookingAdmin,
  assignDriver,
  getAllDrivers,
  handleDispute,
  sendEmailReminder,
  offerJobToDrivers,
  addUserNote,
  addBookingNote,
  recordAdditionalWorkPayment,
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  resendCustomerInvite,
} from '../controllers/admin.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { requireAdmin } from '../middlewares/admin.middleware'

const router = Router()

const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: errors.array()[0].msg || 'Validation failed',
      errors: errors.array(),
    })
  }
  next()
}

const createBookingValidation = [
  body('customer.name').isString().trim().notEmpty(),
  body('customer.email').isEmail().normalizeEmail(),
  body('customer.phone').isString().trim().notEmpty(),
  body('pickupAddress').isString().trim().notEmpty(),
  body('pickupCity').isString().trim().notEmpty(),
  body('pickupZipCode').isString().trim().notEmpty(),
  body('pickupDate').isISO8601(),
  body('pickupTime').isIn([
    '6am-7am',
    '7am-8am',
    '8am-9am',
    '9am-10am',
    '10am-11am',
    '11am-12pm',
    '12pm-1pm',
    '1pm-2pm',
    '2pm-3pm',
    '3pm-4pm',
    '4pm-5pm',
    '5pm-6pm',
    '6pm-7pm',
    '7pm-8pm',
    '8pm-9pm',
  ]),
  body('deliveryAddress').isString().trim().notEmpty(),
  body('deliveryCity').isString().trim().notEmpty(),
  body('deliveryZipCode').isString().trim().notEmpty(),
  body('serviceType').isIn(['local', 'long-distance', 'interstate']),
  body('vehicleType').isIn(['small', 'medium', 'large', 'luton', 'multi-van']),
  body('price').isFloat({ min: 0 }),
  body('paymentStatus').isIn(['paid', 'pending']),
  body('paymentMethod')
    .optional()
    .isIn(['bank-transfer', 'cash', 'card', 'other']),
  body('paymentReference').optional().isString().trim(),
  body('specialInstructions').optional().isString().trim(),
  body('sendConfirmationEmail').optional().isBoolean(),
  body('pickupAccess').optional().isIn(['lift', 'stairs', 'ground']),
  body('pickupStairsCount').optional().isInt({ min: 1, max: 50 }),
  body('deliveryAccess').optional().isIn(['lift', 'stairs', 'ground']),
  body('deliveryStairsCount').optional().isInt({ min: 1, max: 50 }),
  body('men').isInt({ min: 1, max: 6 }),
  body().custom((value, { req }) => {
    if (req.body.paymentStatus === 'paid' && !req.body.paymentMethod) {
      throw new Error('Payment method is required when payment status is paid')
    }
    if (req.body.pickupAccess === 'stairs' && !req.body.pickupStairsCount) {
      throw new Error('Pickup stairs count is required when pickup access is stairs')
    }
    if (req.body.deliveryAccess === 'stairs' && !req.body.deliveryStairsCount) {
      throw new Error('Delivery stairs count is required when delivery access is stairs')
    }
    return true
  }),
  handleValidationErrors,
]

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(requireAdmin)

// Dashboard stats
router.get('/stats', getAdminStats)

// Notifications
router.get('/notifications', getAdminNotifications)
router.post('/notifications/read-all', markAllAdminNotificationsRead)
router.post('/notifications/:id/read', markAdminNotificationRead)

// User management
router.get('/users', getAllUsers)
router.post('/users', createUser)
router.get('/users/:id', getUserById)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)
router.post('/users/:id/approve-application', approveDriverApplicationAdmin)
router.post('/users/:id/reject-application', rejectDriverApplicationAdmin)
router.post('/users/:id/resend-invite', resendCustomerInvite)

// Driver management
router.get('/drivers', getAllDrivers)

// Booking management
router.get('/bookings', getAllBookings)
router.post('/bookings', createBookingValidation, createBookingAdmin)
router.put('/bookings/:id', updateBookingAdmin)
router.post('/bookings/:id/assign-driver', assignDriver)
router.post('/bookings/:id/handle-dispute', handleDispute)
router.post('/bookings/:id/send-reminder', sendEmailReminder)
router.post('/bookings/:id/offer-to-drivers', offerJobToDrivers)
router.post('/bookings/:id/notes', addBookingNote)
router.post('/bookings/:id/additional-work-payment', recordAdditionalWorkPayment)

// User notes
router.post('/users/:id/notes', addUserNote)

export default router

