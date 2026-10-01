import crypto from 'crypto'
import { Booking } from '../models/Booking.model'

const SHORT_CODE_RE = /^[A-Z0-9]{6,8}$/

/** 6-char uppercase alphanumeric reference, e.g. 392C2D */
export function generateShortOrderCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase()
}

export function isShortOrderCode(code: string | undefined | null): boolean {
  if (!code) return false
  return SHORT_CODE_RE.test(String(code).trim().toUpperCase())
}

export async function generateUniqueShortOrderCode(maxAttempts = 8): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const orderCode = generateShortOrderCode()
    const existing = await Booking.findOne({ orderCode }).select('_id').lean()
    if (!existing) return orderCode
  }
  throw Object.assign(new Error('Failed to generate unique order code'), { statusCode: 500 })
}

/**
 * Resolve orderCode for site imports:
 * - short codes (6–8 alnum) used as-is
 * - otherwise generate a short code and keep the original as externalOrderCode
 */
export async function resolveImportOrderCode(
  incoming: string
): Promise<{ orderCode: string; externalOrderCode?: string }> {
  const trimmed = String(incoming || '').trim()
  if (isShortOrderCode(trimmed)) {
    return { orderCode: trimmed.toUpperCase() }
  }
  const orderCode = await generateUniqueShortOrderCode()
  return {
    orderCode,
    externalOrderCode: trimmed || undefined,
  }
}
