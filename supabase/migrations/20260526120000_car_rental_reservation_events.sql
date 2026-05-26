-- Reservation modification audit log.
CREATE TABLE IF NOT EXISTS public.car_rental_reservation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.car_rental_reservations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('created','status_changed','vehicle_changed','dates_changed','price_changed','refunded','damage_recorded','cancelled','other')),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_source TEXT NOT NULL DEFAULT 'admin' CHECK (actor_source IN ('admin','app','phone','walk_in','system')),
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_reservation_events_reservation_idx
  ON public.car_rental_reservation_events (reservation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS car_rental_reservation_events_store_idx
  ON public.car_rental_reservation_events (store_id, created_at DESC);

ALTER TABLE public.car_rental_reservation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners read reservation events" ON public.car_rental_reservation_events;
CREATE POLICY "Owners read reservation events" ON public.car_rental_reservation_events FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp
            WHERE sp.id = car_rental_reservation_events.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Public read reservation events" ON public.car_rental_reservation_events;
CREATE POLICY "Public read reservation events" ON public.car_rental_reservation_events FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.tg_car_rental_log_reservation_event()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  uid UUID;
BEGIN
  BEGIN
    uid := (SELECT auth.uid());
  EXCEPTION WHEN OTHERS THEN
    uid := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
    VALUES (NEW.store_id, NEW.id, 'created', uid, NEW.source, jsonb_build_object(
      'status', NEW.status, 'vehicle_label', NEW.vehicle_label,
      'pickup_at', NEW.pickup_at, 'dropoff_at', NEW.dropoff_at, 'total_cents', NEW.total_cents
    ));
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
      VALUES (NEW.store_id, NEW.id,
        CASE WHEN NEW.status = 'cancelled' OR NEW.status = 'no_show' THEN 'cancelled' ELSE 'status_changed' END,
        uid, NEW.source, jsonb_build_object('from', OLD.status, 'to', NEW.status, 'reason', NEW.cancellation_reason));
    END IF;
    IF NEW.vehicle_id IS DISTINCT FROM OLD.vehicle_id THEN
      INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
      VALUES (NEW.store_id, NEW.id, 'vehicle_changed', uid, NEW.source, jsonb_build_object('from', OLD.vehicle_label, 'to', NEW.vehicle_label));
    END IF;
    IF NEW.pickup_at IS DISTINCT FROM OLD.pickup_at OR NEW.dropoff_at IS DISTINCT FROM OLD.dropoff_at THEN
      INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
      VALUES (NEW.store_id, NEW.id, 'dates_changed', uid, NEW.source, jsonb_build_object(
        'pickup_from', OLD.pickup_at, 'pickup_to', NEW.pickup_at,
        'dropoff_from', OLD.dropoff_at, 'dropoff_to', NEW.dropoff_at
      ));
    END IF;
    IF NEW.total_cents IS DISTINCT FROM OLD.total_cents AND NEW.total_cents <> 0 AND OLD.total_cents <> 0 THEN
      INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
      VALUES (NEW.store_id, NEW.id, 'price_changed', uid, NEW.source, jsonb_build_object('from_cents', OLD.total_cents, 'to_cents', NEW.total_cents));
    END IF;
    IF NEW.refund_amount_cents IS DISTINCT FROM OLD.refund_amount_cents AND NEW.refund_amount_cents > 0 THEN
      INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
      VALUES (NEW.store_id, NEW.id, 'refunded', uid, NEW.source, jsonb_build_object('amount_cents', NEW.refund_amount_cents, 'method', NEW.refund_method));
    END IF;
    IF (NEW.damage_notes IS DISTINCT FROM OLD.damage_notes AND COALESCE(NEW.damage_notes, '') <> '')
       OR (jsonb_array_length(NEW.damage_marks) > 0 AND jsonb_array_length(NEW.damage_marks) <> jsonb_array_length(OLD.damage_marks)) THEN
      INSERT INTO public.car_rental_reservation_events (store_id, reservation_id, event_type, actor_user_id, actor_source, detail)
      VALUES (NEW.store_id, NEW.id, 'damage_recorded', uid, NEW.source, jsonb_build_object('marks', jsonb_array_length(NEW.damage_marks), 'has_notes', (NEW.damage_notes IS NOT NULL)));
    END IF;
    RETURN NEW;
  END IF;

  RETURN NULL;
END; $$;

DROP TRIGGER IF EXISTS car_rental_log_reservation_event ON public.car_rental_reservations;
CREATE TRIGGER car_rental_log_reservation_event
  AFTER INSERT OR UPDATE ON public.car_rental_reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_log_reservation_event();
