# Auth and Identity Flow

## Identity Source of Truth

Zivosmedia is the central identity hub. The shared user identifier is `zivosmedia_user_id`.

## Continue with Zivosmedia

Target flow:

1. User starts in a ZIVO product app.
2. App offers Continue with Zivosmedia.
3. User authenticates through Zivosmedia.
4. Zivosmedia returns a verified identity handoff to the app.
5. App links the local account to `zivosmedia_user_id`.
6. App stores local role/profile data in its own app context.
7. Auth and account-linking events write audit logs.

## Account Linking

Each app may maintain local records:

- `local_user_id`.
- `business_id`.
- `driver_id`.
- `employee_id`.
- app-specific roles and permissions.

Each local record should link to `zivosmedia_user_id` when it belongs to a user identity.

## Auth Audit Logs

Audit logs should capture:

- event type.
- actor user ID.
- `zivosmedia_user_id`.
- source platform.
- local user ID when applicable.
- success/failure.
- error message.
- IP address.
- user agent.
- timestamp.

## Security Rules

- Do not share Supabase service-role keys with frontend apps.
- Do not rely on browser redirects alone for sensitive state changes.
- Use short-lived server-verified handoff codes for cross-app identity handoff.
- Use RLS and server-side validation for local account linking.
- Log account linking, unlinking, failed handoffs, and role changes.

## Recommended First Safe PR

Create the Zivosmedia identity/account-linking foundation and Continue with Zivosmedia flow in `feature/zivosmedia-identity-foundation` after owner approval.
