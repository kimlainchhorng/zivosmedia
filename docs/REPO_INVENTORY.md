# ZIVO Repo Inventory

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Confirm every GitHub repository before implementation. This inventory is based on local repos in `/Users/kimlain/Documents/GitHub`, local Git remotes, package files, README files, env examples, and Supabase folders. GitHub installation visibility should still be confirmed by the owner for private repos.

## Summary

| App | Exact GitHub repo | Default branch | Local branch observed | Framework/runtime | Package manager | Dev command | Build command | Deploy target | Supabase project | Current auth | Missing items | First safe PR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Zivosmedia | `kimlainchhorng/zivosmedia` | `main` | `feature/zivopay-payments-foundation` | React + Vite + Supabase + Capacitor; Cloudflare/Netlify assets present | npm (`packageManager` not declared) | `npm run dev` | `npm run build` | Cloudflare Workers/Pages and Netlify need final confirmation | `slirphzzwcogdbkeicff` | Supabase Auth in central project; auth handoff foundation in progress | Final approved docs, PKCE/code flow completion, app registry approval, payment provider confirmation | PR 1: documentation-only master plan in `zivosmedia/docs`. |
| Zivo Travel | `kimlainchhorng/zivostravel` | `main` | `feature/zivosmedia-auth-bridge` | React + Vite, Cloudflare Worker | npm (`packageManager` not declared) | `npm run dev` | `npm run build` | Cloudflare Workers | `xbllvmpomorawkcrtbcq` | Local travel app + Zivosmedia authority bridge in progress | Travel-driver job contract, payment handoff, local session creation | After PR 1-3: health + payment + driver request foundation. |
| Zivo Admin | `kimlainchhorng/Zivo-Admin` | `main` | `feature/platform-registry-foundation` | React + Vite frontend, Node Admin API | npm (`packageManager` not declared) | `npm run dev`, `npm run dev:api` | `npm run build` | `zivoadmin.com`; Cloudflare/deploy target still needs config confirmation | `wtdlbzgryuelpylijnkd` | Staff-only Admin API using Zivosmedia JWT secret when configured | Owner approval for registry data, production auth/deployment settings | PR 3: platform registry + health dashboard foundation. |
| ZivosChat | `kimlainchhorng/ZIVO-CHAT` | `main` | `feature/zivosmedia-auth-bridge` | React + Vite + Supabase + Capacitor | npm (`packageManager` not declared) | `npm run dev` | `npm run build` | `zivoschat.com`; Cloudflare Pages/Workers need confirmation | Appears to use `slirphzzwcogdbkeicff`; dedicated project not confirmed | Shares Zivosmedia/MyZIVO Supabase auth; bridge foundation in progress | Dedicated vs shared Supabase decision, shared thread schema approval | PR 10-11: shared thread model and app integrations. |
| Zivo Driver | `kimlainchhorng/zivodriver` | `main` | `feature/zivosmedia-auth-bridge` | React + Vite + Supabase + Capacitor | npm (`packageManager` not declared) | `npm run dev` | `npm run build` | Cloudflare/Vite/mobile need confirmation | `yiedlgoxwjmansszdypf` | Local driver Supabase auth plus Zivosmedia bridge in progress | Travel job receiver, status webhooks, payout model, local session creation | PR 5: driver job receiver and status foundation. |
| ZivoSoftware | `kimlainchhorng/zivosoftware` | `main` | `feature/zivosmedia-auth-foundation` | No `package.json` found; docs + Supabase backend/functions | Not present | Not present | Not present | Needs confirmation | `ydxztoresbdeoeijhxww` | Supabase backend auth bridge foundation in progress | Runtime owner, frontend location, business ownership model, subscription tables | PR 7: product/subscription foundation after docs approval. |
| ZIVO-AI | `kimlainchhorng/ZIVO-AI` | `main` per owner-provided verification | Not locally cloned in inspected path | Needs inspection | Needs inspection | Needs inspection | Needs inspection | Needs confirmation | Needs confirmation | Needs review | Confirm role before connecting to ecosystem. |
| Zivo Business | Repo needs confirmation or creation | Unknown | No standalone local repo found | Unknown; likely module split across Zivosmedia/ZivoSoftware until repo exists | Unknown | Unknown | Unknown | `zivobusiness.com` | Needs confirmation | Needs decision | Repo/project ownership | PR 8 after repo and database owner confirmed. |
| Zivo Employee | Repo needs confirmation or creation | Unknown | No standalone local repo found; `zivosmedia/ZIVO Employees` folder exists | Likely Zivosmedia module today until repo exists | Unknown | Unknown | Unknown | `zivoemployee.com` | Needs confirmation | Needs decision | Repo/project ownership | After Business/Admin model is approved. |
| ZivoPay | No standalone repo confirmed | Unknown | Modeled as Zivosmedia Payments today | Shared payment layer with provider adapters | npm through Zivosmedia | `npm run dev` in zivosmedia | `npm run build` in zivosmedia | Zivosmedia deployment until database owner is decided | Payment DB location needs confirmation | Zivosmedia identity + Stripe first, PayPal/Square later | payment database owner, provider credentials, webhook tables | PR 5 foundation; Admin dashboard later. |

## Repo Confirmation Notes

The following repos were previously listed as needing confirmation. Local Git remotes now show:

- `Zivo-Admin` -> `https://github.com/kimlainchhorng/Zivo-Admin.git`
- `ZIVO-CHAT` -> `https://github.com/kimlainchhorng/ZIVO-CHAT.git`
- `zivodriver` -> `https://github.com/kimlainchhorng/zivodriver.git`
- `zivosoftware` -> `https://github.com/kimlainchhorng/zivosoftware.git`

Still confirm in connected GitHub workspace before PR creation if the GitHub app previously could not see them.

## Confirmed Domains

| Platform | Domain |
| --- | --- |
| Zivosmedia | `zivosmedia.com` |
| Zivo Business | `zivobusiness.com` |
| Zivo Driver | `zivodriver.com` |
| Zivo Employee | `zivoemployee.com` |
| ZivosChat | `zivoschat.com` |
| ZivoSoftware | `zivosoftware.com` |
| Zivo Travel | `zivostravel.com` |
| Zivo Admin | `zivoadmin.com` |

## GitHub Access Warning

The owner confirmed `zivodriver`, `ZIVO-CHAT`, `Zivo-Admin`, and `zivosoftware`, but current GitHub tool access may not see every private repo. Before coding in a repo:

1. Try `gh repo view`.
2. Try `gh repo clone`.
3. If `404` or a permission error occurs, check spelling/capitalization, repo privacy, GitHub app access, owner/org, and whether the repo still needs to be created.
4. Do not rename apps or guess alternate repos without owner approval.

## Environment Variable Themes

- Browser-safe only: `VITE_*` publishable URLs/keys and public origins.
- Server-only only: Supabase service-role keys, JWT secrets, Stripe secret keys, Stripe webhook secrets, Cloudflare tokens, Zivosmedia client secrets, webhook signing secrets.
- Do not commit `.env` files.
- Do not put service-role or Stripe secret values in `VITE_*`.

## Detailed Environment Inventory

### Zivosmedia

Observed env needs:

- Browser-safe Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Product project publishable links: `VITE_ZIVO_SOFTWARE_SUPABASE_URL`, `VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY`, `VITE_ZIVO_TRAVEL_SUPABASE_URL`, `VITE_ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY`, `VITE_ZIVO_DRIVER_SUPABASE_URL`, `VITE_ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY`
- Server/Edge Supabase: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`
- Payments: `VITE_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Maps/social/media/notifications: Google Maps, Google OAuth, Mapbox, Twilio, LiveKit, VAPID, analytics/ad IDs, TURN relay
- Public origins: `VITE_APP_URL`, `VITE_PUBLIC_ORIGIN`

Notes:

- `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, OAuth secrets, and provider tokens are server-only.
- Payment provider must remain test mode until payment architecture is approved.

### Zivo Travel

Observed env needs:

- Browser-safe: `VITE_ZIVO_TRAVEL_SUPABASE_URL`, `VITE_ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY`, `VITE_ZIVO_TRAVEL_USE_DEDICATED_BACKEND`, `VITE_ZIVO_PLATFORM_ORIGIN`
- Cloudflare Worker vars: `ZIVO_TRAVEL_SUPABASE_URL`, `ZIVO_AUTHORITY_SUPABASE_URL`, `ZIVOSMEDIA_AUTH_APP_KEY`
- Cloudflare Worker secrets: `ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY`, `ZIVO_TRAVEL_SUPABASE_SERVICE_ROLE_KEY`, Zivosmedia auth client secret/webhook secret when enabled

Notes:

- Travel currently depends on Zivosmedia as identity/payment authority.
- Service-role keys belong only in Cloudflare/Supabase server-side contexts.

### Zivo Admin

Observed env needs:

- Browser-safe dashboard URLs: `VITE_ADMIN_APP_URL`, `VITE_ADMIN_API_BASE_URL`
- Browser-safe project URLs: `VITE_ZIVOSMEDIA_SUPABASE_URL`, `VITE_TRAVEL_SUPABASE_URL`, `VITE_SOFTWARE_SUPABASE_URL`, `VITE_DRIVER_SUPABASE_URL`, `VITE_ADMIN_SUPABASE_URL`
- Server-only Supabase URLs: `ZIVOSMEDIA_SUPABASE_URL`, `TRAVEL_SUPABASE_URL`, `SOFTWARE_SUPABASE_URL`, `DRIVER_SUPABASE_URL`, `ADMIN_SUPABASE_URL`
- Server-only service-role keys: `ZIVOSMEDIA_SUPABASE_SERVICE_ROLE_KEY`, `TRAVEL_SUPABASE_SERVICE_ROLE_KEY`, `SOFTWARE_SUPABASE_SERVICE_ROLE_KEY`, `DRIVER_SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SUPABASE_SERVICE_ROLE_KEY`
- Server-only auth: `ZIVOSMEDIA_SUPABASE_JWT_SECRET`
- Live adapters/RPCs: `ZIVOSMEDIA_CUSTOMER_SEARCH_RPC`, driver/travel/software/admin queue RPC env vars
- Cloudflare: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_BASE`, `CLOUDFLARE_TIMEOUT_MS`
- Local tooling: `SUPABASE_CLI_PATH`

Notes:

- Admin must never expose service-role keys, Cloudflare tokens, JWT secrets, or Stripe secrets to the browser.

### ZivoChat

Observed env needs:

- Browser-safe Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Public origins: `VITE_PUBLIC_ORIGIN`, `VITE_ZIVO_ORIGIN`, `VITE_CHAT_ORIGINS`
- Server-side Zivosmedia auth bridge: `ZIVOSMEDIA_AUTH_APP_KEY`, `ZIVO_AUTHORITY_SUPABASE_URL`, `ZIVOSMEDIA_AUTH_VALIDATE_URL`, `ZIVOSMEDIA_AUTH_CLIENT_SECRET`, `ZIVOSMEDIA_WEBHOOK_SECRET`
- Media/notifications: `VITE_MAPBOX_ACCESS_TOKEN`, `VITE_WEBRTC_TURN_URLS`, `VITE_WEBRTC_TURN_USERNAME`, `VITE_WEBRTC_TURN_CREDENTIAL`, `VITE_VAPID_PUBLIC_KEY`, `VITE_STICKER_ASSET_ORIGIN`
- Debug/health flag: `VITE_SHOW_REQUEST_HEALTH`

Notes:

- Current config points to Zivosmedia Supabase project; dedicated Chat project needs owner confirmation.
- `ZIVOSMEDIA_AUTH_CLIENT_SECRET` and `ZIVOSMEDIA_WEBHOOK_SECRET` are server-only.

### Zivo Driver

Observed env needs:

- Browser-safe Supabase: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- Public API/support: `VITE_API_BASE_URL`, `VITE_SUPPORT_EMAIL`, `VITE_SUPPORT_PHONE`
- Branding/maps/push: `VITE_BRAND_NAME`, `VITE_MAP_PROVIDER`, `VITE_PUSH_PROVIDER`
- Server-side Zivosmedia auth bridge secrets are needed for Edge Functions when deployed, but should not be placed in Vite/browser env.

Notes:

- Driver keeps dedicated Supabase project.
- Travel-driver job receiver and status webhooks remain future work.

### ZivoSoftware

Observed env needs:

- No `.env.example` and no `package.json` were found locally.
- `supabase/config.toml` exists, so Supabase Edge Function/backend env needs should be documented before deploy.
- Expected server-side needs: Zivosmedia auth client secret, webhook signing secret, admin token, Supabase service-role key, and publishable key if a frontend is later added.

Notes:

- Runtime/deployment owner must be confirmed before app coding.
- First safe change should be docs and Supabase contract confirmation only.

## Recommended First PR

PR 1 should be documentation-only in `kimlainchhorng/zivosmedia` on a feature branch. It should add the master architecture documents under `docs/`, make no production code changes, add no migrations, set no secrets, and change no deployment settings.
