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

  it('persists structured quote-calculator fields and replays the same idempotency key', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    payload.idempotencyKey = 'booking-paid:bk_luton'
    payload.orderCode = 'LV-AB12CD'
    payload.paymentReference = 'pi_luton'
    payload.customer.email = 'jane@example.com'
    ;(payload as any).booking = {
      ...payload.booking,
      pickupStreet: '12 Example Road',
      pickupCity: 'London',
      pickupAddress: '12 Example Road, London, E1 6AN',
      pickupZipCode: 'E1 6AN',
      pickupDate: '2026-10-15',
      deliveryStreet: '45 Destination Lane',
      deliveryCity: 'London',
      deliveryAddress: '45 Destination Lane, London, N1 9GU',
      deliveryZipCode: 'N1 9GU',
      vehicleType: 'truck',
      vehicleName: 'Luton Van',
      vanSize: 'luton',
      vans: { small: 0, medium: 0, large: 0, luton: 1 },
      vansLabel: '1× Luton',
      hoursBooked: 3,
      durationRequired: '3',
      vanTime: '3',
      drivers: 1,
      additionalHelpers: 1,
      totalCrew: 2,
      helpersRateTier: 2,
      helpersLabel: '1 driver + 1 additional person',
      manRequired: '2',
      specialInstructions: 'Handle with care | Fleet: 1× Luton',
      discountApplied: true,
      discountCode: 'SAVE10',
      discountPercent: 10,
      estimatedPrice: 170.1,
      amountPaid: 170.1,
      stops: [
        {
          postcode: 'EC1A 1BB',
          street: '1 Stop Street',
          city: 'London',
          stairs: '0',
        },
      ],
    }
    const rawBody = JSON.stringify(payload)

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-luton'))
      .send(payload)

    expect(response.status).toBe(200)
    expect(response.body.idempotentReplay).toBe(false)

    const booking = await Booking.findOne({ idempotencyKey: payload.idempotencyKey })
    expect(booking).toBeTruthy()
    expect(booking?.vehicleType).toBe('luton')
    expect(booking?.vehicleName).toBe('Luton Van')
    expect(booking?.vanSize).toBe('luton')
    expect(booking?.vanCounts?.luton).toBe(1)
    expect(booking?.vanCounts?.large).toBe(0)
    expect(booking?.drivers).toBe(1)
    expect(booking?.helpers).toBe(1)
    expect(booking?.men).toBe(2)
    expect(booking?.helpersRateTier).toBe(2)
    expect(booking?.manRequired).toBe('2')
    expect(booking?.hours).toBe(3)
    expect(booking?.durationRequired).toBe('3')
    expect(booking?.pickupStreet).toBe('12 Example Road')
    expect(booking?.pickupAddress).toBe('12 Example Road')
    expect(booking?.pickupCity).toBe('London')
    expect(booking?.deliveryStreet).toBe('45 Destination Lane')
    expect(booking?.deliveryCity).toBe('London')
    expect(booking?.stops).toHaveLength(1)
    expect(booking?.stops?.[0].address).toBe('1 Stop Street')
    expect(booking?.stops?.[0].city).toBe('London')
    expect(booking?.stops?.[0].zipCode).toBe('EC1A 1BB')
    expect(booking?.discountApplied).toBe(true)
    expect(booking?.discountCode).toBe('SAVE10')
    expect(booking?.discountPercent).toBe(10)
    expect(booking?.amountPaid).toBe(170.1)

    const replay = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-luton-replay'))
      .send(payload)

    expect(replay.status).toBe(200)
    expect(replay.body.idempotentReplay).toBe(true)
    const bookings = await Booking.find({ idempotencyKey: payload.idempotencyKey })
    expect(bookings).toHaveLength(1)
  })

  it('keeps luton when qty says luton even if other vehicle fields say large', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    payload.idempotencyKey = 'booking-paid:bk_luton_override'
    payload.orderCode = 'LV-LUTON2'
    payload.paymentReference = 'pi_luton_override'
    payload.customer.email = 'luton@example.com'
    ;(payload as any).booking = {
      ...payload.booking,
      vehicleType: 'large-van',
      vehicleName: 'Large Van',
      vanSize: 'large',
      vans: { small: 0, medium: 0, large: 0, luton: 1 },
      drivers: 1,
      additionalHelpers: 0,
      totalCrew: 1,
      helpersRateTier: 2,
      manRequired: '2',
    }
    const rawBody = JSON.stringify(payload)

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-luton-override'))
      .send(payload)

    expect(response.status).toBe(200)
    const booking = await Booking.findOne({ paymentReference: payload.paymentReference })
    expect(booking?.vehicleType).toBe('luton')
    expect(booking?.vehicleName).toBe('Luton Van')
    expect(booking?.vanCounts?.luton).toBe(1)
    expect(booking?.vanCounts?.large).toBe(0)
    expect(booking?.helpers).toBe(0)
    expect(booking?.drivers).toBe(1)
    expect(booking?.men).toBe(1)
    expect(booking?.manRequired).toBe('2')
    expect(booking?.discountApplied).toBe(false)
    expect(booking?.discountCode).toBe('')
    expect(booking?.discountPercent).toBe(0)
  })

  it('persists partial stop payloads that only include a postcode', async () => {
    const app = createTestApp()
    const payload = buildPayload()
    payload.idempotencyKey = 'booking-paid:bk_stop_partial'
    payload.orderCode = 'LV-STOP1'
    payload.paymentReference = 'pi_stop_partial'
    payload.customer.email = 'stops@example.com'
    ;(payload as any).booking = {
      ...payload.booking,
      stops: [
        { postcode: 'SW1A 1AA', street: '', city: '', stairs: '0' },
        { postcode: 'E1 6AN', street: '22 Mile End', city: 'London', stairs: '2' },
      ],
    }
    const rawBody = JSON.stringify(payload)

    const response = await request(app)
      .post('/internal/integrations/bookings/upsert-paid')
      .set(signedHeaders(rawBody, 'nonce-stop-partial'))
      .send(payload)

    expect(response.status).toBe(200)
    const booking = await Booking.findOne({ paymentReference: payload.paymentReference })
    expect(booking?.stops).toHaveLength(2)
    expect(booking?.stops?.[0].zipCode).toBe('SW1A 1AA')
    expect(booking?.stops?.[0].address).toBe('SW1A 1AA')
    expect(booking?.stops?.[1].address).toBe('22 Mile End')
    expect(booking?.stops?.[1].city).toBe('London')
    expect(booking?.stops?.[1].zipCode).toBe('E1 6AN')
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
