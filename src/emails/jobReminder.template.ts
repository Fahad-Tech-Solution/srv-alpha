import { formatFullAddress } from '../utils/addressFormat'

export type ReminderEmailInput = {
  recipientName: string
  orderCode: string
  pickupDate: string
  pickupTime: string
  pickupAddress: string
  deliveryAddress: string
  contactPhone?: string
  contactEmail?: string
  role: 'customer' | 'driver'
  supportEmail?: string
  websiteUrl?: string
}

export function buildJobReminderEmail(input: ReminderEmailInput): {
  subject: string
  text: string
  html: string
} {
  const support = input.supportEmail || 'info@local-van.com'
  const site = input.websiteUrl || 'https://local-van.com'
  const who = input.role === 'customer' ? 'your move' : 'your assigned job'
  const subject = `Reminder: Local Van job #${input.orderCode}`

  const text = [
    `Hi ${input.recipientName},`,
    '',
    `This is a reminder about ${who} #${input.orderCode}.`,
    `Date: ${input.pickupDate}`,
    `Time: ${input.pickupTime}`,
    `Pickup: ${input.pickupAddress}`,
    `Delivery: ${input.deliveryAddress}`,
    input.contactPhone ? `Contact phone: ${input.contactPhone}` : '',
    input.contactEmail ? `Contact email: ${input.contactEmail}` : '',
    '',
    `If you have any questions, email ${support}.`,
    site,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1A2332;line-height:1.5">
  <h2 style="color:#0B1F33">Job reminder #${escapeHtml(input.orderCode)}</h2>
  <p>Hi ${escapeHtml(input.recipientName)},</p>
  <p>This is a reminder about ${who}.</p>
  <table style="border-collapse:collapse;width:100%;max-width:520px">
    <tr><td style="padding:6px 0;color:#5B6775">Date</td><td style="padding:6px 0">${escapeHtml(input.pickupDate)}</td></tr>
    <tr><td style="padding:6px 0;color:#5B6775">Time</td><td style="padding:6px 0">${escapeHtml(input.pickupTime)}</td></tr>
    <tr><td style="padding:6px 0;color:#5B6775">Pickup</td><td style="padding:6px 0">${escapeHtml(input.pickupAddress)}</td></tr>
    <tr><td style="padding:6px 0;color:#5B6775">Delivery</td><td style="padding:6px 0">${escapeHtml(input.deliveryAddress)}</td></tr>
  </table>
  <p style="margin-top:24px;color:#5B6775;font-size:14px">Questions? <a href="mailto:${escapeHtml(support)}">${escapeHtml(support)}</a></p>
</body></html>`

  return { subject, text, html }
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function bookingAddressesForEmail(booking: {
  pickupHouseName?: string
  pickupHouseNumber?: string
  pickupAddress?: string
  pickupCity?: string
  pickupZipCode?: string
  deliveryHouseName?: string
  deliveryHouseNumber?: string
  deliveryAddress?: string
  deliveryCity?: string
  deliveryZipCode?: string
}): { pickup: string; delivery: string } {
  return {
    pickup: formatFullAddress({
      houseName: booking.pickupHouseName,
      houseNumber: booking.pickupHouseNumber,
      address: booking.pickupAddress,
      city: booking.pickupCity,
      zipCode: booking.pickupZipCode,
    }),
    delivery: formatFullAddress({
      houseName: booking.deliveryHouseName,
      houseNumber: booking.deliveryHouseNumber,
      address: booking.deliveryAddress,
      city: booking.deliveryCity,
      zipCode: booking.deliveryZipCode,
    }),
  }
}
