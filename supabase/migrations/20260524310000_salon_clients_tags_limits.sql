-- Server-side guardrails on salon_clients.tags so a tampered request can't
-- bypass the client-side caps (40 chars per tag, 20 tags per client).
--
-- Postgres CHECK constraints can't contain subqueries, and we need
-- unnest()-style per-element length validation. Implementing as a BEFORE
-- INSERT/UPDATE trigger instead. Same effect (reject the row), cleaner
-- error message for the UI to surface.

CREATE OR REPLACE FUNCTION public.tg_salon_clients_validate_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tag TEXT;
BEGIN
  IF NEW.tags IS NULL OR cardinality(NEW.tags) = 0 THEN
    RETURN NEW;
  END IF;
  IF cardinality(NEW.tags) > 20 THEN
    RAISE EXCEPTION 'A client can have at most 20 tags.' USING ERRCODE = '22023';
  END IF;
  FOREACH v_tag IN ARRAY NEW.tags LOOP
    IF v_tag IS NULL OR length(v_tag) = 0 THEN
      RAISE EXCEPTION 'Tags can''t be empty.' USING ERRCODE = '22023';
    END IF;
    IF length(v_tag) > 40 THEN
      RAISE EXCEPTION 'Tags must be 40 characters or fewer (got "%").', v_tag USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_clients_validate_tags ON public.salon_clients;
CREATE TRIGGER salon_clients_validate_tags
  BEFORE INSERT OR UPDATE OF tags ON public.salon_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_clients_validate_tags();
