# Zivosmedia Identity Architecture

Generated: 2026-06-07

Zivosmedia is the central identity and integration hub for ZIVO LLC. Product apps keep their own Supabase projects and local user/profile tables, but they link those local users to the canonical Zivosmedia account through a server-side authorization-code exchange.

## System Roles

| System | Role |
| --- | --- |
| Zivosmedia | Canonical identity provider, app registry, authorization-code issuer, profile-change event source |
| Zivo Admin | Control plane, platform registry, health monitoring, user/link visibility, audit review |
| Zivo Travel | Product app with local travel data and linked Zivosmedia users |
| Zivo Driver | Product app with local driver data and linked Zivosmedia users |
| Zivo Software | Product app/backend for business operating software and linked Zivosmedia users |
| ZIVO Chat | Chat app that can continue sharing Zivosmedia auth until a separate identity boundary is approved |

## Data Ownership

- Zivosmedia owns the canonical `auth.users` identity.
- Product apps own app-specific profiles, permissions, operational records, and local sessions.
- Product apps store a `zivosmedia_user_id` link, not a copy of the entire Zivosmedia account.
- Payment records stay with the owning payment workflow until a separate reconciliation plan is approved.
- Zivo Admin reads cross-platform state through server-side APIs, not browser-exposed service keys.

## Foundation Tables

This PR introduces server-only tables in the Zivosmedia project:

- `app_integrations`: registered relying-party apps, redirect URIs, API URLs, Supabase refs, GitHub repos, scopes, and client secret hash.
- `zivosmedia_auth_codes`: short-lived one-time authorization codes stored only as hashes.
- `zivosmedia_auth_audit_logs`: issue/validate success and failure events.
- `platform_webhook_events`: durable future queue for Zivosmedia-to-product webhook delivery.

The migration enables RLS and revokes `anon`/`authenticated` access. Access is intentionally service-role only.

## Integration Rule

Do not make product apps trust browser-supplied identity payloads. Every app must validate the code server-side with Zivosmedia, then create or update its own local user/profile.
