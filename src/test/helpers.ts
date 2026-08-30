import mongoose from 'mongoose'
import { User } from '../models/User.model'
import { Booking } from '../models/Booking.model'
import { generateToken } from '../utils/jwt'

export async function createTestUsers() {
  const customer = await User.create({
    email: 'customer@test.com',
    password: 'pass123',
    name: 'Test Customer',
    role: 'customer',
  })
  const driver1 = await User.create({
    email: 'driver1@test.com',
    password: 'pass123',
    name: 'Test Driver 1',
    role: 'driver',
  })
  const driver2 = await User.create({
    email: 'driver2@test.com',
    password: 'pass123',
    name: 'Test Driver 2',
    role: 'driver',
  })
  const admin = await User.create({
    email: 'admin@test.com',
    password: 'pass123',
    name: 'Test Admin',
    role: 'admin',
  })

  return { customer, driver1, driver2, admin }
}

export function authHeader(user: { _id: mongoose.Types.ObjectId; email: string; role: string }) {
  const token = generateToken({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  })
  return { Authorization: `Bearer ${token}` }
}

export async function createPendingBooking(customerId: mongoose.Types.ObjectId) {
  return Booking.create({
    customer: customerId,
    status: 'pending',
    pickupAddress: '1 Pickup Street',
    pickupCity: 'London',
    pickupZipCode: 'SW1A 1AA',
    pickupDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    pickupTime: '10:00',
    deliveryAddress: '2 Delivery Road',
    deliveryCity: 'Manchester',
    deliveryZipCode: 'M1 1AA',
    serviceType: 'local',
    vehicleType: 'small-van',
    estimatedPrice: 200,
    contactPhone: '07000000000',
    contactEmail: 'customer@test.com',
  })
}

export async function offerBookingToDrivers(
  bookingId: mongoose.Types.ObjectId,
  driverIds: mongoose.Types.ObjectId[],
  offeredPrice = 100,
  offerExpiresAt?: Date
) {
  return Booking.findByIdAndUpdate(
    bookingId,
    {
      driverOffers: driverIds.map((driverId) => ({
        driver: driverId,
        offeredPrice,
        status: 'pending',
        offeredAt: new Date(),
      })),
      offeredToDrivers: driverIds,
      offerExpiresAt:
        offerExpiresAt ?? new Date(Date.now() + 48 * 60 * 60 * 1000),
      status: 'offered',
    },
    { new: true }
  )
}
