-- Cafe menu categories — used to group menu items on the storefront
-- ("Coffee", "Tea", "Pastries", "Sandwiches", etc.). Each store maintains
-- its own list with custom sort order.

CREATE TABLE IF NOT EXISTS public.cafe_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 300),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_categories_store_idx
  ON public.cafe_categories (store_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_categories_active_idx
  ON public.cafe_categories (store_id) WHERE is_active = true;

CREATE OR REPLACE FUNCTION public.tg_cafe_set_updated_at_generic()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_categories_set_updated_at ON public.cafe_categories;
CREATE TRIGGER cafe_categories_set_updated_at
  BEFORE UPDATE ON public.cafe_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active cafe categories"
  ON public.cafe_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_categories.store_id
        AND sp.is_active = true
    )
  );

CREATE POLICY "Owners manage cafe categories - select"
  ON public.cafe_categories
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_categories.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe categories - insert"
  ON public.cafe_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_categories.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe categories - update"
  ON public.cafe_categories
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_categories.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_categories.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe categories - delete"
  ON public.cafe_categories
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_categories.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
