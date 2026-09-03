import { useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { authApi } from '@/api/auth'
import { Alert, AlertDescription } from './alert'

interface PublicFileUploadProps {
  value?: string
  onChange: (url: string) => void
  accept?: string
  label?: string
  description?: string
  folder?: string
  uploadType?: 'image' | 'video'
  maxSizeMB?: number
}

export function PublicFileUpload({
  value,
  onChange,
  accept = 'image/*',
  label,
  description,
  folder = 'driver-applications',
  uploadType = 'image',
  maxSizeMB = uploadType === 'video' ? 25 : 2,
}: PublicFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      setError(`File exceeds ${maxSizeMB}MB limit`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const result = await authApi.uploadApplicationFile(file, { folder, type: uploadType })
      onChange(result.url)
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Upload failed')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    onChange('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isVideo = uploadType === 'video' || value?.includes('/video/')

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
          <div className="relative border rounded-lg overflow-hidden bg-muted/50 p-3">
            {isVideo ? (
              <video src={value} controls className="max-h-48 w-full rounded" />
            ) : (
              <img src={value} alt="Upload preview" className="max-h-48 w-full object-contain rounded" />
            )}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleRemove}
              className="absolute top-2 right-2 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
            Open uploaded file
          </a>
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
            id={`public-upload-${label}`}
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
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {uploadType === 'video' ? 'Video' : 'File'} (max {maxSizeMB}MB)
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
