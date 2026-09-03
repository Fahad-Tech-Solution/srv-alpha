import { apiClient } from './client'
import { Booking } from './admin'

export interface DriverStats {
  totalJobs: number
  activeJobs: number
  completedJobs: number
  pendingJobs: number
  offeredJobs?: number
  totalEarnings?: number
  recentEarnings?: {
    _id: string
    orderCode?: string
    pickupCity?: string
    deliveryCity?: string
    amount: number
    completedAt?: string
    paymentStatus?: string
  }[]
}

export interface VehicleInfo {
  _id?: string
  driver?: string
  drivingLicence?: string
  goodsInTransitInsurance?: string
  publicLiability?: string
  proofOfAddress?: string
  vehiclePhoto?: string
  vehicleRegistration?: string
  vehicleCategory?: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  vehicleMake?: string
  vehicleModel?: string
  vehicleSeats?: number
  vehicleBaseLocation?: string
  vehicleRegistrationDocumentType?: 'logbook' | 'mot' | 'v5'
  vehicleRegistrationDocument?: string
  vehicleType?: string
  vehicleTotalPayload?: {
    value?: number
    unit?: 'kg' | 'tonnes'
  }
  vehicleLoadingCapacity?: {
    value?: number
    unit?: 'm³' | 'ft³'
  }
  vehicleMaxLength?: {
    value?: number
    unit?: 'm' | 'ft'
  }
  vehicleMotorbikeCapacity?: number
  vehicleTailLift?: boolean
  vehicleTrailer?: boolean
  vehiclePayload?: {
    value?: number
    unit?: 'kg' | 'tonnes'
  }
  vehicleFuelType?: 'petrol' | 'diesel' | 'lpg' | 'hybrid' | 'electric'
  createdAt?: string
  updatedAt?: string
}

export interface DriverProfile {
  username?: string
  businessName?: string
  address?: string
  name?: string
  phone?: string
}

export interface BankDetails {
  accountName?: string
  accountNumber?: string
  sortCode?: string
  bankName?: string
  bankStatement?: string
}

export interface DriverMessage {
  subject: string
  message: string
}

export const driverApi = {
  // Stats
  getStats: async (): Promise<DriverStats> => {
    const response = await apiClient.get('/driver/stats')
    return response.data
  },

  // Jobs
  getJobs: async (params?: {
    status?: string
    page?: number
    limit?: number
  }): Promise<{ bookings: Booking[]; pagination: any }> => {
    const response = await apiClient.get('/driver/jobs', { params })
    return response.data
  },

  getJob: async (id: string): Promise<Booking> => {
    const response = await apiClient.get(`/driver/jobs/${id}`)
    return response.data
  },

  updateJobStatus: async (id: string, status: string): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.put(`/driver/jobs/${id}/status`, { status })
    return response.data
  },

  addCompletionDetails: async (
    id: string,
    data: { pictures?: string[]; notes?: string }
  ): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/driver/jobs/${id}/complete`, data)
    return response.data
  },

  disputeJob: async (id: string, reason: string): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/driver/jobs/${id}/dispute`, { reason })
    return response.data
  },

  // Vehicle
  getVehicle: async (): Promise<VehicleInfo> => {
    const response = await apiClient.get('/driver/vehicle')
    return response.data
  },

  updateVehicle: async (data: VehicleInfo): Promise<{ message: string; vehicle: VehicleInfo }> => {
    const response = await apiClient.put('/driver/vehicle', data)
    return response.data
  },

  // Vehicles (multiple vehicles)
  getVehicles: async (): Promise<{ vehicles: VehicleInfo[] }> => {
    const response = await apiClient.get('/driver/vehicles')
    return response.data
  },

  getVehicleById: async (id: string): Promise<{ vehicle: VehicleInfo }> => {
    const response = await apiClient.get(`/driver/vehicles/${id}`)
    return response.data
  },

  createVehicle: async (data: VehicleInfo): Promise<{ message: string; vehicle: VehicleInfo }> => {
    console.log('API: createVehicle - Using POST /driver/vehicles', data)
    const response = await apiClient.post('/driver/vehicles', data)
    console.log('API: createVehicle - Response:', response.data)
    return response.data
  },

  updateVehicleById: async (id: string, data: Partial<VehicleInfo>): Promise<{ message: string; vehicle: VehicleInfo }> => {
    console.log('API: updateVehicleById - Using PUT /driver/vehicles/' + id, data)
    const response = await apiClient.put(`/driver/vehicles/${id}`, data)
    console.log('API: updateVehicleById - Response:', response.data)
    return response.data
  },

  deleteVehicle: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/driver/vehicles/${id}`)
    return response.data
  },

  // Profile
  updateProfile: async (data: DriverProfile): Promise<{ message: string; user: any }> => {
    const response = await apiClient.put('/driver/profile', data)
    return response.data
  },

  // Bank Details
  updateBankDetails: async (data: { bankDetails: BankDetails }): Promise<{ message: string; bankDetails: BankDetails }> => {
    const response = await apiClient.put('/driver/bank-details', data)
    return response.data
  },

  // Pricing Rules
  acceptPricingRules: async (): Promise<{ message: string; pricingRulesAccepted: boolean; pricingRulesAcceptedAt: Date }> => {
    const response = await apiClient.post('/driver/pricing-rules/accept')
    return response.data
  },

  // Messages
  sendMessage: async (data: DriverMessage): Promise<{ message: string }> => {
    const response = await apiClient.post('/driver/message', data)
    return response.data
  },

  // Available Jobs
  getAvailableJobs: async (): Promise<{ bookings: Booking[] }> => {
    const response = await apiClient.get('/driver/available-jobs')
    return response.data
  },

  acceptJobOffer: async (id: string): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/driver/available-jobs/${id}/accept`)
    return response.data
  },

  rejectJobOffer: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.post(`/driver/available-jobs/${id}/reject`)
    return response.data
  },
}

