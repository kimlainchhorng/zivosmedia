# Continue with Zivosmedia Auth Flow

Generated: 2026-06-07

The target flow is an OAuth/OIDC-style authorization-code exchange.

## Browser Flow

1. A product app shows `Continue with Zivosmedia`.
2. The product app redirects the user to Zivosmedia with:
   - `app_key`
   - `redirect_uri`
   - `state`
   - optional `nonce`
   - required PKCE `code_challenge` with `S256`
3. Zivosmedia authenticates the user with the existing Supabase session.
4. Zivosmedia calls `zivosmedia-auth-issue-code` from the authenticated browser session.
5. Zivosmedia redirects back to the registered product `redirect_uri` with the one-time `code` and original `state`.
6. The product app callback sends the code to its own backend or Edge Function.
7. The product backend calls `zivosmedia-auth-validate-code` with its server-only client secret.
8. The product backend links or creates its local user profile and starts its own local session.

## Current Foundation Endpoints

### `zivosmedia-auth-issue-code`

Caller: authenticated Zivosmedia browser session.

Request:

```json
{
  "app_key": "zivo_travel",
  "redirect_uri": "https://zivostravel.com/auth/zivosmedia/callback",
  "scopes": ["openid", "profile", "email"],
  "state": "opaque-state-from-product",
  "nonce": "optional-nonce",
  "code_challenge": "required-pkce-s256-challenge",
  "code_challenge_method": "S256"
}
```

Response:

```json
{
  "code": "one-time-code",
  "token_type": "zivosmedia_authorization_code",
  "expires_at": "2026-06-07T00:00:00.000Z",
  "redirect_uri": "https://zivostravel.com/auth/zivosmedia/callback",
  "state": "opaque-state-from-product"
}
```

### `zivosmedia-auth-validate-code`

Caller: product app backend only.

Request:

```json
{
  "app_key": "zivo_travel",
  "client_secret": "server-only-secret",
  "code": "one-time-code",
  "code_verifier": "original-pkce-code-verifier"
}
```

Response:

```json
{
  "token_type": "zivosmedia_identity",
  "profile": {
    "zivosmedia_user_id": "uuid",
    "email": "user@example.com",
    "phone": null,
    "display_name": "User Name",
    "avatar_url": null
  },
  "scopes": ["openid", "profile", "email"],
  "linked_at": "2026-06-07T00:00:00.000Z"
}
```

## App Enablement

Seeded apps are `configuration_pending` and `enabled = false`. Before production use, an admin must:

1. Confirm the app domain and callback URL.
2. Generate a server-only client secret.
3. Store only the SHA-256 hash in `app_integrations.client_secret_hash`.
4. Store the raw secret only in the product app backend secret manager.
5. Require the product app to generate a fresh PKCE verifier/challenge for every authorization request.
6. Set the app to `status = 'enabled'` and `enabled = true`.

Never put the client secret or service-role key in browser code.
