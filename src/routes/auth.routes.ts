import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import {
  register,
  login,
  getCurrentUser,
  logout,
  updateProfile,
  changePassword,
  verifyFirstAccess,
  completeFirstAccess,
} from '../controllers/auth.controller'
import {
  submitApplication,
  uploadApplicationFile,
} from '../controllers/driverApplication.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { applicationUpload } from '../middlewares/applicationUpload.middleware'

const router = Router()

// Validation error handler middleware
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

// Validation middleware
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().notEmpty(),
  handleValidationErrors,
]

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  handleValidationErrors,
]

// UK phone validation: accepts +44, 0, or 07 formats with spaces/dashes
const updateProfileValidation = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('phone').optional().trim().custom((value) => {
    if (!value || value === '') return true // Allow empty phone
    // UK phone regex: +44, 0, or 07 formats, with optional spaces/dashes
    const ukPhoneRegex = /^(\+44\s?|0)(\d{2,4}\s?\d{3,4}\s?\d{3,4}|\d{10,11})$/
    if (!ukPhoneRegex.test(value.replace(/[\s-]/g, ''))) {
      throw new Error('Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)')
    }
    return true
  }),
  handleValidationErrors,
]

const firstAccessValidation = [
  body('email').isEmail().normalizeEmail(),
  body('token').isString().trim().notEmpty(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
]

const driverApplicationValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().trim(),
  body('username').optional().trim(),
  body('address').optional().trim(),
  body('businessName').optional().trim(),
  handleValidationErrors,
]

// Routes
router.post('/register', registerValidation, register)
router.post('/login', loginValidation, login)
router.post('/driver-application', driverApplicationValidation, submitApplication)
router.post('/driver-application/upload', (req, res, next) => {
  applicationUpload(req, res, (err) => {
    if (err) {
      res.status(400).json({ message: err.message || 'Upload failed' })
      return
    }
    next()
  })
}, uploadApplicationFile)
router.get('/first-access', verifyFirstAccess)
router.post('/first-access', firstAccessValidation, completeFirstAccess)
router.get('/me', authenticate, getCurrentUser)
router.post('/logout', authenticate, logout)
router.put('/profile', authenticate, updateProfileValidation, updateProfile)
router.post('/change-password', authenticate, changePassword)

export default router

