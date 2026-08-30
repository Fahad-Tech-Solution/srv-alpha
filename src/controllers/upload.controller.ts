import { Response, NextFunction } from 'express'
import { AuthRequest } from '../middlewares/auth.middleware'
import { cloudinaryService } from '../services/cloudinary.service'

/**
 * Upload image endpoint
 * POST /api/upload/image
 */
export const uploadImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      fileSize: req.file?.size,
      mimetype: req.file?.mimetype,
      fileName: req.file?.originalname,
    })

    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' })
      return
    }

    // Validate file size (2MB limit)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (req.file.size > maxSize) {
      res.status(400).json({ message: 'File size exceeds 2MB limit' })
      return
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(req.file.mimetype)) {
      res.status(400).json({
        message: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      })
      return
    }

    // Get folder from body or query params (default: 'vehicles')
    const folder = (req.body?.folder || req.query.folder as string) || 'vehicles'

    // Upload to Cloudinary
    const result = await cloudinaryService.uploadImage(req.file, {
      folder,
      quality: 85,
      maxWidth: 1920,
      maxHeight: 1920,
    })

    res.json({
      message: 'Image uploaded successfully',
      url: result.url,
      publicId: result.publicId,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    console.error('Error stack:', error.stack)
    const errorMessage = error.message || 'Failed to upload image'
    res.status(500).json({
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    })
  }
}

/**
 * Delete image endpoint
 * DELETE /api/upload/image/:publicId
 */
export const deleteImage = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { publicId } = req.params

    if (!publicId) {
      res.status(400).json({ message: 'Public ID is required' })
      return
    }

    await cloudinaryService.deleteImage(publicId)

    res.json({
      message: 'Image deleted successfully',
    })
  } catch (error: any) {
    console.error('Delete error:', error)
    res.status(500).json({
      message: error.message || 'Failed to delete image',
    })
  }
}
