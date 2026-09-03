import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import {
  useAdminNotifications,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from '@/hooks/useAdmin'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'
import { AdminNotification } from '@/api/admin'
import { formatRelativeTime, getNotificationLink, getNotificationJobName } from '@/utils/notifications'
import { formatCurrency } from '@/utils/format'

const NotificationsPage = () => {
  useNotificationSocket()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const limit = 15

  const { data, isLoading } = useAdminNotifications({ page, limit })
  const markRead = useMarkAdminNotificationRead()
  const markAllRead = useMarkAllAdminNotificationsRead()

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0
  const pagination = data?.pagination

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.isRead) {
      markRead.mutate(notification._id)
    }
    navigate(getNotificationLink(notification))
  }

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">
              Full notification history
              {unreadCount > 0 ? ` · ${unreadCount} unread` : ''}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isLoading}
            >
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              All notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                No notifications yet.
              </p>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-6 py-4 text-left transition hover:bg-muted/50 ${
                      notification.isRead ? '' : 'bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {notification.driverName && <span>Driver: {notification.driverName}</span>}
                          {getNotificationJobName(notification) && (
                            <span>Job: {getNotificationJobName(notification)}</span>
                          )}
                          {notification.offeredPrice != null && (
                            <span>{formatCurrency(notification.offeredPrice)}</span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t px-6 py-4">
                <p className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((current) => Math.min(pagination.pages, current + 1))
                    }
                    disabled={page >= pagination.pages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

export default NotificationsPage
