DROP POLICY IF EXISTS "Owners and admins manage lodge_rooms" ON public.lodge_rooms;
DROP POLICY IF EXISTS "Owners manage their rooms" ON public.lodge_rooms;

CREATE POLICY "Owners and admins can create lodge rooms"
ON public.lodge_rooms
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_lodge_store_owner(store_id)
  OR public.has_role(auth.uid(), 'admin'::text)
);

CREATE POLICY "Owners and admins can update lodge rooms"
ON public.lodge_rooms
FOR UPDATE
TO authenticated
USING (
  public.is_lodge_store_owner(store_id)
  OR public.has_role(auth.uid(), 'admin'::text)
)
WITH CHECK (
  public.is_lodge_store_owner(store_id)
  OR public.has_role(auth.uid(), 'admin'::text)
);

CREATE POLICY "Owners and admins can delete lodge rooms"
ON public.lodge_rooms
FOR DELETE
TO authenticated
USING (
  public.is_lodge_store_owner(store_id)
  OR public.has_role(auth.uid(), 'admin'::text)
);