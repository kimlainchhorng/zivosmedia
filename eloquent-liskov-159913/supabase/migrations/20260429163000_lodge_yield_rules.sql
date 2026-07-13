-- Lodge yield rules: automatic rate adjustment rules for dynamic pricing
CREATE TABLE IF NOT EXISTS public.lodge_yield_rules (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id          uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  rule_name         text        NOT NULL,
  trigger_type      text        NOT NULL DEFAULT 'occupancy_threshold'
                                CHECK (trigger_type IN (
                                  'occupancy_threshold','lead_time','day_of_week',
                                  'season','last_minute','early_bird'
                                )),
  trigger_value     text        NOT NULL DEFAULT '80',
  adjustment_type   text        NOT NULL DEFAULT 'percent'
                                CHECK (adjustment_type IN ('percent','fixed_cents')),
  adjustment_value  numeric     NOT NULL DEFAULT 10,
  applies_to        text        NOT NULL DEFAULT 'all'
                                CHECK (applies_to IN ('all','weekday','weekend')),
  is_active         boolean     NOT NULL DEFAULT true,
  sort_order        int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_yield_rules_store_idx
  ON public.lodge_yield_rules (store_id, is_active, sort_order);

ALTER TABLE public.lodge_yield_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage yield rules"
ON public.lodge_yield_rules
FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
