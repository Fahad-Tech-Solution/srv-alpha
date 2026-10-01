import { IBooking } from '../models/Booking.model'
import {
  deriveVehicleTypeFromVanCounts,
  formatVanCountsLabel,
  normalizeServiceExtras,
  normalizeVanCounts,
  totalVans,
  type VanCounts,
  type VanSizeKey,
} from './manualBookingExtras'
import { normalizeStairsForStorage, parseStairsAccess } from './stairsAccess'

const VAN_SIZES: VanSizeKey[] = ['small', 'medium', 'large', 'luton']

const LEGACY_VEHICLE_TO_SIZE: Record<string, VanSizeKey> = {
  'small-van': 'small',
  'medium-van': 'medium',
  'large-van': 'large',
  truck: 'luton',
}

const VEHICLE_NAMES: Record<VanSizeKey, string> = {
  small: 'Small Van',
  medium: 'Medium Van',
  large: 'Large Van',
  luton: 'Luton Van',
}

export type QuotePaidStop = {
  postcode?: string
  postal_code?: string
  post_code?: string
  zipCode?: string
  zip?: string
  street?: string
  address?: string
  city?: string
  stairs?: string | number
  access?: 'lift' | 'stairs' | 'ground'
  stairsCount?: number
  accessLabel?: string
  houseNumber?: string
  houseName?: string
}

export type QuotePaidBookingInput = {
  pickupHouseNumber?: string
  pickupHouseName?: string
  pickupStreet?: string
  pickupAddress: string
  pickupCity: string
  pickupZipCode: string
  pickupDate: string
  pickupTime: string
  deliveryHouseNumber?: string
  deliveryHouseName?: string
  deliveryStreet?: string
  deliveryAddress: string
  deliveryCity: string
  deliveryZipCode: string
  serviceType: 'local' | 'long-distance' | 'interstate'
  vehicleType: 'small-van' | 'medium-van' | 'large-van' | 'truck'
  vehicleName?: string
  vanSize?: string
  vans?: Partial<VanCounts>
  vansLabel?: string
  estimatedPrice: number
  amountPaid: number
  discountApplied?: boolean
  discountCode?: string
  discountPercent?: number
  miles?: number
  hoursBooked?: number
  hours?: number
  durationRequired?: string
  vanTime?: string
  collectionStairs?: string
  deliveryStairs?: string
  drivers?: number
  additionalHelpers?: number
  totalCrew?: number
  helpersRateTier?: number
  helpersLabel?: string
  manRequired?: string
  specialInstructions?: string
  packingBoxes?: string | number
  dismantleQty?: string | number
  assembleQty?: string | number
  stops?: QuotePaidStop[]
  items?: { name: string; quantity: number; description?: string }[]
}

function isVanSize(value: string | undefined): value is VanSizeKey {
  return !!value && (VAN_SIZES as string[]).includes(value)
}

function finiteInt(value: unknown): number | undefined {
  if (value == null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.floor(n))
}

function hasOwnCount(value: unknown): boolean {
  return value != null && value !== ''
}

/** Structured street wins over the combined address string. */
function resolveStreetLine(street?: string, fullAddress?: string): {
  street?: string
  line: string
} {
  const structured = street?.trim()
  const combined = fullAddress?.trim() || ''
  if (structured) return { street: structured, line: structured }
  return { street: undefined, line: combined }
}

function resolveHours(booking: QuotePaidBookingInput): {
  hours?: number
  durationRequired?: string
} {
  let hours: number | undefined
  for (const candidate of [booking.hoursBooked, booking.hours]) {
    if (candidate == null || (candidate as unknown) === '') continue
    const parsed = Number(candidate)
    if (Number.isFinite(parsed) && parsed >= 1) {
      hours = parsed
      break
    }
  }

  const durationSource =
    booking.durationRequired != null && String(booking.durationRequired).trim() !== ''
      ? String(booking.durationRequired).trim()
      : booking.vanTime != null && String(booking.vanTime).trim() !== ''
        ? String(booking.vanTime).trim()
        : undefined

  if (hours == null && durationSource) {
    const parsed = Number(durationSource.replace(/[^\d.]/g, ''))
    if (Number.isFinite(parsed) && parsed >= 1) hours = parsed
  }

  return {
    hours,
    durationRequired: durationSource ?? (hours != null ? String(hours) : undefined),
  }
}

/**
 * Van counts are the source of truth when present.
 * `vehicleType: "truck"` and `vanSize: "luton"` both mean Luton Van, never Large.
 * A positive `vans.luton` stays Luton even if other fields say large.
 */
export function resolveQuoteVehicle(booking: QuotePaidBookingInput): {
  vehicleType: IBooking['vehicleType']
  vanSize?: VanSizeKey
  vanCounts?: VanCounts
  vans?: number
  vehicleName?: string
  vansLabel?: string
} {
  const requestedSize = isVanSize(booking.vanSize?.trim().toLowerCase())
    ? (booking.vanSize!.trim().toLowerCase() as VanSizeKey)
    : undefined
  const legacySize = LEGACY_VEHICLE_TO_SIZE[booking.vehicleType]
  const name = booking.vehicleName?.trim()
  const nameSaysLuton = !!name && /luton/i.test(name)

  const signaledLuton =
    requestedSize === 'luton' || legacySize === 'luton' || nameSaysLuton

  const hasVansObject = booking.vans != null && typeof booking.vans === 'object'
  let counts = hasVansObject ? normalizeVanCounts(booking.vans) : normalizeVanCounts(null)

  // Qty was filed under large, but the booking is explicitly a Luton.
  if (
    hasVansObject &&
    counts.luton === 0 &&
    counts.large > 0 &&
    signaledLuton &&
    counts.small === 0 &&
    counts.medium === 0
  ) {
    counts = { ...counts, luton: counts.large, large: 0 }
  }

  if (!hasVansObject || totalVans(counts) === 0) {
    const size = requestedSize || legacySize
    if (size) {
      counts = { small: 0, medium: 0, large: 0, luton: 0, [size]: 1 }
    }
  }

  const total = totalVans(counts)
  const sizesWithCount = VAN_SIZES.filter((key) => counts[key] > 0)
  let vanSize: VanSizeKey | undefined
  if (sizesWithCount.length === 1) vanSize = sizesWithCount[0]
  else if (requestedSize && counts[requestedSize] > 0) vanSize = requestedSize

  if (counts.luton > 0 && counts.large === 0 && sizesWithCount.length === 1) {
    vanSize = 'luton'
  }

  const vehicleType: IBooking['vehicleType'] =
    total > 0 ? deriveVehicleTypeFromVanCounts(counts) : legacySize || booking.vehicleType

  let vehicleName: string | undefined
  if (vanSize === 'luton' || (counts.luton > 0 && sizesWithCount.length === 1)) {
    vehicleName = name && /luton/i.test(name) ? name : VEHICLE_NAMES.luton
  } else if (sizesWithCount.length === 1 && vanSize) {
    vehicleName = name || VEHICLE_NAMES[vanSize]
  } else if (name) {
    vehicleName = name
  }

  const formattedCounts = total > 0 ? formatVanCountsLabel(counts) : undefined
  const vansLabel =
    booking.vansLabel?.trim() ||
    (formattedCounts && formattedCounts !== '—' ? formattedCounts : undefined)

  return {
    vehicleType,
    vanSize,
    vanCounts: total > 0 ? counts : undefined,
    vans: total > 0 ? total : undefined,
    vehicleName,
    vansLabel,
  }
}

/**
 * Crew size is drivers + additional helpers.
 * `manRequired` and `helpersRateTier` are the pricing tier (1–3), not headcount.
 */
export function resolveQuoteCrew(booking: QuotePaidBookingInput, vanTotal?: number): {
  drivers?: number
  helpers?: number
  men?: number
  helpersRateTier?: number
  helpersLabel?: string
  manRequired?: string
} {
  const hasDrivers = hasOwnCount(booking.drivers)
  const hasAdditional = hasOwnCount(booking.additionalHelpers)
  const hasTotal = hasOwnCount(booking.totalCrew)
  const hasStructuredCrew = hasDrivers || hasAdditional || hasTotal

  let drivers: number | undefined
  let helpers: number | undefined
  let men: number | undefined

  if (hasStructuredCrew) {
    if (hasDrivers) drivers = finiteInt(booking.drivers) ?? 0
    else if (vanTotal != null && vanTotal > 0) drivers = vanTotal
    else drivers = 0

    if (hasAdditional) helpers = finiteInt(booking.additionalHelpers) ?? 0
    else if (hasTotal) helpers = Math.max(0, (finiteInt(booking.totalCrew) ?? 0) - drivers)
    else helpers = 0

    if (hasTotal) men = finiteInt(booking.totalCrew) ?? drivers + helpers
    else men = drivers + helpers
  }

  let helpersRateTier = finiteInt(booking.helpersRateTier)
  if (helpersRateTier != null && (helpersRateTier < 1 || helpersRateTier > 3)) {
    helpersRateTier = undefined
  }
  if (helpersRateTier == null && booking.manRequired != null) {
    const tier = String(booking.manRequired).trim()
    if (/^[123]$/.test(tier)) helpersRateTier = Number(tier)
  }

  return {
    drivers,
    helpers,
    men: men != null && men >= 1 ? men : undefined,
    helpersRateTier,
    helpersLabel: booking.helpersLabel?.trim() || undefined,
    manRequired:
      booking.manRequired != null && String(booking.manRequired).trim() !== ''
        ? String(booking.manRequired).trim()
        : undefined,
  }
}

function mapQuoteStops(stops?: QuotePaidStop[]): NonNullable<IBooking['stops']> {
  if (!Array.isArray(stops) || stops.length === 0) return []

  return stops.slice(0, 3).flatMap((stop) => {
    if (!stop || typeof stop !== 'object') return []

    const zipCode = String(
      stop.postcode || stop.postal_code || stop.post_code || stop.zipCode || stop.zip || ''
    ).trim()
    const street = String(stop.street || '').trim()
    const addressRaw = String(stop.address || '').trim()
    const city = String(stop.city || '').trim()
    const houseNumber = String(stop.houseNumber || '').trim() || undefined
    const houseName = String(stop.houseName || '').trim() || undefined

    // Prefer structured street; fall back to address / postcode so partial WP stops still persist.
    const address = street || addressRaw || zipCode
    if (!address && !city && !zipCode) return []

    if (stop.access) {
      const stairsCount =
        stop.access === 'stairs'
          ? Math.max(1, Math.min(6, finiteInt(stop.stairsCount) || finiteInt(stop.stairs) || 1))
          : undefined
      return [
        {
          houseNumber,
          houseName,
          address: address || city || 'Stop',
          city: city || '',
          zipCode,
          access: stop.access,
          stairsCount,
          accessLabel:
            stop.accessLabel?.trim() ||
            normalizeStairsForStorage(stop.stairs ?? stop.accessLabel),
        },
      ]
    }

    const parsed = parseStairsAccess(stop.stairs)
    return [
      {
        houseNumber,
        houseName,
        address: address || city || 'Stop',
        city: city || '',
        zipCode,
        access: parsed.access,
        stairsCount: parsed.access === 'stairs' ? parsed.stairsCount : undefined,
        accessLabel: normalizeStairsForStorage(stop.stairs),
      },
    ]
  })
}

function mapServiceExtras(booking: QuotePaidBookingInput) {
  const hasExtras =
    hasOwnCount(booking.dismantleQty) ||
    hasOwnCount(booking.assembleQty) ||
    hasOwnCount(booking.packingBoxes)
  if (!hasExtras) return undefined
  return normalizeServiceExtras({
    dismantleItems: finiteInt(booking.dismantleQty) ?? 0,
    assemblyItems: finiteInt(booking.assembleQty) ?? 0,
    packingBoxes: finiteInt(booking.packingBoxes) ?? 0,
  })
}

/**
 * Discount metadata only — WordPress already validated the code and applied it to amountPaid.
 * Missing fields default to no discount for older plugin payloads.
 */
export function resolveQuoteDiscount(booking: QuotePaidBookingInput): {
  discountApplied: boolean
  discountCode: string
  discountPercent: number
} {
  const discountApplied = booking.discountApplied === true
  const rawCode = String(booking.discountCode ?? '').trim().toUpperCase()
  const percent = finiteInt(booking.discountPercent) ?? 0

  if (!discountApplied) {
    return { discountApplied: false, discountCode: '', discountPercent: 0 }
  }

  return {
    discountApplied: true,
    discountCode: rawCode,
    discountPercent: Math.max(0, Math.min(100, percent)),
  }
}

/** Map a quote-calculator booking object onto stored booking fields. */
export function mapQuotePaidBooking(booking: QuotePaidBookingInput): Partial<IBooking> {
  const pickup = resolveStreetLine(booking.pickupStreet, booking.pickupAddress)
  const delivery = resolveStreetLine(booking.deliveryStreet, booking.deliveryAddress)
  const vehicle = resolveQuoteVehicle(booking)
  const crew = resolveQuoteCrew(booking, vehicle.vans)
  const duration = resolveHours(booking)
  const stops = mapQuoteStops(booking.stops)
  const serviceExtras = mapServiceExtras(booking)
  const discount = resolveQuoteDiscount(booking)

  return {
    pickupHouseNumber: booking.pickupHouseNumber?.trim() || undefined,
    pickupHouseName: booking.pickupHouseName?.trim() || undefined,
    pickupStreet: pickup.street,
    pickupAddress: pickup.line,
    pickupCity: booking.pickupCity,
    pickupZipCode: booking.pickupZipCode,
    pickupDate: new Date(booking.pickupDate),
    pickupTime: booking.pickupTime,
    deliveryHouseNumber: booking.deliveryHouseNumber?.trim() || undefined,
    deliveryHouseName: booking.deliveryHouseName?.trim() || undefined,
    deliveryStreet: delivery.street,
    deliveryAddress: delivery.line,
    deliveryCity: booking.deliveryCity,
    deliveryZipCode: booking.deliveryZipCode,
    serviceType: booking.serviceType,
    vehicleType: vehicle.vehicleType,
    vanSize: vehicle.vanSize,
    vanCounts: vehicle.vanCounts,
    vans: vehicle.vans,
    vehicleName: vehicle.vehicleName,
    vansLabel: vehicle.vansLabel,
    miles: booking.miles,
    durationRequired: duration.durationRequired,
    hours: duration.hours,
    collectionStairs: normalizeStairsForStorage(booking.collectionStairs),
    deliveryStairs: normalizeStairsForStorage(booking.deliveryStairs),
    drivers: crew.drivers,
    helpers: crew.helpers,
    men: crew.men,
    helpersRateTier: crew.helpersRateTier,
    helpersLabel: crew.helpersLabel,
    manRequired: crew.manRequired,
    discountApplied: discount.discountApplied,
    discountCode: discount.discountCode,
    discountPercent: discount.discountPercent,
    specialInstructions: booking.specialInstructions,
    stops,
    serviceExtras,
    items: booking.items || [],
  }
}
