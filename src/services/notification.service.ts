import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let smtpTransporter: Transporter | null = null

function getFromParts(): { email: string; name: string; header: string } {
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'info@local-van.com'
  const name = process.env.SMTP_FROM_NAME || 'Local Van'
  return { email, name, header: `${name} <${email}>` }
}

function getSmtpTransporter(): Transporter {
  if (smtpTransporter) {
    return smtpTransporter
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)')
  }

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
    connectionTimeout: 12_000,
    greetingTimeout: 12_000,
    socketTimeout: 20_000,
    tls: { minVersion: 'TLSv1.2' },
  })

  return smtpTransporter
}

async function sendViaMailRelay(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<void> {
  const relayUrl = process.env.MAIL_RELAY_URL
  const relaySecret = process.env.MAIL_RELAY_SECRET
  if (!relayUrl || !relaySecret) {
    throw new Error('MAIL_RELAY_URL / MAIL_RELAY_SECRET not configured')
  }

  const from = getFromParts()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  try {
    const response = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Mail-Relay-Secret': relaySecret,
      },
      body: JSON.stringify({
        to,
        subject,
        text,
        html,
        fromEmail: from.email,
        fromName: from.name,
      }),
      signal: controller.signal,
    })

    const payload = (await response.json().catch(() => ({}))) as {
      ok?: boolean
      error?: string
    }

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Mail relay failed with HTTP ${response.status}`)
    }
  } finally {
    clearTimeout(timeout)
  }
}

async function sendViaResend(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY not configured')
  }

  const from = getFromParts()
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: from.header,
      to: [to],
      subject,
      text,
      html,
    }),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend API error ${response.status}: ${detail}`)
  }
}

async function sendViaSmtp(
  to: string,
  subject: string,
  text: string,
  html: string
): Promise<void> {
  const mailer = getSmtpTransporter()
  await mailer.sendMail({
    from: getFromParts().header,
    to,
    subject,
    text,
    html,
  })
}

function resolveTransport(): 'relay' | 'resend' | 'smtp' {
  const forced = (process.env.EMAIL_TRANSPORT || 'auto').toLowerCase()
  if (forced === 'relay' || forced === 'resend' || forced === 'smtp') {
    return forced
  }
  if (process.env.MAIL_RELAY_URL && process.env.MAIL_RELAY_SECRET) {
    return 'relay'
  }
  if (process.env.RESEND_API_KEY) {
    return 'resend'
  }
  return 'smtp'
}

export class NotificationService {
  getActiveTransport(): string {
    return resolveTransport()
  }

  async sendEmail(to: string, subject: string, body: string, html?: string) {
    const htmlBody = html || body.replace(/\n/g, '<br>')
    const transport = resolveTransport()

    console.log(
      JSON.stringify({
        scope: 'notification.sendEmail',
        transport,
        to,
        subject,
        at: new Date().toISOString(),
      })
    )

    if (transport === 'relay') {
      await sendViaMailRelay(to, subject, body, htmlBody)
      return
    }

    if (transport === 'resend') {
      await sendViaResend(to, subject, body, htmlBody)
      return
    }

    try {
      await sendViaSmtp(to, subject, body, htmlBody)
    } catch (error: any) {
      const code = error?.code || error?.errno || ''
      if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
        throw new Error(
          `SMTP connection failed (${code}). Render free tier blocks outbound SMTP ports 25/465/587. ` +
            `Set MAIL_RELAY_URL + MAIL_RELAY_SECRET (HTTPS relay on local-van.com) or RESEND_API_KEY.`
        )
      }
      throw error
    }
  }

  async sendSMS(to: string, message: string) {
    console.log(`SMS would be sent to ${to}: ${message}`)
  }

  async sendPushNotification(userId: string, title: string, body: string) {
    console.log(`Push notification would be sent to ${userId}: ${title} - ${body}`)
  }
}

export const notificationService = new NotificationService()
