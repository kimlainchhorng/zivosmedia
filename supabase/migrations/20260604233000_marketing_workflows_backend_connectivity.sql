-- Connect Marketing Audience/Campaigns/Flows to concrete backend records.
-- The Supabase CLI is not installed in this workspace, so this migration was
-- created manually and applied directly through the Supabase MCP SQL executor.

CREATE TABLE IF NOT EXISTS public.marketing_segment_members (
  segment_id uuid NOT NULL REFERENCES public.marketing_segments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, user_id)
);

ALTER TABLE public.marketing_segment_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage segment members" ON public.marketing_segment_members;
CREATE POLICY "Admins manage segment members"
  ON public.marketing_segment_members
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Store owners view segment members" ON public.marketing_segment_members;
CREATE POLICY "Store owners view segment members"
  ON public.marketing_segment_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.marketing_segments s
      WHERE s.id = marketing_segment_members.segment_id
        AND (public.is_store_owner(s.store_id) OR public.has_role(auth.uid(), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Users view own segment memberships" ON public.marketing_segment_members;
CREATE POLICY "Users view own segment memberships"
  ON public.marketing_segment_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_marketing_segment_members_user
  ON public.marketing_segment_members(user_id, added_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketing_segment_members_segment_added
  ON public.marketing_segment_members(segment_id, added_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_segment_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_segment_members TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_marketing_segment_count(p_segment_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id uuid;
  v_total integer := 0;
BEGIN
  SELECT store_id
  INTO v_store_id
  FROM public.marketing_segments
  WHERE id = p_segment_id;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Segment not found';
  END IF;

  IF NOT (
    coalesce(auth.role(), '') = 'service_role'
    OR public.is_store_owner(v_store_id)
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  WITH audience AS (
    SELECT 'segment:' || user_id::text AS audience_key
    FROM public.marketing_segment_members
    WHERE segment_id = p_segment_id
      AND user_id IS NOT NULL

    UNION

    SELECT 'food:' || customer_id::text AS audience_key
    FROM public.food_orders
    WHERE restaurant_id = v_store_id
      AND customer_id IS NOT NULL

    UNION

    SELECT 'store:' || customer_id::text AS audience_key
    FROM public.store_orders
    WHERE store_id = v_store_id
      AND customer_id IS NOT NULL

    UNION

    SELECT 'ar-email:' || lower(owner_email) AS audience_key
    FROM public.ar_customer_vehicles
    WHERE store_id = v_store_id
      AND nullif(trim(owner_email), '') IS NOT NULL

    UNION

    SELECT 'ar-phone:' || regexp_replace(owner_phone, '\D', '', 'g') AS audience_key
    FROM public.ar_customer_vehicles
    WHERE store_id = v_store_id
      AND nullif(regexp_replace(coalesce(owner_phone, ''), '\D', '', 'g'), '') IS NOT NULL

    UNION

    SELECT 'ar-work-email:' || lower(customer_email) AS audience_key
    FROM public.ar_work_orders
    WHERE store_id = v_store_id
      AND nullif(trim(customer_email), '') IS NOT NULL

    UNION

    SELECT 'ar-work-phone:' || regexp_replace(customer_phone, '\D', '', 'g') AS audience_key
    FROM public.ar_work_orders
    WHERE store_id = v_store_id
      AND nullif(regexp_replace(coalesce(customer_phone, ''), '\D', '', 'g'), '') IS NOT NULL
  )
  SELECT count(DISTINCT audience_key)::integer
  INTO v_total
  FROM audience;

  UPDATE public.marketing_segments
  SET member_count = v_total,
      last_refreshed_at = now()
  WHERE id = p_segment_id;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_marketing_segment_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_marketing_segment_count(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.refresh_marketing_segment_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_marketing_segment_count(uuid) TO service_role;
