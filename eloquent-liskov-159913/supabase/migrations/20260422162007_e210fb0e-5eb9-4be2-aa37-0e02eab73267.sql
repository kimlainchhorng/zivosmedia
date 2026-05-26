-- Add actor columns to lodge_reservation_audit
ALTER TABLE public.lodge_reservation_audit
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_role text;

-- Trigger function: auto-insert audit row when reservation status changes
CREATE OR REPLACE FUNCTION public.tg_lodge_reservation_status_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text := 'system';
  v_is_owner boolean := false;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF v_uid IS NOT NULL THEN
      -- Try host check via stores ownership
      BEGIN
        SELECT EXISTS (
          SELECT 1 FROM public.restaurants r
          WHERE r.id = NEW.store_id AND r.owner_id = v_uid
        ) INTO v_is_owner;
      EXCEPTION WHEN others THEN
        v_is_owner := false;
      END;

      IF v_is_owner THEN
        v_role := 'host';
      ELSIF EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = v_uid AND ur.role = 'admin') THEN
        v_role := 'admin';
      ELSE
        v_role := 'guest';
      END IF;
    END IF;

    INSERT INTO public.lodge_reservation_audit (
      reservation_id, store_id, from_status, to_status, note, actor_id, actor_user_id, actor_role
    ) VALUES (
      NEW.id, NEW.store_id, OLD.status, NEW.status, NULL, v_uid, v_uid, v_role
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lodge_reservation_status_audit ON public.lodge_reservations;
CREATE TRIGGER trg_lodge_reservation_status_audit
AFTER UPDATE OF status ON public.lodge_reservations
FOR EACH ROW EXECUTE FUNCTION public.tg_lodge_reservation_status_audit();

-- Enable realtime
ALTER TABLE public.lodge_reservations REPLICA IDENTITY FULL;
ALTER TABLE public.lodge_reservation_audit REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lodge_reservations;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lodge_reservation_audit;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;