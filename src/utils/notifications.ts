import { AdminNotification } from '@/api/admin'

export const formatBadgeCount = (count: number): string | null => {
  if (count <= 0) return null
  return count > 9 ? '9+' : String(count)
}

export const formatRelativeTime = (value: string) => {
  const date = new Date(value)
  const diffMs = Date.now() - date.getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export const getNotificationJobName = (notification: AdminNotification): string | null => {
  if (notification.jobName) {
    return notification.jobName
  }

  const booking = notification.booking
  if (
    booking &&
    typeof booking === 'object' &&
    'pickupCity' in booking &&
    'deliveryCity' in booking &&
    booking.pickupCity &&
    booking.deliveryCity
  ) {
    return `${booking.pickupCity} → ${booking.deliveryCity}`
  }

  if (notification.orderCode) {
    return notification.orderCode
  }

  return null
}

export const getNotificationLink = (notification: AdminNotification): string => {
  if (notification.jobId) {
    return `/admin/bookings?search=${encodeURIComponent(
      notification.orderCode || notification.jobId
    )}`
  }
  return '/notifications'
}

export type NotificationsResponse = {
  notifications: AdminNotification[]
  unreadCount: number
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const prependNotification = (
  current: NotificationsResponse | undefined,
  notification: AdminNotification
): NotificationsResponse => {
  if (!current) {
    return {
      notifications: [notification],
      unreadCount: notification.isRead ? 0 : 1,
    }
  }

  const exists = current.notifications.some((item) => item._id === notification._id)
  if (exists) {
    return current
  }

  const notifications = [notification, ...current.notifications].slice(0, current.pagination?.limit || 10)

  return {
    ...current,
    notifications,
    unreadCount: notification.isRead ? current.unreadCount : current.unreadCount + 1,
  }
}
