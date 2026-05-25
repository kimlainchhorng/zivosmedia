-- Cafe dine-in tables — optional floor-plan resource so orders can be
-- attached to a physical seat. Used for table service and per-table
-- running tabs.

CREATE TABLE IF NOT EXISTS public.cafe_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  -- Owner-visible label, e.g. "Table 5" or "Booth A".
  label TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 40),
  capacity INTEGER NOT NULL DEFAULT 2 CHECK (capacity BETWEEN 1 AND 50),

  -- Optional grouping (e.g., "Patio", "Counter", "Indoor").
  zone TEXT CHECK (zone IS NULL OR char_length(zone) <= 40),

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Optional QR code that customers can scan to order to this table.
  qr_token UUID NOT NULL DEFAULT gen_random_uuid(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_tables_store_idx
  ON public.cafe_tables (store_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS cafe_tables_store_label_unique
  ON public.cafe_tables (store_id, lower(label));
CREATE UNIQUE INDEX IF NOT EXISTS cafe_tables_qr_token_unique
  ON public.cafe_tables (qr_token);

DROP TRIGGER IF EXISTS cafe_tables_set_updated_at ON public.cafe_tables;
CREATE TRIGGER cafe_tables_set_updated_at
  BEFORE UPDATE ON public.cafe_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active tables"
  ON public.cafe_tables
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_tables.store_id AND sp.is_active = true)
  );

CREATE POLICY "Owners manage tables - all"
  ON public.cafe_tables
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_tables.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_tables.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
