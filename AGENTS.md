# AGENTS.md — ZIVO monorepo

Brief for AI coding agents (Codex, Claude Code, etc.) working in this repo. Read this before building. Keep it updated when architecture changes.

## Repo at a glance
- One **Vite + React + TypeScript SPA** serves **many apex domains from a single build** (zivosmedia.com, zivostravel.com, zivosoftware.com, zivoschat.com, …). Runtime **host-gating** decides what renders per domain.
- Wrapped for native via **Capacitor** (iOS/Android) and **Electron**. A **Cloudflare Worker** (`cloudflare/worker.ts`) fronts the web app: security headers/CSP, R2 media, host-specific robots/sitemap.
- Backend is **Supabase**. UI is Tailwind + shadcn/ui + framer-motion.

## Build, run, verify
- Dev server: `npm run dev` (Vite, port 5173/5174).
- Type-check (keep at **0 errors**): `npm run type-check`.
- Worker type-check: `npx tsc --noEmit -p tsconfig.cloudflare.json`.
- Lint: `npm run lint`. Unit tests: `npm test` (vitest).
- **Preview the Zivo Travel surface at `/zivo-travel`** — that route always renders `ZivoTravelHome` regardless of host (on the real domain it renders at `/`). Handy because localhost is not a travel host.

## Supabase projects (know which is which)
- `slirphzzwcogdbkeicff` ("zivo") — **MAIN / source of truth**. LIVE bookings, payments, payouts, and **auth**. Both zivosmedia.com and zivostravel.com authenticate here. Codex's MCP (`.codex/config.toml`) points here.
- `xbllvmpomorawkcrtbcq` ("Zivo Travel") — travel-site **telemetry/config only** (auth disabled). Accessed via `src/integrations/supabase/travelClient.ts`.
- `ydxztoresbdeoeijhxww` ("Zivo software") — zivosoftware.com backend.
- Live DB has **drifted** from repo migrations — read live objects (via Supabase MCP) before schema changes.
- `yiedlgoxwjmansszdypf` ("Zivo Driver") — zivodriver.com backend (new).

## Multi-domain federation (LOCKED architecture — read `docs/zivo-multidomain-architecture.md`)
7 domains, each owns its vertical on its OWN Supabase project; **zivosmedia.com = all-in-one aggregator + identity authority**. Owner-locked: **(1) ONE ZIVO account across all domains** — auth ALWAYS on the main project; per-domain projects trust it via the SAME JWT secret + **claims-based RLS** (`auth.uid()`, not local `auth.users`); client becomes a **dual client** (auth=main, data=per-domain via supabase-js `accessToken`). **(2) per-domain data, federated** to zivosmedia. Map: travel→`xbllv`, software→`ydxz`, driver→`yiedl`, main→`slirph`. **Pilot order: Driver → Travel → Software → aggregation.** Guardrail: do NOT flip a domain's data routing until its project has schema + data + the shared JWT secret; back up before any data move; keep payments central on `slirph` initially. This supersedes the earlier "travel stays on shared backend" stance.

## Guardrails (important)
- **Live data + live Stripe key.** `src/lib/stripe.ts` holds a `pk_live` key; checkout charges are real. Don't run end-to-end payment tests casually; never expose secrets.
- **Don't migrate/duplicate** live bookings/payments into the travel project. The travel site reuses the engine via API (shared-backend decision).
- **Reuse existing engine routes** for booking/checkout/wallet — don't rebuild them.
- Keep `type-check` at 0 errors. Respect `prefers-reduced-motion` in travel UI. Make cross-cutting changes **additive** (they ship to all domains).
- **Don't commit unless the owner asks.** Don't change product gates (e.g. the hotels Cambodia gate) without confirmation.

## Zivo Travel — active build area (zivostravel.com)
A branded front-door **in this repo** that reuses the existing engine + source backend. The new Supabase project is telemetry-only.

File map:
- `src/pages/ZivoTravelHome.tsx` — the 3D front-door. **Premium CSS/framer-motion 3D** (coverflow carousel, pointer-tilt, parallax, scroll reveals) — **not** heavy WebGL/Three.js (mobile + SEO matter). Autoplay must never clobber user input. Also runs a head-SEO reconcile (see SEO).
- `src/config/zivoTravelDomain.ts` — host gating, allowed paths, travel project URL/key, `getZivoTravelUrl`.
- `src/integrations/supabase/travelClient.ts` — telemetry client (`xbllvmpomorawkcrtbcq`).
- `src/lib/crossDomainSSO.ts` + `src/pages/AuthHandoff.tsx` (route `/auth/handoff`) — same-project session handoff for SSO between zivosmedia ↔ zivostravel (tokens via URL hash, open-redirect guarded).
- `src/pages/FlightLanding.tsx` — `useFlightDeepLinkInitial` reads inbound query params into the flight search form.
- `cloudflare/worker.ts` — `travelSeoResponse` serves host-aware `robots.txt` + `sitemap.xml` for travel hosts.

Booking surfaces (reuse, don't rebuild): `/flights`, `/hotels` (wrapped in `CambodiaOnlyGate` — blocks non-Cambodia users), `/cars`, `/bus`, `/travel/checkout`, `/wallet`, `/payment-methods`.

**Deep-link param contract** (home → engine page; each page reads its own keys, keep additive):
- flight → `/flights?from&to&start&end&travelers`
- hotel → `/hotels?city&ci&co&adults`
- car → `/cars?city&pickup_date&return_date`
- bus → `/bus?from&to&date`

SEO: the shared static `index.html` bakes **zivosmedia** SEO into every host; `ZivoTravelHome` reconciles the head client-side (de-dupes keeping its `<Helmet>` tags, drops non-`zivostravel` JSON-LD). The worker serves travel robots/sitemap.

## Build backlog (good next tasks)
- **Hotels gate**: decide whether to lift `CambodiaOnlyGate` for the zivostravel host (product decision — confirm with owner).
- **Travel `og:image`**: add a branded public social image and wire `og:image`/`twitter:image` in `ZivoTravelHome` Helmet.
- **Harden SSO**: replace the URL-hash refresh_token handoff with a one-time magic-link OTP via an edge function (mirror the existing `/connect/media` `verifyOtp` flow).
- **SEO for non-JS crawlers**: add a Cloudflare HTMLRewriter in `worker.ts` to correct the static `index.html` head on travel hosts (current reconcile is client-side only).
- **Flight one-click**: resolve free-text origin/destination to IATA so deep-linked flight searches can auto-run.
- **Sitemap depth**: expand the travel sitemap with destination/route SEO pages.

## Backend cutover guardrails (see docs/zivo-travel-backend-cutover.md)
**OWNER DECISION (2026-06-05): keep the shared backend via API. Do NOT run the dedicated data migration or set `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND=true`. The travel project stays telemetry-only; zivostravel.com keeps using the live shared engine (`slirphzzwcogdbkeicff`).** If this is ever revisited, make the flag auth/payments-shared first (below).

The dedicated-backend flag `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND` (wired in `src/integrations/supabase/client.ts`) currently switches the MAIN client — **including auth** — to the travel project (`xbllvmpomorawkcrtbcq`) on the travel host. Before ever enabling it:
- **Keep auth + payments on the shared main project (`slirphzzwcogdbkeicff`) even in dedicated mode** — switch only the travel content/edge client. Otherwise: the cross-domain SSO (`/auth/handoff`) breaks (Supabase JWTs are verified per-project, so a `slirph` token can't `setSession` on an `xbllv` client); user accounts split (the travel project has no users); and payouts/Stripe reconciliation split across two accounts.
- **Plan the DATA migration, not just schema/functions** — live rows (airports/airlines/hotel inventory, bookings, PII) must be migrated or the travel project is empty when the flag flips.
- Keep the flag **OFF** until both are handled. Default = shared backend via API.

## 3D revamp — zivostravel.com ONLY (in progress, Claude + Codex)
Owner wants a full 3D redesign for the travel domain: new imagery, layered scroll (up/down/left/right + turn/move), 3D UX/UI across the home AND inside flights/hotels/cars/bus + the booking funnel. **Decision: scoped 3D theme + scroll layer** (do NOT fork the shared engine pages or restyle them globally — zivosmedia must stay untouched).

**Reusable foundation (Claude built — use it, don't make a second kit):**
- `src/styles/zivo-travel-3d.css` — theme scoped entirely under `.zivo-travel-3d` (tokens, `.zt-glass`, `.zt-gradient-text`, `.zt-perspective`, `.zt-aurora`, `.zt-rail`). Anything new must stay under that selector so it only affects the travel host.
- `src/components/zivo-travel/` (import from the barrel `@/components/zivo-travel` or `./scroll3d`):
  - Scroll/motion: `Parallax`, `ScrollTurn` (scroll-driven rotate/lift), `Reveal`, `TiltCard`, `HorizontalRail` (left/right snap rail).
  - `Coverflow3D` — generic drag/swipe/turn card carousel (N items, render prop, arrows/dots, optional hover-paused autoplay, `onLaunch`/`onIndexChange`). Use for flight/hotel/car/bus result decks.
  - `LoadingScene3D` — 3D loading screen (uses the `.zt-loader-*` keyframes). Good as a Suspense/route fallback.
  - `PageTransition` — wrap a page root for a 3D enter (fade + lift + turn); no router change needed.
  - `TravelPullToRefresh` — pull-down-to-refresh (touch gesture) with a gradient-ring + Z indicator. IMPORTANT: wrap the page **body below any sticky header** — its `y` transform breaks `position: sticky` if it wraps the header.
  - `ZivoTravel3DProvider` — adds the `.zivo-travel-3d` class to `<html>` on the travel host only (`force` to preview on localhost).
  - All reduced-motion safe.

**How to apply:** wrap the travel surface with `<ZivoTravel3DProvider>`; build page UI with the kit + `zt-*` classes. Keep engine data/hooks/checkout as-is (visual layer only).

**Division of labor (one agent per page — avoid collisions):**
- **Claude:** the 3D kit/theme (above) + the `ZivoTravelHome` redesign.
- **Codex:** apply the theme + kit to `/flights`, `/hotels`, `/cars`, `/bus` and the booking funnel (pages it already owns), plus backend readiness.
Coordinate here; re-check `git status` before editing a shared page.

**Site-wide travel shell (make ALL pages look travel on zivostravel.com):** the generic zivosmedia shell currently leaks onto travel pages. Progress/TODO:
- ✅ `GlobalDesktopNav` now returns null on the travel host (no Feed/Reels/Chat social nav on zivostravel.com; travel pages render their own header).
- ✅ DONE: `<ZivoTravel3DProvider />` is mounted at the app root (`src/App.tsx`, beside the host gates). On the travel host it adds the `.zivo-travel-3d` scope to `<html>` site-wide AND runs a **title guard** (rewrites "ZIVO …" → "Zivo Travel …" in document titles, so utility pages like Wallet/My Trips get travel tab/SEO titles). No-op off the travel host. Also `Header.tsx`, `home/NavBar.tsx`, and `Footer.tsx` are now travel-host-aware (ZIVO TRAVEL / Zivo Travel branding).
- TODO: hide/replace the mobile zivosmedia nav (`AppLayout`/bottom nav) on the travel host too.
- TODO: travel-style shared utility pages (My Trips, Wallet, Payment Methods) via `.zivo-travel-3d`-scoped CSS once the provider is mounted.
