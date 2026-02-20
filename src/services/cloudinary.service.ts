import { v2 as cloudinary } from 'cloudinary'
import sharp from 'sharp'

export interface UploadOptions {
  folder?: string
  quality?: number
  maxWidth?: number
  maxHeight?: number
}

export class CloudinaryService {
  private configured = false

  /**
   * Configure Cloudinary (lazy initialization)
   */
  private ensureConfigured(): void {
    if (this.configured) return

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      const missing = []
      if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME')
      if (!apiKey) missing.push('CLOUDINARY_API_KEY')
      if (!apiSecret) missing.push('CLOUDINARY_API_SECRET')
      
      throw new Error(
        `Cloudinary is not configured. Missing: ${missing.join(', ')}. ` +
        `Please set these environment variables in your .env file and restart the server.`
      )
    }

    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      })
      this.configured = true
      console.log('✅ Cloudinary configured successfully')
    } catch (error: any) {
      console.error('❌ Failed to configure Cloudinary:', error)
      throw new Error(`Failed to configure Cloudinary: ${error.message}`)
    }
  }

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
      // Ensure Cloudinary is configured
      this.ensureConfigured()

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
      let compressedBuffer: Buffer
      try {
        compressedBuffer = await this.compressImage(
          file.buffer,
          options.maxWidth || 1920,
          options.maxHeight || 1920,
          options.quality || 85
        )
      } catch (compressError) {
        console.error('Image compression error, using original:', compressError)
        // If compression fails, use original buffer
        compressedBuffer = file.buffer
      }

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || 'vehicles',
            resource_type: 'image',
            quality: 'auto', // Auto quality optimization
            fetch_format: 'auto', // Auto format conversion (WebP when supported)
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error)
              console.error('Error details:', {
                message: error.message,
                http_code: (error as any).http_code,
                name: error.name,
              })
              reject(new Error(`Failed to upload image to Cloudinary: ${error.message || 'Unknown error'}`))
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
    } catch (error: any) {
      console.error('Upload error:', error)
      throw error
    }
  }

  /**
   * Delete image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      this.ensureConfigured()
      await cloudinary.uploader.destroy(publicId)
    } catch (error: any) {
      console.error('Cloudinary delete error:', error)
      throw new Error(`Failed to delete image from Cloudinary: ${error.message || 'Unknown error'}`)
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
