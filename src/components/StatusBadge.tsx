import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/** Soft, easy-on-the-eyes status colors used across the app */
export const BOOKING_STATUS_STYLES: Record<string, string> = {
  pending:
    'border-slate-200 bg-slate-100 text-slate-700',
  offered:
    'border-sky-200 bg-sky-50 text-sky-800',
  confirmed:
    'border-teal-200 bg-teal-50 text-teal-800',
  'in-progress':
    'border-amber-200 bg-amber-50 text-amber-900',
  completed:
    'border-emerald-200 bg-emerald-50 text-emerald-800',
  cancelled:
    'border-stone-200 bg-stone-100 text-stone-600',
  disputed:
    'border-rose-200 bg-rose-50 text-rose-800',
}

export const OFFER_STATUS_STYLES: Record<string, string> = {
  pending: 'border-sky-200 bg-sky-50 text-sky-800',
  accepted: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  rejected: 'border-rose-200 bg-rose-50 text-rose-800',
  superseded: 'border-stone-200 bg-stone-100 text-stone-600',
  expired: 'border-amber-200 bg-amber-50 text-amber-900',
}

export function formatStatusLabel(status: string): string {
  if (!status) return ''
  return status
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function getBookingStatusClass(status: string): string {
  return BOOKING_STATUS_STYLES[status] || BOOKING_STATUS_STYLES.pending
}

export function getOfferStatusClass(status: string): string {
  return OFFER_STATUS_STYLES[status] || OFFER_STATUS_STYLES.pending
}

type StatusBadgeProps = {
  status: string
  kind?: 'booking' | 'offer'
  className?: string
  label?: string
}

export function StatusBadge({
  status,
  kind = 'booking',
  className,
  label,
}: StatusBadgeProps) {
  const colorClass =
    kind === 'offer' ? getOfferStatusClass(status) : getBookingStatusClass(status)

  return (
    <Badge
      variant="outline"
      className={cn('font-medium capitalize', colorClass, className)}
    >
      {label || formatStatusLabel(status)}
    </Badge>
  )
}
