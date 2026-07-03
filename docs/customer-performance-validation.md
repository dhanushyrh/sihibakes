# Customer performance validation

Use this checklist after deploying storefront performance changes.

## Vercel Speed Insights

1. Open the Vercel project → **Speed Insights**.
2. Filter routes to exclude `/admin` (e.g. `/orders`, `/orders/delivery/menu`).
3. Compare **FCP** and **LCP** before vs after deploy:
   - Target hub LCP (`/orders`): under **2.5s** on mobile
   - Target menu TTFB (`/orders/delivery/menu`): under **600ms** when ISR cache is warm
   - Checkout should show lower **TBT** after lazy Maps/Razorpay

## Lighthouse (mobile, throttled)

Run against production or a local production build (`npm run build && npm run start`):

```bash
npx lighthouse http://localhost:3000/orders --only-categories=performance --preset=perf --chrome-flags="--headless"
npx lighthouse http://localhost:3000/orders/delivery --only-categories=performance --preset=perf --chrome-flags="--headless"
npx lighthouse http://localhost:3000/orders/delivery/menu --only-categories=performance --preset=perf --chrome-flags="--headless"
npx lighthouse http://localhost:3000/orders/delivery/checkout --only-categories=performance --preset=perf --chrome-flags="--headless"
```

Record **TTFB**, **FCP**, **LCP**, **TBT**, and **Total JS** in deployment notes.

### Baseline snapshot (local prod build, curl TTFB)

Lighthouse mobile runs require a local Chrome install. Until Chrome is available, use curl TTFB as a quick check:

```bash
for route in /orders /orders/delivery /orders/delivery/menu /orders/delivery/checkout; do
  curl -o /dev/null -s -w "$route TTFB=%{time_starttransfer}s\n" "http://localhost:3000$route"
done
```

Post-optimization local snapshot (warm server, ms):

| Route | TTFB (curl) |
|-------|-------------|
| `/orders` | ~248ms |
| `/orders/delivery` | ~25ms |
| `/orders/delivery/menu` | ~21ms |
| `/orders/delivery/checkout` | ~18ms |

Fill the full Lighthouse table after running with Chrome installed.

## Manual smoke test

- [ ] `/orders` — hub logo and product marquee paint without layout shift
- [ ] `/orders/delivery` — mode choice loads without full product catalog delay
- [ ] `/orders/delivery/menu` — no refetch spinner when returning with same delivery date/mode
- [ ] `/orders/delivery/checkout` — checkout loads with same pay button and Razorpay behaviour as before

## Caching note

Storefront hub, delivery mode, menu, and legacy `/menu` + `/cart` use `revalidate = 60` ISR. Delivery schedule is mirrored to cookies so the menu page SSR can align with saved session; client refetch behaviour is unchanged.
