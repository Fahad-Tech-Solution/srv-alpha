export type OnboardingInviteEmailInput = {
  customerName: string
  inviteUrl: string
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

export function buildOnboardingInviteEmail(input: OnboardingInviteEmailInput): {
  subject: string
  text: string
  html: string
} {
  const name = input.customerName?.trim() || 'there'
  const supportEmail = input.supportEmail || 'info@local-van.com'
  const websiteUrl = input.websiteUrl || 'https://local-van.com'
  const logoUrl = input.logoUrl || process.env.EMAIL_LOGO_URL || DEFAULT_LOGO_URL
  const subject = 'Complete your Local Van account setup'

  const text = [
    `Welcome ${name},`,
    '',
    'Thanks for booking with Local Van — your payment was received and your booking is confirmed.',
    '',
    'Set your password to access your customer account, track your move, and manage booking details:',
    input.inviteUrl,
    '',
    'This secure link expires in 7 days.',
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
  <title>${subject}</title>
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
              <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:${BRAND.navy};">Welcome ${escapeHtml(name)}</h1>
              <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
                Thanks for booking with Local Van. Your payment was received and your booking is confirmed.
              </p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${BRAND.ink};">
                Set your password to access your customer account, track your move, and manage booking details.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-radius:8px;background:${BRAND.yellow};">
                    <a href="${input.inviteUrl}" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:${BRAND.navy};text-decoration:none;">
                      Complete account setup
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 24px 0;font-size:12px;line-height:1.5;word-break:break-all;color:${BRAND.navy};">
                <a href="${input.inviteUrl}" style="color:${BRAND.navy};">${escapeHtml(input.inviteUrl)}</a>
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:${BRAND.muted};">
                This secure link expires in <strong>7 days</strong>. If you did not make this booking, you can ignore this email.
              </p>
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
