# ZIVO identity plan — 8 September 2026

## Recommendation and current behavior

Use **standards-based federation with Media as the canonical identity provider**, retaining app-local UUIDs and sessions during migration. Ride and Driver share one local project; Business has another. A hub sign-in and a local app session are different things. The existing PKCE linking bridge is intentional compatibility infrastructure, not by itself evidence that SSO is broken, and not a standards-compliant OIDC implementation.

This recommendation aligns with the current Business `IDENTITY_PLAN.md` option A. Media's older architecture documents conflict: AGENTS.md proposes shared JWT identity and no local Auth, while the June 7 owner ruling preserves per-app linking bridges. This document records a proposed target and a reversible observation step; it does not silently switch either model, copy signing secrets, enable providers or merge users.

| App | Current session authority | Canonical identity target | Existing data ownership |
| --- | --- | --- | --- |
| Media | slirphzzwcogdbkeicff | Media subject | Main local UUID |
| Ride + Driver | yiedlgoxwjmansszdypf | Verified Media subject mapped to local UUID | Shared Ride/Driver UUID |
| Business | gzyktwcanrrkosieecxs | Verified Media subject mapped to local UUID | Business UUID; merchant roles remain local |

The misleading phone/username placeholder is corrected to an accessible EN/KM email label and email input in this release. The main login implementation currently calls `signInWithPassword({email,password})`. A phone/username label is not proof of native phone/password or SMS OTP readiness. Phone capabilities, verified Auth phone fields, recovery and provider delivery need separate end-to-end validation. Do not infer verified phone ownership from profile fields or editable metadata.

## Live foreign-key inventory

Schema-only queries on September 8 collected **450 direct auth.users foreign-key columns in Media, 27 in Ride/Driver and 124 in Business**. Exact table/column/constraint mappings:

- [Media](docs/identity/slirphzzwcogdbkeicff-auth-foreign-keys.json)
- [Ride/Driver](docs/identity/yiedlgoxwjmansszdypf-auth-foreign-keys.json)
- [Business](docs/identity/gzyktwcanrrkosieecxs-auth-foreign-keys.json)

These counts are FK columns, not user/table counts. The files contain no account rows. References through profiles, UUIDs without FKs, JSON, RLS expressions, storage paths, billing/provider metadata and external integrations must also be inventoried before a consolidation; the direct-FK catalog is not an exhaustive dependency graph. No password hashes, tokens, contact lists or user exports were collected.

## Options

| Option | Benefits | Cost and constraints | Rollback |
| --- | --- | --- | --- |
| A. Media OIDC issuer + local sessions (recommended) | One recognizable sign-in, preserves existing local UUIDs and merchant/wallet ownership; staged per app | Configure actual OAuth/OIDC clients, consent, exact callbacks, PKCE/nonce and issuer/audience checks; safe linking and disable/revoke propagation | Disable app/provider flags, revoke pilot sessions, keep verified links/audit records; local password/MFA login continues |
| B. One Auth project + per-domain data | One session authority and simpler future identity | Rewrite/reconcile hundreds of FKs and policies, storage and provider identifiers; validate cross-project token trust; collisions and stale tokens affect money/ownership | Requires complete pre-migration mapping/backups, dual-read phase and transaction-by-transaction reconciliation; never remap financial history by email |
| C. Existing custom PKCE bridge (transition only) | Already integrated by Ride/Driver and staged in Business; minimal near-term data impact | Bespoke code exchange and local session minting, replay/client secret enforcement and disabled-account/MFA propagation remain responsibilities | Disable integration/client flags, keep local login; preserve mappings and audit history |

Supabase supports an [OAuth 2.1/OIDC server](https://supabase.com/docs/guides/auth/oauth-server) and [custom OIDC providers](https://supabase.com/docs/guides/auth/custom-oauth-providers). Use discovery and asymmetric public-key verification; do not share private JWT signing secrets as the default integration. OIDC scopes do not replace [database RLS and client-aware authorization](https://supabase.com/docs/guides/auth/oauth-server/token-security). Existing discovery endpoints alone do not prove client registration, consent or account linking works.

## Matching and duplicate handling

1. Canonical key is `(issuer, subject)`, never email or phone. Existing verified mappings win; do not reassign them on an email change.
2. Verified email is a candidate signal only. Trim surrounding whitespace and normalize the domain; preserve the source local part and the identity provider's semantics. Never strip plus tags or Gmail dots. Require authoritative verification (Auth confirmed timestamp, not user metadata), recent hub login and proof of the existing local account before linking a collision.
3. Normalize phones with a maintained parser to E.164 (KH +855 with domestic trunk zero handled). Only recently reverified Auth phone ownership can support linking. A profile contact number, recycled number, or matching display name cannot transfer an account.
4. Multiple candidates, unverified contacts, mismatched email/phone, banned/deleted identities, MFA-protected collisions or privileged accounts go to explicit recovery/manual review. Never merge wallet balances, payout methods, driver approvals or merchant ownership automatically.
5. In one transaction enforce unique provider subject and unique local mapping; consume the authorization code once, bind PKCE/state/nonce and callback, and append a service-controlled audit event. Use idempotency for retries. Link audits retain proof method and actor but no codes, OTPs, tokens or full provider payloads.
6. Step-up remains required for financial/privileged operations. Hub authentication never grants Driver approval, merchant membership or admin status. Test old tokens after disable/unlink and define revocation latency.

## Migration sequence and acceptance

- Phase 0 (implemented here): source topology + `VITE_IDENTITY_DIAGNOSTICS_ENABLED=false`. When enabled in an isolated pilot, AuthContext emits only app name, expected-issuer match and `observe-only` phase to an in-page event. No network writes, account IDs, claims, issuer values or tokens are emitted. It cannot permit/deny login. Rollback: set false/rebuild or remove observer. Software and other hosts are deliberately excluded.
- Phase 1: refresh full dependency and collision inventories, review conflicting historical decisions, confirm provider/client availability and create dedicated non-admin pilot accounts with verified contacts. Establish disabled-user and MFA contracts and backups.
- Phase 2: stage standards-based Media consent and one app provider with exact callbacks; retain the current bridge/local login. Prove two-app single-sign-in, local UUID stability, unmatched signup, conflict recovery, replay/expiry/cancel handling, disabled account, MFA, malicious callback and cross-account access rejection. Do not use real purchases or payouts as probes.
- Phase 3: opt-in pilot for one app, monitor link failures and role/ownership mismatches, then roll out Ride/Driver together (shared identity store) and Business separately. Continue explicit fallback login. Change one provider flag at a time.
- Phase 4: deprecate bridge only after clients and revocation paths are proven; retain identifiers/audit history and local data UUIDs. Consolidation is a future separately scoped migration, not required for single sign-on.

Rollback is triggered by any wrong-owner result, duplicate mapping, MFA bypass or broken revoke propagation. Disable the pilot first, revoke affected pilot sessions, preserve audit evidence and return to local login. Never undo by deleting accounts or moving wallet/merchant rows.

## Planning estimate

Engineering estimate, not a delivery commitment: 2–3 days dependency/collision inventory; 3–5 days provider/consent integration; 3–5 days linking/MFA/revocation hardening; 3–5 days staged QA and rollout. Approximately **2–4 weeks** with two engineers and timely provider access. Full consolidation is approximately **6–10 weeks** plus financial reconciliation and rollout support; refine after the indirect-reference inventory. No bulk identity migration or provider activation is included in this release.
