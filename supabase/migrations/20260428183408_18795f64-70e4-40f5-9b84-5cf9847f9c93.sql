DROP POLICY IF EXISTS "Owners can view lodging_promotions" ON public.lodging_promotions;

CREATE POLICY "Public can view active lodging promotions"
ON public.lodging_promotions
FOR SELECT
TO public
USING (
  active = true
  AND member_only = false
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at >= now())
);

CREATE POLICY "Owners and admins can view lodging promotions"
ON public.lodging_promotions
FOR SELECT
TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);

GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO authenticated;