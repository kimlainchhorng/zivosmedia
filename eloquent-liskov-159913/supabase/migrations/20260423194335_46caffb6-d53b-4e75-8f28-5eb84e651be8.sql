ALTER TABLE public.lodge_reservation_change_requests
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS applied_at timestamptz;

ALTER TABLE public.lodge_reservation_messages_link
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid;

CREATE INDEX IF NOT EXISTS idx_lrcr_payment_status
  ON public.lodge_reservation_change_requests(payment_status);

CREATE INDEX IF NOT EXISTS idx_lrml_thread
  ON public.lodge_reservation_messages_link(thread_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lodge_reservation_charges'
      AND policyname = 'Guests can view their own lodging charges'
  ) THEN
    CREATE POLICY "Guests can view their own lodging charges"
    ON public.lodge_reservation_charges
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.lodge_reservations r
        WHERE r.id = lodge_reservation_charges.reservation_id
          AND r.guest_id = auth.uid()
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lodge_reservation_charges'
      AND policyname = 'Store owners can view lodging charges'
  ) THEN
    CREATE POLICY "Store owners can view lodging charges"
    ON public.lodge_reservation_charges
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1
        FROM public.lodge_reservations r
        JOIN public.restaurants s ON s.id = r.store_id
        WHERE r.id = lodge_reservation_charges.reservation_id
          AND s.owner_id = auth.uid()
      )
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    );
  END IF;
END $$;