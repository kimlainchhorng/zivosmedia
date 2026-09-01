# Internal cron authentication cutover

This runbook moves these live main-project jobs to one signed, replay-protected
handler boundary:

- `auto-cancel-stale-orders`
- `close-trip-call-sessions-5min`
- `marketing-automations-tick`

The long-lived value must never appear in a job command, pg_net request header,
migration, ticket, chat, CI log, or repository file. Scheduled calls place only a
short-lived HMAC signature, signed purpose, timestamp, UUID nonce, and body hash
in pg_net's transient request queue.

## Why the database change is staged

Hosted pg_net and pg_cron operational tables are owned by `supabase_admin`.
The project `postgres` role cannot revoke owner-issued `PUBLIC` grants from
those extension tables. The browser roles are `NOLOGIN`, and the `net` and
`cron` schemas are not exposed by the Data API, but trusted direct database
login roles can still inspect extension internals.

The repair therefore does not depend on changing extension ACLs. Instead:

1. a postgres-only private function reads the Vault secret in memory;
2. it signs the exact method, logical public function path, purpose, timestamp,
   nonce, and raw JSON body hash;
3. pg_net stores only the derived envelope;
4. Edge verifies the HMAC and strict time bounds; and
5. Edge atomically inserts the nonce into the existing RLS-protected
   `nonce_cache` before any privileged business work.

A direct database operator who can read and delete pg_net queue rows remains a
trusted secret-bearing principal and can cause denial of service. Racing a
captured signed request can cause the one intended invocation to run early, but
the nonce claim prevents duplicate execution.

The signer deliberately does not delete from the shared `nonce_cache`. Other
signed endpoints currently have different timestamp windows and the table's
older five-minute default; a global cleanup must not be scheduled until those
windows and every nonce retention period are reconciled. Cron claims explicitly
retain their nonce for ten minutes, so this cutover remains replay-safe without
that unrelated cleanup change.

The preparation and cutover are separate migrations so signed readiness can be
proved before any live job changes.

## Preconditions

1. Freeze the three Edge Function sources, the shared auth helper, and both
   migrations:

   - `20260830163714_harden_internal_cron_auth.sql`
   - `20260830173024_cutover_internal_cron_hmac_jobs.sql`

2. Confirm the three jobs still exist with their recorded IDs, schedules,
   databases, usernames, and active states.
3. Confirm the three functions still use `verify_jwt=false`; their handler-owned
   HMAC boundary performs authentication.
4. Confirm exactly one Edge secret `INTERNAL_CRON_SECRET` and one Vault secret
   `internal_cron_secret` exist, each contains at least 32 random UTF-8 bytes,
   and their SHA-256 fingerprints match. Never display either value.
5. Confirm `INTERNAL_CRON_LEGACY_AUTH_ENABLED=true` only for the coordinated
   transition. When this flag is false, direct `x-cron-secret` and every former
   credential are rejected; only the signed HMAC path remains.
6. Confirm `public.nonce_cache` has RLS enabled, only `service_role` has an
   INSERT policy, and it is currently operational. Any database error during
   nonce claim must fail authentication closed.
7. Confirm `anon` and `authenticated` are `NOLOGIN` roles. Probe the Data API
   with `Accept-Profile: net` and `Accept-Profile: cron`; both must return 406.
   Also confirm no browser-executable function in a Data-API-exposed schema
   (including either security mode in `public` or `graphql_public`) exposes
   `cron.job`, `cron.job_run_details`, `net.http_request_queue`, or
   `net._http_response`.
8. Confirm the preserved job username can use `private`, Vault, pgcrypto,
   pg_net, and `net.http_post`. The live jobs currently run as `postgres`;
   verify rather than assume.
9. Classify old command and history credentials with fingerprints only. On
   2026-08-30, jobs 10 and 18 used a stale anon JWT and job 20 used a stale
   opaque value. None matched the current Vault values. Do not restore them.
10. Treat the scheduler's historical `succeeded` rows only as enqueue evidence.
    Before this repair, function-specific Edge logs showed downstream 403, 403,
    and 401 responses.

## Exact deploy, probe, and cutover order

1. Set the matching Edge and Vault secret copies. Temporarily set
   `INTERNAL_CRON_LEGACY_AUTH_ENABLED=true`.
2. Deploy only the three frozen handlers with platform JWT verification disabled:

   ```bash
   fnm exec --using v24.19.0 npx supabase functions deploy \
     auto-cancel-stale-orders close-trip-call-sessions marketing-automations-tick \
     --project-ref slirphzzwcogdbkeicff --use-api --no-verify-jwt
   ```

   Confirm all three versions are active and report `verify_jwt=false`.

3. Apply only the preparation migration
   `20260830163714_harden_internal_cron_auth.sql`. It validates the hosted
   prerequisites and installs `private.enqueue_internal_cron`, executable only
   by `postgres`. It does not alter a live job or redact history.
4. From an approved SQL session, enqueue one signed readiness request for each
   function. The signer returns only pg_net request IDs, never the secret:

   ```sql
   select private.enqueue_internal_cron(
     'auto-cancel-stale-orders',
     '{}'::jsonb,
     'readiness'
   ) as request_id;

   select private.enqueue_internal_cron(
     'close-trip-call-sessions',
     '{}'::jsonb,
     'readiness'
   ) as request_id;

   select private.enqueue_internal_cron(
     'marketing-automations-tick',
     '{}'::jsonb,
     'readiness'
   ) as request_id;
   ```

   For those exact request IDs, require pg_net response status 204 and fresh
   function-specific Edge 204 logs. The signed `readiness` purpose is included
   in the HMAC and every probe claims its nonce before returning. An unsigned
   `x-cron-probe` header cannot turn a signed execute request into a probe.
   Legacy or direct credentials never select the no-op readiness path; while
   transition mode is enabled, they continue to invoke normal execution.

5. Send one deliberately incomplete or malformed signed request directly to each
   function and require 401/403. Do not use the real secret in this negative test.
6. Only after all three signed probes pass, apply
   `20260830173024_cutover_internal_cron_hmac_jobs.sql`. In one transaction it:

   - redacts only the target history commands that contain legacy Authorization
     or `x-cron-secret` material while retaining run/status/timing evidence;
   - changes all three jobs through `cron.alter_job`;
   - preserves job IDs, schedules, databases, usernames, and active states; and
   - fails if a rewritten command contains Authorization, `x-cron-secret`, or a
     Vault secret reference.

7. Verify all three jobs call only `private.enqueue_internal_cron(...,
'execute')` and retain their recorded metadata:

   ```sql
   select
     jobid,
     jobname,
     schedule,
     database,
     username,
     active,
     command ilike '%Authorization%' as has_authorization,
     command ilike '%x-cron-secret%' as has_static_secret_header,
     command ilike '%vault.decrypted_secrets%' as reads_vault_directly,
     command ilike '%private.enqueue_internal_cron%' as uses_hmac_signer
   from cron.job
   where jobname in (
     'auto-cancel-stale-orders',
     'close-trip-call-sessions-5min',
     'marketing-automations-tick'
   )
   order by jobname;
   ```

8. Observe one complete schedule cycle and require a fresh downstream HTTP 2xx in
   each function-specific Edge log. A pg_cron `succeeded` row is insufficient.
9. Set `INTERNAL_CRON_LEGACY_AUTH_ENABLED=false` without redeploying.
10. Observe a second complete schedule cycle and again require fresh downstream
    HTTP 2xx for all three functions.
11. Confirm direct `x-cron-secret`, missing/partial signed headers, malformed
    signatures, old timestamps, future timestamps beyond the allowed skew, query
    strings, altered bodies, altered purposes, and repeated nonces are rejected
    before business work.
12. Complete the approved issuer-level handling for every classified legacy
    credential and the approved platform-log retention process. Do not rotate a
    shared service-role key blindly.

## Signed rejection diagnostics

For a fresh signed probe failure, filter the function-specific Edge logs for the
exact event name `internal_cron_signed_rejected`. The event contains only
`event`, `function_name`, and `stage`; it never logs a header value, URL, body,
timestamp, nonce, signature, or secret.

A structurally complete signed-readiness envelope also receives a bounded JSON
failure body such as
`{"error":"signed_readiness_rejected","stage":"hmac"}`. Those are the only
two response fields. Eligibility requires all five correctly formatted signing
headers, `POST`, no query string, and the `readiness` purpose. Supabase rewrites
the runtime `req.url.pathname` before the Edge handler, so response eligibility
does not trust that internal pathname. Function separation remains bound to the
hardcoded logical public path reconstructed from the handler's `functionName`.
Unsigned, purpose-only, partial, query-bearing, direct or legacy requests, plus
signed `execute` failures, keep the handler's generic unauthorized response;
they never receive a response stage. Stage-only logs can still record where
those signed attempts were rejected.

Use the first fresh event emitted at the probe time:

- `configuration`: the deployed handler does not have a usable signing secret
  or function binding;
- `envelope`: a required signed field, format, purpose, or method is invalid;
- `timestamp`: the signature is stale or too far in the future;
- `url`: a query string is present; the hosted rewritten runtime pathname is
  intentionally not part of verification;
- `body`: Edge could not read or hash the request body;
- `hmac`: the canonical message and signature do not verify; or
- `nonce_claim`: HMAC passed, but the service-role nonce insert failed or the
  nonce was already claimed.

If a failed probe produces no such fresh event, it did not reach the patched
signed-verification path; inspect the deployed function version and gateway log
before changing the signer or secret.

## Rollback

If the preparation migration or a function deployment fails, stop before the
cutover migration; the existing jobs are unchanged. The unused private signer can
remain while the issue is corrected.

If any signed readiness probe fails, keep transition mode on, do not apply the
cutover migration, and compare only secret fingerprints, versions, request IDs,
paths, body hashes, and response codes.

The cutover migration is atomic. If a post-cutover invocation fails, keep the
signed job commands and transition mode on while diagnosing the exact HMAC or
nonce failure. Do not restore the known-stale credentials. The history redaction
is intentionally irreversible: it retains operational run evidence while
removing credential-bearing command text.
