-- Grant EXECUTE permission on group member helper functions to authenticated users
-- This fixes the "permission denied for function is_group_member" error (42501)

GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) TO authenticated;

-- Also ensure they can be executed by service_role if needed (usually is by default)
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_group_admin(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) TO service_role;
