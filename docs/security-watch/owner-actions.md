# Security Watchdog — Owner Action Items (2026-06-15)

Consolidated from the 24/7 watchdog's first runs + a live verification sweep +
DeepSeek/MiMo review. Items are ordered by value. Nothing here has been applied —
each needs your decision/deploy. No active attack was detected anywhere checked.

> Scope note: the live checks below were run against the **Zivo Software** project
> (`ydxztoresbdeoeijhxww`) — the only project this session's Supabase MCP reaches.
> The **main** payments/bookings/auth project (`slirphzzwcogdbkeicff`) was **not**
> verified live (see Priority 1).

---

## ✅ Priority 1 — Live attack detection for the MAIN project — DONE (2026-06-15)

> Token added to `.env.local`; verified the watchdog scans `slirphzzwcogdbkeicff` live
> auth logs every cycle (first run: 43 rows, no attack). Steps below kept for reference
> (e.g. to point at another project, or after a token rotation).

### (original steps)

The watchdog can scan a project's live auth logs every cycle for brute-force /
credential-stuffing, but only for a project it has a token for. Right now it has
**none**, so the 24/7 job is code/dependency analysis only — the "catch the hacker
on live data" half is dark for your real money project.

To enable it for `slirphzzwcogdbkeicff` (main):
1. Supabase Dashboard → **Account → Access Tokens** → generate a personal token (`sbp_…`).
2. Add to `.env.local` (git-ignored):
   ```
   SUPABASE_ACCESS_TOKEN=<paste the sbp_ token from the dashboard>
   SUPABASE_PROJECT_REF=slirphzzwcogdbkeicff
   ```
3. Verify it's wired: `npm run security:watch:selftest` (should show ✅ live scan configured).
4. Next cycle the watchdog flags a burst of failed logins from one IP as a likely attack.

---

## 🟡 Priority 2 — Supabase Auth hardening (dashboard, ~2 min)

- [x] **Main project (`slirph`) — already hardened** (verified 2026-06-15 via Management
      API): `password_hibp_enabled: true`, refresh-token rotation ON, reauth-required on
      password change, 8-char letters+digits policy. No action needed.
- [ ] **Zivo Software project (`ydxz`) — leaked-password protection is OFF.** Enabling
      it (`PATCH /v1/projects/ydxztoresbdeoeijhxww/config/auth {"password_hibp_enabled":true}`)
      is reversible. Risk is low: the shared `Signup.tsx` already blocks breached passwords
      at signup, so almost no existing user has one. Confirm before flipping (Supabase also
      enforces HIBP at sign-in).

---

## 🟡 Priority 3 — Two zivosoftware findings (VERIFIED — both non-security)

These came out of the live log sweep. Both fail **closed** (they error rather than
leak), so neither is a breach — but both are real and worth fixing.

### 3a. Repeated `401`s on public-config endpoints — *client token, not a DB hole*
`/rest/v1/brands`, `/rest/v1/app_settings`, `/rest/v1/pricing_config`, `/rest/v1/eats_zones`
were returning `401` repeatedly from one client.

**Verified:** all four tables have **RLS enabled + an anon-read policy + anon SELECT
grant** — anon *can* read them with a valid key. A PostgREST `401` means the
**apikey/JWT was missing or invalid** (an RLS denial returns `200`/empty). Paired
with the `400 refresh_token_not_found` in the auth logs, this is a **client whose
session expired and kept retrying with a dead token** — not a DB misconfiguration.

- [ ] No DB change needed. Check the **client's token-refresh / anon-key** handling
      (one Edge/Chrome session was looping). Optionally add a guard so the app stops
      re-firing config loads once a refresh fails.

### 3b. `ERROR: relation "public.app_integrations" does not exist` — *cross-project ref*
**Verified:** `app_integrations` does **not** exist on ydxz, but it's created by the
zivosmedia auth-foundation migration (`20260607161643`) and referenced by the SSO
edge function `zivosmedia-user-event-dispatch` + `src/pages/ZivosmediaAuthorize.tsx`.
The table lives on the **main** project; something running against ydxz queries it.

- [ ] Decide: provision `app_integrations` on ydxz, **or** point that SSO reference at
      the main project. (Functional SSO-provisioning gap; fails closed.)

---

## 🟢 Priority 4 — Lower-severity hardening

- [ ] **Edge-function CORS (LOW — not the wallet-drain risk it first looks like).**
      `_shared/cors.ts` *already* has `strictCorsHeaders()` (validates Origin against a
      full ZIVO allowlist → 403 on unknown). The `corsHeaders` `*` export is intentional
      for public/webhook routes. CORS `*` does **not** bypass `Bearer`-token auth, can't
      carry credentials, and doesn't block non-browser (curl) calls — so it is not a
      drain vector. Optional cleanup only: audit which *authenticated* edge fns still use
      the legacy `corsHeaders`/`getCorsHeaders` and migrate them to `strictCorsHeaders`.
- [ ] **`ip-api.com` over http** in `geo-detect` / `log-login` edge fns — geo data is
      low-sensitivity; options: keep + add a 3s timeout, or switch to `ipapi.co`
      (free HTTPS, but field names differ — verify the consumed fields). **You deploy.**
- [ ] **npm dev-dep vulns** (esbuild/vite/form-data/lovable-tagger) — build-time only,
      don't ship to prod. `npm audit fix` then `npm run update` to verify, or pin via
      `overrides`. Verify the build before committing.
- [ ] **`target=_blank` without `rel=noopener`** (~30 components) — low (modern
      browsers default to noopener); matters most in the Android WebView. A
      `react/jsx-no-target-blank` ESLint rule prevents regressions.

---

## How the watchdog keeps watching

- Runs every 45 min via the `ZivoSecurityWatchdog` Scheduled Task (read-only).
- Latest report: `docs/security-watch/LATEST.md`. Alerts: `docs/security-watch/ALERT-*.md`.
- Health check: `npm run security:watch:selftest`.
- Set `WATCHDOG_WEBHOOK_URL` to get alerts pushed to Slack/Discord.
