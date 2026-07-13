-- Auto Repair — Customer Notes / Communication Log
-- Tracks shop-to-customer messages and internal notes per work order or vehicle.

CREATE TABLE IF NOT EXISTS public.ar_customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  workorder_id uuid REFERENCES public.ar_work_orders(id) ON DELETE SET NULL,
  vehicle_id uuid REFERENCES public.ar_customer_vehicles(id) ON DELETE SET NULL,
  customer_name text,
  note_type text NOT NULL DEFAULT 'internal', -- 'internal' | 'customer' | 'sms' | 'call'
  body text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ar_customer_notes_store
  ON public.ar_customer_notes(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_customer_notes_workorder
  ON public.ar_customer_notes(workorder_id) WHERE workorder_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ar_customer_notes_vehicle
  ON public.ar_customer_notes(vehicle_id) WHERE vehicle_id IS NOT NULL;

ALTER TABLE public.ar_customer_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their ar_customer_notes"
  ON public.ar_customer_notes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ar_customer_notes.store_id AND r.owner_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = ar_customer_notes.store_id AND r.owner_id = auth.uid()
  ));

CREATE POLICY "Admins manage all ar_customer_notes"
  ON public.ar_customer_notes FOR ALL
  USING (has_role(auth.uid(), 'admin'::text))
  WITH CHECK (has_role(auth.uid(), 'admin'::text));
