import { useQuery, useMutation, useQueryClient } from 'react-query'
import { bookingsApi, CreateBookingData } from '@/api/bookings'
import { customerApi, UpdateBookingData } from '@/api/customer'

export const useBookings = (params?: { status?: string; page?: number; limit?: number }) => {
  return useQuery(
    ['bookings', params],
    () => bookingsApi.getAll(params),
    {
      staleTime: 30000, // 30 seconds
    }
  )
}

export const useBooking = (id: string) => {
  return useQuery(
    ['booking', id],
    () => bookingsApi.getById(id),
    {
      enabled: !!id,
    }
  )
}

export const useCreateBooking = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (data: CreateBookingData) => bookingsApi.create(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['bookings'])
      },
    }
  )
}

export const useUpdateBooking = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: Partial<CreateBookingData> }) =>
      bookingsApi.update(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['bookings'])
        queryClient.invalidateQueries(['booking', variables.id])
      },
    }
  )
}

export const useCancelBooking = () => {
  const queryClient = useQueryClient()

  return useMutation(
    (id: string) => bookingsApi.cancel(id),
    {
      onSuccess: (_, id) => {
        queryClient.invalidateQueries(['bookings'])
        queryClient.invalidateQueries(['booking', id])
      },
    }
  )
}

export const useAmendBooking = () => {
  const queryClient = useQueryClient()

  return useMutation(
    ({ id, data }: { id: string; data: UpdateBookingData }) =>
      customerApi.amendBooking(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries(['bookings'])
        queryClient.invalidateQueries(['booking', variables.id])
      },
    }
  )
}

