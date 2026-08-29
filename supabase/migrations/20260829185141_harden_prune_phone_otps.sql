-- public.prune_phone_otps() is SECURITY DEFINER with no fixed search_path, and
-- EXECUTE was reachable by anon. That combination is the documented privilege
-- escalation shape: a definer-privileged function whose object resolution can
-- be steered by the caller's search_path. It also gave an unauthenticated
-- caller a DELETE primitive against phone_otps.
--
-- Nothing invokes it: no app code, no edge function, and no cron.job entry.
-- So pinning the path and removing the client grants is behaviour-neutral.

alter function public.prune_phone_otps() set search_path = public, pg_temp;

revoke execute on function public.prune_phone_otps() from anon;
revoke execute on function public.prune_phone_otps() from authenticated;
