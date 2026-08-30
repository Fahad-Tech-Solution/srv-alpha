import { Router } from 'express'
import { uploadImage, deleteImage } from '../controllers/upload.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { uploadSingle } from '../middlewares/upload.middleware'

const router = Router()

// All upload routes require authentication
router.use(authenticate)

// Multer error handler middleware
const handleMulterError = (err: any, req: any, res: any, next: any) => {
  if (err) {
    console.error('Multer error:', err)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File size exceeds 2MB limit' })
    }
    if (err.message && err.message.includes('Invalid file type')) {
      return res.status(400).json({ message: err.message })
    }
    return res.status(400).json({ 
      message: err.message || 'File upload error',
      code: err.code,
    })
  }
  next()
}

// Upload image
router.post('/image', (req, res, next) => {
  uploadSingle(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next)
    }
    next()
  })
}, uploadImage)

// Delete image
router.delete('/image/:publicId', deleteImage)

export default router
