# Mail relay (bypass Render SMTP block)

Render **free** web services block outbound SMTP on ports `25`, `465`, and `587`.
That is why logs show `ETIMEDOUT` / `Connection timeout` even when credentials are correct.

## Fix (recommended)

1. Upload [`send-mail.standalone.php`](./send-mail.standalone.php) to your Local Van hosting as:

   `https://local-van.com/api/send-mail.php`

2. Edit the `$RELAY_SECRET` value inside that PHP file.

3. On Render, set:

```
MAIL_RELAY_URL=https://local-van.com/api/send-mail.php
MAIL_RELAY_SECRET=<same-secret-as-php>
EMAIL_TRANSPORT=auto
SMTP_FROM_EMAIL=info@local-van.com
SMTP_FROM_NAME=Local Van
CUSTOMER_APP_URL=https://fahad-tech-solution.github.io/Local-Van/#
```

4. Redeploy the Node server.

5. Resend the failed invite:

```
POST /internal/integrations/customers/resend-invite
{ "email": "fahadtechfts@gmail.com" }
```

(signed with the same integration headers), or:

```
POST /api/admin/users/:customerId/resend-invite
```

as an admin.

## Optional: Resend.com

If you prefer a SaaS API instead of the PHP relay:

```
RESEND_API_KEY=re_xxx
EMAIL_TRANSPORT=resend
```

(Verify `info@local-van.com` / domain in Resend.)

## Local development

SMTP still works locally. Leave `MAIL_RELAY_URL` unset, or set `EMAIL_TRANSPORT=smtp`.
