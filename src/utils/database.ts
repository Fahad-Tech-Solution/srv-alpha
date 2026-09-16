import mongoose from 'mongoose'
import { Booking } from '../models/Booking.model'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moving-van'

async function repairBookingPaymentReferenceIndex(): Promise<void> {
  const collection = mongoose.connection.collection('bookings')

  // Remove stored nulls so they are not treated as duplicate unique keys
  const unsetResult = await collection.updateMany(
    { $or: [{ paymentReference: null }, { paymentReference: '' }] },
    { $unset: { paymentReference: '' } }
  )
  if (unsetResult.modifiedCount > 0) {
    console.log(
      `Cleaned ${unsetResult.modifiedCount} booking(s) with empty paymentReference`
    )
  }

  try {
    const indexes = await collection.indexes()
    const paymentIdx = indexes.find((idx) => idx.name === 'paymentReference_1')
    const hasPartial =
      paymentIdx?.partialFilterExpression &&
      typeof paymentIdx.partialFilterExpression === 'object'

    if (paymentIdx && !hasPartial) {
      await collection.dropIndex('paymentReference_1')
      console.log('Dropped legacy sparse paymentReference_1 index')
    }
  } catch (error: any) {
    if (error?.codeName !== 'IndexNotFound' && error?.code !== 27) {
      console.warn('Could not inspect/drop paymentReference index:', error?.message || error)
    }
  }

  await Booking.syncIndexes()
}

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ MongoDB connected successfully')
    await repairBookingPaymentReferenceIndex()
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected')
})

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB error:', error)
})

process.on('SIGINT', async () => {
  await mongoose.connection.close()
  console.log('MongoDB connection closed through app termination')
  process.exit(0)
})

