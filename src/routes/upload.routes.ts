import { Router } from 'express'
import { uploadImage, deleteImage } from '../controllers/upload.controller'
import { authenticate } from '../middlewares/auth.middleware'
import { uploadSingle } from '../middlewares/upload.middleware'

const router = Router()

// All upload routes require authentication
router.use(authenticate)

// Upload image
router.post('/image', uploadSingle, uploadImage)

// Delete image
router.delete('/image/:publicId', deleteImage)

export default router
