import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from 'react-query'
import { AdminNotification } from '@/api/admin'
import { getSocketUrl } from '@/lib/socket'
import { prependNotification } from '@/utils/notifications'
import { useAuth } from '@/hooks/useAuth'

let sharedSocket: Socket | null = null

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

export const useNotificationSocket = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  useEffect(() => {
    if (user?.role !== 'admin') {
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      return
    }

    if (!sharedSocket) {
      sharedSocket = io(getSocketUrl(), {
        auth: { token },
        transports: ['websocket', 'polling'],
      })
    } else {
      sharedSocket.auth = { token }
      if (!sharedSocket.connected) {
        sharedSocket.connect()
      }
    }

    const handleNotification = (notification: AdminNotification) => {
      updateNotificationCaches(queryClient, (current) =>
        prependNotification(current, notification)
      )
    }

    sharedSocket.on('admin:notification', handleNotification)

    return () => {
      sharedSocket?.off('admin:notification', handleNotification)
    }
  }, [queryClient, user?.role, user?.id])
}
