import express from 'express'
import driverRoutes from '../routes/driver.routes'
import adminRoutes from '../routes/admin.routes'
import { errorHandler } from '../middlewares/errorHandler'

export function createTestApp() {
  const app = express()
  app.use(express.json())
  app.use('/api/driver', driverRoutes)
  app.use('/api/admin', adminRoutes)
  app.use(errorHandler)
  return app
}
