-- cafe_customer_notes — store-scoped CRM tags keyed by phone. There's no
-- customer master table (we derive from orders), so phone is the join key.
-- Notes stay admin-only; never exposed via the public RPCs the customer
-- order page calls.

CREATE TABLE IF NOT EXISTS public.cafe_customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  phone text NOT NULL,
  is_vip boolean NOT NULL DEFAULT false,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cafe_customer_notes_store_phone_uk
  ON public.cafe_customer_notes(store_id, phone);

ALTER TABLE public.cafe_customer_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_customer_notes_owner_manage ON public.cafe_customer_notes;
CREATE POLICY cafe_customer_notes_owner_manage ON public.cafe_customer_notes
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_customer_notes.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_customer_notes.store_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.cafe_customer_notes_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS cafe_customer_notes_touch ON public.cafe_customer_notes;
CREATE TRIGGER cafe_customer_notes_touch
  BEFORE UPDATE ON public.cafe_customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.cafe_customer_notes_touch_updated_at();
