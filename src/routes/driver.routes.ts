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

// Vehicle
router.get('/vehicle', getDriverVehicle)
router.put('/vehicle', updateDriverVehicle)

export default router

