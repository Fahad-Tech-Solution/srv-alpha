export type InvoiceLinkEmailInput = {
  customerName: string
  orderCode: string
  amount: number
  invoiceUrl: string
  pickupCity?: string
  deliveryCity?: string
  pickupDate?: string
  supportEmail?: string
  websiteUrl?: string
  logoUrl?: string
}

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
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatPrice(amount: number): string {
  return `£${Number(amount).toFixed(2)}`
}

export function buildInvoiceLinkEmail(input: InvoiceLinkEmailInput): {
  subject: string
  text: string
  html: string
} {
  const name = input.customerName?.trim() || 'there'
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const route =
    input.pickupCity && input.deliveryCity
      ? `${input.pickupCity} → ${input.deliveryCity}`
      : null
  const subject = `Invoice for your Local Van booking — ${input.orderCode}`

  const text = [
    `Hi ${name},`,
    '',
    `Please pay your Local Van invoice for order ${input.orderCode}.`,
    route ? `Route: ${route}` : null,
    input.pickupDate ? `Pickup: ${input.pickupDate}` : null,
    `Amount due: ${formatPrice(input.amount)}`,
    '',
    `Pay securely with PayPal: ${input.invoiceUrl}`,
    '',
    `Need help? Email ${supportEmail}`,
    websiteUrl,
  ]
    .filter(Boolean)
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:${BRAND.ink};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND.bg};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:${BRAND.white};border-radius:12px;overflow:hidden;border:1px solid ${BRAND.border};">
          <tr>
            <td style="background:${BRAND.navy};padding:20px 28px;">
              <a href="${websiteUrl}" style="text-decoration:none;">
                <img src="${logoUrl}" alt="Local Van" width="160" style="display:block;width:160px;max-width:70%;height:auto;border:0;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:${BRAND.navy};">Invoice ready</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
                Hi ${escapeHtml(name)}, your invoice for order
                <strong style="color:${BRAND.navy};">${escapeHtml(input.orderCode)}</strong>
                is ready. Please pay securely via PayPal.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
                ${
                  route
                    ? `<tr><td style="padding:14px 16px;font-size:14px;color:${BRAND.ink};"><span style="color:${BRAND.muted};">Route</span><br /><strong>${escapeHtml(route)}</strong></td></tr>`
                    : ''
                }
                ${
                  input.pickupDate
                    ? `<tr><td style="padding:14px 16px;font-size:14px;color:${BRAND.ink};border-top:1px solid ${BRAND.border};"><span style="color:${BRAND.muted};">Pickup</span><br /><strong>${escapeHtml(input.pickupDate)}</strong></td></tr>`
                    : ''
                }
                <tr>
                  <td style="padding:14px 16px;font-size:14px;color:${BRAND.ink};border-top:1px solid ${BRAND.border};">
                    <span style="color:${BRAND.muted};">Amount due</span><br />
                    <strong style="font-size:18px;color:${BRAND.navy};">${escapeHtml(formatPrice(input.amount))}</strong>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:8px;background:${BRAND.yellow};">
                    <a href="${escapeHtml(input.invoiceUrl)}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:${BRAND.navy};text-decoration:none;">
                      Pay invoice
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                If the button does not work, open this link:<br />
                <a href="${escapeHtml(input.invoiceUrl)}" style="color:${BRAND.navy};word-break:break-all;">${escapeHtml(input.invoiceUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;">
              <div style="border-top:1px solid ${BRAND.border};padding-top:18px;">
                <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                  Need help? Email <a href="mailto:${supportEmail}" style="color:${BRAND.navy};">${supportEmail}</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}
