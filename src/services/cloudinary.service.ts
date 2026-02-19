import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface UploadOptions {
  folder?: string
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

export class CloudinaryService {
  /**
   * Compress and optimize image before upload
   */
  private async compressImage(
    buffer: Buffer,
    maxWidth: number = 1920,
    maxHeight: number = 1920,
    quality: number = 85
  ): Promise<Buffer> {
    try {
      const image = sharp(buffer)
      const metadata = await image.metadata()

      // Resize if image is larger than max dimensions
      let resized = image
      if (metadata.width && metadata.height) {
        if (metadata.width > maxWidth || metadata.height > maxHeight) {
          resized = image.resize(maxWidth, maxHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
        }
      }

      // Convert to JPEG with compression (or keep original format if PNG)
      const format = metadata.format === 'png' ? 'png' : 'jpeg'
      const compressed = await resized
        .toFormat(format, {
          quality,
          progressive: true,
        })
        .toBuffer()

      return compressed
    } catch (error) {
      console.error('Image compression error:', error)
      // Return original buffer if compression fails
      return buffer
    }
  }

  /**
   * Upload image to Cloudinary with compression
   */
  async uploadImage(
    file: Express.Multer.File,
    options: UploadOptions = {}
  ): Promise<{ url: string; publicId: string }> {
    try {
      // Validate file size (2MB limit)
      const maxSize = 2 * 1024 * 1024 // 2MB in bytes
      if (file.size > maxSize) {
        throw new Error('File size exceeds 2MB limit')
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed')
      }

      // Compress image
      const compressedBuffer = await this.compressImage(
        file.buffer,
        options.maxWidth || 1920,
        options.maxHeight || 1920,
        options.quality || 85
      )

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'vehicles',
            resource_type: 'image',
            format: 'auto', // Auto-detect format
            quality: 'auto', // Auto quality
            fetch_format: 'auto', // Auto format conversion
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error)
              reject(new Error('Failed to upload image to Cloudinary'))
            } else if (result) {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
              })
            } else {
              reject(new Error('No result from Cloudinary'))
            }
          }
        )

        uploadStream.end(compressedBuffer)
      })
    } catch (error) {
      console.error('Upload error:', error)
      throw error
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch (error) {
      console.error('Cloudinary delete error:', error)
      throw new Error('Failed to delete image from Cloudinary')
    }
  }

  /**
   * Extract public ID from Cloudinary URL
   */
  extractPublicId(url: string): string | null {
    try {
      const matches = url.match(/\/v\d+\/(.+)\.(jpg|jpeg|png|webp|gif)/i)
      if (matches && matches[1]) {
        return matches[1]
      }
      return null
    } catch (error) {
      console.error('Error extracting public ID:', error)
      return null
    }
  }
}

export const cloudinaryService = new CloudinaryService()
