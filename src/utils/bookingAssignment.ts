import mongoose from 'mongoose'
import { IBooking } from '../models/Booking.model'

export type BookingStatus =
  | 'pending'
  | 'offered'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'disputed'

export const OFFERABLE_STATUSES: BookingStatus[] = ['pending', 'offered']

export const UNASSIGNED_OFFER_STATUSES = ['pending', 'offered'] as const

export function hasAssignedDriver(booking: { driver?: mongoose.Types.ObjectId | null }): boolean {
  return !!booking.driver
}

export function isOfferable(booking: { status: string; driver?: mongoose.Types.ObjectId | null }): boolean {
  if (hasAssignedDriver(booking)) return false
  if (['completed', 'cancelled', 'disputed'].includes(booking.status)) return false
  return OFFERABLE_STATUSES.includes(booking.status as BookingStatus)
}

export function canDirectAssign(booking: { status: string }): boolean {
  return !['completed', 'cancelled'].includes(booking.status)
}

export function supersedePendingOffers(
  booking: IBooking,
  options?: { acceptedDriverId?: string; now?: Date }
): void {
  const now = options?.now ?? new Date()
  if (!booking.driverOffers?.length) return

  for (const offer of booking.driverOffers) {
    if (offer.status !== 'pending') continue

    if (options?.acceptedDriverId && offer.driver.toString() === options.acceptedDriverId) {
      offer.status = 'accepted'
      offer.respondedAt = now
      continue
    }

    offer.status = 'superseded'
    offer.respondedAt = now
  }
}

export function clearAssignmentAndOffers(booking: IBooking, now = new Date()): void {
  booking.driver = undefined
  booking.assignedAt = undefined
  booking.assignedBy = undefined
  booking.offeredToDrivers = []
  booking.offerExpiresAt = undefined

  if (booking.driverOffers?.length) {
    for (const offer of booking.driverOffers) {
      if (offer.status === 'pending') {
        offer.status = 'rejected'
        offer.respondedAt = now
      }
    }
  }
}

export function isOpenForDriverOffers(booking: {
  status: string
  driver?: mongoose.Types.ObjectId | null
}): boolean {
  return (
    UNASSIGNED_OFFER_STATUSES.includes(booking.status as (typeof UNASSIGNED_OFFER_STATUSES)[number]) &&
    !hasAssignedDriver(booking)
  )
}

export function syncBookingStatusAfterOfferChanges(booking: IBooking): void {
  if (hasAssignedDriver(booking)) return
  if (!['pending', 'offered'].includes(booking.status)) return

  const hasPendingOffers = booking.driverOffers?.some((offer) => offer.status === 'pending')
  const hasOfferedDrivers = (booking.offeredToDrivers?.length ?? 0) > 0

  if (hasPendingOffers || hasOfferedDrivers) {
    booking.status = 'offered'
    return
  }

  booking.status = 'pending'
  booking.offerExpiresAt = undefined
}

export function applyStatusSideEffects(
  booking: IBooking,
  newStatus: BookingStatus,
  oldStatus: BookingStatus
): { error?: string } {
  if (newStatus === oldStatus) return {}

  switch (newStatus) {
    case 'pending':
      clearAssignmentAndOffers(booking)
      break

    case 'offered':
      if (hasAssignedDriver(booking)) {
        booking.driver = undefined
        booking.assignedAt = undefined
        booking.assignedBy = undefined
      }
      break

    case 'confirmed':
      if (!hasAssignedDriver(booking)) {
        return { error: 'Cannot set status to confirmed without an assigned driver' }
      }
      supersedePendingOffers(booking)
      booking.offeredToDrivers = []
      booking.offerExpiresAt = undefined
      break

    case 'in-progress':
      if (!hasAssignedDriver(booking)) {
        return { error: 'Cannot set status to in-progress without an assigned driver' }
      }
      supersedePendingOffers(booking)
      booking.offeredToDrivers = []
      booking.offerExpiresAt = undefined
      break

    case 'completed':
      if (!hasAssignedDriver(booking)) {
        return { error: 'Cannot set status to completed without an assigned driver' }
      }
      supersedePendingOffers(booking)
      booking.offeredToDrivers = []
      booking.offerExpiresAt = undefined
      if (!booking.completedAt) {
        booking.completedAt = new Date()
      }
      break

    case 'cancelled':
      supersedePendingOffers(booking)
      booking.offeredToDrivers = []
      booking.offerExpiresAt = undefined
      break

    case 'disputed':
      if (!hasAssignedDriver(booking)) {
        return { error: 'Cannot set status to disputed without an assigned driver' }
      }
      booking.isDisputed = true
      supersedePendingOffers(booking)
      booking.offeredToDrivers = []
      booking.offerExpiresAt = undefined
      break

    default:
      return { error: 'Invalid booking status' }
  }

  return {}
}
 