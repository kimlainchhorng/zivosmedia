-- The previous migration revoked EXECUTE from anon and authenticated, which
-- were no-ops: neither held an explicit grant. The access came from the
-- default PUBLIC grant (the leading "=X/postgres" in proacl), which every
-- role inherits. Revoking from PUBLIC is what actually closes it.
--
-- service_role holds its own explicit grant, so server-side callers keep
-- access; nothing else invokes this function.

revoke execute on function public.prune_phone_otps() from public;
