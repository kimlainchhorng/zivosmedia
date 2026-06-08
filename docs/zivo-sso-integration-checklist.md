# Zivo SSO / identity — integration **status tracker**

Generated: 2026-06-07 (Claude). **This file is a status tracker, not a model
definition.** The authoritative model is the LOCKED
[`zivo-multidomain-architecture.md`](./zivo-multidomain-architecture.md) (hybrid
identity) and [`Zivo-Admin/docs/ADMIN_CONTROL_PLAN.md`]. Where this file and those
disagree, **those win.** See also [`AUTH_FLOW.md`](./AUTH_FLOW.md),
[`API_CONTRACT.md`](./API_CONTRACT.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md)
(note: those three currently describe the *pure-federated* model and are being
reconciled to hybrid — do not treat them as final yet).

## Model in one paragraph (hybrid, per locked owner decision 2026-06-07)

**Shared identity is the DEFAULT.** Auth always runs on the main project
`slirphzzwcogdbkeicff`; per-domain projects (travel `xbll…`, driver `yiedl…`,
software `ydxz…`) have **no local `auth.users`** — they trust the main JWT (same
secret + issuer) and use claims-based RLS (`auth.uid()`), routing only *data* per
domain (the dual-client `authSupabase`/`dataSupabase` pattern). Cross-domain SSO via
`/auth/handoff` already works. **Local linked accounts are OPT-IN** — only for a
surface that must own an independent user system. For the opt-in case: **reuse
`public.cross_app_tokens`**, exchange fn named **`exchange-auth-token`**; keep PKCE +
client-secret hashing + redirect allowlist + webhook HMAC/replay; add
`linked_zivosmedia_users` + `auth_audit_logs` in that app's OWN project only.

## ⚠️ Open reconciliation questions (need owner decision)

These block a clean "finish SSO" because Codex's uncommitted hub work (branch
`feature/zivosmedia-auth-foundation`) encodes the *federated* design, which conflicts
with the locked *hybrid* decision:

1. **Token table:** Codex added `zivosmedia_auth_codes` (PKCE auth-code) in the hub;
   the locked decision says **reuse/extend `cross_app_tokens`**. Keep Codex's new
   table, or migrate its good bits (hash/redirect_uri/scopes/PKCE) onto
   `cross_app_tokens` and drop it?
2. **Function names:** Codex built `zivosmedia-auth-issue-code` +
   `zivosmedia-auth-validate-code`; the locked decision says use
   **`exchange-auth-token`** (already called by `ZIVO-CHAT/src/hooks/useCrossAppAuth.ts`).
   Rename/alias Codex's fns + keep one name, or update chat to the new names?
3. **`app_integrations` location:** the handoff "Identity Model Decision" note says it
   **belongs in Zivo-Admin**; but Codex created it in the **hub**, and the latest
   `ADMIN_CONTROL_PLAN.md` (09:33 today) keeps it in the hub with Admin reading it.
   Confirm: hub-owned + Admin-reads (current direction) — yes/no?
4. **Which apps are opt-in (Path B) at all?** Per the locked doc, travel/driver/
   software/chat are shared-identity (Path A) → they likely **don't need**
   `linked_zivosmedia_users` now. Confirm none are opt-in yet, so we don't build
   per-app local-user plumbing that the hybrid model doesn't want.

## Current state matrix (verified 2026-06-07)

| App (project) | Identity path | Auth wiring today | Local linked table needed? | `/health` |
| --- | --- | --- | --- | --- |
| **zivosmedia** (hub `slirph…`) | authority | issues identity; dual-client `authSupabase`/`dataSupabase` | n/a | ✅ `zivosmedia-health` Edge Function |
| **Travel** (`xbll…`) | A (shared) | bridge mode → `/auth/handoff`; trusts main JWT when dedicated backend on | No (unless made opt-in) | ✅ `/api/health` |
| **Driver** (`yiedl…`) | A (shared) | data routes to `yiedl…` gated by publishable key; ConnectedWorkflowBanner | No (unless opt-in) | ✅ `driver-health` Edge Function |
| **Software** (`ydxz…`) | A (shared) | backend-only repo now has `zivosmedia-auth-exchange`, signed profile webhooks, admin linked-user lookup; UI still served by hub build until frontend is scaffolded | No (unless opt-in) | ✅ `software-health` Edge Function |
| **Chat** (shares `slirph…`) | A (shared) | shares main project → already a main session; `exchange-auth-token` call is vestigial until a real split | No | ✅ `chat-health` Edge Function |

## Cross-cutting fixes (independent of the open questions — safe to do)

0. **PKCE hardening:** the auth-code foundation now requires S256
   `code_challenge` on issue and `code_verifier` on validation. Keep this invariant
   if the code is later reconciled into `cross_app_tokens`.
1. **Driver secret leak:** `zivodriver/.env` is git-tracked with a live Google Maps
   key. Untrack + add to `.gitignore` + **rotate the key** (branch
   `chore/untrack-env-file` is the in-progress fix; history rewrite needs approval).
2. **Health endpoints:** zivosmedia now has `zivosmedia-health`; Driver has
   `driver-health`; Software has `software-health`; Chat has `chat-health`;
   Travel has `/api/health`; Admin has `/healthz`. Later Cloudflare/API
   routing should map product-domain `/health` paths to these handlers.
3. **Driver BOLA migration gap:** the live driver metric-RPC hardening still isn't in
   a migration (baseline would clobber on reset) — see the SQL in
   `Zivo-Admin/docs/claude-codex-handoff.md`.

## Zivo-Admin (control plane) — already in progress

PR for the platform registry is **in flight on `feature/platform-registry-foundation`**
(`config/platform-registry.json`, `server/product-registry.mjs`,
`server/platform-health.mjs`, routes `GET /api/platform/registry` + `/api/platform/health`,
`docs/ADMIN_CONTROL_PLAN.md`). Do **not** duplicate. When it quiesces, the useful
review is: confirm `/api/platform/registry` never returns `client_secret_hash` and
stays behind `admin-auth.mjs` + redaction.
