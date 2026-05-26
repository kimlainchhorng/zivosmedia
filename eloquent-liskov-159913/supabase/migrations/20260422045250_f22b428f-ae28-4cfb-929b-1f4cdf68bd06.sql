ALTER TABLE public.lodge_rooms
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS cancellation_policy text NOT NULL DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS check_in_time time,
  ADD COLUMN IF NOT EXISTS check_out_time time,
  ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.lodge_reservations
  ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb;