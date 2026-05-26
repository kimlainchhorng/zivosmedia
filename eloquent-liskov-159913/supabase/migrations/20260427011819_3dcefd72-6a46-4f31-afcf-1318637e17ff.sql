-- Add iCal/source tracking to lodge_room_blocks
ALTER TABLE public.lodge_room_blocks
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_uid text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Unique guard so iCal upserts and manual blocks dedupe per (room, date)
CREATE UNIQUE INDEX IF NOT EXISTS lodge_room_blocks_room_date_uniq
  ON public.lodge_room_blocks(room_id, block_date);

CREATE INDEX IF NOT EXISTS lodge_room_blocks_store_date_idx
  ON public.lodge_room_blocks(store_id, block_date);

CREATE INDEX IF NOT EXISTS lodge_room_blocks_source_idx
  ON public.lodge_room_blocks(source);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS lodge_room_blocks_updated_at ON public.lodge_room_blocks;
CREATE TRIGGER lodge_room_blocks_updated_at
  BEFORE UPDATE ON public.lodge_room_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate any existing range rows from lodging_room_blocks into per-day rows in lodge_room_blocks
INSERT INTO public.lodge_room_blocks (store_id, room_id, block_date, reason, source, external_uid, summary)
SELECT
  lrb.store_id,
  lrb.room_id,
  d::date AS block_date,
  COALESCE(lrb.summary, 'Imported'),
  COALESCE(lrb.source, 'ical'),
  lrb.external_uid,
  lrb.summary
FROM public.lodging_room_blocks lrb
CROSS JOIN LATERAL generate_series(lrb.start_date, lrb.end_date - INTERVAL '1 day', INTERVAL '1 day') AS d
ON CONFLICT (room_id, block_date) DO UPDATE
  SET source = EXCLUDED.source,
      external_uid = EXCLUDED.external_uid,
      summary = EXCLUDED.summary;

-- Drop the duplicate table
DROP TABLE IF EXISTS public.lodging_room_blocks CASCADE;