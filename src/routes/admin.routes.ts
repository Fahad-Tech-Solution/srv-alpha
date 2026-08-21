import { Router } from 'express'
import { body } from 'express-validator'
import {
  getAdminStats,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  getAllBookings,
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
router.get('/users/:id', getUserById)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)
router.post('/users/:id/resend-invite', resendCustomerInvite)

// Driver management
router.get('/drivers', getAllDrivers)

// Booking management
router.get('/bookings', getAllBookings)
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

