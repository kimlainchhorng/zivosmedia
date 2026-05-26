ALTER TYPE public.lodge_change_status ADD VALUE IF NOT EXISTS 'failed';

CREATE TABLE IF NOT EXISTS public.lodge_reservation_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid NOT NULL REFERENCES public.lodge_reservations(id) ON DELETE CASCADE,
  store_id uuid NOT NULL,
  generated_by uuid,
  reservation_number text,
  filename text NOT NULL,
  snapshot jsonb NOT NULL,
  pdf_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lodge_reservation_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lodge_reservation_receipts_reservation
  ON public.lodge_reservation_receipts(reservation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lodge_reservation_receipts_store
  ON public.lodge_reservation_receipts(store_id, created_at DESC);

DROP POLICY IF EXISTS "Guests view own reservation receipts" ON public.lodge_reservation_receipts;
CREATE POLICY "Guests view own reservation receipts"
  ON public.lodge_reservation_receipts
  FOR SELECT
  TO authenticated
  USING (public.is_lodge_reservation_guest(reservation_id, auth.uid()));

DROP POLICY IF EXISTS "Store managers view reservation receipts" ON public.lodge_reservation_receipts;
CREATE POLICY "Store managers view reservation receipts"
  ON public.lodge_reservation_receipts
  FOR SELECT
  TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));