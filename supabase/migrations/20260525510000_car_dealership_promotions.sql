-- Car dealership promotions / specials
CREATE TABLE IF NOT EXISTS car_dealership_promotions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id              uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  title                 text        NOT NULL,
  description           text,
  promo_type            text        NOT NULL DEFAULT 'discount'
                          CHECK (promo_type IN ('discount','financing','lease','trade_in_bonus','event')),
  -- discount fields
  discount_type         text        CHECK (discount_type IN ('percent','flat')),
  discount_amount       integer     NOT NULL DEFAULT 0, -- percent (1-100) or cents
  -- target vehicle filter
  applies_to            text        NOT NULL DEFAULT 'all'
                          CHECK (applies_to IN ('all','new','used','certified','specific_make','specific_model')),
  applies_to_make       text,
  applies_to_model      text,
  -- financing special fields
  financing_apr_bps     integer,    -- e.g. 0 = 0%, 299 = 2.99%
  financing_term_months integer,
  -- optional public code
  code                  text,
  -- validity window
  starts_at             timestamptz,
  ends_at               timestamptz,
  is_active             boolean     NOT NULL DEFAULT true,
  is_featured           boolean     NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cd_promotions_store ON car_dealership_promotions(store_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_cd_promotions_code ON car_dealership_promotions(store_id, code)
  WHERE code IS NOT NULL;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_cd_promotions_updated_at ON car_dealership_promotions;
CREATE TRIGGER trg_cd_promotions_updated_at
  BEFORE UPDATE ON car_dealership_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE car_dealership_promotions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cd_promos_owner_select" ON car_dealership_promotions;
CREATE POLICY "cd_promos_owner_select" ON car_dealership_promotions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "cd_promos_owner_insert" ON car_dealership_promotions;
CREATE POLICY "cd_promos_owner_insert" ON car_dealership_promotions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "cd_promos_owner_update" ON car_dealership_promotions;
CREATE POLICY "cd_promos_owner_update" ON car_dealership_promotions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "cd_promos_owner_delete" ON car_dealership_promotions;
CREATE POLICY "cd_promos_owner_delete" ON car_dealership_promotions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "cd_promos_public_read" ON car_dealership_promotions;
CREATE POLICY "cd_promos_public_read" ON car_dealership_promotions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
