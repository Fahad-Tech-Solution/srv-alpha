import crypto from 'crypto'
import { NextFunction, Request, Response } from 'express'

type RateLimitEntry = {
  windowStart: number
  count: number
}

const nonceStore = new Map<string, number>()
const rateLimitStore = new Map<string, RateLimitEntry>()

const NONCE_TTL_MS = 5 * 60 * 1000
const MAX_TIMESTAMP_AGE_MS = 5 * 60 * 1000
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 60

function pruneExpiredNonces(now: number): void {
  for (const [nonce, expiresAt] of nonceStore.entries()) {
    if (expiresAt <= now) {
      nonceStore.delete(nonce)
    }
  }
}

function integrationError(
  res: Response,
  status: number,
  code: string,
  message: string
): void {
  res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  })
}

function safeCompare(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected, 'utf8')
  const providedBuffer = Buffer.from(provided, 'utf8')

  if (expectedBuffer.length !== providedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

export function integrationRateLimiter(req: Request, res: Response, next: NextFunction): void {
  const integrationKey = req.header('X-Integration-Key')

  if (!integrationKey) {
    integrationError(res, 401, 'MISSING_INTEGRATION_KEY', 'Missing X-Integration-Key header')
    return
  }

  const now = Date.now()
  const entry = rateLimitStore.get(integrationKey)

  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(integrationKey, { windowStart: now, count: 1 })
    next()
    return
  }

  entry.count += 1
  if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
    integrationError(res, 429, 'RATE_LIMITED', 'Integration rate limit exceeded')
    return
  }

  next()
}

export function authenticateIntegrationRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const integrationKey = req.header('X-Integration-Key')
  const timestamp = req.header('X-Integration-Timestamp')
  const nonce = req.header('X-Integration-Nonce')
  const signature = req.header('X-Integration-Signature')

  if (!integrationKey) {
    integrationError(res, 401, 'MISSING_INTEGRATION_KEY', 'Missing X-Integration-Key header')
    return
  }

  const expectedKey = process.env.INTEGRATION_KEY
  if (!expectedKey || integrationKey !== expectedKey) {
    integrationError(res, 401, 'INVALID_INTEGRATION_KEY', 'Invalid integration key')
    return
  }

  if (!timestamp) {
    integrationError(res, 401, 'MISSING_TIMESTAMP', 'Missing X-Integration-Timestamp header')
    return
  }

  if (!nonce) {
    integrationError(res, 401, 'MISSING_NONCE', 'Missing X-Integration-Nonce header')
    return
  }

  if (!signature) {
    integrationError(res, 401, 'MISSING_SIGNATURE', 'Missing X-Integration-Signature header')
    return
  }

  const parsedTimestamp = Number(timestamp)
  if (!Number.isFinite(parsedTimestamp)) {
    integrationError(res, 401, 'INVALID_TIMESTAMP', 'Timestamp must be a unix epoch in milliseconds')
    return
  }

  const now = Date.now()
  if (Math.abs(now - parsedTimestamp) > MAX_TIMESTAMP_AGE_MS) {
    integrationError(res, 401, 'STALE_TIMESTAMP', 'Timestamp is outside the allowed 5 minute window')
    return
  }

  pruneExpiredNonces(now)
  if (nonceStore.has(nonce)) {
    integrationError(res, 409, 'REPLAYED_NONCE', 'Nonce has already been used')
    return
  }

  const rawBody = req.rawBody
  if (!rawBody) {
    integrationError(res, 400, 'MISSING_RAW_BODY', 'Raw request body is required for signature verification')
    return
  }

  const secret = process.env.INTEGRATION_SECRET
  if (!secret) {
    integrationError(res, 500, 'INTEGRATION_AUTH_MISCONFIGURED', 'Integration secret is not configured')
    return
  }

  const payloadToSign = `${timestamp}.${nonce}.${rawBody}`
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex')

  if (!safeCompare(expectedSignature, signature)) {
    integrationError(res, 401, 'INVALID_SIGNATURE', 'Signature verification failed')
    return
  }

  nonceStore.set(nonce, now + NONCE_TTL_MS)
  next()
}
