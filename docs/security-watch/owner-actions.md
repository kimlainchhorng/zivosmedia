# Security Watchdog — Owner Action Items (2026-06-15)

Consolidated from the 24/7 watchdog's first runs + a live verification sweep +
DeepSeek/MiMo review. Items are ordered by value. Nothing here has been applied —
each needs your decision/deploy. No active attack was detected anywhere checked.

> Scope note: the live checks below were run against the **Zivo Software** project
> (`ydxztoresbdeoeijhxww`) — the only project this session's Supabase MCP reaches.
> The **main** payments/bookings/auth project (`slirphzzwcogdbkeicff`) was **not**
> verified live (see Priority 1).

---

## 🔴 Priority 1 — Turn on live attack detection for the MAIN project

The watchdog can scan a project's live auth logs every cycle for brute-force /
credential-stuffing, but only for a project it has a token for. Right now it has
**none**, so the 24/7 job is code/dependency analysis only — the "catch the hacker
on live data" half is dark for your real money project.

To enable it for `slirphzzwcogdbkeicff` (main):
1. Supabase Dashboard → **Account → Access Tokens** → generate a personal token (`sbp_…`).
2. Add to `.env.local` (git-ignored):
   ```
   SUPABASE_ACCESS_TOKEN=sbp_xxxxxxxx
   SUPABASE_PROJECT_REF=slirphzzwcogdbkeicff
   ```
3. Verify it's wired: `npm run security:watch:selftest` (should show ✅ live scan configured).
4. Next cycle the watchdog flags a burst of failed logins from one IP as a likely attack.

---

## 🟡 Priority 2 — Supabase Auth hardening (dashboard, ~2 min)

- [ ] **Enable leaked-password protection** — Auth → Settings → "Prevent use of
      compromised passwords" (HaveIBeenPwned). Currently **OFF**. Affects new
      sign-ups/changes only; existing users unaffected.

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

- [ ] **Edge-function CORS** — `supabase/functions/_shared/cors.ts` uses
      `Access-Control-Allow-Origin: *`. Move to an origin allowlist (the 7 ZIVO
      domains + localhost). Cross-cutting: touches every edge function's CORS import,
      so change `_shared/cors.ts` to a `getCorsHeaders(origin)` helper and update
      callers. **You deploy.**
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
