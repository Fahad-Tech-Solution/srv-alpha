import mongoose from 'mongoose'
import dotenv from 'dotenv'
import { Vehicle } from '../src/models/Vehicle.model'
import { User } from '../src/models/User.model'

dotenv.config()

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moving-van'

async function addTestVehicles() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    // Find a driver user (or create one for testing)
    let driver = await User.findOne({ role: 'driver' })

    if (!driver) {
      console.log('⚠️  No driver found. Creating a test driver...')
      // Create a test driver
      driver = await User.create({
        email: 'testdriver@example.com',
        password: 'password123',
        name: 'Test Driver',
        role: 'driver',
        isActive: true,
      })
      console.log('✅ Created test driver:', driver.email)
    }

    console.log('📝 Using driver:', driver.email, 'ID:', driver._id)

    // Check if vehicles already exist
    const existingVehicles = await Vehicle.find({ driver: driver._id })
    console.log(`📊 Found ${existingVehicles.length} existing vehicles`)

    // Create first test vehicle
    const vehicle1 = await Vehicle.create({
      driver: driver._id,
      vehicleRegistration: 'AB12 CDE',
      vehicleCategory: 'medium-van',
      vehicleMake: 'Ford',
      vehicleModel: 'Transit',
      vehicleSeats: 3,
      vehicleBaseLocation: 'London',
      vehicleRegistrationDocumentType: 'logbook',
      vehicleType: 'goods-vehicle',
      vehicleTotalPayload: {
        value: 1200,
        unit: 'kg',
      },
      vehicleLoadingCapacity: {
        value: 10.5,
        unit: 'm³',
      },
      vehicleMaxLength: {
        value: 5.5,
        unit: 'm',
      },
      vehicleMotorbikeCapacity: 2,
      vehicleTailLift: true,
      vehicleTrailer: false,
      vehiclePayload: {
        value: 1000,
        unit: 'kg',
      },
      vehicleFuelType: 'diesel',
    })

    console.log('✅ Created vehicle 1:', vehicle1.vehicleRegistration)

    // Create second test vehicle
    const vehicle2 = await Vehicle.create({
      driver: driver._id,
      vehicleRegistration: 'XY99 ZZZ',
      vehicleCategory: 'large-van',
      vehicleMake: 'Mercedes',
      vehicleModel: 'Sprinter',
      vehicleSeats: 2,
      vehicleBaseLocation: 'Manchester',
      vehicleRegistrationDocumentType: 'v5',
      vehicleType: 'goods-vehicle',
      vehicleTotalPayload: {
        value: 2000,
        unit: 'kg',
      },
      vehicleLoadingCapacity: {
        value: 15.2,
        unit: 'm³',
      },
      vehicleMaxLength: {
        value: 6.8,
        unit: 'm',
      },
      vehicleMotorbikeCapacity: 3,
      vehicleTailLift: true,
      vehicleTrailer: true,
      vehiclePayload: {
        value: 1800,
        unit: 'kg',
      },
      vehicleFuelType: 'diesel',
    })

    console.log('✅ Created vehicle 2:', vehicle2.vehicleRegistration)

    // Verify vehicles
    const allVehicles = await Vehicle.find({ driver: driver._id })
    console.log(`\n✅ Successfully added vehicles. Total vehicles for driver: ${allVehicles.length}`)
    allVehicles.forEach((v, index) => {
      console.log(`  ${index + 1}. ${v.vehicleRegistration} - ${v.vehicleMake} ${v.vehicleModel}`)
    })

    await mongoose.disconnect()
    console.log('✅ Disconnected from MongoDB')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    await mongoose.disconnect()
    process.exit(1)
  }
}

addTestVehicles()
