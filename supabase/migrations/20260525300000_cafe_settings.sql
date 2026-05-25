-- cafe_settings: per-store toggles for customer-facing checkout sections.
-- One row per store. Default = all features enabled.

CREATE TABLE IF NOT EXISTS public.cafe_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL UNIQUE REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  allow_tips boolean NOT NULL DEFAULT true,
  allow_promos boolean NOT NULL DEFAULT true,
  allow_gift_cards boolean NOT NULL DEFAULT true,
  allow_scheduled_orders boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_settings_store_idx ON public.cafe_settings(store_id);

ALTER TABLE public.cafe_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous + authenticated read: customer page needs this to decide which
-- checkout sections to render.
DROP POLICY IF EXISTS cafe_settings_select_all ON public.cafe_settings;
CREATE POLICY cafe_settings_select_all ON public.cafe_settings
  FOR SELECT USING (true);

-- Owner manage: same pattern as other cafe_* tables — store owner can write.
DROP POLICY IF EXISTS cafe_settings_owner_manage ON public.cafe_settings;
CREATE POLICY cafe_settings_owner_manage ON public.cafe_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = cafe_settings.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = cafe_settings.store_id AND s.owner_id = auth.uid()
    )
  );

-- updated_at touch trigger
CREATE OR REPLACE FUNCTION public.cafe_settings_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_settings_touch ON public.cafe_settings;
CREATE TRIGGER cafe_settings_touch
  BEFORE UPDATE ON public.cafe_settings
  FOR EACH ROW EXECUTE FUNCTION public.cafe_settings_touch_updated_at();
