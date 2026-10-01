# PayPal invoicing setup

Admin can send a PayPal invoice link for unpaid bookings. When the customer pays, PayPal calls our webhook and the booking is marked **paid**.

## Environment variables

Add to `server/.env`:

```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=
# Optional — business email on the invoice
PAYPAL_MERCHANT_EMAIL=
```

- `PAYPAL_MODE`: `sandbox` or `live`
- Currency is **GBP**

## PayPal app + webhook

1. Create an app in [PayPal Developer](https://developer.paypal.com/).
2. Enable **Invoicing** for the app.
3. Copy Client ID and Secret into `.env`.
4. Add a webhook pointing to:

   `https://<your-api-host>/api/payments/paypal/webhook`

5. Subscribe at least to:
   - `INVOICING.INVOICE.PAID`
   - `INVOICING.INVOICE.MARKED_AS_PAID` (optional)
6. Copy the Webhook ID into `PAYPAL_WEBHOOK_ID`.

## Admin usage

On **Booking Management**, for any booking with `paymentStatus = pending`, click **Send invoice**. The customer receives an email with a **Pay invoice** button. After payment, status updates automatically via the webhook.
