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
} from '../controllers/admin.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { requireAdmin } from '../middlewares/admin.middleware'

const router = Router()

// All admin routes require authentication and admin role
router.use(authenticate)
router.use(requireAdmin)

// Dashboard stats
router.get('/stats', getAdminStats)

// User management
router.get('/users', getAllUsers)
router.get('/users/:id', getUserById)
router.put('/users/:id', updateUser)
router.delete('/users/:id', deleteUser)

// Driver management
router.get('/drivers', getAllDrivers)

// Booking management
router.get('/bookings', getAllBookings)
router.put('/bookings/:id', updateBookingAdmin)
router.post('/bookings/:id/assign-driver', assignDriver)
router.post('/bookings/:id/handle-dispute', handleDispute)
router.post('/bookings/:id/send-reminder', sendEmailReminder)

export default router

