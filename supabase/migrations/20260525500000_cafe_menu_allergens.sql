-- Free-text allergen warning per menu item. We keep it nullable + freeform
-- (e.g. "peanuts, dairy, sesame") so owners aren't forced into a fixed
-- enum that may not cover their cuisine. The public order page renders
-- it as-is, prefixed with "⚠ Contains:".

ALTER TABLE public.cafe_menu_items
  ADD COLUMN IF NOT EXISTS allergens text;
