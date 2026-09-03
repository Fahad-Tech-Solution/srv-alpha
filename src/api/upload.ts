import { apiClient } from './client'

export interface UploadResponse {
  message: string
  url: string
  publicId: string
}

export const uploadApi = {
  uploadImage: async (file: File, folder?: string): Promise<UploadResponse> => {
    const formData = new FormData()
    formData.append('image', file)
    // Note: Multer doesn't parse FormData fields other than files by default
    // So we'll use query params instead
    const url = folder ? `/upload/image?folder=${encodeURIComponent(folder)}` : '/upload/image'

    const response = await apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  deleteImage: async (publicId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/upload/image/${publicId}`)
    return response.data
  },
}
