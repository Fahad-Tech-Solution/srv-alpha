import { apiClient } from './client'

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  name: string
  role?: 'customer'
}

export interface DriverApplicationData {
  name: string
  email: string
  phone?: string
  username?: string
  address?: string
  businessName?: string
  drivingLicence?: string
  goodsInTransitInsurance?: string
  publicLiability?: string
  proofOfAddress?: string
  vehicleRegistration?: string
  vehicleCategory?: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  vehicleMake?: string
  vehicleModel?: string
  vehicleSeats?: number
  vehicleBaseLocation?: string
  vehicleRegistrationDocumentType?: 'logbook' | 'mot' | 'v5'
  vehicleRegistrationDocument?: string
  vehiclePhoto?: string
  vehicleType?: string
  vehicleFuelType?: 'petrol' | 'diesel' | 'lpg' | 'hybrid' | 'electric'
  vehicleTailLift?: boolean
  vehicleTrailer?: boolean
  introductionVideoUrl?: string
  bankDetails?: {
    accountName?: string
    accountNumber?: string
    sortCode?: string
    bankName?: string
    bankStatement?: string
  }
}

export interface AuthResponse {
  token: string
  user: {
    id: string
    email: string
    name: string
    role: string
  }
}

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/login', credentials)
    return response.data
  },
  
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await apiClient.post('/auth/register', data)
    return response.data
  },
  
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout')
  },
  
  getCurrentUser: async () => {
    const response = await apiClient.get('/auth/me')
    return response.data
  },

  updateProfile: async (data: { name?: string; phone?: string; address?: string }): Promise<{ message: string; user: any }> => {
    const response = await apiClient.put('/auth/profile', data)
    return response.data
  },

  changePassword: async (data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password', data)
    return response.data
  },

  verifyFirstAccess: async (
    email: string,
    token: string
  ): Promise<{ valid: boolean; email: string; name: string }> => {
    const response = await apiClient.get('/auth/first-access', {
      params: { email, token },
    })
    return response.data
  },

  completeFirstAccess: async (data: {
    email: string
    token: string
    password: string
  }): Promise<AuthResponse & { message: string }> => {
    const response = await apiClient.post('/auth/first-access', data)
    return response.data
  },

  submitDriverApplication: async (
    data: DriverApplicationData
  ): Promise<{ message: string; userId: string }> => {
    const response = await apiClient.post('/auth/driver-application', data)
    return response.data
  },

  uploadApplicationFile: async (
    file: File,
    options?: { folder?: string; type?: 'image' | 'video' }
  ): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    if (options?.folder) params.set('folder', options.folder)
    if (options?.type) params.set('type', options.type)
    const query = params.toString()
    const response = await apiClient.post(
      `/auth/driver-application/upload${query ? `?${query}` : ''}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },
}
