import { Request, Response, NextFunction } from 'express'
import { cloudinaryService } from '../services/cloudinary.service'
import { submitDriverApplication } from '../services/driverApplication.service'

export const submitApplication = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await submitDriverApplication(req.body)
    res.status(201).json({
      message:
        'Application submitted successfully. We will email you once your application has been reviewed.',
      userId: result.userId,
    })
  } catch (error: any) {
    if (error?.statusCode) {
      res.status(error.statusCode).json({ message: error.message })
      return
    }
    next(error)
  }
}

export const uploadApplicationFile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: 'No file uploaded' })
      return
    }

    const fileType = String(req.query.type || 'image')
    const folder =
      (req.query.folder as string) ||
      (fileType === 'video' ? 'driver-applications/videos' : 'driver-applications')

    if (fileType === 'video') {
      const allowedVideo = ['video/mp4', 'video/webm', 'video/quicktime']
      if (!allowedVideo.includes(req.file.mimetype)) {
        res.status(400).json({ message: 'Invalid video type. Use MP4, WebM, or MOV' })
        return
      }
      if (req.file.size > 25 * 1024 * 1024) {
        res.status(400).json({ message: 'Video must be 25MB or smaller' })
        return
      }
      const result = await cloudinaryService.uploadVideo(req.file, { folder })
      res.json({ message: 'Video uploaded successfully', url: result.url, publicId: result.publicId })
      return
    }

    const result = await cloudinaryService.uploadImage(req.file, { folder })
    res.json({ message: 'File uploaded successfully', url: result.url, publicId: result.publicId })
  } catch (error: any) {
    console.error('Application upload error:', error)
    res.status(500).json({ message: error.message || 'Failed to upload file' })
  }
}
