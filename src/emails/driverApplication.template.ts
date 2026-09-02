const BRAND = {
  yellow: '#F5C518',
  navy: '#0B1F33',
  ink: '#1A2332',
  muted: '#5B6775',
  border: '#E6EAF0',
  bg: '#F4F6F8',
  white: '#FFFFFF',
}

const DEFAULT_LOGO_URL = 'https://local-van.com/oobevyhe/2020/05/LOCAL-VAN-LOGO.png'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function emailShell(title: string, bodyHtml: string, supportEmail: string, websiteUrl: string, logoUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.white};border-radius:12px;border:1px solid ${BRAND.border};">
        <tr><td style="background:${BRAND.navy};padding:20px 28px;">
          <img src="${logoUrl}" alt="Local Van" width="160" style="display:block;width:160px;max-width:70%;height:auto;border:0;" />
        </td></tr>
        <tr><td style="padding:32px 28px;">${bodyHtml}</td></tr>
        <tr><td style="padding:0 28px 28px;">
          <div style="border-top:1px solid ${BRAND.border};padding-top:18px;font-size:13px;color:${BRAND.muted};">
            Need help? Email <a href="mailto:${supportEmail}" style="color:${BRAND.navy};">${supportEmail}</a>
            · <a href="${websiteUrl}" style="color:${BRAND.navy};">local-van.com</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function buildDriverApplicationReceivedEmail(input: {
  name: string
  supportEmail?: string
  websiteUrl?: string
  logoUrl?: string
}) {
  const name = input.name.trim() || 'there'
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const subject = 'We received your Local Van driver application'

  const text = [
    `Hi ${name},`,
    '',
    'Thank you for applying to drive with Local Van.',
    'Our team will review your application and contact you by email once a decision has been made.',
    '',
    `Questions? Email ${supportEmail}`,
    '',
    '— The Local Van team',
  ].join('\n')

  const html = emailShell(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.navy};">Application received</h1>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)}, thank you for your interest in joining Local Van as a driver.</p>
     <p style="margin:0;font-size:15px;line-height:1.6;">We will review your details and email you when your application has been approved or declined.</p>`,
    supportEmail,
    websiteUrl,
    logoUrl
  )

  return { subject, text, html }
}

export function buildDriverApplicationAdminNotifyEmail(input: {
  applicantName: string
  applicantEmail: string
  adminPortalUrl?: string
  supportEmail?: string
  websiteUrl?: string
  logoUrl?: string
}) {
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const adminUrl = input.adminPortalUrl || 'https://fahad-tech-solution.github.io/Local-Van/#/admin/driver-applications'
  const subject = `New driver application — ${input.applicantName}`

  const text = [
    'A new driver application was submitted.',
    '',
    `Name: ${input.applicantName}`,
    `Email: ${input.applicantEmail}`,
    '',
    `Review in admin: ${adminUrl}`,
  ].join('\n')

  const html = emailShell(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.navy};">New driver application</h1>
     <p style="margin:0 0 8px;"><strong>${escapeHtml(input.applicantName)}</strong></p>
     <p style="margin:0 0 16px;color:${BRAND.muted};">${escapeHtml(input.applicantEmail)}</p>
     <a href="${adminUrl}" style="display:inline-block;padding:12px 20px;background:${BRAND.yellow};color:${BRAND.navy};font-weight:700;text-decoration:none;border-radius:8px;">Review application</a>`,
    supportEmail,
    websiteUrl,
    logoUrl
  )

  return { subject, text, html }
}

export function buildDriverApplicationApprovedEmail(input: {
  name: string
  inviteUrl: string
  supportEmail?: string
  websiteUrl?: string
  logoUrl?: string
}) {
  const name = input.name.trim() || 'there'
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const subject = 'Your Local Van driver application has been approved'

  const text = [
    `Hi ${name},`,
    '',
    'Great news — your driver application with Local Van has been approved.',
    '',
    'Set your password to access your driver account:',
    input.inviteUrl,
    '',
    'This link expires in 7 days.',
    '',
    `Need help? Email ${supportEmail}`,
  ].join('\n')

  const html = emailShell(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.navy};">Application approved</h1>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)}, welcome to Local Van! Your driver application has been approved.</p>
     <p style="margin:0 0 20px;font-size:15px;line-height:1.6;">Click below to set your password and access your driver dashboard.</p>
     <a href="${input.inviteUrl}" style="display:inline-block;padding:14px 22px;background:${BRAND.yellow};color:${BRAND.navy};font-weight:700;text-decoration:none;border-radius:8px;">Set up your account</a>
     <p style="margin:16px 0 0;font-size:13px;color:${BRAND.muted};">Link expires in 7 days.</p>`,
    supportEmail,
    websiteUrl,
    logoUrl
  )

  return { subject, text, html }
}

export function buildDriverApplicationRejectedEmail(input: {
  name: string
  note?: string
  supportEmail?: string
  websiteUrl?: string
  logoUrl?: string
}) {
  const name = input.name.trim() || 'there'
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const subject = 'Update on your Local Van driver application'

  const noteLine = input.note?.trim()
    ? `\n\nNote from our team: ${input.note.trim()}`
    : ''

  const text = [
    `Hi ${name},`,
    '',
    'Thank you for your interest in driving with Local Van.',
    'After reviewing your application, we are unable to approve it at this time.',
    noteLine,
    '',
    `If you have questions, contact us at ${supportEmail}.`,
  ].join('\n')

  const html = emailShell(
    subject,
    `<h1 style="margin:0 0 12px;font-size:22px;color:${BRAND.navy};">Application update</h1>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Hi ${escapeHtml(name)}, thank you for applying to drive with Local Van.</p>
     <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">After review, we are unable to approve your application at this time.</p>
     ${input.note?.trim() ? `<p style="margin:0;padding:12px;background:${BRAND.bg};border-radius:8px;font-size:14px;"><strong>Note:</strong> ${escapeHtml(input.note.trim())}</p>` : ''}`,
    supportEmail,
    websiteUrl,
    logoUrl
  )

  return { subject, text, html }
}
