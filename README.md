# Sihi Bakes

Next.js storefront and admin panel for Sihi Bakes — orders, delivery, enquiries, and WhatsApp notifications backed by Supabase.

## Prerequisites

- Node.js 20+
- A Supabase project (see `.env.example`)
- Optional: Razorpay, Google Maps, Borzo, WhatsApp Cloud API keys for full checkout and messaging flows

Copy environment variables:

```bash
cp .env.example .env.local
```

Fill in values from Supabase → **Project Settings → API** and **Database**.

---

## Scripts handbook

All commands run from the project root.

### Quick reference

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run production server (after `build`) |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Apply SQL migrations to Supabase |
| `npm run db:seed` | Insert sample customers and orders |
| `npm run db:reset` | Wipe transactional data; keep products & settings |

---

### App scripts

#### `npm run dev`

Starts the Next.js development server at [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

Use for local development. Hot reload is enabled.

#### `npm run build`

Creates an optimized production build.

```bash
npm run build
```

Run before deploying or before `npm run start`.

#### `npm run start`

Serves the production build.

```bash
npm run build
npm run start
```

#### `npm run lint`

Runs ESLint across the project.

```bash
npm run lint
```

---

### Database scripts

Database scripts live in [`scripts/`](scripts/). They read `.env.local` (and `.env` as fallback) when noted below.

**Required for all `db:*` commands:**

```env
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<host>:6543/postgres?pgbouncer=true
```

Get this from Supabase → **Project Settings → Database → Connection string (URI)**. Use the pooler URI for scripts.

> **Note:** `db:migrate` re-runs every file in `supabase/migrations/` in sorted order. On an existing database that already has schema applied, prefer the Supabase CLI or Dashboard SQL editor for new migrations only.

---

#### `npm run db:migrate`

**File:** [`scripts/migrate.mjs`](scripts/migrate.mjs)

Applies all SQL migration files in `supabase/migrations/` to your Postgres database.

```bash
npm run db:migrate
```

| | |
| --- | --- |
| **When to use** | Fresh database setup, or when you need to apply migration files manually |
| **Requires** | `DATABASE_URL` |
| **Idempotent** | No — re-applying migrations that already ran may error |

---

#### `npm run db:seed`

**File:** [`scripts/seed-orders.mjs`](scripts/seed-orders.mjs)

Seeds demo **customers** and **paid orders** for testing the admin panel, roster, and analytics.

```bash
npm run db:seed
```

| | |
| --- | --- |
| **When to use** | Local/staging testing after migrations; populate admin with realistic order data |
| **Requires** | `DATABASE_URL` **or** `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` |
| **Idempotent** | Yes — deletes existing seed orders (`order_number` like `SEED-%`) before inserting |

**What it creates:**

- 12 sample customers (phones `9800000001`–`9800000012`)
- Orders spanning **5 days before → 5 days after** today
- Order numbers prefixed with `SEED-` (e.g. `SEED-20260701-0001`)
- Mix of statuses: confirmed, preparing, out for delivery, delivered, cancelled
- Delivery slots for those dates if missing (windows 10–12, 12–14, 16–18, 18–20)
- Uses your **active products** from the database

**Prerequisites:** At least one active product must exist (from migrations seed or Admin → Products).

---

#### `npm run db:reset`

**File:** [`scripts/reset-data.mjs`](scripts/reset-data.mjs)

Clears transactional and customer data while **keeping catalog and shop configuration**. Intended for wiping test data before go-live or after heavy testing.

```bash
npm run db:reset -- --confirm
```

Without `--confirm`, the script prints a warning and exits (safety guard).

| | |
| --- | --- |
| **When to use** | Before production launch, after seeding/testing, or to start with a clean order history |
| **Requires** | `DATABASE_URL` |
| **Destructive** | Yes — cannot be undone |

**Deleted / cleared:**

| Table | Action |
| --- | --- |
| `orders`, `order_items` | Deleted |
| `customers` | Deleted |
| `contact_enquiries`, `enquiry_items` | Deleted |
| `whatsapp_conversations`, `whatsapp_messages`, `whatsapp_message_log` | Deleted |
| `customer_activity_sessions`, `customer_activity_events`, `customer_activity_profiles` | Deleted |
| `phone_otps`, `phone_verifications`, `phone_legal_acknowledgements` | Deleted |
| `admin_alerts`, `customer_reviews`, `expenses` | Deleted |
| `product_daily_counts` | Truncated (order counters → 0) |
| `delivery_slots.orders_booked` | Reset to `0` |

**Preserved:**

| Table | Notes |
| --- | --- |
| `products` | Full catalog |
| `product_daily_availability` | Per-day product limits |
| `shop_settings` | Kitchen location, radius, closed dates, etc. |
| `delivery_fee_slabs` | Fee tiers |
| `delivery_vendors` | Borzo / manual dispatch config |
| `coupons` | Promo codes |
| `delivery_slots` | Slot definitions (only booking counts zeroed) |

The script prints row counts **before** and **after** the reset.

---

## Common workflows

### First-time local setup

```bash
cp .env.example .env.local
# Edit .env.local with Supabase, Maps, Razorpay keys

npm install
npm run db:migrate    # if schema not yet applied
npm run dev
```

### Test admin with sample orders

```bash
npm run db:seed
npm run dev
# Open /admin/orders
```

### Wipe test data before go-live

```bash
npm run db:reset -- --confirm
```

### Re-seed after a reset

```bash
npm run db:reset -- --confirm
npm run db:seed
```

---

## Related documentation

| Doc | Description |
| --- | --- |
| [`.env.example`](.env.example) | All environment variables with comments |
| [`docs/whatsapp-meta-setup.md`](docs/whatsapp-meta-setup.md) | WhatsApp Cloud API templates and webhook setup |
| [`docs/amplify-deploy.md`](docs/amplify-deploy.md) | AWS Amplify Hosting setup and verification |
| [`supabase/migrations/`](supabase/migrations/) | Database schema history |

---

## Deploy

### Vercel (production)

The app is designed for [Vercel](https://vercel.com). Set the same environment variables in the Vercel project settings. Do **not** run `db:migrate` or `db:reset` against production unless you intend to change that database.

```bash
npm run build
```

Push to your connected Git branch for automatic preview/production deploys.

### AWS Amplify (additional environment)

To deploy alongside Vercel, follow [`docs/amplify-deploy.md`](docs/amplify-deploy.md). The repo includes [`amplify.yml`](amplify.yml) for SSR builds in **ap-south-1**.

Set `NEXT_PUBLIC_APP_URL` to your Amplify domain. Add that domain to Supabase **Authentication → Redirect URLs** for admin login. Webhooks can stay on Vercel until you switch production traffic.
