import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/moving-van'

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ MongoDB connected successfully')
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

