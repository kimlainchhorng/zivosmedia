-- Creator links are user-editable, but the owner relationship points through
-- creator_profiles.id. The original policies compared creator_links.creator_id
-- directly to auth.uid(), which blocks legitimate link editing when creator_id
-- stores the creator profile id. Also keep click_count server-owned.

DROP POLICY IF EXISTS "cln_ins" ON public.creator_links;
DROP POLICY IF EXISTS "cln_upd" ON public.creator_links;
DROP POLICY IF EXISTS "cln_del" ON public.creator_links;

CREATE POLICY "cln_ins_profile_owner"
  ON public.creator_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.creator_profiles cp
      WHERE cp.id = creator_links.creator_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "cln_upd_profile_owner"
  ON public.creator_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creator_profiles cp
      WHERE cp.id = creator_links.creator_id
        AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.creator_profiles cp
      WHERE cp.id = creator_links.creator_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "cln_del_profile_owner"
  ON public.creator_links
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.creator_profiles cp
      WHERE cp.id = creator_links.creator_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.prevent_direct_creator_link_metric_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_role text := COALESCE(auth.role(), current_setting('request.jwt.claim.role', true), '');
BEGIN
  IF request_role <> 'service_role' THEN
    IF TG_OP = 'INSERT' THEN
      IF COALESCE(NEW.click_count, 0) <> 0 THEN
        RAISE EXCEPTION 'creator_link_metrics_server_gate_required';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.click_count IS DISTINCT FROM OLD.click_count THEN
        RAISE EXCEPTION 'creator_link_metrics_server_gate_required';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_direct_creator_link_metric_writes ON public.creator_links;

CREATE TRIGGER trg_prevent_direct_creator_link_metric_writes
BEFORE INSERT OR UPDATE ON public.creator_links
FOR EACH ROW
EXECUTE FUNCTION public.prevent_direct_creator_link_metric_writes();

COMMENT ON FUNCTION public.prevent_direct_creator_link_metric_writes()
IS 'Blocks direct client writes to creator_links.click_count while allowing creator-owned title, URL, icon, sort order, and active-state edits.';
