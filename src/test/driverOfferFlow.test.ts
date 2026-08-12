import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { createTestApp } from './createTestApp'
import {
  authHeader,
  createPendingBooking,
  createTestUsers,
  offerBookingToDrivers,
} from './helpers'
import { Booking } from '../models/Booking.model'

const app = createTestApp()

describe('driver offer flow', () => {
  it('lists available jobs for a driver with a pending offer', async () => {
    const { customer, driver1 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id], 100)

    const response = await request(app)
      .get('/api/driver/available-jobs')
      .set(authHeader(driver1))
      .expect(200)

    expect(response.body.bookings).toHaveLength(1)
    expect(response.body.bookings[0]._id).toBe(booking._id.toString())
  })

  it('accepts a job offer and assigns the driver', async () => {
    const { customer, driver1 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id], 100)

    const response = await request(app)
      .post(`/api/driver/available-jobs/${booking._id}/accept`)
      .set(authHeader(driver1))
      .expect(200)

    expect(response.body.booking.status).toBe('confirmed')
    const assignedDriverId =
      typeof response.body.booking.driver === 'string'
        ? response.body.booking.driver
        : response.body.booking.driver._id
    expect(assignedDriverId).toBe(driver1._id.toString())

    const updated = await Booking.findById(booking._id)
    expect(updated?.status).toBe('confirmed')
    expect(updated?.driver?.toString()).toBe(driver1._id.toString())
    expect(updated?.finalPrice).toBe(100)
  })

  it('returns 409 when a second driver tries to accept an already claimed job', async () => {
    const { customer, driver1, driver2 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id, driver2._id], 100)

    await request(app)
      .post(`/api/driver/available-jobs/${booking._id}/accept`)
      .set(authHeader(driver1))
      .expect(200)

    const response = await request(app)
      .post(`/api/driver/available-jobs/${booking._id}/accept`)
      .set(authHeader(driver2))
      .expect(409)

    expect(response.body.message).toMatch(/already accepted|no longer available/i)
  })

  it('rejects a job offer and removes it from available jobs', async () => {
    const { customer, driver1 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id], 100)

    await request(app)
      .post(`/api/driver/available-jobs/${booking._id}/reject`)
      .set(authHeader(driver1))
      .expect(200)

    const available = await request(app)
      .get('/api/driver/available-jobs')
      .set(authHeader(driver1))
      .expect(200)

    expect(available.body.bookings).toHaveLength(0)

    const updated = await Booking.findById(booking._id)
    const driverOffer = updated?.driverOffers?.find(
      (offer) => offer.driver.toString() === driver1._id.toString()
    )
    expect(driverOffer?.status).toBe('rejected')
    expect(updated?.status).toBe('pending')
  })

  it('blocks acceptance when the offer has expired', async () => {
    const { customer, driver1 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(
      booking._id,
      [driver1._id],
      100,
      new Date(Date.now() - 60 * 60 * 1000)
    )

    const response = await request(app)
      .post(`/api/driver/available-jobs/${booking._id}/accept`)
      .set(authHeader(driver1))
      .expect(400)

    expect(response.body.message).toMatch(/expired/i)
  })

  it('returns pending offer details before the driver is assigned', async () => {
    const { customer, driver1 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id], 100)

    const response = await request(app)
      .get(`/api/driver/jobs/${booking._id}`)
      .set(authHeader(driver1))
      .expect(200)

    expect(response.body.status).toBe('offered')
    expect(response.body.driver).toBeFalsy()
    expect(response.body.driverOffers).toHaveLength(1)
  })

  it('accepts a job offered only via offeredToDrivers', async () => {
    const { customer, driver1 } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)

    await Booking.findByIdAndUpdate(booking._id, {
      offeredToDrivers: [driver1._id],
      offerExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    })

    const response = await request(app)
      .post(`/api/driver/available-jobs/${booking._id}/accept`)
      .set(authHeader(driver1))
      .expect(200)

    expect(response.body.booking.status).toBe('confirmed')
    const assignedDriverId =
      typeof response.body.booking.driver === 'string'
        ? response.body.booking.driver
        : response.body.booking.driver._id
    expect(assignedDriverId).toBe(driver1._id.toString())
  })

  it('sets offer expiry when admin offers a job to drivers', async () => {
    const { customer, driver1, admin } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)

    await request(app)
      .post(`/api/admin/bookings/${booking._id}/offer-to-drivers`)
      .set(authHeader(admin))
      .send({ driverIds: [driver1._id.toString()], percentage: 50 })
      .expect(200)

    const updated = await Booking.findById(booking._id)
    expect(updated?.offerExpiresAt).toBeTruthy()
    expect(updated?.offerExpiresAt!.getTime()).toBeGreaterThan(Date.now())
    expect(updated?.status).toBe('offered')
    expect(updated?.driverOffers?.[0]?.offeredPrice).toBe(100)
  })
})
