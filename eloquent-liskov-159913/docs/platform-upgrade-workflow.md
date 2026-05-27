# Platform Upgrade Workflow

This app is currently React/Vite + Supabase/Postgres + Supabase Edge Functions. Keep that as the core platform until real traffic or product requirements justify another database or service.

## What Is Built Now

- SQL/Postgres: Supabase migrations, RLS, hot-path indexes, trigram search indexes.
- API/server: Supabase Edge Functions with shared WAF, CORS, rate limits, bot detection, IP blocklist, and network-risk signals.
- Media: shared `SmartImage`, shared `LazyVideo`, PWA image/video caching, and `npm run perf:media-report`.
- Security workflow: `npm run security:api-readiness:report`, `npm run security:check-secrets`, `platform-readiness` edge function.
- Database upgrade workflow: `npm run supabase:upgrade-readiness` creates a non-destructive Postgres/Supabase upgrade report.
- User/IP/VPN workflow: `network_security_events` stores hashed IP metadata, proxy/VPN-like headers, risk score, and request IDs.

## Upgrade Rules

- PostgreSQL stays the system of record for users, payments, orders, trips, content, audit logs, and permissions.
- Use Postgres trigram or full-text search first for stores, products, posts, and profiles.
- Add Redis only when you need cross-region low-latency counters, queues, locks, or cache invalidation that Supabase/Postgres cannot handle cheaply.
- Add OpenSearch only when product search needs typo tolerance, faceting, ranking, synonyms, and analytics beyond Postgres.
- Add MongoDB only for a proven document workload that does not fit Postgres JSONB plus indexes.
- Do not add MySQL unless a partner/vendor system requires it.
- Do not store raw user IPs unless legal/privacy approval says the product needs it. Prefer hashed IPs plus coarse location headers.

## Standard Checks Before Release

Run:

```bash
npm run type-check
npm run build
npm run security:check-secrets
npm run security:api-readiness:report
npm run supabase:upgrade-readiness
npm run perf:media-report
```

Review:

- New Edge Functions use `withSecurity`.
- Sensitive routes use `strictCors: true`.
- Payment/account/auth routes use DB-backed rate limits where possible.
- Public tables in exposed schemas have RLS enabled.
- New search/filter columns have matching indexes.
- New media-heavy UI uses `SmartImage` or `LazyVideo`.
- Migration drift is reconciled before any Supabase `db push`, `db pull`, or Postgres major-version upgrade.
- Postgres extensions are checked before upgrading to Postgres 17.

## Network/VPN Workflow

1. Edge request enters `withSecurity`.
2. WAF, bot, rate-limit, and blocklist checks run.
3. `assessNetwork` reads edge headers such as forwarded chain, Cloudflare country/ASN/colo, and proxy-like headers.
4. Suspicious network metadata is stored in `network_security_events` with hashed IP, risk score, signals, route, and request ID.
5. Admin/security tools can review high-risk patterns and add known abusive IP hashes to the blocklist.

VPN detection is intentionally signal-based, not a final identity decision. Real VPN/proxy reputation requires a paid provider such as IPinfo, IPQualityScore, Spur, or Cloudflare bot/risk products.
