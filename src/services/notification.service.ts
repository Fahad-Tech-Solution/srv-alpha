import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

let transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (transporter) {
    return transporter
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  if (!host || !user || !pass) {
    throw new Error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)')
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: {
      user,
      pass,
    },
  })

  return transporter
}

function getFromAddress(): string {
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@local-van.com'
  const name = process.env.SMTP_FROM_NAME || 'LocalVan'
  return `${name} <${email}>`
}

export class NotificationService {
  async sendEmail(to: string, subject: string, body: string, html?: string) {
    const mailer = getTransporter()
    await mailer.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text: body,
      html: html || body.replace(/\n/g, '<br>'),
    })
  }

  async sendSMS(to: string, message: string) {
    console.log(`SMS would be sent to ${to}: ${message}`)
  }

  async sendPushNotification(userId: string, title: string, body: string) {
    console.log(`Push notification would be sent to ${userId}: ${title} - ${body}`)
  }
}

export const notificationService = new NotificationService()
