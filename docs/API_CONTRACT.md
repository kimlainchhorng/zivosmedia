# Zivo Shared API Contract

Generated: 2026-06-07

Each Zivo product app should eventually expose this minimal contract for Zivosmedia and Zivo Admin.

## Product App Endpoints

### `GET /health`

Returns app status, version, Supabase status, deployment metadata, and timestamp.
Zivosmedia exposes the same read-only health contract through the
`zivosmedia-health` Edge Function; Cloudflare or app hosting can route public
`/health` traffic to it without changing its response shape.

### `POST /auth/zivosmedia/exchange`

Accepts the authorization code received from Zivosmedia plus the original PKCE `code_verifier`. The product backend validates both server-side through `zivosmedia-auth-validate-code`, links or creates the local user, records an audit event, and returns a local session result.

### `POST /webhooks/zivosmedia/user-updated`

Receives signed profile updates from Zivosmedia and updates the local linked profile.

### `POST /webhooks/zivosmedia/user-disabled`

Receives signed account-disabled events from Zivosmedia and restricts or disables the local profile.

### `GET /admin/users/:zivosmedia_user_id`

Admin-only endpoint returning local linked-user details. It must require an admin/server token and must not be public.

## Local Linked User Table

Product apps should add:

```text
linked_zivosmedia_users
- id
- local_user_id
- zivosmedia_user_id
- email
- phone
- display_name
- avatar_url
- linked_at
- last_login_at
- status
- metadata jsonb
- created_at
- updated_at
```

## Audit Table

Product apps should add:

```text
auth_audit_logs
- id
- event_type
- local_user_id
- zivosmedia_user_id
- ip_address
- user_agent
- success
- error_message
- created_at
```

## CORS

Browser endpoints must restrict CORS to approved Zivo domains. Server-to-server endpoints may allow no-origin requests but must require signed requests or server-only credentials.

## PKCE

Every `Continue with Zivosmedia` authorization request must use S256 PKCE:

- Product app creates a random `code_verifier`.
- Product app sends `code_challenge = base64url(sha256(code_verifier))` and `code_challenge_method = "S256"` to Zivosmedia.
- Product backend sends the original `code_verifier` during exchange.
- Zivosmedia rejects missing or mismatched verifiers.
