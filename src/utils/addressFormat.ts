export type AddressParts = {
  houseName?: string | null
  houseNumber?: string | null
  address?: string | null
  city?: string | null
  zipCode?: string | null
}

/** Compose a single-line UK-style address for display/emails. */
export function formatFullAddress(parts: AddressParts): string {
  const head = [parts.houseName, parts.houseNumber].filter(Boolean).join(' ').trim()
  const street = (parts.address || '').trim()
  const line1 = [head, street].filter(Boolean).join(', ')
  const rest = [parts.city, parts.zipCode].filter(Boolean).join(', ')
  return [line1, rest].filter(Boolean).join(', ')
}

/** UK calendar day bounds in UTC for a given YYYY-MM-DD (or "today" in Europe/London). */
export function ukDayBounds(dateInput?: string): { from: Date; to: Date } {
  const tz = 'Europe/London'
  let ymd = dateInput
  if (!ymd || ymd === 'today') {
    ymd = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  }

  // Approximate UK day as local midnight → next midnight using offset at that date.
  // Parse as noon UTC then find London offset to avoid DST edge issues on the boundary.
  const [y, m, d] = ymd.split('-').map(Number)
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const londonParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(probe)
  const tzName = londonParts.find((p) => p.type === 'timeZoneName')?.value || 'GMT'
  const match = tzName.match(/GMT([+-]\d{1,2})(?::?(\d{2}))?/)
  let offsetMinutes = 0
  if (match) {
    const hours = Number(match[1])
    const mins = Number(match[2] || 0)
    offsetMinutes = hours * 60 + Math.sign(hours || 1) * mins
    if (hours === 0 && match[1].startsWith('-')) offsetMinutes = -mins
  }

  const from = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMinutes * 60_000)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)
  return { from, to }
}
