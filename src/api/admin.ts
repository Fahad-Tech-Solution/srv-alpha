import { apiClient } from './client'

export interface AdminStats {
  users: {
    total: number
    admins?: number
    drivers: number
    customers: number
  }
  bookings: {
    total: number
    pending: number
    offered?: number
    confirmed: number
    inProgress: number
    completed: number
    disputed: number
    cancelled?: number
    activeAssigned?: number
  }
  revenue: {
    total: number
    totalSpent: number
    pipeline?: number
  }
}

export interface AdminNotification {
  _id: string
  type: 'offer_accepted' | 'offer_rejected' | 'general'
  title: string
  message: string
  booking?: string | Booking
  driver?: User | string
  driverName?: string
  jobId?: string
  jobName?: string
  orderCode?: string
  offeredPrice?: number
  isRead: boolean
  createdAt: string
  updatedAt: string
}

export interface User {
  _id: string
  email: string
  name: string
  role: 'customer' | 'driver' | 'admin'
  phone?: string
  username?: string
  address?: string
  businessName?: string
  bankDetails?: {
    accountName?: string
    accountNumber?: string
    sortCode?: string
    bankName?: string
    bankStatement?: string
  }
  notes?: {
    text: string
    createdBy: User | string
    createdAt: string
    type?: 'call' | 'issue' | 'general'
  }[]
  isActive: boolean
  applicationStatus?: 'pending' | 'approved' | 'rejected'
  applicationSubmittedAt?: string
  applicationReviewedAt?: string
  applicationReviewNote?: string
  introductionVideoUrl?: string
  drivingLicence?: string
  goodsInTransitInsurance?: string
  publicLiability?: string
  proofOfAddress?: string
  vehicleRegistration?: string
  vehicleCategory?: string
  vehicleMake?: string
  vehicleModel?: string
  vehiclePhoto?: string
  vehicleBaseLocation?: string
  createdAt: string
  updatedAt: string
}

export interface Booking {
  _id: string
  customer: User | string
  driver?: User | string
  status: 'pending' | 'offered' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'disputed'
  pickupAddress: string
  pickupCity: string
  pickupState?: string
  pickupZipCode: string
  pickupDate: string
  pickupTime: string
  deliveryAddress: string
  deliveryCity: string
  deliveryState?: string
  deliveryZipCode: string
  serviceType: 'local' | 'long-distance' | 'interstate'
  vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  estimatedPrice: number
  finalPrice?: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  amountPaid?: number
  orderCode?: string
  miles?: number
  durationRequired?: string
  collectionStairs?: string
  deliveryStairs?: string
  helpersLabel?: string
  vanSize?: string
  manRequired?: string
  specialInstructions?: string
  contactEmail?: string
  contactPhone?: string
  completionPictures?: string[]
  driverNotes?: string
  additionalWorkPayment?: number
  additionalWorkDescription?: string
  notes?: {
    text: string
    createdBy: User | string
    createdAt: string
    type?: 'call' | 'issue' | 'general'
  }[]
  offeredToDrivers?: (User | string)[]
  driverOffers?: {
    driver: User | string
    offeredPrice: number
    status: 'pending' | 'accepted' | 'rejected' | 'superseded' | 'expired'
    offeredAt: string
    respondedAt?: string
  }[]
  offerExpiresAt?: string
  isDisputed?: boolean
  disputeReason?: string
  disputeResolved?: boolean
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  users?: T[]
  bookings?: T[]
  drivers?: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const adminApi = {
  // Stats
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get('/admin/stats')
    return response.data
  },

  // Users
  getAllUsers: async (params?: {
    role?: string
    page?: number
    limit?: number
    search?: string
    applicationStatus?: string
  }): Promise<PaginatedResponse<User>> => {
    const response = await apiClient.get('/admin/users', { params })
    return response.data
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await apiClient.get(`/admin/users/${id}`)
    return response.data
  },

  updateUser: async (id: string, data: Partial<User>): Promise<{ message: string; user: User }> => {
    const response = await apiClient.put(`/admin/users/${id}`, data)
    return response.data
  },

  deleteUser: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/admin/users/${id}`)
    return response.data
  },

  createUser: async (data: {
    name: string
    email: string
    role: 'admin' | 'driver' | 'customer'
    phone?: string
    sendInvite?: boolean
  }): Promise<{ message: string; user: User; inviteStatus?: string }> => {
    const response = await apiClient.post('/admin/users', data)
    return response.data
  },

  approveDriverApplication: async (id: string): Promise<{ message: string; inviteStatus: string }> => {
    const response = await apiClient.post(`/admin/users/${id}/approve-application`)
    return response.data
  },

  rejectDriverApplication: async (
    id: string,
    note?: string
  ): Promise<{ message: string; emailStatus: string }> => {
    const response = await apiClient.post(`/admin/users/${id}/reject-application`, { note })
    return response.data
  },

  // Drivers
  getAllDrivers: async (params?: {
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<User & { stats: { totalJobs: number; completedJobs: number; activeJobs: number } }>> => {
    const response = await apiClient.get('/admin/drivers', { params })
    return response.data
  },

  // Bookings
  getAllBookings: async (params?: {
    status?: string
    page?: number
    limit?: number
    search?: string
  }): Promise<PaginatedResponse<Booking>> => {
    const response = await apiClient.get('/admin/bookings', { params })
    return response.data
  },

  updateBooking: async (id: string, data: Partial<Booking>): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.put(`/admin/bookings/${id}`, data)
    return response.data
  },

  createBooking: async (data: {
    customer: { name: string; email: string; phone: string }
    pickupAddress: string
    pickupCity: string
    pickupZipCode: string
    pickupDate: string
    pickupTime: string
    deliveryAddress: string
    deliveryCity: string
    deliveryZipCode: string
    serviceType: 'local' | 'long-distance' | 'interstate'
    vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
    price: number
    paymentStatus: 'paid' | 'pending'
    paymentMethod?: 'bank-transfer' | 'cash' | 'card' | 'other'
    paymentReference?: string
    specialInstructions?: string
    sendConfirmationEmail?: boolean
    pickupAccess?: 'lift' | 'stairs' | 'ground'
    pickupStairsCount?: number
    deliveryAccess?: 'lift' | 'stairs' | 'ground'
    deliveryStairsCount?: number
    men?: number
  }): Promise<{
    message: string
    booking: Booking
    customerStatus: 'existing' | 'created'
    emails: {
      confirmation: 'sent' | 'failed' | 'skipped'
      onboardingInvite: 'sent' | 'failed' | 'not_required'
    }
  }> => {
    const response = await apiClient.post('/admin/bookings', data)
    return response.data
  },

  assignDriver: async (id: string, driverId: string): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/admin/bookings/${id}/assign-driver`, { driverId })
    return response.data
  },

  handleDispute: async (id: string, data: { resolved: boolean; status?: string }): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/admin/bookings/${id}/handle-dispute`, data)
    return response.data
  },

  sendEmailReminder: async (id: string, type: 'customer' | 'driver'): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/admin/bookings/${id}/send-reminder`, { type })
    return response.data
  },

  offerJobToDrivers: async (id: string, driverIds: string[], percentage: number): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/admin/bookings/${id}/offer-to-drivers`, { driverIds, percentage })
    return response.data
  },

  addBookingNote: async (id: string, text: string, type?: 'call' | 'issue' | 'general'): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/admin/bookings/${id}/notes`, { text, type })
    return response.data
  },

  recordAdditionalWorkPayment: async (id: string, amount: number, description?: string): Promise<{ message: string; booking: Booking }> => {
    const response = await apiClient.post(`/admin/bookings/${id}/additional-work-payment`, { amount, description })
    return response.data
  },

  addUserNote: async (id: string, text: string, type?: 'call' | 'issue' | 'general'): Promise<{ message: string; user: User }> => {
    const response = await apiClient.post(`/admin/users/${id}/notes`, { text, type })
    return response.data
  },

  getNotifications: async (params?: {
    page?: number
    limit?: number
    unreadOnly?: boolean
  }): Promise<{
    notifications: AdminNotification[]
    unreadCount: number
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> => {
    const response = await apiClient.get('/admin/notifications', {
      params: {
        page: params?.page,
        limit: params?.limit,
        unreadOnly: params?.unreadOnly ? 'true' : undefined,
      },
    })
    return response.data
  },

  markNotificationRead: async (id: string): Promise<{ message: string; notification: AdminNotification }> => {
    const response = await apiClient.post(`/admin/notifications/${id}/read`)
    return response.data
  },

  markAllNotificationsRead: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/admin/notifications/read-all')
    return response.data
  },
}

