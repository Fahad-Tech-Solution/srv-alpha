import { describe, expect, it, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createTestApp } from './createTestApp'
import { authHeader, createTestUsers } from './helpers'
import { User } from '../models/User.model'
import { Booking } from '../models/Booking.model'

vi.mock('../services/notification.service', () => ({
  notificationService: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}))

import { notificationService } from '../services/notification.service'

function buildManualOrderPayload(overrides: Record<string, unknown> = {}) {
  return {
    customer: {
      name: 'Phone Customer',
      email: 'phonecustomer@test.com',
      phone: '07000000001',
    },
    pickupAddress: '10 Pickup Lane',
    pickupCity: 'London',
    pickupZipCode: 'SW1A 2AA',
    pickupDate: new Date(Date.now() + 86400000).toISOString(),
    pickupTime: '14:00',
    deliveryAddress: '20 Delivery Ave',
    deliveryCity: 'Birmingham',
    deliveryZipCode: 'B1 1AA',
    serviceType: 'local',
    vehicleType: 'medium-van',
    price: 250,
    paymentStatus: 'paid',
    paymentMethod: 'bank-transfer',
    sendConfirmationEmail: true,
    pickupAccess: 'stairs',
    pickupStairsCount: 2,
    deliveryAccess: 'lift',
    men: 2,
    ...overrides,
  }
}

const app = createTestApp()

describe('admin manual booking create', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'jwt-secret'
    vi.mocked(notificationService.sendEmail).mockClear()
  })

  it('creates paid manual booking for existing customer', async () => {
    const { customer, admin } = await createTestUsers()

    const response = await request(app)
      .post('/api/admin/bookings')
      .set(authHeader(admin))
      .send(
        buildManualOrderPayload({
          customer: {
            name: customer.name,
            email: customer.email,
            phone: '07000000000',
          },
        })
      )
      .expect(201)

    expect(response.body.customerStatus).toBe('existing')
    expect(response.body.emails.confirmation).toBe('sent')
    expect(response.body.emails.onboardingInvite).toBe('not_required')
    expect(response.body.booking.paymentStatus).toBe('paid')
    expect(response.body.booking.paymentMethod).toBe('bank-transfer')
    expect(response.body.booking.orderCode).toMatch(/^MAN-/)
    expect(response.body.booking.sourceSystem).toBe('admin-manual')
    expect(response.body.booking.collectionStairs).toBe('2 flights of stairs')
    expect(response.body.booking.deliveryStairs).toBe('Lift')
    expect(response.body.booking.men).toBe(2)
    expect(response.body.booking.manRequired).toBe('2 people')

    expect(notificationService.sendEmail).toHaveBeenCalledTimes(1)

    const bookings = await Booking.find({ customer: customer._id })
    expect(bookings).toHaveLength(1)
  })

  it('creates pending manual booking', async () => {
    const { admin } = await createTestUsers()

    const response = await request(app)
      .post('/api/admin/bookings')
      .set(authHeader(admin))
      .send(
        buildManualOrderPayload({
          paymentStatus: 'pending',
          paymentMethod: undefined,
          customer: {
            name: 'Pending Customer',
            email: 'pending@test.com',
            phone: '07000000002',
          },
        })
      )
      .expect(201)

    expect(response.body.booking.paymentStatus).toBe('pending')
    expect(response.body.booking.amountPaid).toBeFalsy()
  })

  it('creates new customer with onboarding invite and confirmation', async () => {
    const { admin } = await createTestUsers()

    const response = await request(app)
      .post('/api/admin/bookings')
      .set(authHeader(admin))
      .send(
        buildManualOrderPayload({
          customer: {
            name: 'New Customer',
            email: 'brandnew@test.com',
            phone: '07000000003',
          },
        })
      )
      .expect(201)

    expect(response.body.customerStatus).toBe('created')
    expect(response.body.emails.confirmation).toBe('sent')
    expect(['sent', 'failed']).toContain(response.body.emails.onboardingInvite)
    expect(notificationService.sendEmail).toHaveBeenCalledTimes(2)

    const user = await User.findOne({ email: 'brandnew@test.com' })
    expect(user).toBeTruthy()
    expect(user?.role).toBe('customer')
  })

  it('rejects paid booking without payment method', async () => {
    const { admin } = await createTestUsers()
    const payload = buildManualOrderPayload()
    delete (payload as { paymentMethod?: string }).paymentMethod

    const response = await request(app)
      .post('/api/admin/bookings')
      .set(authHeader(admin))
      .send(payload)
      .expect(400)

    expect(response.body.message).toMatch(/payment method/i)
  })

  it('rejects unauthenticated request', async () => {
    await request(app).post('/api/admin/bookings').send(buildManualOrderPayload()).expect(401)
  })

  it('rejects non-admin user', async () => {
    const { customer } = await createTestUsers()

    await request(app)
      .post('/api/admin/bookings')
      .set(authHeader(customer))
      .send(buildManualOrderPayload())
      .expect(403)
  })
})
