ALTER TABLE public.lodge_property_profile
  ADD COLUMN IF NOT EXISTS description_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS property_highlights jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS popular_amenities text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.lodge_rooms
  ADD COLUMN IF NOT EXISTS expandable_features text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS badges text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.lodging_promotions
  ADD COLUMN IF NOT EXISTS member_only boolean NOT NULL DEFAULT false;