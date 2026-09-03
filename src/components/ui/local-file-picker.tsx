import { useEffect, useRef, useState } from 'react'
import { Button } from './button'
import { Input } from './input'
import { Upload, X, AlertCircle, FileText } from 'lucide-react'
import { Alert, AlertDescription } from './alert'

interface LocalFilePickerProps {
  file?: File | null
  onChange: (file: File | null) => void
  accept?: string
  label?: string
  description?: string
  maxSizeMB?: number
}

export function LocalFilePicker({
  file,
  onChange,
  accept = 'image/*',
  label,
  description,
  maxSizeMB = 2,
}: LocalFilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }

    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    setError('')
    const maxSize = maxSizeMB * 1024 * 1024
    if (selected.size > maxSize) {
      setError(`File exceeds ${maxSizeMB}MB limit`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    onChange(selected)
  }

  const handleRemove = () => {
    onChange(null)
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const isImage = file?.type.startsWith('image/')
  const isVideo = file?.type.startsWith('video/')

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
      {file && previewUrl ? (
        <div className="space-y-2">
          <div className="relative border rounded-lg overflow-hidden bg-muted/50 p-3">
            {isImage ? (
              <img src={previewUrl} alt="Preview" className="max-h-48 w-full object-contain rounded" />
            ) : isVideo ? (
              <video src={previewUrl} controls className="max-h-48 w-full rounded" />
            ) : (
              <div className="flex items-center gap-3 py-4 px-2">
                <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
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
          <p className="text-xs text-muted-foreground">
            {file.name} — will be uploaded when you submit your application
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileSelect}
            className="hidden"
            id={`local-picker-${label}`}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Choose file (max {maxSizeMB}MB)
          </Button>
        </div>
      )}
    </div>
  )
}
