import http from 'http'
import express from 'express'
import type { Request } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import { connectDB } from './utils/database'
import { initRealtime } from './utils/realtime'
import authRoutes from './routes/auth.routes'
import bookingRoutes from './routes/booking.routes'
import adminRoutes from './routes/admin.routes'
import driverRoutes from './routes/driver.routes'
import customerRoutes from './routes/customer.routes'
import uploadRoutes from './routes/upload.routes'
import internalIntegrationRoutes from './routes/internalIntegration.routes'
import { errorHandler } from './middlewares/errorHandler'

dotenv.config()

const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

initRealtime(server)

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://*.github.io', // GitHub Pages
    'https://*.vercel.app', // Vercel deployments
    
    'https://fahad-tech-solution.github.io'
    
  ],
  credentials: true,
}))
app.use(morgan('dev'))
app.use(
  express.json({
    verify: (req, _res, buffer) => {
      ;(req as Request & { rawBody?: string }).rawBody = buffer.toString('utf8')
    },
  })
)
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
app.use('/api/customer', customerRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/internal/integrations', internalIntegrationRoutes)

// Error handling middleware
app.use(errorHandler)

// Connect to database and start server
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error('Failed to start server:', error)
    process.exit(1)
  })

export default app
