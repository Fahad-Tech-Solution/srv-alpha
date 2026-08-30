export type OrderConfirmationEmailInput = {
  customerName: string
  orderCode: string
  pickupAddress: string
  pickupCity: string
  pickupZipCode: string
  pickupDate: string
  pickupTime: string
  deliveryAddress: string
  deliveryCity: string
  deliveryZipCode: string
  serviceType: string
  vehicleType: string
  price: number
  paymentStatus: 'paid' | 'pending'
  paymentMethod?: string
  collectionStairs?: string
  deliveryStairs?: string
  peopleRequired?: string
  customerPortalUrl?: string
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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  'bank-transfer': 'Bank transfer',
  cash: 'Cash',
  card: 'Card',
  other: 'Other',
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  local: 'Local move',
  'long-distance': 'Long distance',
  interstate: 'Interstate',
}

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  'small-van': 'Small van',
  'medium-van': 'Medium van',
  'large-van': 'Large van',
  truck: 'Truck',
}

function formatPrice(amount: number): string {
  return `£${amount.toFixed(2)}`
}

function formatPaymentLine(input: OrderConfirmationEmailInput): string {
  if (input.paymentStatus === 'paid') {
    const method = input.paymentMethod
      ? PAYMENT_METHOD_LABELS[input.paymentMethod] || input.paymentMethod
      : 'Direct payment'
    return `Paid via ${method}`
  }
  return 'Payment pending'
}

export function buildOrderConfirmationEmail(input: OrderConfirmationEmailInput): {
  subject: string
  text: string
  html: string
} {
  const name = input.customerName?.trim() || 'there'
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const customerPortalUrl = input.customerPortalUrl || websiteUrl
  const serviceLabel = SERVICE_TYPE_LABELS[input.serviceType] || input.serviceType
  const vehicleLabel = VEHICLE_TYPE_LABELS[input.vehicleType] || input.vehicleType
  const paymentLine = formatPaymentLine(input)
  const subject = `Your Local Van booking is confirmed — ${input.orderCode}`
  const pickupAccessLine = input.collectionStairs ? `Access: ${input.collectionStairs}` : null
  const deliveryAccessLine = input.deliveryStairs ? `Access: ${input.deliveryStairs}` : null
  const peopleLine = input.peopleRequired ? `People required: ${input.peopleRequired}` : null

  const text = [
    `Hi ${name},`,
    '',
    'Thank you for booking with Local Van. Your move is confirmed.',
    '',
    `Order reference: ${input.orderCode}`,
    '',
    'Pickup',
    `${input.pickupAddress}, ${input.pickupCity}, ${input.pickupZipCode}`,
    `Date: ${input.pickupDate} at ${input.pickupTime}`,
    ...(pickupAccessLine ? [pickupAccessLine] : []),
    '',
    'Delivery',
    `${input.deliveryAddress}, ${input.deliveryCity}, ${input.deliveryZipCode}`,
    ...(deliveryAccessLine ? [deliveryAccessLine] : []),
    '',
    `Service: ${serviceLabel}`,
    `Vehicle: ${vehicleLabel}`,
    ...(peopleLine ? [peopleLine] : []),
    `Price: ${formatPrice(input.price)} (${paymentLine})`,
    '',
    `Track your booking: ${customerPortalUrl}`,
    '',
    `Need help? Email us at ${supportEmail} or visit ${websiteUrl}`,
    '',
    '— The Local Van team',
  ].join('\n')

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
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <a href="${websiteUrl}" style="text-decoration:none;">
                      <img
                        src="${logoUrl}"
                        alt="Local Van"
                        width="160"
                        style="display:block;width:160px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;"
                      />
                    </a>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <a href="${websiteUrl}" style="color:${BRAND.white};text-decoration:none;font-size:13px;opacity:0.9;">local-van.com</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 8px 28px;">
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:${BRAND.navy};">Booking confirmed</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
                Hi ${escapeHtml(name)}, thank you for booking with Local Van. Here are your booking details.
              </p>
              <p style="margin:0 0 24px 0;font-size:14px;line-height:1.5;color:${BRAND.muted};">
                Order reference: <strong style="color:${BRAND.navy};">${escapeHtml(input.orderCode)}</strong>
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;border:1px solid ${BRAND.border};border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:14px 16px;background:${BRAND.bg};font-size:13px;font-weight:700;color:${BRAND.navy};">Pickup</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.5;color:${BRAND.ink};">
                    ${escapeHtml(input.pickupAddress)}<br />
                    ${escapeHtml(input.pickupCity)}, ${escapeHtml(input.pickupZipCode)}<br />
                    <span style="color:${BRAND.muted};">${escapeHtml(input.pickupDate)} at ${escapeHtml(input.pickupTime)}</span>
                    ${input.collectionStairs ? `<br /><span style="color:${BRAND.muted};">Access: ${escapeHtml(input.collectionStairs)}</span>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;background:${BRAND.bg};font-size:13px;font-weight:700;color:${BRAND.navy};border-top:1px solid ${BRAND.border};">Delivery</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.5;color:${BRAND.ink};">
                    ${escapeHtml(input.deliveryAddress)}<br />
                    ${escapeHtml(input.deliveryCity)}, ${escapeHtml(input.deliveryZipCode)}
                    ${input.deliveryStairs ? `<br /><span style="color:${BRAND.muted};">Access: ${escapeHtml(input.deliveryStairs)}</span>` : ''}
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;background:${BRAND.bg};font-size:13px;font-weight:700;color:${BRAND.navy};border-top:1px solid ${BRAND.border};">Service &amp; price</td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:${BRAND.ink};">
                    ${escapeHtml(serviceLabel)} · ${escapeHtml(vehicleLabel)}<br />
                    ${input.peopleRequired ? `<span style="color:${BRAND.muted};">People required: ${escapeHtml(input.peopleRequired)}</span><br />` : ''}
                    <strong style="font-size:16px;color:${BRAND.navy};">${escapeHtml(formatPrice(input.price))}</strong>
                    <span style="color:${BRAND.muted};"> · ${escapeHtml(paymentLine)}</span>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:8px;background:${BRAND.yellow};">
                    <a href="${customerPortalUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:${BRAND.navy};text-decoration:none;">
                      View your booking
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px 28px;">
              <div style="border-top:1px solid ${BRAND.border};padding-top:18px;">
                <p style="margin:0 0 6px 0;font-size:13px;color:${BRAND.ink};"><strong>Need help?</strong></p>
                <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                  Email <a href="mailto:${supportEmail}" style="color:${BRAND.navy};">${supportEmail}</a>
                  &nbsp;·&nbsp;
                  <a href="${websiteUrl}" style="color:${BRAND.navy};">local-van.com</a>
                </p>
              </div>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-size:11px;color:${BRAND.muted};">
          © ${new Date().getFullYear()} Local Van · Reliable local &amp; long-distance moves
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
