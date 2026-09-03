/** Resolve current driver id from auth user payload (supports id or _id). */
export function getDriverId(user: { id?: string; _id?: string } | null | undefined): string | undefined {
  if (!user) return undefined
  return user.id || user._id
}

function normalizeId(value: any): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value._id) return String(value._id)
  if (typeof value === 'object' && value.id) return String(value.id)
  return undefined
}

/**
 * Find the pending offer for the current driver.
 * Prefer explicit driverOffers.offeredPrice (admin payout),
 * fall back to offeredToDrivers + estimated price.
 */
export function getOfferForDriver(
  booking: any,
  user: { id?: string; _id?: string } | null | undefined
): { offeredPrice: number; status: string; offeredAt?: string | Date } | undefined {
  if (!booking) return undefined
  const currentDriverId = getDriverId(user)
  if (!currentDriverId) return undefined

  const pendingOffer = booking.driverOffers?.find((offer: any) => {
    const offerDriverId = normalizeId(offer.driver)
    return offerDriverId === currentDriverId && offer.status === 'pending'
  })

  if (pendingOffer) {
    return {
      offeredPrice: pendingOffer.offeredPrice,
      status: pendingOffer.status,
      offeredAt: pendingOffer.offeredAt,
    }
  }

  const isOfferedToDriver = booking.offeredToDrivers?.some((driverId: any) => {
    return normalizeId(driverId) === currentDriverId
  })

  if (isOfferedToDriver) {
    return {
      offeredPrice: booking.finalPrice || booking.estimatedPrice,
      status: 'pending',
    }
  }

  // If the job is on available-jobs (already filtered for this driver) but we
  // still couldn't match ids, surface the first pending offer as a last resort.
  const anyPending = booking.driverOffers?.find((offer: any) => offer.status === 'pending')
  if (anyPending && ['pending', 'offered'].includes(booking.status) && !booking.driver) {
    return {
      offeredPrice: anyPending.offeredPrice,
      status: anyPending.status,
      offeredAt: anyPending.offeredAt,
    }
  }

  return undefined
}
