export type SurveyConfirmationEmailInput = {
  customerName: string
  orderCode: string
  surveyType: 'home' | 'video'
  pickupDate: string
  pickupTime: string
  address?: string
  supportEmail?: string
  websiteUrl?: string
}

export function buildSurveyConfirmationEmail(input: SurveyConfirmationEmailInput): {
  subject: string
  text: string
  html: string
} {
  const support = input.supportEmail || 'info@local-van.com'
  const typeLabel = input.surveyType === 'home' ? 'home visit survey' : 'video survey'
  const subject = `Survey booked — Local Van #${input.orderCode}`

  const text = [
    `Hi ${input.customerName},`,
    '',
    `Your ${typeLabel} is booked.`,
    `Reference: #${input.orderCode}`,
    `Date: ${input.pickupDate}`,
    `Time: ${input.pickupTime}`,
    input.address ? `Location: ${input.address}` : '',
    '',
    `If you need to reschedule, email ${support}.`,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;color:#1A2332;line-height:1.5">
  <h2 style="color:#0B1F33">Survey confirmed #${escapeHtml(input.orderCode)}</h2>
  <p>Hi ${escapeHtml(input.customerName)},</p>
  <p>Your <strong>${escapeHtml(typeLabel)}</strong> is booked for <strong>${escapeHtml(input.pickupDate)}</strong> at <strong>${escapeHtml(input.pickupTime)}</strong>.</p>
  ${input.address ? `<p>Location: ${escapeHtml(input.address)}</p>` : ''}
  <p style="margin-top:24px;color:#5B6775;font-size:14px">Need to change it? <a href="mailto:${escapeHtml(support)}">${escapeHtml(support)}</a></p>
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
