/**
 * Stairs / access values may arrive as:
 * - Calculator codes: "0" | "1" | "2"…"6" (0 = ground, 1 = lift or 1 flight, 2–6 = flights)
 * - Admin labels: "Ground floor" | "Lift" | "1 flight of stairs" | "N flights of stairs"
 */

export type AccessType = 'lift' | 'stairs' | 'ground'

export function formatAccessFromAdmin(
  access?: AccessType,
  stairsCount?: number
): string | undefined {
  if (!access) return undefined
  if (access === 'lift') return 'Lift'
  if (access === 'ground') return 'Ground floor'
  if (access === 'stairs') {
    const count = Math.max(1, Math.min(6, stairsCount ?? 1))
    return count === 1 ? '1 flight of stairs' : `${count} flights of stairs`
  }
  return undefined
}

/** Normalize any stored stairs/access value to a consistent display label. */
export function formatStairsDisplay(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '—'

  const raw = String(value).trim()
  if (!raw) return '—'

  const lower = raw.toLowerCase()

  if (
    lower === '0' ||
    lower === 'ground' ||
    lower === 'ground floor' ||
    lower.includes('ground floor') ||
    lower.includes('no flight')
  ) {
    return 'Ground floor'
  }

  if (lower === 'lift' || lower === 'working lift' || lower === 'elevator') {
    return 'Lift'
  }

  // Calculator code "1" = lift OR 1 flight (same price); keep a combined label
  if (lower === '1') {
    return '1 flight / Lift'
  }

  if (lower === '1 flight / lift' || lower === '1 flight/lift') {
    return '1 flight / Lift'
  }

  const numeric = Number(raw)
  if (Number.isInteger(numeric) && numeric >= 2 && numeric <= 50) {
    return numeric === 1 ? '1 flight of stairs' : `${numeric} flights of stairs`
  }

  const flightMatch = lower.match(/(\d+)\s*flights?\s*(of\s*)?stairs?/)
  if (flightMatch) {
    const count = parseInt(flightMatch[1], 10)
    if (count === 1) return '1 flight of stairs'
    return `${count} flights of stairs`
  }

  if (lower.includes('stair')) {
    const countMatch = raw.match(/(\d+)/)
    if (countMatch) {
      const count = parseInt(countMatch[1], 10)
      return count === 1 ? '1 flight of stairs' : `${count} flights of stairs`
    }
    return '1 flight of stairs'
  }

  if (lower.includes('lift')) return 'Lift'

  return raw
}

/** Persist calculator / free-text stairs into a consistent label for the DB. */
export function normalizeStairsForStorage(value?: string | number | null): string | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const formatted = formatStairsDisplay(value)
  return formatted === '—' ? undefined : formatted
}

export function parseStairsAccess(value?: string | number | null): {
  access: AccessType
  stairsCount: number
} {
  if (value === undefined || value === null || value === '') {
    return { access: 'ground', stairsCount: 1 }
  }

  const raw = String(value).trim()
  const lower = raw.toLowerCase()
  const formatted = formatStairsDisplay(raw)

  if (formatted === 'Ground floor') return { access: 'ground', stairsCount: 1 }
  if (formatted === 'Lift') return { access: 'lift', stairsCount: 1 }

  // Combined calculator "1" → treat as stairs (1) in the edit form
  if (formatted === '1 flight / Lift') return { access: 'stairs', stairsCount: 1 }

  const flightMatch = formatted.match(/(\d+)/)
  if (flightMatch) {
    return {
      access: 'stairs',
      stairsCount: Math.max(1, Math.min(6, parseInt(flightMatch[1], 10))),
    }
  }

  if (lower.includes('lift')) return { access: 'lift', stairsCount: 1 }
  return { access: 'ground', stairsCount: 1 }
}
