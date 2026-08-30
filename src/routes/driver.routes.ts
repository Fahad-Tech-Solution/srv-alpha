import { Router } from 'express'
import { body } from 'express-validator'
import {
  getDriverJobs,
  getDriverStats,
  getDriverJob,
  updateJobStatus,
  addCompletionDetails,
  disputeJob,
  getDriverVehicle,
  updateDriverVehicle,
  getDriverVehicles,
  getDriverVehicleById,
  createDriverVehicle,
  updateDriverVehicleById,
  deleteDriverVehicle,
  updateDriverProfile,
  updateBankDetails,
  acceptPricingRules,
  sendDriverMessage,
  getAvailableJobs,
  acceptJobOffer,
  rejectJobOffer,
} from '../controllers/driver.controller'
import { authenticate } from '../middlewares/auth.middleware'

const router = Router()

// All driver routes require authentication
router.use(authenticate)

// Stats
router.get('/stats', getDriverStats)

// Jobs
router.get('/jobs', getDriverJobs)
router.get('/jobs/:id', getDriverJob)
router.put('/jobs/:id/status', updateJobStatus)
router.post('/jobs/:id/complete', addCompletionDetails)
router.post('/jobs/:id/dispute', disputeJob)

// Vehicle (legacy - single vehicle, kept for backward compatibility)
router.get('/vehicle', getDriverVehicle)
router.put('/vehicle', updateDriverVehicle)

// Vehicles (multiple vehicles management)
// Note: Order matters - specific routes before parameterized routes
router.get('/vehicles', getDriverVehicles)
router.post('/vehicles', createDriverVehicle)
router.get('/vehicles/:id', getDriverVehicleById)
router.put('/vehicles/:id', updateDriverVehicleById)
router.delete('/vehicles/:id', deleteDriverVehicle)

// Profile
router.put('/profile', updateDriverProfile)

// Bank Details
router.put('/bank-details', updateBankDetails)

// Pricing Rules
router.post('/pricing-rules/accept', acceptPricingRules)

// Messages
router.post('/message', sendDriverMessage)

// Available Jobs (Work section)
router.get('/available-jobs', getAvailableJobs)
router.post('/available-jobs/:id/accept', acceptJobOffer)
router.post('/available-jobs/:id/reject', rejectJobOffer)

export default router

