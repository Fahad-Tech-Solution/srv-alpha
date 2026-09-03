import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useAdminNotificationBadge,
  useMarkAdminNotificationRead,
  useMarkAllAdminNotificationsRead,
} from '@/hooks/useAdmin'
import { useNotificationSocket } from '@/hooks/useNotificationSocket'
import { AdminNotification } from '@/api/admin'
import {
  formatBadgeCount,
  formatRelativeTime,
  getNotificationLink,
  getNotificationJobName,
} from '@/utils/notifications'

const NotificationBell = () => {
  useNotificationSocket()
  const navigate = useNavigate()
  const { data, isLoading } = useAdminNotificationBadge()
  const markRead = useMarkAdminNotificationRead()
  const markAllRead = useMarkAllAdminNotificationsRead()

  const notifications = data?.notifications || []
  const unreadCount = data?.unreadCount || 0
  const badge = formatBadgeCount(unreadCount)

  const handleNotificationClick = (notification: AdminNotification) => {
    if (!notification.isRead) {
      markRead.mutate(notification._id)
    }
    navigate(getNotificationLink(notification))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-5 w-5" />
          {badge && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
              {badge}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0 sm:w-96">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isLoading}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </p>
          ) : (
                notifications.map((notification) => {
                  const jobName = getNotificationJobName(notification)
                  return (
                  <button
                    key={notification._id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full border-b px-4 py-3 text-left transition hover:bg-muted/60 ${
                      notification.isRead ? 'bg-background' : 'bg-primary/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-medium leading-snug">{notification.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex flex-wrap gap-x-2 text-[11px] text-muted-foreground">
                          {notification.driverName && <span>{notification.driverName}</span>}
                          {jobName && <span>{jobName}</span>}
                        </div>
                      </div>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </button>
                )})
          )}
        </div>

        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full text-sm"
            onClick={() => navigate('/notifications')}
          >
            See all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default NotificationBell
