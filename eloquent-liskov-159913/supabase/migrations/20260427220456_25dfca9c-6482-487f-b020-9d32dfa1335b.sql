
GRANT EXECUTE ON FUNCTION public.is_lodge_store_owner(_store_id uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_lodge_store_manager(_store_id uuid, _user_id uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.safe_uuid(_text text) TO authenticated, anon;
