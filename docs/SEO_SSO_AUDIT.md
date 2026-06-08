# SEO & SSO Audit

**Date:** 2026-06-08 · Audit only. Evidence cites real files. `qa:sso-auth-contracts` **FAILS** (login OAuth entrypoints missing).

## SSO inventory

| Component | Status | Path(s) | Notes |
|-----------|--------|---------|-------|
| Identity source of truth | ✅ | `docs/AUTH_AND_IDENTITY_FLOW.md` | Zivosmedia (`slirphzzwcogdbkeicff`) central |
| Auth foundation (PR#67) | ✅ Backend | `20260607161643_zivosmedia_auth_foundation.sql` | `app_integrations`, `zivosmedia_auth_codes` (PKCE S256), audit logs, `platform_webhook_events` |
| Issue / validate code | ✅ | `zivosmedia-auth-issue-code/`, `…-validate-code/` | single-use, client-secret + PKCE, expiry/revoke |
| Identity-event webhooks | ✅ | `zivosmedia-user-event-dispatch/`, `zivosmedia-user-disabled` | user_updated/disabled fan-out |
| Account linking (driver) | 🟡 Partial | `20260607163751_zivosmedia_auth_bridge.sql` | driver linked-accounts/audit/webhooks; other apps pending |
| **OAuth login entrypoints** | 🔴 Missing | `src/pages/Login.tsx` | no `handleOAuthSignIn`/`signInWithOAuth`/google/apple → **contract fails** |
| **`/authorize` UI route** | 🔴 Missing | — | backend can issue codes but no UI ties redirect→code |
| Password + MFA + OTP + sessions | ✅ | `AuthContext.tsx`, `mfa.ts`, `send-otp-*`, `AccountSessionsPage.tsx` | mature |

**Known security review findings (from `docs/zivo-auth-bridge-security-review-*`):** webhook replay protection (body-only signing), native deep-link raw-token forwarding, stale `auth_relay_tokens` migration, missing rate-limit on one exchange fn. Treat as P1 hardening within the SSO PRs.

## SEO inventory

| Component | Status | Path(s) |
|-----------|--------|---------|
| SEOHead (meta/OG/Twitter/canonical/JSON-LD/robots/app-links) | ✅ Complete | `src/components/SEOHead.tsx` |
| Titles/descriptions per landing | ✅ | flight/hotel/car/eats/software/business landings |
| Sitemap + robots | ✅ | `public/sitemap.xml`, `public/robots.txt`, worker travel sitemap/robots |
| Canonical + noIndex on protected routes | ✅ | SEOHead |
| schema.org structured data | 🟡 Partial | SEOHead supports `structuredData` prop; **not uniformly populated** |
| Per-domain software/business SEO pages | 🟡 Thin | exist but light on structured/organic content |

## Top gaps
- **P0/P1 (SSO)** Add OAuth/Continue-with-Zivosmedia entrypoints to `Login.tsx` + `/authorize` UI route → fixes the failing contract and item #7.
- **P1 (SSO)** Address auth-bridge security review items (replay protection, deep-link tokens, relay-token migration, rate-limit).
- **P2 (SEO)** Populate JSON-LD (Organization/Breadcrumb/FAQ/Product) uniformly; expand software/business SEO landing content.

## Readiness flags
- P0: SSO login UI absent (contract fails).
- P1: auth-bridge hardening; account-linking for non-driver apps.
- P2: SEO structured data + landing depth.

## Maps to roadmap
PR 8 (Continue with Zivosmedia entrypoints — fixes sso-auth-contracts), PR 12 (Travel pilot), PR 18 (SEO metadata/canonical/sitemap + schema.org), PR 13 (chat thread contract uses identity).
