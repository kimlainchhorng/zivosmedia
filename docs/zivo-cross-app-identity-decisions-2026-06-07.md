# Zivo cross-app identity — decision record & reconciliation plan

**Date:** 2026-06-07 · **Author:** Claude (architect) · **Status:** Superseded in part by the owner ruling below.

> **⚠️ OWNER RULING 2026-06-07 — supersedes D4.** The owner chose **all four first-party apps are
> Path B** (per [`IDENTITY_EXCHANGE_SPEC.md`](../../docs/IDENTITY_EXCHANGE_SPEC.md)): build/keep the
> per-app linking bridge (`linked_zivosmedia_users` + `auth_audit_logs` + server exchange) in
> **Travel, Driver, and Software**; **Chat is Path B but short-circuits** on the shared hub project
> (no separate `linked_zivosmedia_users` table). Therefore **D4 below is VOID**, and the
> "remove Path-B plumbing" reconciliation steps for **Travel and Software are CANCELLED — keep +
> finish + harden them instead**. (Chat's separate-linked-table removal still applies, since Chat
> shares the hub.) **D1, D2, D3 stand.**

D2–D4 originally confirmed/enforced existing locked decisions; **D1 awaits owner ratification** (it
overrides the earlier "reuse `cross_app_tokens`" note).

**Inputs:** locked [`zivo-multidomain-architecture.md`](./zivo-multidomain-architecture.md)
(hybrid identity), [`Zivo-Admin/docs/ADMIN_CONTROL_PLAN.md`],
[`zivo-sso-integration-checklist.md`](./zivo-sso-integration-checklist.md) (status),
[`zivo-auth-bridge-security-review-2026-06-07.md`](./zivo-auth-bridge-security-review-2026-06-07.md)
(findings).

## Context

The hybrid identity model is locked (shared identity by default; per-domain projects trust
the main JWT + claims-RLS; local linked accounts opt-in). In parallel, a confidential-client
**OAuth2 authorization-code + PKCE** bridge was built on the hub and **copy-pasted into every
app** (driver/chat/software edge functions; travel in its worker). That created four
conflicts; this record resolves them.

## Decisions

- **D1 — Token table: standardize on `zivosmedia_auth_codes`; retire `cross_app_tokens`.**
  *(pending ratify — overrides the earlier "reuse cross_app_tokens" lock)* — It's purpose-built
  (PKCE S256 `code_challenge`, single-use, `expires/used/revoked`, FK to `app_integrations`)
  and already wired with PKCE enforced. Still "one token table," just the stronger one.
- **D2 — Naming: keep three role-specific functions; retire the legacy `exchange-auth-token`.**
  `zivosmedia-auth-issue-code` (hub, issues), `zivosmedia-auth-validate-code` (hub, redeems
  server-to-server), `zivosmedia-auth-exchange` (each target's `/auth/zivosmedia/exchange`).
  These are three roles, not duplicates. Only chat's legacy browser hook is removed (the lock
  permitted this "…unless you also update chat").
- **D3 — `app_integrations` stays in the hub; Zivo-Admin reads it.** The hub's issue/validate
  functions query it at runtime via service-role, so it must be co-located with them. Admin
  reads it (service-role, excluding `client_secret_hash`) and layers ops metadata keyed by
  `app_key`. Matches the latest `ADMIN_CONTROL_PLAN.md`.
- **D4 — ❌ VOID (overridden by the owner ruling 2026-06-07; see banner at top).** Original
  proposal, kept for history: *Path B = Driver only; Path A = Chat, Travel, Software.* The owner
  instead chose **all four = Path B** (Travel/Driver/Software keep the linking bridge; Chat
  short-circuits on the shared hub). **Do not act on the Travel/Software "remove bridge" steps in
  the reconciliation plan below** — keep and finish them per
  [`IDENTITY_EXCHANGE_SPEC.md`](../../docs/IDENTITY_EXCHANGE_SPEC.md).

## Reconciliation plan

### Hub (zivosmedia `slirph`)
- [ ] Make `zivosmedia_auth_codes` canonical; migrate any `cross_app_tokens` callers, then drop it (D1).
- [ ] Build the **authorize route** (`/auth/zivosmedia/authorize`): authenticated UI → `issue-code`
      → 302 to the registered `redirect_uri?code=&state=`. (Currently missing — only the edge fn exists.)
- [ ] Keep `app_integrations` (D3); provision each app's `client_secret` (store only the hash);
      set apps `enabled=true` only after a staging test.
- [ ] Add webhook emitters (`user-updated`/`user-disabled`) with a **timestamped HMAC** (replay-safe).
- [ ] Apply the foundation migration (currently unapplied on `slirph`).

### Driver (Path B — keep & finish)
- [ ] Wire the client (F1): generate + store PKCE verifier + `state`; point "Continue with
      Zivosmedia" at the hub authorize route (not `/auth/handoff`); send `code` + `code_verifier`
      to `zivosmedia-auth-exchange`.
- [ ] Harden: webhook replay (F4), rate-limit the exchange (F5), merge (not overwrite) webhook
      metadata (F6).
- [ ] Land the 3 pending security fixes as their own commit (`.env` untrack, BOLA migration,
      `auth_relay_tokens` RLS) and **rotate** the leaked Google Maps key.

### Chat (Path A — remove Path-B plumbing)
- [ ] Drop `linked_zivosmedia_users`/`auth_audit_logs` from its bridge migration (self-referential
      on shared `slirph`); remove `zivosmedia-auth-exchange`/`-user-disabled`/`-user-updated`/
      `admin-linked-user`.
- [ ] Use the shared session / `/auth/handoff` hash bridge; remove the legacy `exchange-auth-token`
      hook in `useCrossAppAuth.ts` (D2).

### Travel (Path B — keep & finish; D4 VOID)
- [ ] ❌ **VOID per the owner ruling (top banner)** — do NOT remove the worker's
      `exchangeZivosmediaAuth` + `linked_zivosmedia_users` bridge. Keep, finish, and harden it:
      client PKCE wiring + session creation; the `authenticated` SELECT grant is already added.
      Keep `/api/health`.

### Software (Path B — keep & finish; D4 VOID)
- [ ] ❌ **VOID per the owner ruling (top banner)** — do NOT remove the bridge edge functions.
      Keep, finish, and harden them: client PKCE wiring + session creation.

### Zivo-Admin
- [ ] `GET /api/platform/registry` reads hub `app_integrations` (service-role, **exclude
      `client_secret_hash`**); layer ops metadata keyed by `app_key`. (Already in flight on
      `feature/platform-registry-foundation`.)

### Cross-cutting
- [ ] One exchange-fn name per role; retire `exchange-auth-token` and `cross_app_tokens`.
- [ ] After D4, only Driver keeps `_shared/zivosmediaAuthBridge.ts`, so the 4-way copy-paste
      divergence (F8) largely resolves itself; if any shared helper remains multi-app, source it once.

## Consequences
- **D4 means walking back work just built** — the chat/software/travel Path-B bridges the
  parallel session created should be removed. Coordinate so it stops extending them.
- Surface shrinks to one Path-B app (driver) = the reference implementation; others stay
  shared-identity. Reversible: re-introduce Path B per the driver template if an app later
  needs independent local accounts.
- Nothing is deployed yet (foundation unapplied; apps `enabled=false`), so this reconciliation
  is pre-production and low-risk to land now.
