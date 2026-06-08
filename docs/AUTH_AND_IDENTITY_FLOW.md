# ZIVO Auth and Identity Flow

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Define "Continue with Zivosmedia" for all Zivo apps.

## Main Rule

Each app may keep its own local users and app-specific profiles, but every important user must link to `zivosmedia_user_id`.

## Identity Implementation Priority

1. Zivosmedia identity foundation
2. Zivo Admin monitoring/control
3. Zivo Travel + Zivo Driver
4. ZivosChat
5. ZivoPay / Zivosmedia Payments
6. ZivoSoftware + Zivo Business
7. Zivo Employee

Reason: every downstream platform needs `zivosmedia_user_id` before reliable payments, chat, driver jobs, business subscriptions, employee roles, and Admin audit can be connected.

## Login Flow

1. User opens a product app.
2. User clicks `Continue with Zivosmedia`.
3. Product app redirects to Zivosmedia auth with:
   - `app_key`
   - `redirect_uri`
   - `state`
   - `code_challenge` using PKCE S256
   - optional `handoff_id`
4. Zivosmedia authenticates user through central Supabase Auth.
5. Zivosmedia verifies app registration and redirect URI.
6. Zivosmedia issues a short-lived one-time authorization code.
7. Product app sends code to its server-side endpoint.
8. Product app server exchanges code with Zivosmedia validate endpoint using:
   - `app_key`
   - server-held client secret
   - `code`
   - `code_verifier`
9. Product app creates or updates local profile link.
10. Product app creates its own local session.

## Account Linking Flow

Product apps should store:

- `local_user_id`
- `zivosmedia_user_id`
- `email`
- `phone`
- `display_name`
- `avatar_url`
- `linked_at`
- `last_login_at`
- `status`
- `metadata`

If a matching local user exists, link it. If not, create a local profile or local auth user based on app policy.

## Token/Code Exchange

Recommended contract:

```json
{
  "app_key": "zivo-travel",
  "client_secret": "server-only",
  "code": "one-time-code",
  "code_verifier": "pkce-verifier"
}
```

Rules:

- Code is one-time use.
- Code expires quickly.
- PKCE is required.
- Client secret is held server-side only.
- Token/code exchange never happens directly in the browser.
- All failures are audited without logging secrets.

## Session Creation

Each app chooses its local session strategy:

- Supabase local session
- App-specific signed session token
- Magic-link/session bootstrap
- Shared Zivosmedia session only if approved

The product app must not treat the Zivosmedia code response as a browser session by itself. It must create a local session server-side or through a secure Supabase-supported flow.

## Logout Behavior

Minimum behavior:

- Product app logout clears local app session.
- Zivosmedia global logout clears central session.
- Product apps should handle disabled central users on next request or webhook.

Future behavior:

- Coordinated logout event from Zivosmedia to apps.
- Session revocation for high-risk admin/security actions.

## User Sync

Zivosmedia should send signed webhooks for:

- User profile updated
- Email/phone changed
- Avatar changed
- User disabled
- User restored

Product apps verify webhook signature server-side and update local linked profile.

## Disabled User Behavior

When Zivosmedia disables a user:

1. Zivosmedia emits signed `user-disabled` webhook.
2. Product app marks linked user `disabled` or `restricted`.
3. Product app blocks new sessions.
4. Existing sessions should be revoked where possible or denied on next privileged request.
5. Admin audit log records the action.

## Audit Logs

Audit these events:

- auth code issued
- auth code exchange success/failure
- account linked
- local profile created
- local session created
- webhook received
- webhook rejected
- user disabled/restored
- admin role/permission change

## RLS and Security Rules

- RLS enabled on sensitive tables.
- Service-role access only in server/Edge Function code.
- No service-role keys in frontend.
- No `.env` files in GitHub.
- Use `app_metadata` or server role tables for authorization, not user-editable metadata.
- Admin-only endpoints require staff auth and audit logging.
- Webhooks require HMAC or equivalent signature verification.
