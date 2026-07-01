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

Ensure these templates exist in WhatsApp Manager (names must match env vars). All utility templates use locale **`en_US`** unless noted.

| Template | Env var | Locale | Body params | Sent when |
| --- | --- | --- | --- | --- |
| `reach_confirmation` | `WHATSAPP_TEMPLATE_OTP` | `en_US` | `{{1}}` id, `{{2}}` support phone | Checkout phone verify |
| `checkout_otp` | `WHATSAPP_TEMPLATE_OTP` | `en` | `{{1}}` code (+ copy button) | Auth OTP (TIER_2K+ only) |
| `order_confirmed` | `WHATSAPP_TEMPLATE_ORDER_PLACED` / `ORDER_CONFIRMED` | `en_US` | name, order #, total, slot | Payment success / confirmed |
| `order_status_update` | `WHATSAPP_TEMPLATE_ORDER_STATUS` | `en_US` | order #, status label, note | Preparing / delivered |
| `order_out_for_delivery_v2` | `WHATSAPP_TEMPLATE_ORDER_DISPATCH` | `en_US` | order #, partner, ref, ETA | Out for delivery |
| `order_cancelled` | `WHATSAPP_TEMPLATE_ORDER_CANCELLED` | `en_US` | order #, reason | Order cancelled |
| `enquiry_received` | `WHATSAPP_TEMPLATE_ENQUIRY_RECEIVED` | `en_US` | first name, reference | Enquiry submitted |

The app validates body parameter counts and normalizes `en` → `en_US` for utility templates before each send.

Template list:

- `enquiry_received` (UTILITY — sent when a customer submits an enquiry)
- `reach_confirmation` (UTILITY — default for checkout id messages; works on lower messaging tiers)
- `checkout_otp` (AUTHENTICATION — optional; see tier requirement below)
- `order_confirmed` (order placed on payment + admin confirmation)
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

### Enquiry acknowledgment (`enquiry_received`)

Sent automatically when a customer submits a general, kitty party, or landing enquiry (after phone verification):

> Hi {{1}}, thank you for your enquiry at Sihi Bakes. Your reference is {{2}}. Our team will get back to you shortly.

- `{{1}}` — customer first name
- `{{2}}` — short enquiry reference (first 8 characters of enquiry id)

### Reach confirmation template (`reach_confirmation`)

The app sends checkout ids via a **UTILITY** template (default `WHATSAPP_TEMPLATE_OTP=reach_confirmation`):

> Thanks for reaching out Sihi Bakes, your id is {{1}}. Please reach out for more support at {{2}} if needed.

- `{{1}}` — reference id shown to the customer at checkout
- `{{2}}` — your shop support phone (from Admin → Settings, or `STORE_CONTACT` fallback)

Create it via **Admin → WhatsApp → Templates → Seed defaults**, or set `WHATSAPP_TEMPLATE_OTP=reach_confirmation` after Meta approves the template.

### Authentication template (`checkout_otp`, optional)

Meta does **not** allow AUTHENTICATION templates on accounts below **messaging tier TIER_2K** (2,000 business-initiated conversations per day). New numbers typically start at **TIER_250**.

- Set `WHATSAPP_TEMPLATE_OTP=checkout_otp` and `WHATSAPP_TEMPLATE_OTP_LANGUAGE=en` only after tier upgrade.
- Create via `POST /<WABA_ID>/upsert_message_templates` (the app seed route uses this automatically).
- If API returns *"does not have permission to create message template"* (error code 10, subcode 2388185), your WABA is not eligible yet.
- **Workaround until tier upgrades:** use `reach_confirmation` (seeded by default) instead of the authentication template.
- **To become eligible:** send high-quality template messages to grow to TIER_2K, then re-run seed or create `checkout_otp` in WhatsApp Manager → Message templates → Create → Authentication.

Check your tier in WhatsApp Manager → Phone numbers → Messaging limits, or via Graph API field `messaging_limit_tier` on the phone number ID.


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
