import { apiClient } from './client'

export interface CustomerMessage {
  subject: string
  message: string
}

export interface UpdateBookingData {
  hours?: number
  men?: number
  vans?: number
  pickupDate?: string
  pickupTime?: string
}

export const customerApi = {
  // Send message to info@local-van.com
  sendMessage: async (data: CustomerMessage): Promise<{ message: string }> => {
    const response = await apiClient.post('/customer/message', data)
    return response.data
  },

  // Amend booking (update hours/men/vans)
  amendBooking: async (id: string, data: UpdateBookingData): Promise<{ message: string; booking: any; newPrice?: number }> => {
    const response = await apiClient.put(`/customer/bookings/${id}/amend`, data)
    return response.data
  },
}
