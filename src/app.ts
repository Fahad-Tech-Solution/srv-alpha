import express from 'express'
import type { Request } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import authRoutes from './routes/auth.routes'
import { errorHandler } from './middlewares/errorHandler'

const app = express()

// Middleware
app.use(helmet())
app.use(cors())
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
  res.json({ status: 'ok', message: 'wroom wroom we are on the way server up and running' })
})

// Routes
app.use('/api/auth', authRoutes)

// Error handling middleware
app.use(errorHandler)

export default app

