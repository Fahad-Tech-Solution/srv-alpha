import crypto from 'crypto'
import request from 'supertest'
import { describe, expect, it, beforeEach } from 'vitest'
import { createTestApp } from './createTestApp'
import { User } from '../models/User.model'
import { Booking } from '../models/Booking.model'

function buildPayload() {
  return {
    sourceSystem: 'checkout-plugin',
    eventType: 'booking.paid',
    eventVersion: 'v1',
    idempotencyKey: 'idem-001',
    orderCode: 'ORD-001',
    paymentReference: 'PAY-001',
    paymentProvider: 'stripe',
    paidAt: new Date().toISOString(),
    customer: {
      email: 'customer@test.com',
      name: 'Test Customer',
      phone: '07000000000',
    },
    booking: {
      pickupAddress: '1 Pickup Street',
      pickupCity: 'London',
      pickupZipCode: 'SW1A 1AA',
      pickupDate: new Date(Date.now() + 86400000).toISOString(),
      pickupTime: '10:00',
      deliveryAddress: '2 Delivery Road',
      deliveryCity: 'Manchester',
      deliveryZipCode: 'M1 1AA',
      serviceType: 'local',
      vehicleType: 'small-van',
      estimatedPrice: 120,
      amountPaid: 120,
      items: [{ name: 'Box', quantity: 2 }],
    },
  }
}

function signedHeaders(rawBody: string, nonce = 'nonce-1') {
  const timestamp = Date.now().toString()
  const secret = process.env.INTEGRATION_SECRET as string
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${nonce}.${rawBody}`)
    .digest('hex')

  return {
    'X-Integration-Key': process.env.INTEGRATION_KEY as string,
    'X-Integration-Timestamp': timestamp,
    'X-Integration-Nonce': nonce,
    'X-Integration-Signature': signature,
  }
}

describe('internal booking paid upsert', () => {
  beforeEach(() => {
    process.env.INTEGRATION_KEY = 'integration-key'
    process.env.INTEGRATION_SECRET = 'integration-secret'
    process.env.JWT_SECRET = 'jwt-secret'
  })

  it('attaches booking to existing customer', async () => {
    await User.create({
      email: 'customer@test.com',
      password: 'pass123',
      name: 'Existing User',
      role: 'customer',
    })

    const app = createTestApp()
    const payload = buildPayload()
    const rawBody = JSON.stringify(payload)

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-existing'))
      .send(payload)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.customerStatus).toBe('existing')
    expect(response.body.idempotentReplay).toBe(false)

    const bookings = await Booking.find({ paymentReference: payload.paymentReference })
    expect(bookings).toHaveLength(1)
  })

  it('creates new customer and booking', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    payload.customer.email = 'newcustomer@test.com'
    payload.idempotencyKey = 'idem-002'
    payload.paymentReference = 'PAY-002'
    payload.orderCode = 'ORD-002'
    const rawBody = JSON.stringify(payload)

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-new'))
      .send(payload)

    expect(response.status).toBe(200)
    expect(response.body.success).toBe(true)
    expect(response.body.customerStatus).toBe('created')
    expect(['sent', 'failed']).toContain(response.body.inviteStatus)
  })

  it('returns idempotent replay for duplicate payment reference', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    const rawBody = JSON.stringify(payload)

    await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-first'))
      .send(payload)

    const replay = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-second'))
      .send(payload)

    expect(replay.status).toBe(200)
    expect(replay.body.idempotentReplay).toBe(true)
    const bookings = await Booking.find({ paymentReference: payload.paymentReference })
    expect(bookings).toHaveLength(1)
  })

  it('rejects invalid signature', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    const rawBody = JSON.stringify(payload)
    const headers = signedHeaders(rawBody, 'nonce-bad-signature')

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set({ ...headers, 'X-Integration-Signature': 'invalid-signature' })
      .send(payload)

    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('INVALID_SIGNATURE')
  })

  it('rejects replayed nonce', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    payload.idempotencyKey = 'idem-003'
    payload.paymentReference = 'PAY-003'
    payload.orderCode = 'ORD-003'
    const rawBody = JSON.stringify(payload)
    const nonce = 'nonce-replay'

    await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, nonce))
      .send(payload)

    const replay = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, nonce))
      .send(payload)

    expect(replay.status).toBe(409)
    expect(replay.body.error.code).toBe('REPLAYED_NONCE')
  })

  it('rejects malformed payload', async () => {
    const app = createTestApp()
    const payload = { foo: 'bar' }
    const rawBody = JSON.stringify(payload)

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-invalid-payload'))
      .send(payload)

    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('INVALID_PAYLOAD')
  })
})
