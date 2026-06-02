grant execute on function public.is_channel_manager(uuid, uuid) to anon, authenticated, service_role;
grant execute on function public.can_view_channel(uuid, uuid) to anon, authenticated, service_role;
