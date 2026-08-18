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

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://fahad-tech-solution.github.io', // NO trailing path '/Local-Van'
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []),
];

// Regex patterns to support wildcard subdomains like *.vercel.app or *.github.io
const allowedPatterns = [
  /\.github\.io$/,
  /\.vercel\.app$/,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like Server-to-Server, mobile apps, or Postman)
      if (!origin) return callback(null, true);

      // 1. Check exact match
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // 2. Check regex wildcard patterns
      const isPatternAllowed = allowedPatterns.some((pattern) => pattern.test(origin));
      if (isPatternAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`CORS policy blocked access for origin: ${origin}`));
    },
    credentials: true,
  })
);
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
