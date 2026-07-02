# AWS Amplify Deployment

Deploy Sihi Bakes to [AWS Amplify Hosting](https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html) alongside the existing Vercel deployment. The repo includes [`amplify.yml`](../amplify.yml) for build settings.

## 1. Create the Amplify app

1. Open [AWS Amplify Console](https://console.aws.amazon.com/amplify/) in **ap-south-1** (Mumbai).
2. **Create new app** → **Host web app** → connect your Git provider and repository.
3. Select the branch to deploy (e.g. `main` or a dedicated `amplify` branch).
4. Amplify should detect **Next.js — SSR** (`WEB_COMPUTE`). If not, set the platform to `WEB_COMPUTE` manually under **App settings → General**.
5. Under **Advanced settings**, enable **SSR app logs** (CloudWatch) for API/webhook debugging.
6. Confirm build settings use the repo’s `amplify.yml` (it overrides console defaults).

## 2. Environment variables

In Amplify Console → **Hosting** → **Environment variables**, copy every variable from [`.env.example`](../.env.example).

| Variable | Amplify value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Your Amplify URL, e.g. `https://main.d1234abcd.amplifyapp.com` (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | Same as Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as Vercel (server-only secret) |
| All other `RAZORPAY_*`, `WHATSAPP_*`, `BORZO_*`, etc. | Same keys as production/staging |

Do **not** commit `.env.local`. `DATABASE_URL` is only needed for local `npm run db:migrate`, not for Amplify hosting.

The build pipes matching env vars into `.env.production` so server components and API routes can read them at runtime.

## 3. Supabase auth (admin panel)

While Vercel and Amplify run in parallel, add the Amplify domain to Supabase so admin login works on both hosts.

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL configuration**:

1. **Site URL** — keep your primary production URL (e.g. Vercel / `https://sihibakes.in`).
2. **Redirect URLs** — add:
   - `https://<your-amplify-domain>/admin`
   - `https://<your-amplify-domain>/admin/**` (if your project uses wildcard redirects)

Example redirect URLs when both hosts are active:

```
http://localhost:3000/admin
https://sihibakes.in/admin
https://main.d1234abcd.amplifyapp.com/admin
```

Local `supabase/config.toml` only applies to `supabase start`; production redirect URLs are managed in the dashboard.

## 4. Webhooks (while Vercel is primary)

Meta WhatsApp and Razorpay each accept **one** webhook URL. If production webhooks still point at Vercel:

- **Storefront, admin, and read-only APIs** work on Amplify with the same Supabase project.
- **Inbound WhatsApp messages**, **payment webhooks**, and **OTP via WhatsApp** will not reach Amplify until you change the webhook URL in Meta / Razorpay or use separate test credentials.

See [`docs/whatsapp-meta-setup.md`](whatsapp-meta-setup.md) for WhatsApp callback configuration.

## 5. Deploy

Push to the connected branch or click **Redeploy** in Amplify Console. The build runs:

```bash
nvm use 20
npm ci
npm run build
```

If the build fails with `ENOENT ... proxy.js`, `amplify.yml` already copies `middleware.js` → `proxy.js` as a workaround for Next.js 16 `proxy.ts` on Amplify Hosting.

## 6. Post-deploy verification

| Check | How |
| --- | --- |
| Build | Amplify build succeeds without `proxy.js` or `required-server-files.json` errors |
| Storefront | `/` and `/orders` load products from Supabase |
| Images | Product images load via `next/image` (requires `NEXT_PUBLIC_SUPABASE_URL` at build time) |
| Admin auth | `/admin` redirects to login; successful login reaches the dashboard |
| API health | `GET /api/health` returns OK |
| Payments | Checkout shows Razorpay UI; full capture only if webhook URL points to Amplify |
| ISR | Homepage reflects product changes within ~60 seconds |

## 7. Custom domain (optional)

To use a subdomain (e.g. `amplify.sihibakes.in`) instead of `*.amplifyapp.com`:

1. Amplify Console → **Domain management** → add domain.
2. Update DNS per Amplify instructions.
3. Set `NEXT_PUBLIC_APP_URL` to the new domain and redeploy.
4. Add the custom domain to Supabase redirect URLs.

## Related

| Doc | Description |
| --- | --- |
| [`.env.example`](../.env.example) | All environment variables |
| [`amplify.yml`](../amplify.yml) | Amplify build spec |
| [`vercel.json`](../vercel.json) | Vercel config (unchanged; ignored by Amplify) |
