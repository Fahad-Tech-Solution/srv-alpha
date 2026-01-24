import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './utils/database'
import authRoutes from './routes/auth.routes'
import bookingRoutes from './routes/booking.routes'
import adminRoutes from './routes/admin.routes'
import driverRoutes from './routes/driver.routes'
import { errorHandler } from './middlewares/errorHandler'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://*.github.io', // GitHub Pages
  ],
  credentials: true,
}))
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/driver', driverRoutes)

// Error handling middleware
app.use(errorHandler)

// Connect to database and start server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })

export default app

