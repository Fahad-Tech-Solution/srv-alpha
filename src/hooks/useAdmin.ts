import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminApi, User, Booking } from '@/api/admin'

const updateNotificationCaches = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: any) => any
) => {
  queryClient
    .getQueryCache()
    .findAll(['adminNotifications'])
    .forEach((query) => {
      queryClient.setQueryData(query.queryKey, updater)
    })
}

export const useAdminNotifications = (params?: {
  page?: number
  limit?: number
  unreadOnly?: boolean
}) => {
  return useQuery(
    ['adminNotifications', params],
    () => adminApi.getNotifications(params),
    {
      staleTime: 15 * 1000,
      retry: 1,
    }
  )
}

export const useAdminNotificationBadge = () => {
  return useQuery(
    ['adminNotifications', { page: 1, limit: 10 }],
    () => adminApi.getNotifications({ page: 1, limit: 10 }),
    {
      staleTime: 15 * 1000,
      retry: 1,
    }
  )
}

export const useMarkAdminNotificationRead = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (id: string) => adminApi.markNotificationRead(id),
    {
      onSuccess: (data) => {
        updateNotificationCaches(queryClient, (current) => {
          if (!current) return current
          const wasUnread = current.notifications.some(
            (item: { _id: string; isRead: boolean }) =>
              item._id === data.notification._id && !item.isRead
          )
          return {
            ...current,
            unreadCount: wasUnread
              ? Math.max(0, current.unreadCount - 1)
              : current.unreadCount,
            notifications: current.notifications.map((item: { _id: string }) =>
              item._id === data.notification._id
                ? { ...item, isRead: true }
                : item
            ),
          }
        })
      },
    }
  )
}

export const useMarkAllAdminNotificationsRead = () => {
  const queryClient = useQueryClient()
  return useMutation(
    () => adminApi.markAllNotificationsRead(),
    {
      onSuccess: () => {
        updateNotificationCaches(queryClient, (current) => {
          if (!current) return current
          return {
            ...current,
            unreadCount: 0,
            notifications: current.notifications.map((item: { isRead: boolean }) => ({
              ...item,
              isRead: true,
            })),
          }
        })
      },
    }
  )
}

// Stats
export const useAdminStats = () => {
  return useQuery('adminStats', adminApi.getStats, {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  })
}

// Users
export const useAdminUsers = (params?: {
  role?: string
  page?: number
  limit?: number
  search?: string
  applicationStatus?: string
}) => {
  return useQuery(
    ['adminUsers', params],
    () => adminApi.getAllUsers(params),
    {
      staleTime: 10 * 1000, // 10 seconds
    }
  )
}

export const useAdminUser = (id: string) => {
  return useQuery(
    ['adminUser', id],
    () => adminApi.getUserById(id),
    {
      enabled: !!id,
    }
  )
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, data }: { id: string; data: Partial<User> }) => adminApi.updateUser(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
        queryClient.invalidateQueries('adminStats')
      },
    }
  )
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (id: string) => adminApi.deleteUser(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
        queryClient.invalidateQueries('adminStats')
      },
    }
  )
}

// Drivers
export const useAdminDrivers = (params?: {
  page?: number
  limit?: number
  search?: string
}) => {
  return useQuery(
    ['adminDrivers', params],
    () => adminApi.getAllDrivers(params),
    {
      staleTime: 10 * 1000,
    }
  )
}

// Bookings
export const useAdminBookings = (params?: {
  status?: string
  page?: number
  limit?: number
  search?: string
}) => {
  return useQuery(
    ['adminBookings', params],
    () => adminApi.getAllBookings(params),
    {
      staleTime: 10 * 1000,
    }
  )
}

export const useUpdateBookingAdmin = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, data }: { id: string; data: Partial<Booking> }) => adminApi.updateBooking(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
        queryClient.invalidateQueries('adminStats')
      },
    }
  )
}

export const useCreateBookingAdmin = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: Parameters<typeof adminApi.createBooking>[0]) => adminApi.createBooking(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
        queryClient.invalidateQueries('adminStats')
      },
    }
  )
}

export const useAssignDriver = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ bookingId, driverId }: { bookingId: string; driverId: string }) =>
      adminApi.assignDriver(bookingId, driverId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
        queryClient.invalidateQueries('adminStats')
      },
    }
  )
}

export const useHandleDispute = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, data }: { id: string; data: { resolved: boolean; status?: string } }) =>
      adminApi.handleDispute(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
        queryClient.invalidateQueries('adminStats')
      },
    }
  )
}

export const useSendEmailReminder = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, type }: { id: string; type: 'customer' | 'driver' }) =>
      adminApi.sendEmailReminder(id, type),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
      },
    }
  )
}

export const useOfferJobToDrivers = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, driverIds, percentage }: { id: string; driverIds: string[]; percentage: number }) =>
      adminApi.offerJobToDrivers(id, driverIds, percentage),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
      },
    }
  )
}

export const useAddBookingNote = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, text, type }: { id: string; text: string; type?: 'call' | 'issue' | 'general' }) =>
      adminApi.addBookingNote(id, text, type),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
      },
    }
  )
}

export const useRecordAdditionalWorkPayment = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, amount, description }: { id: string; amount: number; description?: string }) =>
      adminApi.recordAdditionalWorkPayment(id, amount, description),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminBookings')
      },
    }
  )
}

export const useAddUserNote = () => {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, text, type }: { id: string; text: string; type?: 'call' | 'issue' | 'general' }) =>
      adminApi.addUserNote(id, text, type),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
      },
    }
  )
}

export const useCreateUser = () => {
  const queryClient = useQueryClient()
  return useMutation(
    (data: { name: string; email: string; role: 'admin' | 'driver' | 'customer'; phone?: string; sendInvite?: boolean }) =>
      adminApi.createUser(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('adminUsers')
      },
    }
  )
}

export const useApproveDriverApplication = () => {
  const queryClient = useQueryClient()
  return useMutation((id: string) => adminApi.approveDriverApplication(id), {
    onSuccess: () => {
      queryClient.invalidateQueries('adminUsers')
    },
  })
}

export const useRejectDriverApplication = () => {
  const queryClient = useQueryClient()
  return useMutation(({ id, note }: { id: string; note?: string }) => adminApi.rejectDriverApplication(id, note), {
    onSuccess: () => {
      queryClient.invalidateQueries('adminUsers')
    },
  })
}

