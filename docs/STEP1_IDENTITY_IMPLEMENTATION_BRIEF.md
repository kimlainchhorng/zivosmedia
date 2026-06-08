# Step-1 Identity Foundation — Codex Implementation Brief

Status: Ready for Codex · Date: 2026-06-07 · Owner-gated actions flagged ⚠️

Single ordered worklist to finish **Step 1 (Zivosmedia identity foundation)**. Consolidates
[`../../docs/IDENTITY_EXCHANGE_SPEC.md`](../../docs/IDENTITY_EXCHANGE_SPEC.md) (build targets),
[`zivo-cross-app-identity-decisions-2026-06-07.md`](zivo-cross-app-identity-decisions-2026-06-07.md)
(decisions), and [`zivo-auth-bridge-security-review-2026-06-07.md`](zivo-auth-bridge-security-review-2026-06-07.md)
(findings F1–F8). Where they once conflicted, **this brief wins** (it applies the owner ruling).

## Decision recap (owner, 2026-06-07)

**All four first-party apps are Path B.** Travel, Driver, Software keep a local
`linked_zivosmedia_users` + `auth_audit_logs` + server exchange in their own project. **Chat is
Path B but short-circuits** on the shared hub (`slirphzzwcogdbkeicff`) → **no separate linked
table** for chat. Shared identity (Path A) still underpins everything; `zivosmedia_user_id` is the
universal join key. **Nothing built for Travel/Software gets removed** (ADR D4 is void).

## Rules (every task)

Feature branches only; no push to `main`; PRs for review. No secrets in the browser / `VITE_*`;
service-role, client_secret, webhook secrets server-side only. **No destructive migrations.** Run
lint + build + tests + type-check before each PR. See [`SECURITY_CHECKLIST.md`](SECURITY_CHECKLIST.md)
and [`PR_ROADMAP.md`](PR_ROADMAP.md).

---

## Phase A — author on feature branches now (NOT live)

Hub (`zivosmedia` / `slirphzzwcogdbkeicff`):

1. **Build the authorize route** (the missing piece, F1 root cause):
   `/auth/zivosmedia/authorize` — when the user is signed in, render consent for `app_key`/scopes,
   call `zivosmedia-auth-issue-code`, then 302 to the registered `redirect_uri?code=&state=`. Reuse
   the `TRUSTED_ZIVO_AUTH_HOSTS` allowlist in `src/lib/authRedirect.ts`.
2. **Harden `zivosmedia-auth-validate-code`**: require `code_verifier` and verify
   `base64url(sha256(code_verifier)) === code_challenge`; re-validate `redirect_uri` against the
   stored value. Keep the confidential `client_secret` check (defense in depth).
3. **Non-destructive hardening migration**: add `app_integrations.webhook_secret_hash`; add
   `cleanup_expired_auth_codes()` (SECURITY DEFINER, `search_path=public`). (Cron scheduling is ⚠️.)
4. **Audit inserts**: populate `ip_hash`.
5. **`/health`** endpoint matching Travel's payload shape (also add to driver + chat below).

Each target app (in its OWN project):

6. **Driver client wiring (F1, pre-launch blocker)**: generate + store a PKCE verifier + `state`;
   point "Continue with Zivosmedia" at the hub **authorize route** (not `/auth/handoff`); on the
   `/auth/zivosmedia/callback`, validate `state` and POST `code` + `code_verifier` to
   `zivosmedia-auth-exchange`. Add `/health`.
7. **Travel + Software**: finish/keep their server exchange route + `linked_zivosmedia_users`
   (already on branches — **keep per the ruling**). Reconcile to one grant pattern — **fix Travel's
   missing `grant select on linked_zivosmedia_users to authenticated`** (RLS scopes it to the owner row).
8. **Chat (short-circuit)**: **remove only the redundant separate `linked_zivosmedia_users`/
   `auth_audit_logs`** from its bridge migration (self-referential on the shared hub) and rewire
   `ZIVO-CHAT/src/hooks/useCrossAppAuth.ts` off the browser `exchange-auth-token` → resolve to the
   hub session / server exchange. Keep "Continue with Zivosmedia".
9. **Webhook replay/dedupe (F4)** in driver + software `user-updated`/`user-disabled`: unique
   delivery `event_id` + insert-on-conflict-ignore into `platform_webhook_events` + advance status
   after processing; sign `t=<unix>.<body>`, reject if `|now-t| > 300s`.
10. **Rate-limit** the exchange endpoints (F5, reuse driver `check-rate-limit`); **merge, not
    overwrite**, webhook metadata (F6).
11. **`.env` hygiene**: ensure `zivodriver/.env` is untracked (`chore/untrack-env-file`); add
    `.env.example` (names only) for software + chat cross-app vars. (Key rotation + history rewrite ⚠️.)
12. **Tests**: code/secret/PKCE validator unit tests (no real secrets); build/lint/type-check per repo.

---

## Phase B — ⚠️ owner-gated live actions (do NOT run without explicit approval)

1. Generate + store the four `ZIVO_*_CLIENT_SECRET` + `ZIVO_WEBHOOK_SIGNING_SECRET` (env only;
   store only the hashes in `app_integrations`).
2. Apply the hub foundation migration (`20260607161643_...`) + the new hardening migration; set the
   4 apps `status='enabled'`, `enabled=true`.
3. Apply bridge migrations in driver + software projects (chat: drop its redundant linked-table
   migration). **Staging first.**
4. Deploy the per-app exchange edge functions / worker routes + the updated `validate-code`.
5. Schedule `cleanup_expired_auth_codes()` via `pg_cron`.
6. **Rotate** the exposed `zivodriver` Google Maps key + complete the `.env` history scrub.

---

## Acceptance (staging)

- End-to-end "Continue with Zivosmedia" works for **Driver** (full Path B: code → exchange →
  `linked_zivosmedia_users` upsert → local session) and the short-circuit path for **Chat**.
- `auth_audit_logs` / `zivosmedia_auth_audit_logs` rows written for issue + exchange (success + fail).
- No secret reaches the browser; Admin registry read excludes `client_secret_hash`/`webhook_secret_hash`.
- Supabase advisors clean on touched projects; replayed webhook rejected; expired code rejected.

## Coordination

A parallel agent is active in `zivosmedia/docs/*` and `Zivo-Admin/*`
(`feature/platform-registry-foundation`). Build in **new files**, do **not** duplicate the platform
registry, reconcile after quiescence, and audit grants on any new RPCs.
