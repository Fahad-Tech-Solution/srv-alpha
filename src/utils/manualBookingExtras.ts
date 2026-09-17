import {
  AccessType,
  formatAccessFromAdmin,
} from './stairsAccess'

export type VanSizeKey = 'small' | 'medium' | 'large' | 'luton'

export type VanCounts = {
  small: number
  medium: number
  large: number
  luton: number
}

export type BookingStopInput = {
  address: string
  city: string
  zipCode: string
  access?: AccessType
  stairsCount?: number
}

export type ServiceExtrasInput = {
  dismantleItems?: number
  assemblyItems?: number
  packingBoxes?: number
}

export const DISMANTLE_PRICE_PER_ITEM = 40
export const ASSEMBLY_PRICE_PER_ITEM = 50
export const PACKING_PRICE_PER_5_BOXES = 65

export function normalizeVanCounts(input?: Partial<VanCounts> | null): VanCounts {
  return {
    small: Math.max(0, Number(input?.small) || 0),
    medium: Math.max(0, Number(input?.medium) || 0),
    large: Math.max(0, Number(input?.large) || 0),
    luton: Math.max(0, Number(input?.luton) || 0),
  }
}

export function totalVans(counts: VanCounts): number {
  return counts.small + counts.medium + counts.large + counts.luton
}

export function deriveVehicleTypeFromVanCounts(
  counts: VanCounts
): 'small' | 'medium' | 'large' | 'luton' | 'multi-van' {
  const total = totalVans(counts)
  if (total <= 0) return 'multi-van'

  const sizesWithCount = (Object.keys(counts) as VanSizeKey[]).filter((key) => counts[key] > 0)
  if (sizesWithCount.length === 1 && counts[sizesWithCount[0]] === 1) {
    return sizesWithCount[0]
  }
  return 'multi-van'
}

export function formatVanCountsLabel(counts?: Partial<VanCounts> | null): string {
  const normalized = normalizeVanCounts(counts)
  const parts: string[] = []
  if (normalized.small) parts.push(`${normalized.small}× Small`)
  if (normalized.medium) parts.push(`${normalized.medium}× Medium`)
  if (normalized.large) parts.push(`${normalized.large}× Large`)
  if (normalized.luton) parts.push(`${normalized.luton}× Luton`)
  return parts.length ? parts.join(', ') : '—'
}

export function normalizeServiceExtras(input?: ServiceExtrasInput | null) {
  const packingBoxes = Math.max(0, Number(input?.packingBoxes) || 0)
  return {
    dismantleItems: Math.max(0, Math.floor(Number(input?.dismantleItems) || 0)),
    assemblyItems: Math.max(0, Math.floor(Number(input?.assemblyItems) || 0)),
    packingBoxes,
  }
}

export function suggestedExtrasTotal(extras: ReturnType<typeof normalizeServiceExtras>): number {
  return (
    extras.dismantleItems * DISMANTLE_PRICE_PER_ITEM +
    extras.assemblyItems * ASSEMBLY_PRICE_PER_ITEM +
    (extras.packingBoxes / 5) * PACKING_PRICE_PER_5_BOXES
  )
}

export function formatServiceExtrasLabel(
  extras?: ServiceExtrasInput | null
): string | undefined {
  const normalized = normalizeServiceExtras(extras)
  const parts: string[] = []
  if (normalized.dismantleItems) {
    parts.push(
      `Dismantle ×${normalized.dismantleItems} (+£${normalized.dismantleItems * DISMANTLE_PRICE_PER_ITEM})`
    )
  }
  if (normalized.assemblyItems) {
    parts.push(
      `Assembly ×${normalized.assemblyItems} (+£${normalized.assemblyItems * ASSEMBLY_PRICE_PER_ITEM})`
    )
  }
  if (normalized.packingBoxes) {
    parts.push(
      `Packing ${normalized.packingBoxes} boxes (+£${(normalized.packingBoxes / 5) * PACKING_PRICE_PER_5_BOXES})`
    )
  }
  return parts.length ? parts.join('; ') : undefined
}

export function mapStopsForStorage(stops?: BookingStopInput[]) {
  if (!stops?.length) return []
  return stops.slice(0, 3).map((stop) => ({
    address: String(stop.address || '').trim(),
    city: String(stop.city || '').trim(),
    zipCode: String(stop.zipCode || '').trim(),
    access: stop.access,
    stairsCount: stop.access === 'stairs' ? stop.stairsCount : undefined,
    accessLabel: formatAccessFromAdmin(stop.access, stop.stairsCount),
  }))
}

export function validateStops(stops?: BookingStopInput[]): string | null {
  if (!stops?.length) return null
  if (stops.length > 3) return 'A maximum of 3 intermediate stops is allowed'
  for (let i = 0; i < stops.length; i++) {
    const stop = stops[i]
    if (!stop.address?.trim() || !stop.city?.trim() || !stop.zipCode?.trim()) {
      return `Stop ${i + 1} requires address, city, and postcode`
    }
    if (stop.access === 'stairs' && (!stop.stairsCount || stop.stairsCount < 1)) {
      return `Stop ${i + 1} stairs count is required when access is stairs`
    }
  }
  return null
}
