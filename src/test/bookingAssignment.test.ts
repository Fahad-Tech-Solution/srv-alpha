import { describe, expect, it } from 'vitest'
import { Booking } from '../models/Booking.model'
import mongoose from 'mongoose'
import {
  applyStatusSideEffects,
  clearAssignmentAndOffers,
  isOfferable,
  reclaimBookingFromDriver,
  syncBookingStatusAfterOfferChanges,
} from '../utils/bookingAssignment'

function createBookingStub(overrides: Partial<InstanceType<typeof Booking>> = {}) {
  return {
    status: 'pending',
    driverOffers: [],
    offeredToDrivers: [],
    ...overrides,
  } as InstanceType<typeof Booking>
}

describe('bookingAssignment utils', () => {
  it('detects offerable bookings', () => {
    expect(isOfferable(createBookingStub({ status: 'pending' }))).toBe(true)
    expect(isOfferable(createBookingStub({ status: 'offered' }))).toBe(true)
    expect(
      isOfferable(
        createBookingStub({
          status: 'offered',
          driver: new mongoose.Types.ObjectId(),
        })
      )
    ).toBe(false)
    expect(isOfferable(createBookingStub({ status: 'completed' }))).toBe(false)
  })

  it('returns booking to pending when all offers are rejected', () => {
    const booking = createBookingStub({
      status: 'offered',
      driverOffers: [
        {
          driver: new mongoose.Types.ObjectId(),
          offeredPrice: 100,
          status: 'rejected',
          offeredAt: new Date(),
        },
      ],
      offeredToDrivers: [],
    })

    syncBookingStatusAfterOfferChanges(booking)
    expect(booking.status).toBe('pending')
  })

  it('clears assignment and offers when admin resets to pending', () => {
    const booking = createBookingStub({
      status: 'offered',
      driver: new mongoose.Types.ObjectId(),
      assignedAt: new Date(),
      offeredToDrivers: [new mongoose.Types.ObjectId()],
      driverOffers: [
        {
          driver: new mongoose.Types.ObjectId(),
          offeredPrice: 100,
          status: 'pending',
          offeredAt: new Date(),
        },
      ],
    })

    const result = applyStatusSideEffects(booking, 'pending', 'offered')
    expect(result.error).toBeUndefined()
    expect(booking.driver).toBeUndefined()
    expect(booking.offeredToDrivers).toEqual([])
    expect(booking.driverOffers?.[0]?.status).toBe('rejected')
  })

  it('requires a driver before confirming through admin status change', () => {
    const booking = createBookingStub({ status: 'pending' })
    const result = applyStatusSideEffects(booking, 'confirmed', 'pending')
    expect(result.error).toMatch(/without an assigned driver/i)
  })

  it('clears assignment data with clearAssignmentAndOffers', () => {
    const booking = createBookingStub({
      status: 'offered',
      driver: new mongoose.Types.ObjectId(),
      assignedAt: new Date(),
      offeredToDrivers: [new mongoose.Types.ObjectId()],
    })

    clearAssignmentAndOffers(booking)
    expect(booking.driver).toBeUndefined()
    expect(booking.assignedAt).toBeUndefined()
    expect(booking.offeredToDrivers).toEqual([])
  })

  it('reclaims assigned booking for re-offer', () => {
    const acceptedDriver = new mongoose.Types.ObjectId()
    const booking = createBookingStub({
      status: 'confirmed',
      driver: acceptedDriver,
      assignedAt: new Date(),
      offeredToDrivers: [],
      driverOffers: [
        {
          driver: acceptedDriver,
          offeredPrice: 120,
          status: 'accepted',
          offeredAt: new Date(),
        },
        {
          driver: new mongoose.Types.ObjectId(),
          offeredPrice: 100,
          status: 'pending',
          offeredAt: new Date(),
        },
      ],
    })

    reclaimBookingFromDriver(booking)

    expect(booking.status).toBe('pending')
    expect(booking.driver).toBeUndefined()
    expect(booking.offeredToDrivers).toEqual([])
    expect(booking.driverOffers?.[0]?.status).toBe('superseded')
    expect(booking.driverOffers?.[1]?.status).toBe('rejected')
    expect(isOfferable(booking)).toBe(true)
  })
})
