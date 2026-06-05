-- Scheduled and backend maintenance helpers should not be callable directly
-- from anonymous or signed-in browser clients. pg_cron runs its scheduled
-- functions as the database role that owns the job, and the device-link Edge
-- Function calls its cleanup helper with the service role.

revoke execute on function public.cleanup_expired_device_link_tokens() from public;
revoke execute on function public.cleanup_expired_device_link_tokens() from anon;
revoke execute on function public.cleanup_expired_device_link_tokens() from authenticated;
grant execute on function public.cleanup_expired_device_link_tokens() to service_role;

revoke execute on function public.cafe_auto_expire_pending_orders() from public;
revoke execute on function public.cafe_auto_expire_pending_orders() from anon;
revoke execute on function public.cafe_auto_expire_pending_orders() from authenticated;
grant execute on function public.cafe_auto_expire_pending_orders() to service_role;

revoke execute on function public.salon_auto_expire_pending_bookings() from public;
revoke execute on function public.salon_auto_expire_pending_bookings() from anon;
revoke execute on function public.salon_auto_expire_pending_bookings() from authenticated;
grant execute on function public.salon_auto_expire_pending_bookings() to service_role;

revoke execute on function public.run_ad_boost_auction() from public;
revoke execute on function public.run_ad_boost_auction() from anon;
revoke execute on function public.run_ad_boost_auction() from authenticated;
grant execute on function public.run_ad_boost_auction() to service_role;
