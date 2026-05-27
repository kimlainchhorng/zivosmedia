-- Cafe menu items — the products a cafe sells. Each item lives in a
-- category and has a base price; size/milk/syrup variants come from
-- modifiers (see 20260525020000_cafe_modifiers.sql).

CREATE TABLE IF NOT EXISTS public.cafe_menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.cafe_categories(id) ON DELETE SET NULL,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_cents >= 0),

  -- Approximate prep time so kitchen display can sort/estimate.
  prep_minutes INTEGER NOT NULL DEFAULT 5 CHECK (prep_minutes BETWEEN 0 AND 240),

  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- Free-text labels (e.g., "Hot", "Iced", "Seasonal").
  tags TEXT[] NOT NULL DEFAULT '{}',

  -- Dietary flags surfaced on the menu.
  is_vegetarian BOOLEAN NOT NULL DEFAULT false,
  is_vegan BOOLEAN NOT NULL DEFAULT false,
  is_gluten_free BOOLEAN NOT NULL DEFAULT false,

  -- Optional caffeine / calorie info for transparency.
  caffeine_mg INTEGER CHECK (caffeine_mg IS NULL OR caffeine_mg BETWEEN 0 AND 1000),
  calories INTEGER CHECK (calories IS NULL OR calories BETWEEN 0 AND 5000),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_menu_items_store_idx
  ON public.cafe_menu_items (store_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_menu_items_category_idx
  ON public.cafe_menu_items (category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cafe_menu_items_active_idx
  ON public.cafe_menu_items (store_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS cafe_menu_items_featured_idx
  ON public.cafe_menu_items (store_id) WHERE is_featured = true AND is_active = true;

DROP TRIGGER IF EXISTS cafe_menu_items_set_updated_at ON public.cafe_menu_items;
CREATE TRIGGER cafe_menu_items_set_updated_at
  BEFORE UPDATE ON public.cafe_menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active cafe menu items"
  ON public.cafe_menu_items
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_menu_items.store_id
        AND sp.is_active = true
    )
  );

CREATE POLICY "Owners manage cafe menu items - select"
  ON public.cafe_menu_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_menu_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe menu items - insert"
  ON public.cafe_menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_menu_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe menu items - update"
  ON public.cafe_menu_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_menu_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_menu_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe menu items - delete"
  ON public.cafe_menu_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_menu_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
