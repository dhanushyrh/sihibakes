# Admin performance validation

Use this checklist after deploying admin performance changes to production.

## Vercel Speed Insights

1. Open the Vercel project → **Speed Insights**.
2. Filter routes by `/admin`.
3. Compare **FCP** and **LCP** before vs after deploy:
   - Target FCP: under 1.5s (shell + skeleton visible)
   - Target LCP: under 3s on `/admin`, `/admin/orders`, `/admin/analytics`

## Lighthouse (mobile, throttled)

Run against production URLs while logged in as admin:

```bash
npx lighthouse https://your-domain.com/admin --only-categories=performance --preset=desktop
npx lighthouse https://your-domain.com/admin/orders --only-categories=performance
npx lighthouse https://your-domain.com/admin/analytics --only-categories=performance
```

Record FCP, LCP, and TTFB in a spreadsheet or deployment notes.

## Manual smoke test

- [ ] `/admin` — heading and stat cards appear before product grid
- [ ] `/admin/orders` — table renders with data on first paint (no empty flash)
- [ ] `/admin/products` — product cards visible without waiting for client fetch
- [ ] `/admin/customers` — customer table visible on first paint
- [ ] Notification bell badge updates within ~2s without blocking page content
- [ ] Opening notification panel loads feed on demand
- [ ] `/admin/settings` and `/admin/market-analysis` — map loads after page shell (skeleton first)

## Caching note

Analytics and market analysis use a 2-minute in-memory TTL cache (`lib/admin-data-cache.ts`). Global `cacheComponents` was not enabled because it conflicts with existing route segment configs across the app.

Apply the product order counts RPC if not yet applied:

```bash
npm run db:migrate
```

This enables `get_product_order_counts` used by the dashboard.
