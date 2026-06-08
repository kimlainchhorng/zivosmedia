# Zivo Identity Security Checklist

Generated: 2026-06-07

## Secrets

- Do not commit `.env` files.
- Do not expose Supabase service-role keys in browser code.
- Do not expose product app client secrets in browser code.
- Store product app client secrets only in server-side Edge Function, Cloudflare, or backend secret managers.
- Store only hashes in `app_integrations.client_secret_hash`.

## Database

- Enable RLS on all sensitive tables.
- Revoke `anon` and `authenticated` access for server-only integration tables.
- Grant only required privileges to `service_role`.
- Do not use user-editable metadata for authorization.
- Do not put `SECURITY DEFINER` helpers in exposed schemas unless grants are locked down.

## Auth Exchange

- Use short-lived one-time codes.
- Store only code hashes.
- Validate redirect URI against the app registry.
- Require S256 PKCE on every issued authorization code.
- Validate `code_verifier` before marking a code used.
- Validate the app secret server-side.
- Mark codes as used immediately after validation.
- Record audit logs for issue and validation failures.

## Webhooks

- Sign every webhook with HMAC.
- Include timestamp and nonce.
- Reject replayed nonces.
- Store event payload hashes.
- Retry failed events with capped backoff.

## Deployment

- Deploy to staging first.
- Verify CORS on every app domain.
- Verify all Edge Functions with `deno check` or equivalent before deployment.
- Run secret scanners and build checks before opening a PR.
- Do not change production Auth/DNS/deployment settings without explicit owner approval.

## Payments (ZivoPay)

- Do not store card numbers.
- Do not expose Stripe, PayPal, or Square secret keys (server-only).
- Do not expose Supabase service-role keys.
- Use backend routes or Supabase Edge Functions for all charges, payouts, refunds, and webhooks.
- Verify each provider's webhook signature server-side; store event IDs for idempotency; never
  trust browser-submitted payment status.
- Sandbox/test mode first for every provider; **no live payment or payout without explicit
  owner approval**.
- Store only provider object IDs, never raw payment credentials.

## Current Risk Register (2026-06-07)

Concrete issues found in prior live audits — fix before/while building:

- **zivodriver `.env` was git-tracked with a live Google Maps key** → untrack AND **rotate**
  the key (fix in progress on `chore/untrack-env-file`).
- **Driver metric RPC BOLA/IDOR** (`increment_driver_*`) was fixed live but must land as a
  migration (`20260607170000_harden_driver_metric_security.sql`) or a `db reset` reintroduces it.
- **`auth_relay_tokens`** stale driver migrations would recreate an `anon`-readable
  session-token table on reset → repair/drop before any reset.
- **Hub `app_integrations` / auth-code tables are inert/undeployed** and SSO client halves are
  unwired — do not assume the federated exchange flow is live.
- **No `/health` on hub, driver, or chat** (Travel has `/api/health`, Admin `/healthz`) → add
  the shared `/health` contract.
- Keep service-role / Stripe / JWT secrets out of every `VITE_*` (browser) variable.
