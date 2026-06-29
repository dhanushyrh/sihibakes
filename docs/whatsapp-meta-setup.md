# Meta WhatsApp Webhook Setup

Use this checklist after deploying the WhatsApp chat integration.

## 1. Environment variables

Set these in Vercel (or local `.env`):

| Variable | Purpose |
| --- | --- |
| `WHATSAPP_ACCESS_TOKEN` | Graph API token with `whatsapp_business_messaging` |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number ID from WhatsApp Manager |
| `WHATSAPP_VERIFY_TOKEN` | Any secret string you choose for webhook verification |
| `WHATSAPP_APP_SECRET` | App Secret from Meta App Dashboard → App settings → Basic |
| `WHATSAPP_WABA_ID` | WhatsApp Business Account ID — required for template create/list API |

## 2. Webhook callback URL

In [Meta App Dashboard](https://developers.facebook.com/) → your app → **WhatsApp** → **Configuration**:

1. **Callback URL**: `https://<your-production-domain>/api/whatsapp/webhook`
2. **Verify token**: same value as `WHATSAPP_VERIFY_TOKEN`
3. Click **Verify and save**

For local testing, expose your dev server with a tunnel (e.g. ngrok):

```bash
ngrok http 3000
# Use https://<subdomain>.ngrok.io/api/whatsapp/webhook
```

## 3. Subscribe to webhook fields

Under the same WhatsApp Configuration page, subscribe to:

- `messages` — inbound customer messages
- `messages` statuses are delivered via the `statuses` payload when `messages` field is subscribed

Also useful later:

- `message_template_status_update` — template approval changes

## 4. Messaging rules

- **Customer replies**: arrive via webhook → stored in `whatsapp_conversations` / `whatsapp_messages` → visible in Admin → WhatsApp.
- **Free-form replies**: allowed only within 24 hours of the customer's last message.
- **Business-initiated messages**: must use approved templates when outside the 24-hour window.
- **Welcome auto-reply**: when a customer message opens (or re-opens) the 24-hour window, the app sends a one-time plain-text reply with your store link. Follow-up messages within the same window do not trigger another auto-reply. This is Meta-compliant because the customer just messaged you. Toggle with `WHATSAPP_AUTO_REPLY_ENABLED` (default `true`). Optional store URL override: `WHATSAPP_AUTO_REPLY_STORE_URL` (defaults to `https://sihibakes.in/orders`).

## 5. Approved templates

Ensure these templates exist in WhatsApp Manager (names must match env vars):

- `checkout_otp`
- `jaspers_market_order_confirmation_v1` (or your order-placed template)
- `order_confirmed`
- `order_status_update`
- `order_out_for_delivery_v2`
- `order_cancelled`

Admin chat can send the order-related templates from the inbox when the reply window is closed.

## 8. Create templates via API

You can list and create templates from **Admin → WhatsApp → Templates**, or call:

- `GET /api/admin/whatsapp/templates` — list templates from Meta
- `POST /api/admin/whatsapp/templates` — create a custom template
- `POST /api/admin/whatsapp/templates/seed` — submit the default Sihi order/OTP templates

Requirements:

- `WHATSAPP_WABA_ID` set in env
- Access token with `whatsapp_business_management` scope
- New templates start as `PENDING` until Meta approves (usually within 24 hours)
- Meta rate limit: ~100 template creates per hour per WABA

## 6. Verify end-to-end

1. Send a WhatsApp message to your business number from a test phone.
2. Confirm `POST /api/whatsapp/webhook` returns `{ "received": true }` in server logs.
3. Open **Admin → WhatsApp** and confirm the conversation appears.
4. Reply while the 24-hour window is open.
5. After the window closes, send a template instead.

## 7. Database migration

Apply the new migration before testing:

```bash
npm run db:migrate
```

This creates `whatsapp_conversations` and `whatsapp_messages`.
