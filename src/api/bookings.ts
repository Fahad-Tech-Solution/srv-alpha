import { apiClient } from './client'

export interface BookingItem {
  name: string
  quantity: number
  description?: string
}

export interface CreateBookingData {
  pickupAddress: string
  pickupCity: string
  pickupState: string
  pickupZipCode: string
  pickupDate: string
  pickupTime: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryZipCode: string
  serviceType: 'local' | 'long-distance' | 'interstate'
  vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  items: BookingItem[]
  estimatedPrice: number
  specialInstructions?: string
  contactPhone: string
}

export interface Booking {
  _id: string
  customer: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  driver?: {
    _id: string
    name: string
    email: string
    phone?: string
  }
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled'
  pickupAddress: string
  pickupCity: string
  pickupState: string
  pickupZipCode: string
  pickupDate: string
  pickupTime: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState: string
  deliveryZipCode: string
  serviceType: 'local' | 'long-distance' | 'interstate'
  vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  items: BookingItem[]
  estimatedPrice: number
  finalPrice?: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod?: string
  specialInstructions?: string
  contactPhone: string
  contactEmail: string
  hours?: number
  men?: number
  vans?: number
  additionalWorkPayment?: number
  additionalWorkDescription?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface BookingsResponse {
  bookings: Booking[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const bookingsApi = {
  create: async (data: CreateBookingData) => {
    const response = await apiClient.post('/bookings', data)
    return response.data
  },

  getAll: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await apiClient.get<BookingsResponse>('/bookings', { params })
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiClient.get<Booking>(`/bookings/${id}`)
    return response.data
  },

  update: async (id: string, data: Partial<CreateBookingData>) => {
    const response = await apiClient.put(`/bookings/${id}`, data)
    return response.data
  },

  cancel: async (id: string) => {
    const response = await apiClient.post(`/bookings/${id}/cancel`)
    return response.data
  },
}

