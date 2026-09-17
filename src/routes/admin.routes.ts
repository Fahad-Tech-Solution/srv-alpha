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
  resendDriverApprovalInviteAdmin,
  getAllBookings,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  assignDriver,
  reclaimBooking,
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
import { SAFE_EMAIL_NORMALIZE } from '../utils/emailNormalize'

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
  body('customer.email').isEmail().normalizeEmail(SAFE_EMAIL_NORMALIZE),
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
  body('vehicleType').optional().isIn(['small', 'medium', 'large', 'luton', 'multi-van']),
  body('vanCounts.small').optional().isInt({ min: 0, max: 20 }),
  body('vanCounts.medium').optional().isInt({ min: 0, max: 20 }),
  body('vanCounts.large').optional().isInt({ min: 0, max: 20 }),
  body('vanCounts.luton').optional().isInt({ min: 0, max: 20 }),
  body('helpers').optional().isInt({ min: 0, max: 20 }),
  body('drivers').optional().isInt({ min: 0, max: 20 }),
  body('stops').optional().isArray({ max: 3 }),
  body('stops.*.address').optional().isString().trim().notEmpty(),
  body('stops.*.city').optional().isString().trim().notEmpty(),
  body('stops.*.zipCode').optional().isString().trim().notEmpty(),
  body('stops.*.access').optional().isIn(['lift', 'stairs', 'ground']),
  body('stops.*.stairsCount').optional().isInt({ min: 1, max: 50 }),
  body('serviceExtras.dismantleItems').optional().isInt({ min: 0, max: 100 }),
  body('serviceExtras.assemblyItems').optional().isInt({ min: 0, max: 100 }),
  body('serviceExtras.packingBoxes').optional().isInt({ min: 0, max: 500 }),
  body('price').isFloat({ min: 0 }),
  body('paymentStatus').isIn(['paid', 'pending']),
  body('paymentMethod')
    .optional()
    .isIn(['bank-transfer', 'cash', 'card', 'other']),
  body('paymentReference').optional().isString().trim(),
  body('specialInstructions').optional().isString().trim(),
  body('sendConfirmationEmail').optional().isBoolean(),
  body('status').optional().isIn(['pending', 'survey']),
  body('pickupAccess').optional().isIn(['lift', 'stairs', 'ground']),
  body('pickupStairsCount').optional().isInt({ min: 1, max: 50 }),
  body('deliveryAccess').optional().isIn(['lift', 'stairs', 'ground']),
  body('deliveryStairsCount').optional().isInt({ min: 1, max: 50 }),
  body('men').optional().isInt({ min: 1, max: 40 }),
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
    const vc = req.body.vanCounts || {}
    const vanTotal =
      (Number(vc.small) || 0) +
      (Number(vc.medium) || 0) +
      (Number(vc.large) || 0) +
      (Number(vc.luton) || 0)
    if (vanTotal < 1 && !req.body.vehicleType) {
      throw new Error('At least one van is required')
    }
    if (
      req.body.serviceExtras?.packingBoxes != null &&
      Number(req.body.serviceExtras.packingBoxes) % 5 !== 0
    ) {
      throw new Error('Packing boxes must be in steps of 5')
    }
    const stops = req.body.stops
    if (Array.isArray(stops)) {
      if (stops.length > 3) throw new Error('A maximum of 3 intermediate stops is allowed')
      stops.forEach((stop: any, index: number) => {
        if (stop?.access === 'stairs' && !stop?.stairsCount) {
          throw new Error(`Stop ${index + 1} stairs count is required when access is stairs`)
        }
      })
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
router.post('/users/:id/resend-approval-invite', resendDriverApprovalInviteAdmin)
router.post('/users/:id/resend-invite', resendCustomerInvite)

// Driver management
router.get('/drivers', getAllDrivers)

// Booking management
router.get('/bookings', getAllBookings)
router.post('/bookings', createBookingValidation, createBookingAdmin)
router.put('/bookings/:id', updateBookingAdmin)
router.delete('/bookings/:id', deleteBookingAdmin)
router.post('/bookings/:id/assign-driver', assignDriver)
router.post('/bookings/:id/reclaim', reclaimBooking)
router.post('/bookings/:id/handle-dispute', handleDispute)
router.post('/bookings/:id/send-reminder', sendEmailReminder)
router.post('/bookings/:id/offer-to-drivers', offerJobToDrivers)
router.post('/bookings/:id/notes', addBookingNote)
router.post('/bookings/:id/additional-work-payment', recordAdditionalWorkPayment)

// User notes
router.post('/users/:id/notes', addUserNote)

export default router

