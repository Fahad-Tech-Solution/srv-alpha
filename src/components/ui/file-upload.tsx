import { useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Upload, X, Loader2, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { uploadApi } from '@/api/upload'
import { Alert, AlertDescription } from './alert'

interface FileUploadProps {
  value?: string
  onChange: (url: string) => void
  accept?: string
  label?: string
  description?: string
  folder?: string
  maxSizeMB?: number
}

export function FileUpload({ 
  value, 
  onChange, 
  accept = 'image/*', 
  label, 
  description,
  folder = 'vehicles',
  maxSizeMB = 2
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string>('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [imageError, setImageError] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const validateFile = (file: File): string | null => {
    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      return `File size exceeds ${maxSizeMB}MB limit. Current size: ${formatFileSize(file.size)}`
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Only JPEG, PNG, and WebP images are allowed'
    }

    return null
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset error
    setError('')

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Simulate progress (Cloudinary handles upload internally)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Upload to Cloudinary via backend
      const result = await uploadApi.uploadImage(file, folder)
      
      clearInterval(progressInterval)
      setUploadProgress(100)

      // Small delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 200))

      onChange(result.url)
      setError('')
    } catch (error: any) {
      console.error('File upload error:', error)
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload file. Please try again.'
      setError(errorMessage)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemove = () => {
    onChange('')
    setError('')
    setImageError(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {value ? (
        <div className="space-y-2">
          <div className="relative border rounded-lg overflow-hidden bg-muted/50 group">
            <div className="aspect-video w-full flex items-center justify-center bg-muted min-h-[200px]">
              {!imageError ? (
                <img
                  src={value}
                  alt="Uploaded preview"
                  className="max-w-full max-h-64 object-contain rounded"
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-4 text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <p className="text-sm">Preview unavailable</p>
                  <a 
                    href={value} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-primary hover:underline text-xs mt-2"
                  >
                    View image
                  </a>
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="truncate flex-1 mr-2" title={value}>{value}</span>
            <a 
              href={value} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-primary hover:underline whitespace-nowrap"
            >
              Open in new tab
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
            id={`file-upload-${label}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading... {uploadProgress > 0 && `${uploadProgress}%`}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Image (Max {maxSizeMB}MB)
              </>
            )}
          </Button>
          {uploading && uploadProgress > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Supported formats: JPEG, PNG, WebP. Maximum size: {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  )
}
