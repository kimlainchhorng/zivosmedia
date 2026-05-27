-- Remove duplicate indexes reported by Supabase performance advisors.
--
-- These duplicates add write overhead and storage cost without improving reads.
-- Keep canonical constraint-backed indexes where they exist, and keep the
-- clearer/older named non-constraint index where both duplicates are plain
-- indexes.

set lock_timeout = '5s';
set statement_timeout = '30s';

drop index if exists public.idx_activity_feed_user_recent;

drop index if exists public.idx_dm_receiver;

alter table if exists public.job_offers
  drop constraint if exists job_offers_job_driver_uniq,
  drop constraint if exists job_offers_job_driver_unique;

drop index if exists public.lodge_room_blocks_room_date_uniq;

drop index if exists public.idx_marketplace_status;

drop index if exists public.idx_trip_shares_token_unique;

reset statement_timeout;
reset lock_timeout;
