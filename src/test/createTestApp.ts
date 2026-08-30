import express from 'express'
import type { Request } from 'express'
import driverRoutes from '../routes/driver.routes'
import adminRoutes from '../routes/admin.routes'
import internalIntegrationRoutes from '../routes/internalIntegration.routes'
import { errorHandler } from '../middlewares/errorHandler'

export function createTestApp() {
  const app = express()
  app.use(
    express.json({
      verify: (req, _res, buffer) => {
        ;(req as Request & { rawBody?: string }).rawBody = buffer.toString('utf8')
      },
    })
  )
  app.use('/api/driver', driverRoutes)
  app.use('/api/admin', adminRoutes)
  app.use('/internal/integrations', internalIntegrationRoutes)
  app.use(errorHandler)
  return app
}
