# Anon SECURITY DEFINER — Function Privilege Allowlist & Audit

**Project:** `slirphzzwcogdbkeicff` (zivosmedia — shared media+chat+travel identity authority; **PRODUCTION, ~266 real users**).
**Method:** read-only audit of `supabase/migrations` (1,129 files). **No DB access** was available (no psql/CLI/authed MCP/service-role key), so this is **source-derived** and must be **reconciled against live `information_schema` introspection before any change is applied.** Nothing here was executed. No private data was read.

**Live counts (given):** 102 anon-executable, 202 authenticated-executable, 584 SECURITY DEFINER total, 5 tables RLS-enabled-with-no-policy.

## Decision framework (do NOT blanket-revoke)

A prior migration (`20260608191657_grant_anon_execute_rls_helper_functions.sql`) documents that many anon EXECUTE grants are **load-bearing**: RLS boolean predicates called by anonymous SELECT policies on the **public logged-out read path (social feed, reviews) across ~274 tables**. Dropping them previously caused `42501 permission denied` and **broke the public feed**. Therefore each function gets one of:

- **KEEP** — public access is documented and safe (guest/token endpoint, or a boolean predicate that returns false for anon).
- **HARDEN** — keep anon EXECUTE (RLS needs it) but change the body so it cannot enumerate arbitrary users.
- **RATE-LIMIT** — public but abusable; add throttling/dedup.
- **REVOKE** — anon has no public need (must be confirmed against live RLS/endpoint usage; revoking a load-bearing helper is a production outage).

## Inventory & audit records

### A. KEEP — token/reference-scoped public commerce & share links (guest flows)
`cafe_place_public_order`, `cafe_public_order_status/receipt/review_summary/loyalty_balance/…`, `salon_public_*` (booking/get/review/stylist), `car_rental_*` (`get_car_rental_reservation_by_code(text)`, `…_payment_status`), `get_deal_for_review`, `get_shared_document(uuid)`, `get_cv_by_share_code(text)`, `get_paired_session_by_token`, `confirm/cancel/revoke_live_pair_session(text)`, `search_bus_trips`, `get_hotel_detail`, `get_bus_trip_seats`, `schedule_public_test_drive`, `ar_get_estimate_by_share_token(text)`.
- **purpose:** guest checkout / booking / view-by-share-token / public listing detail.
- **caller:** logged-out guest UI. **public necessity:** yes (feature requires anon).
- **auth/ownership:** scoped by an unguessable token or a public entity id; SECURITY DEFINER.
- **rate limit:** varies — **verify** each validates its token and rate-limits order/booking creation.
- **abuse risk:** token-guessing / spam order creation → **medium**; mitigated by token entropy.
- **decision: KEEP**, with a follow-up to confirm token validation + write-path throttling.

### B. KEEP — public discovery
`get_trending_posts/people/hashtags/communities(integer)`.
- **purpose:** logged-out discovery. **public necessity:** yes. **abuse:** low (read-only aggregates). **decision: KEEP.**

### C. KEEP — RLS boolean predicates (caller-scoped)
`is_admin()`, `is_chat_member(uuid)`, `is_chat_participant(uuid,uuid)`, `is_store_owner(uuid[,uuid])`, `is_trip_participant(uuid,uuid)`, `is_lodge_store_owner(uuid)`, `can_view_channel(uuid,uuid)`, `is_channel_manager(uuid,uuid)`, `user_owns_store(uuid,uuid)`.
- **purpose:** predicates used by public-read RLS policies. **caller:** RLS engine (+ anon path). **public necessity:** yes — revoking → feed/reviews outage (documented).
- **auth/ownership:** return false when `auth.uid()` is null. **abuse:** low **when used caller-scoped**; but see D. **decision: KEEP** (do not revoke).

### D. HARDEN — role/admin enumeration overloads (Task 4) ⚠️
`is_admin(uuid)`, `has_role(uuid, public.app_role)`, `has_role(uuid, text)`.
- **purpose:** check a specific user's admin/role. **caller:** RLS + potentially a direct client call.
- **risk:** if directly callable by anon/authenticated with an **arbitrary uuid**, a caller can probe *"is user X an admin / does X have role Y?"* → **admin/role enumeration (medium-high)**.
- **decision: HARDEN, not revoke.** Recommended: the function returns a truthful answer only when the caller is the subject **or** an admin; otherwise `false`. Keeps RLS working where policies pass `auth.uid()`, blocks arbitrary enumeration.
- **⚠️ MUST validate first:** if any RLS policy calls these with a non-caller uuid (e.g. `is_admin(row.owner_id)`), hardening changes behavior — confirm against live `pg_policies` before applying. (Draft SQL in `PROPOSED_role_admin_hardening.sql` — **not applied**.)

### E. RATE-LIMIT — abusable public writes/counters
`increment_store_post_views(uuid)`, `increment_user_post_view_count(uuid)`, `increment_user_post_views(uuid)`, `record_post_share(uuid,text,text)`, `is_ip_blocked(text)`.
- **abuse:** view/share-count inflation by anon; `is_ip_blocked` lets anon probe block status. **decision: KEEP + add per-IP/per-session throttling & dedup;** treat `is_ip_blocked` as low-sensitivity but review.

### F. Already REVOKED in source (good) — verify still revoked live
`create_bot*`, `create_bus_booking`, `get_job_otp_plain(uuid,text)`, `get_my_bus_bookings()`, `claim_employee_invite(text)`, `run_ad_boost_auction()`, `ar_*` internal, `cafe/salon_auto_expire_*`, `cleanup_expired_device_link_tokens()`. These were correctly revoked from anon; **confirm the June-8 re-grant migration did not accidentally re-expose any.**

## Related findings
- **5 tables: RLS enabled, no policy** → currently deny-all (safe default) but must get **explicit** policies so intent is auditable and a future `GRANT` can't silently open them. Enumerate them live and add policies.
- **`cross_app_tokens`** (media↔chat↔wallet SSO): RLS enabled; single-use UUID with `expires_at`. Verify the read policy is owner/consumer-scoped, single-use is enforced atomically, and the token never appears in a URL/log.
- **Auth abuse (Task 5, prior scope):** `auth_record_login_attempt` already has anomaly detection + escalating lockouts (`auth_shield`). Verify coverage, don't rebuild.
- **Channel RPCs (prior scope):** `channel_create` / `channel_set_member_role` / `channel_update_settings` are source-verified authenticated-only + owner/manager-gated (`is_channel_manager`).

## AFTER count (honest)
No revokes were applied (no DB access; unsafe blind). **ANON FUNCTIONS AFTER = 102 (unchanged).** The **target** after applying this allowlist is **not ~0** — most of the 102 are legitimately public (guest commerce + discovery + RLS predicates). The security wins are **HARDEN(D)** + **RATE-LIMIT(E)** + **explicit policies on the 5 tables** + confirming **F** stayed revoked. The precise revoke set requires live `information_schema.role_routine_grants` × `pg_policies` reconciliation, then application via authorized MCP/migration **with the documented rollback ready.**
