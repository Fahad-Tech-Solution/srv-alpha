import mongoose from 'mongoose'
import { IBooking } from '../models/Booking.model'

export type BookingStatus =
  | 'pending'
  | 'offered'
  | 'confirmed'
  | 'in-progress'
  | 'job-started'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'survey'

export const OFFERABLE_STATUSES: BookingStatus[] = ['pending', 'offered']

export const UNASSIGNED_OFFER_STATUSES = ['pending', 'offered'] as const

export function hasAssignedDriver(booking: { driver?: mongoose.Types.ObjectId | null }): boolean {
  return !!booking.driver
}

export function isOfferable(booking: { status: string; driver?: mongoose.Types.ObjectId | null }): boolean {
  if (hasAssignedDriver(booking)) return false
  if (['completed', 'cancelled', 'disputed', 'survey'].includes(booking.status)) return false
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

/** Take booking back from an assigned driver so it can be re-offered. */
export function reclaimBookingFromDriver(booking: IBooking, now = new Date()): void {
  if (booking.driverOffers?.length) {
    for (const offer of booking.driverOffers) {
      if (offer.status === 'pending') {
        offer.status = 'rejected'
        offer.respondedAt = now
      } else if (offer.status === 'accepted') {
        offer.status = 'superseded'
        offer.respondedAt = now
      }
    }
  }

  booking.driver = undefined
  booking.assignedAt = undefined
  booking.assignedBy = undefined
  booking.offeredToDrivers = []
  booking.offerExpiresAt = undefined
  booking.status = 'pending'
}

export function canReclaimForReoffer(booking: {
  status: string
  driver?: mongoose.Types.ObjectId | null
}): boolean {
  if (!hasAssignedDriver(booking)) return false
  return ['confirmed', 'in-progress', 'job-started', 'offered'].includes(booking.status)
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
    case 'survey':
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
    case 'job-started':
      if (!hasAssignedDriver(booking)) {
        return { error: `Cannot set status to ${newStatus} without an assigned driver` }
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

/**
 * Redact customer contact details and booking list prices for a driver who only
 * has a pending offer (not yet assigned). Keeps job logistics + their offer price.
 */
export function sanitizeBookingForPendingOffer(
  booking: IBooking | Record<string, any>,
  driverId: string
): Record<string, unknown> {
  const obj =
    typeof (booking as any).toObject === 'function'
      ? (booking as any).toObject({ virtuals: true })
      : { ...(booking as any) }

  const normalizeId = (value: any): string | undefined => {
    if (!value) return undefined
    if (typeof value === 'string') return value
    if (typeof value === 'object' && value._id) return String(value._id)
    if (typeof value === 'object' && value.id) return String(value.id)
    return undefined
  }

  const myOffers = (obj.driverOffers || []).filter(
    (offer: any) => normalizeId(offer.driver) === String(driverId)
  )

  let offeredPrice: number | undefined = myOffers.find(
    (offer: any) => offer.status === 'pending'
  )?.offeredPrice

  if (offeredPrice == null && myOffers.length) {
    offeredPrice = myOffers[0].offeredPrice
  }

  if (offeredPrice == null) {
    const offeredToDriver = (obj.offeredToDrivers || []).some(
      (id: any) => normalizeId(id) === String(driverId)
    )
    if (offeredToDriver) {
      offeredPrice = obj.finalPrice ?? obj.estimatedPrice
    }
  }

  delete obj.contactPhone
  delete obj.contactEmail
  delete obj.estimatedPrice
  delete obj.finalPrice
  delete obj.amountPaid
  delete obj.paymentMethod
  delete obj.paymentReference
  delete obj.additionalWorkPayment
  delete obj.additionalWorkDescription
  delete obj.notes
  delete obj.pickupPhotos
  delete obj.dropoffPhotos
  delete obj.completionPictures
  delete obj.driverNotes
  delete obj.disputeReason

  if (obj.customer && typeof obj.customer === 'object') {
    obj.customer = {
      _id: obj.customer._id,
      name: obj.customer.name || 'Customer',
    }
  } else {
    obj.customer = { name: 'Customer' }
  }

  obj.driverOffers = myOffers.map((offer: any) => ({
    driver: offer.driver && typeof offer.driver === 'object'
      ? { _id: offer.driver._id, name: offer.driver.name }
      : offer.driver,
    offeredPrice: offer.offeredPrice ?? offeredPrice,
    status: offer.status,
    offeredAt: offer.offeredAt,
    respondedAt: offer.respondedAt,
  }))

  obj.offeredToDrivers = (obj.offeredToDrivers || []).filter(
    (id: any) => normalizeId(id) === String(driverId)
  )

  if (offeredPrice != null && !obj.driverOffers.some((o: any) => o.status === 'pending')) {
    obj.driverOffers.push({
      driver: driverId,
      offeredPrice,
      status: 'pending',
    })
  }

  return obj
}
 