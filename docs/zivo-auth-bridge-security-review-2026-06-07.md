# Zivo "Continue with Zivosmedia" auth bridge — security review

**Date:** 2026-06-07 · **Reviewer:** Claude (reviewer role) · **Status:** point-in-time
review of in-flight work. Companion to
[`zivo-sso-integration-checklist.md`](./zivo-sso-integration-checklist.md).

## Scope & method

Read-only review of the cross-app identity bridge being built in parallel:
- Hub (zivosmedia): `zivosmedia-auth-issue-code`, `zivosmedia-auth-validate-code`,
  `_shared/zivosmediaAuth.ts`, migration `20260607161643_zivosmedia_auth_foundation.sql`.
- Driver (zivodriver): `zivosmedia-auth-exchange`, `admin-linked-user`,
  `zivosmedia-user-disabled` / `-user-updated`, `_shared/zivosmediaAuthBridge.ts`,
  `src/pages/Login.tsx`, `src/pages/AuthCallback.tsx`, migration
  `20260607163751_zivosmedia_auth_bridge.sql`, and the older `auth_relay_tokens` migrations.
- Live DB state verified via Supabase MCP (read-only `pg_policies` / `pg_class` queries).

## Overall verdict

**Server-side bridge is well-built and secure. Nothing is exposed in production because
nothing is deployed yet.** The work to do is on the **client** wiring plus a few
hardening items and two latent risks. No ERROR-level live exposure found.

### What's done right (keep)
- Confidential client: `client_secret` only in edge-function env, never the browser.
- **PKCE enforced end-to-end** — hub `validate-code` requires `code_verifier` and checks
  it against the stored S256 `code_challenge`.
- Webhook **HMAC** verification: timing-safe compare, fails closed if no secret.
- Admin endpoint gated by token, timing-safe, fails closed.
- **RLS correct** on the driver link tables: owner-read with ownership predicate; audit +
  webhook tables service-role-only.
- Input validation (UUID, PKCE format, length caps); all paths audited; CORS allowlisted
  (no wildcard-with-credentials).

## Findings

| # | Sev | Area | Status |
|---|---|---|---|
| F1 | Med (pre-launch blocker) | Driver client not wired to the PKCE exchange | open |
| F2 | Med (latent) | `auth_relay_tokens` migration reintroduces a token-dump on `db reset` | latent (not live) |
| F3 | Low-Med | Native return forwards raw tokens via custom-scheme deep link | open |
| F4 | Low | Webhook signature has no replay/timestamp protection | open |
| F5 | Low | `zivosmedia-auth-exchange` has no rate limit | open |
| F6 | Low (correctness) | `user-disabled` overwrites (not merges) link metadata | open |
| F7 | Low | `admin-linked-user` uses a single static shared token | by design; plan rotation |

### F1 — Driver client flow not wired to the new contract (pre-launch blocker)
`src/pages/Login.tsx` `handleZivosmediaContinue` redirects to the **old** `/auth/handoff`
with `app`+`redirect` only — no PKCE `code_challenge`, no `state`. `src/pages/AuthCallback.tsx`
then calls `zivosmedia-auth-exchange` with `{ code }` only — no `code_verifier`. The server
requires a valid `code_verifier`, so the exchange always returns 400. The client also
conflates the shared-session handoff with the new identity-code exchange.

**Root cause (Path A vs Path B):** `/auth/handoff` is a *same-Supabase-project* session
bridge — it hands over `slirph` access/refresh tokens via the URL hash (`#at&rt&next`) and
the receiver `AuthHandoff.tsx` ignores the `app`/`redirect` *query* params the driver sends.
That works for Path-A apps sharing `slirph` (chat, and the zivosmedia-served travel/software
domains) but is useless for **Path-B** separate-project apps like driver (`yiedl`): a `slirph`
token can't establish a driver session. Driver needs the authorization-code flow, but no hub
*authorize* route exists to turn `?app&redirect` into `redirect?code=…` (only the `issue-code`
edge fn exists, unwired to any UI).
**Fix:** build the hub authorize route (calls `issue-code`, 302s to the registered
`redirect_uri?code=&state=`); in the driver client generate + store a PKCE verifier and
`state`, point "Continue with Zivosmedia" at that authorize route (not `/auth/handoff`), and
on callback validate `state` and send `code` + `code_verifier` to the exchange. Keep
`/auth/handoff` for Path-A apps only.

### F2 — `auth_relay_tokens` reset landmine (latent, not live)
Stale 2026-02 migrations create `public.auth_relay_tokens` (raw access/refresh tokens) with
`anon_select_relay … FOR SELECT TO anon USING (true)` (and an authenticated equivalent). The
2026-03 "fix" only tightened INSERT/DELETE. **Verified live: the table does not exist on the
driver project (`yiedlgoxwjmansszdypf`) or main (`slirphzzwcogdbkeicff`)** — so it is not
exploitable today. But a `supabase db reset` on the driver project would recreate it and
hand anyone with the public anon key the ability to dump every user's session tokens.
**Fix:** repair or remove those migrations before any reset — never allow a permissive anon
SELECT on a token table. If the relay is still needed, read via a `relay_id`-scoped,
one-time `SECURITY DEFINER` claim RPC + short TTL; otherwise drop the relay path.

### F3 — Raw tokens via custom-scheme deep link
Because the relay table is absent, `AuthCallback.tsx` falls back to forwarding
`access_token`+`refresh_token` through `zivodriver://auth/callback?...` URLs, which other
installed apps can hijack (scheme squatting), and which land in history/logs.
**Fix:** restore the relay (with F2's safe pattern) or use `ASWebAuthenticationSession` /
app-bound universal links for the native return.

### F4 — Webhook replay protection
`verifyWebhookSignature` signs only the body — no timestamp/nonce — so a captured webhook is
replayable. `user_disabled` is idempotent (low harm) but `user_updated` overwrites profile
data. **Fix:** sign `t=<unix>.<body>`, send `x-zivo-signature: t=…,v1=…`, reject if
`|now-t| > 300s`. One change in the shared helper covers both webhooks.

### F5 — Rate-limit the exchange
`zivosmedia-auth-exchange` is a bare endpoint with no rate limit (the hub `validate-code`
is rate-limited, so practical risk is low). **Fix:** add the existing driver
`check-rate-limit` for defense in depth.

### F6 — Webhook metadata overwrite
`zivosmedia-user-disabled` does `update({ metadata: { … } })`, replacing the scopes/source
set at link time. **Fix:** merge instead of replace.

### F7 — Static admin token
`admin-linked-user` is gated by a single shared `ZIVO_DRIVER_ADMIN_API_TOKEN`. Acceptable
server-to-server, but plan rotation and eventually per-admin identity/JWT.

### F8 — Ecosystem rollout: copy-paste divergence + Path-A apps getting Path-B plumbing (Med)
The bridge has been replicated to **every app** (driver, chat, software edge functions;
travel inside `cloudflare/worker.ts` `exchangeZivosmediaAuth`), all on
`feature/zivosmedia-auth-bridge` / `-foundation`. Consequences:
- **Divergent copies of security-critical code.** Each repo has its own
  `_shared/zivosmediaAuthBridge.ts` and they have already drifted (driver imports `cors.ts`;
  software inlined a different `ALLOWED_ORIGINS`; chat tweaked app-key handling). F4–F7 must
  be fixed in each copy, and CORS/validation posture already differs per app. Consider one
  shared source (or codegen) so a hardening fix lands everywhere at once.
- **F4 confirmed ecosystem-wide:** no copy has webhook replay protection.
- **Path-A misapplication.** Chat *shares* the main project (`slirph`), so its users already
  are `slirph` `auth.users`; yet its bridge migration still creates a local
  `linked_zivosmedia_users` referencing `auth.users(id)` on that same project — where
  `local_user_id` and `zivosmedia_user_id` collapse to the same id. Path-B plumbing for a
  Path-A app is redundant and contradicts the locked hybrid decision. **Decide which apps are
  Path A vs Path B (open question #4) before rolling this further.**

## Live-state verification (2026-06-07, read-only)
- `slirphzzwcogdbkeicff` (main): `app_integrations`, `zivosmedia_auth_codes`,
  `linked_zivosmedia_users`, `auth_relay_tokens` — **none exist.** Hub foundation migration
  is unapplied; seeded apps are `enabled=false` → the whole exchange is inert end-to-end.
- `yiedlgoxwjmansszdypf` (driver): `auth_relay_tokens` does not exist (no policies). The
  driver bridge tables are defined in migration `20260607163751`; their live-apply status to
  `yiedl` was not checked in this review.
- **Security advisors (read-only):** Driver (`yiedl`) 0 ERROR / 7 WARN — all known/intentional
  (`create_driver_on_signup` anon-signup, `owns_driver` RLS helper, the three body-scoped
  `increment_driver_*`); `refresh_wallet_balance` is no longer anon-callable, confirming the
  live BOLA fix holds. Software (`ydxz`) 0 ERROR / 2 WARN (pre-existing: `update_updated_at_column`
  mutable search_path; leaked-password protection off). Travel (`xbll`) clean. **No new issues
  from the bridge rollout surfaced at the DB level** — the new bridge tables don't appear, so
  they're either unapplied or RLS-clean.

## Open design decisions (owner)
Tracked in [`zivo-sso-integration-checklist.md`](./zivo-sso-integration-checklist.md): token
table (`cross_app_tokens` vs `zivosmedia_auth_codes`); exchange fn naming (three names now
exist: `exchange-auth-token`, `zivosmedia-auth-validate-code`, `zivosmedia-auth-exchange`);
`app_integrations` location (hub vs Admin); which apps are opt-in (Path B) vs shared
identity (Path A).

## Pre-launch checklist
- [ ] Resolve the 4 design decisions; converge on one exchange fn name + one token table.
- [ ] Wire the driver client (F1): PKCE verifier + `state` + correct authorize endpoint.
- [ ] Repair/remove the `auth_relay_tokens` migrations (F2) before any `db reset`.
- [ ] Secure the native return (F3); add webhook replay protection (F4); rate-limit the
      exchange (F5); merge webhook metadata (F6).
- [ ] Apply the hub foundation migration, provision per-app `client_secret`s (store only the
      hash), then set apps `enabled=true` — staging first.
- [ ] Rotate the driver Google Maps key that was committed to git, and scrub history.
