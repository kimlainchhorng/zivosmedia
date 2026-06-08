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
