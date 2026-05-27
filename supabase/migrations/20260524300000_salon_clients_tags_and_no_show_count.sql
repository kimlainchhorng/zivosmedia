-- Two columns that exist on salon_clients in production but were never in
-- the local migration tree:
--
--   no_show_count INTEGER NOT NULL DEFAULT 0
--     — maintained by tg_salon_booking_no_show_count_sync
--       (20260524290000). Without this column, that trigger would error
--       out on a fresh local DB build.
--
--   tags TEXT[] NOT NULL DEFAULT '{}'
--     — SalonClientsSection writes and reads `c.tags` to power the tag
--       filter bar; SalonClientDraft includes it in its update Patch
--       type. Without the column, those writes would 42703 in local dev.
--
-- Both are idempotent ADD COLUMN IF NOT EXISTS so a Supabase project that
-- already has them (production) is a no-op on rerun.

ALTER TABLE public.salon_clients
  ADD COLUMN IF NOT EXISTS no_show_count INTEGER NOT NULL DEFAULT 0
    CHECK (no_show_count >= 0);

ALTER TABLE public.salon_clients
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS salon_clients_tags_idx
  ON public.salon_clients USING gin (tags);
