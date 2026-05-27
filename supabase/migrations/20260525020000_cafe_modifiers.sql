-- Cafe modifiers — the customization layer that turns a base item
-- ("Latte") into a real order ("Large Oat Milk Latte, extra shot").
--   • cafe_modifier_groups: a named axis of choice (Size, Milk, Extras)
--   • cafe_modifiers: individual options inside a group (Small/Medium/Large)
--   • cafe_menu_item_modifier_groups: which groups apply to which items

CREATE TABLE IF NOT EXISTS public.cafe_modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 200),

  -- single = pick exactly one (radio); multi = pick any (checkboxes).
  selection_type TEXT NOT NULL DEFAULT 'single'
    CHECK (selection_type IN ('single', 'multi')),

  -- Required min/max picks. min_select=0 means optional.
  min_select INTEGER NOT NULL DEFAULT 0 CHECK (min_select >= 0),
  max_select INTEGER NOT NULL DEFAULT 1 CHECK (max_select >= 1 AND max_select <= 20),
  CONSTRAINT cafe_modifier_groups_select_range CHECK (min_select <= max_select),

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_modifier_groups_store_idx
  ON public.cafe_modifier_groups (store_id, sort_order);

CREATE TABLE IF NOT EXISTS public.cafe_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.cafe_modifier_groups(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  -- Surcharge in cents added to the menu item base price (may be 0).
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_modifiers_group_idx
  ON public.cafe_modifiers (group_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_modifiers_store_idx
  ON public.cafe_modifiers (store_id);

CREATE TABLE IF NOT EXISTS public.cafe_menu_item_modifier_groups (
  item_id UUID NOT NULL REFERENCES public.cafe_menu_items(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.cafe_modifier_groups(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, group_id)
);

CREATE INDEX IF NOT EXISTS cafe_item_modgroups_item_idx
  ON public.cafe_menu_item_modifier_groups (item_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_item_modgroups_group_idx
  ON public.cafe_menu_item_modifier_groups (group_id);

DROP TRIGGER IF EXISTS cafe_modifier_groups_set_updated_at ON public.cafe_modifier_groups;
CREATE TRIGGER cafe_modifier_groups_set_updated_at
  BEFORE UPDATE ON public.cafe_modifier_groups
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

DROP TRIGGER IF EXISTS cafe_modifiers_set_updated_at ON public.cafe_modifiers;
CREATE TRIGGER cafe_modifiers_set_updated_at
  BEFORE UPDATE ON public.cafe_modifiers
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active modifier groups"
  ON public.cafe_modifier_groups
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_modifier_groups.store_id AND sp.is_active = true)
  );

CREATE POLICY "Public can view active modifiers"
  ON public.cafe_modifiers
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_modifiers.store_id AND sp.is_active = true)
  );

CREATE POLICY "Public can view item modifier mappings"
  ON public.cafe_menu_item_modifier_groups
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_menu_items mi
      WHERE mi.id = cafe_menu_item_modifier_groups.item_id
        AND mi.is_active = true
    )
  );

CREATE POLICY "Owners manage modifier groups - all"
  ON public.cafe_modifier_groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_modifier_groups.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_modifier_groups.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage modifiers - all"
  ON public.cafe_modifiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_modifiers.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_modifiers.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage item modifier mappings - all"
  ON public.cafe_menu_item_modifier_groups
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_menu_items mi
      JOIN public.store_profiles sp ON sp.id = mi.store_id
      WHERE mi.id = cafe_menu_item_modifier_groups.item_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cafe_menu_items mi
      JOIN public.store_profiles sp ON sp.id = mi.store_id
      WHERE mi.id = cafe_menu_item_modifier_groups.item_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );
