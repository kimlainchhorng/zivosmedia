-- Change request types & statuses
DO $$ BEGIN
  CREATE TYPE public.lodge_change_type AS ENUM ('reschedule', 'cancel', 'addon');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.lodge_change_status AS ENUM ('pending', 'auto_approved', 'approved', 'declined', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Change requests table
CREATE TABLE IF NOT EXISTS public.lodge_reservation_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.lodge_reservations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  type public.lodge_change_type NOT NULL,
  status public.lodge_change_status NOT NULL DEFAULT 'pending',
  proposed_check_in DATE,
  proposed_check_out DATE,
  proposed_total_cents INTEGER,
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  refund_cents INTEGER NOT NULL DEFAULT 0,
  addon_payload JSONB,
  reason TEXT,
  host_response TEXT,
  requested_by UUID,
  decided_by UUID,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lrcr_reservation ON public.lodge_reservation_change_requests(reservation_id);
CREATE INDEX IF NOT EXISTS idx_lrcr_store_status ON public.lodge_reservation_change_requests(store_id, status);

ALTER TABLE public.lodge_reservation_change_requests ENABLE ROW LEVEL SECURITY;

-- Helper: is the caller the guest on this reservation?
CREATE OR REPLACE FUNCTION public.is_lodge_reservation_guest(_reservation_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lodge_reservations r
    WHERE r.id = _reservation_id AND r.guest_id = _user_id
  );
$$;

-- Helper: is the caller a store owner / admin for this store?
CREATE OR REPLACE FUNCTION public.is_lodge_store_manager(_store_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurants s
    WHERE s.id = _store_id AND s.owner_id = _user_id
  ) OR public.has_role(_user_id, 'admin');
$$;

CREATE POLICY "Guests view own change requests"
  ON public.lodge_reservation_change_requests FOR SELECT TO authenticated
  USING (public.is_lodge_reservation_guest(reservation_id, auth.uid()));

CREATE POLICY "Guests create own change requests"
  ON public.lodge_reservation_change_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_lodge_reservation_guest(reservation_id, auth.uid()) AND requested_by = auth.uid());

CREATE POLICY "Guests cancel own pending requests"
  ON public.lodge_reservation_change_requests FOR UPDATE TO authenticated
  USING (public.is_lodge_reservation_guest(reservation_id, auth.uid()) AND status = 'pending')
  WITH CHECK (status IN ('pending', 'cancelled'));

CREATE POLICY "Store managers view change requests"
  ON public.lodge_reservation_change_requests FOR SELECT TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

CREATE POLICY "Store managers decide change requests"
  ON public.lodge_reservation_change_requests FOR UPDATE TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

-- Messages link
CREATE TABLE IF NOT EXISTS public.lodge_reservation_messages_link (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.lodge_reservations(id) ON DELETE CASCADE,
  store_id UUID NOT NULL,
  thread_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(reservation_id)
);

ALTER TABLE public.lodge_reservation_messages_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guests view own reservation thread link"
  ON public.lodge_reservation_messages_link FOR SELECT TO authenticated
  USING (public.is_lodge_reservation_guest(reservation_id, auth.uid()));

CREATE POLICY "Guests create own reservation thread link"
  ON public.lodge_reservation_messages_link FOR INSERT TO authenticated
  WITH CHECK (public.is_lodge_reservation_guest(reservation_id, auth.uid()));

CREATE POLICY "Store managers view reservation thread link"
  ON public.lodge_reservation_messages_link FOR SELECT TO authenticated
  USING (public.is_lodge_store_manager(store_id, auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_lrcr_updated_at
BEFORE UPDATE ON public.lodge_reservation_change_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();