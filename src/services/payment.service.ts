type PayPalMode = 'sandbox' | 'live'

export type CreateInvoiceResult = {
  invoiceId: string
  href: string
}

type TokenCache = {
  accessToken: string
  expiresAt: number
}

let tokenCache: TokenCache | null = null

function getPayPalMode(): PayPalMode {
  const mode = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase()
  return mode === 'live' ? 'live' : 'sandbox'
}

function getPayPalBaseUrl(): string {
  return getPayPalMode() === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'
}

function requirePayPalConfig(): { clientId: string; clientSecret: string } {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim()
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) {
    throw Object.assign(
      new Error('PayPal is not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.'),
      { statusCode: 503 }
    )
  }
  return { clientId, clientSecret }
}

export function getInvoiceAmount(booking: {
  finalPrice?: number
  estimatedPrice?: number
  additionalWorkPayment?: number
}): number {
  const base = Number(booking.finalPrice ?? booking.estimatedPrice ?? 0)
  const extra = Number(booking.additionalWorkPayment ?? 0)
  return Math.round((base + (extra > 0 ? extra : 0)) * 100) / 100
}

async function getAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken
  }

  const { clientId, clientSecret } = requirePayPalConfig()
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(`${getPayPalBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  const data = (await response.json()) as {
    access_token?: string
    expires_in?: number
    error_description?: string
    message?: string
  }

  if (!response.ok || !data.access_token) {
    throw Object.assign(
      new Error(data.error_description || data.message || 'Failed to authenticate with PayPal'),
      { statusCode: 502 }
    )
  }

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 300) * 1000,
  }
  return data.access_token
}

async function paypalRequest<T>(
  path: string,
  options: { method?: string; body?: unknown; prefer?: string } = {}
): Promise<T> {
  const token = await getAccessToken()
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (options.prefer) {
    headers.Prefer = options.prefer
  }

  const response = await fetch(`${getPayPalBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const text = await response.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { message: text }
  }

  if (!response.ok) {
    const detail =
      data?.details?.[0]?.description ||
      data?.message ||
      data?.error_description ||
      `PayPal request failed (${response.status})`
    throw Object.assign(new Error(detail), { statusCode: 502, paypal: data })
  }

  return data as T
}

function extractInvoiceHref(invoice: any): string | undefined {
  const links: Array<{ rel?: string; href?: string }> = invoice?.links || []
  const payerView = links.find((l) => l.rel === 'payer-view' || l.rel === 'payer-view-url')
  if (payerView?.href) return payerView.href
  const self = links.find((l) => l.rel === 'self')
  return self?.href || invoice?.detail?.invoice_url || invoice?.href
}

export type InvoiceBookingInput = {
  _id: { toString(): string }
  orderCode?: string
  contactEmail: string
  contactPhone?: string
  pickupCity?: string
  deliveryCity?: string
  pickupAddress?: string
  deliveryAddress?: string
  finalPrice?: number
  estimatedPrice?: number
  additionalWorkPayment?: number
  customer?: { name?: string; email?: string } | string
}

/**
 * Create a PayPal draft invoice, send it, and return id + payer link.
 */
export async function createAndSendInvoice(
  booking: InvoiceBookingInput,
  customerName?: string
): Promise<CreateInvoiceResult> {
  requirePayPalConfig()

  const amount = getInvoiceAmount(booking)
  if (!(amount > 0)) {
    throw Object.assign(new Error('Invoice amount must be greater than zero'), {
      statusCode: 400,
    })
  }

  const buyerEmail = booking.contactEmail?.trim()
  if (!buyerEmail) {
    throw Object.assign(new Error('Booking has no contact email for invoice'), {
      statusCode: 400,
    })
  }

  const bookingId = booking._id.toString()
  const orderLabel = booking.orderCode || bookingId
  const routeLabel =
    booking.pickupCity && booking.deliveryCity
      ? `${booking.pickupCity} → ${booking.deliveryCity}`
      : 'Moving service'
  const name =
    customerName ||
    (typeof booking.customer === 'object' && booking.customer?.name) ||
    buyerEmail.split('@')[0]

  const invoicePayload = {
    detail: {
      invoice_number: `LV${Date.now().toString(36).toUpperCase()}`.slice(0, 25),
      reference: bookingId,
      currency_code: 'GBP',
      note: `Payment for Local Van booking ${orderLabel}`,
      terms_and_conditions: 'Thank you for choosing Local Van.',
      memo: bookingId,
    },
    invoicer: {
      business_name: 'Local Van',
      email_address: process.env.PAYPAL_MERCHANT_EMAIL || process.env.SMTP_FROM_EMAIL || undefined,
    },
    primary_recipients: [
      {
        billing_info: {
          name: { full_name: String(name).slice(0, 140) },
          email_address: buyerEmail,
          phones: undefined,
        },
      },
    ],
    items: [
      {
        name: `Moving service — ${routeLabel}`.slice(0, 120),
        description: `Order ${orderLabel}`,
        quantity: '1',
        unit_amount: {
          currency_code: 'GBP',
          value: amount.toFixed(2),
        },
        unit_of_measure: 'QUANTITY',
      },
    ],
    configuration: {
      allow_tip: false,
      tax_calculated_after_discount: true,
      tax_inclusive: true,
    },
  }

  if (!invoicePayload.invoicer.email_address) {
    delete (invoicePayload.invoicer as any).email_address
  }

  const created = await paypalRequest<{ id?: string; href?: string; links?: any[] }>(
    '/v2/invoicing/invoices',
    {
      method: 'POST',
      body: invoicePayload,
      prefer: 'return=representation',
    }
  )

  const invoiceId = created.id
  if (!invoiceId) {
    throw Object.assign(new Error('PayPal did not return an invoice id'), { statusCode: 502 })
  }

  const sent = await paypalRequest<{ href?: string; links?: any[]; id?: string }>(
    `/v2/invoicing/invoices/${invoiceId}/send`,
    {
      method: 'POST',
      body: {
        send_to_invoicer: false,
        send_to_recipient: false, // we email via our own template with the link
      },
      prefer: 'return=representation',
    }
  )

  // Fetch full invoice for payer-view link if send response lacks it
  let href = extractInvoiceHref(sent) || extractInvoiceHref(created)
  if (!href) {
    const full = await paypalRequest<any>(`/v2/invoicing/invoices/${invoiceId}`)
    href = extractInvoiceHref(full)
  }

  // Sandbox/live hosted invoice URL pattern fallback
  if (!href) {
    const host =
      getPayPalMode() === 'live'
        ? 'https://www.paypal.com'
        : 'https://www.sandbox.paypal.com'
    href = `${host}/invoice/p/#${invoiceId}`
  }

  return { invoiceId, href }
}

export type WebhookHeaders = {
  authAlgo?: string
  certUrl?: string
  transmissionId?: string
  transmissionSig?: string
  transmissionTime?: string
  webhookId?: string
}

/**
 * Verify PayPal webhook signature. Returns true if valid.
 * In development without PAYPAL_WEBHOOK_ID, verification is skipped with a warning.
 */
export async function verifyPayPalWebhook(
  headers: WebhookHeaders,
  webhookEvent: unknown
): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim() || headers.webhookId
  if (!webhookId) {
    if (process.env.NODE_ENV === 'production') {
      console.error('PAYPAL_WEBHOOK_ID is required in production')
      return false
    }
    console.warn('PAYPAL_WEBHOOK_ID not set — skipping webhook signature verification')
    return true
  }

  if (
    !headers.authAlgo ||
    !headers.certUrl ||
    !headers.transmissionId ||
    !headers.transmissionSig ||
    !headers.transmissionTime
  ) {
    return false
  }

  try {
    const result = await paypalRequest<{ verification_status?: string }>(
      '/v1/notifications/verify-webhook-signature',
      {
        method: 'POST',
        body: {
          auth_algo: headers.authAlgo,
          cert_url: headers.certUrl,
          transmission_id: headers.transmissionId,
          transmission_sig: headers.transmissionSig,
          transmission_time: headers.transmissionTime,
          webhook_id: webhookId,
          webhook_event: webhookEvent,
        },
      }
    )
    return result.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('PayPal webhook verification failed:', error)
    return false
  }
}

export function extractPaidInvoiceId(event: any): string | undefined {
  const resource = event?.resource
  if (!resource) return undefined
  return (
    resource.invoice?.id ||
    resource.id ||
    resource.invoice_id ||
    undefined
  )
}

export function extractPaidAmount(event: any): number | undefined {
  const resource = event?.resource
  const value =
    resource?.amount?.value ||
    resource?.payments?.paid_amount?.value ||
    resource?.due_amount?.value
  if (value == null) return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

export function extractBookingIdFromInvoiceEvent(event: any): string | undefined {
  const resource = event?.resource
  return (
    resource?.detail?.reference ||
    resource?.detail?.memo ||
    resource?.invoice?.detail?.reference ||
    resource?.invoice?.detail?.memo ||
    undefined
  )
}

export function isInvoicePaidEvent(eventType?: string): boolean {
  if (!eventType) return false
  const t = eventType.toUpperCase()
  return (
    t === 'INVOICING.INVOICE.PAID' ||
    t === 'INVOICING.INVOICE.MARKED_AS_PAID' ||
    t === 'INVOICE.PAID'
  )
}

/** @deprecated Use createAndSendInvoice — kept for import compatibility */
export class PaymentService {
  async processPayment(_amount: number, _currency: string) {
    throw new Error('Use createAndSendInvoice for PayPal invoicing')
  }

  async refundPayment(_transactionId: string) {
    throw new Error('Refund service not implemented yet')
  }
}
