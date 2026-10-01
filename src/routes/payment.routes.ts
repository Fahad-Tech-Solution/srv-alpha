import { Router } from 'express'
import { paypalWebhook } from '../controllers/payment.controller'

const router = Router()

// Public PayPal webhooks (signature verified in controller)
router.post('/paypal/webhook', paypalWebhook)

export default router
