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

describe('admin booking guardrails', () => {
  it('blocks offering a job that already has an assigned driver', async () => {
    const { customer, driver1, admin } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    booking.driver = driver1._id
    booking.status = 'confirmed'
    await booking.save()

    const response = await request(app)
      .post(`/api/admin/bookings/${booking._id}/offer-to-drivers`)
      .set(authHeader(admin))
      .send({ driverIds: [driver1._id.toString()], percentage: 50 })
      .expect(400)

    expect(response.body.message).toMatch(/assigned driver/i)
  })

  it('sets booking status to offered when admin sends offers', async () => {
    const { customer, driver1, admin } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)

    await request(app)
      .post(`/api/admin/bookings/${booking._id}/offer-to-drivers`)
      .set(authHeader(admin))
      .send({ driverIds: [driver1._id.toString()], percentage: 50 })
      .expect(200)

    const updated = await Booking.findById(booking._id)
    expect(updated?.status).toBe('offered')
  })

  it('direct assign supersedes pending offers and confirms booking', async () => {
    const { customer, driver1, driver2, admin } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id, driver2._id], 100)

    await request(app)
      .post(`/api/admin/bookings/${booking._id}/assign-driver`)
      .set(authHeader(admin))
      .send({ driverId: driver2._id.toString() })
      .expect(200)

    const updated = await Booking.findById(booking._id)
    expect(updated?.status).toBe('confirmed')
    expect(updated?.driver?.toString()).toBe(driver2._id.toString())
    expect(updated?.assignedBy?.toString()).toBe(admin._id.toString())
    expect(updated?.offeredToDrivers).toEqual([])

    const driver1Offer = updated?.driverOffers?.find(
      (offer) => offer.driver.toString() === driver1._id.toString()
    )
    const driver2Offer = updated?.driverOffers?.find(
      (offer) => offer.driver.toString() === driver2._id.toString()
    )
    expect(driver1Offer?.status).toBe('superseded')
    expect(driver2Offer?.status).toBe('accepted')
  })

  it('resets assignment and offers when admin sets status back to pending', async () => {
    const { customer, driver1, admin } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)
    await offerBookingToDrivers(booking._id, [driver1._id], 100)

    await request(app)
      .put(`/api/admin/bookings/${booking._id}`)
      .set(authHeader(admin))
      .send({ status: 'pending' })
      .expect(200)

    const updated = await Booking.findById(booking._id)
    expect(updated?.status).toBe('pending')
    expect(updated?.driver).toBeFalsy()
    expect(updated?.offeredToDrivers).toEqual([])
    expect(updated?.driverOffers?.[0]?.status).toBe('rejected')
  })

  it('blocks confirming a booking without an assigned driver', async () => {
    const { customer, admin } = await createTestUsers()
    const booking = await createPendingBooking(customer._id)

    const response = await request(app)
      .put(`/api/admin/bookings/${booking._id}`)
      .send({ status: 'confirmed' })
      .set(authHeader(admin))
      .expect(400)

    expect(response.body.message).toMatch(/without an assigned driver/i)
  })
})
