-- Phase two of the Salon booking capability rollout.
--
-- Apply only after the additive capability migration is live and the
-- production web/PWA/native clients have been verified to use the
-- salon_customer_* RPCs.
-- Keeping this ACL cutover separate prevents an additive schema deployment
-- from breaking an older cached or still-live web bundle.

do $assert_salon_booking_capability_cutover_ready$
begin
  if to_regprocedure('public.salon_customer_get_booking(uuid,text)') is null
     or to_regprocedure('public.salon_customer_cancel_booking(uuid,text)') is null
     or to_regprocedure('public.salon_customer_get_booking_for_review(uuid,text)') is null
     or to_regprocedure('public.salon_customer_submit_review(uuid,text,integer,text)') is null then
    raise exception 'Salon capability RPCs are not ready for the legacy ACL cutover.'
      using errcode = '55000';
  end if;

  if to_regprocedure('public.salon_public_get_booking(uuid)') is null
     or to_regprocedure('public.salon_public_cancel_booking(uuid)') is null
     or to_regprocedure('public.salon_public_get_booking_for_review(uuid)') is null
     or to_regprocedure('public.salon_public_submit_review(uuid,integer,text)') is null then
    raise exception 'A Salon legacy RPC is missing; review the cutover target before changing ACLs.'
      using errcode = '55000';
  end if;

  if not has_function_privilege('anon', 'public.salon_customer_get_booking(uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.salon_customer_get_booking(uuid,text)', 'execute')
     or not has_function_privilege('anon', 'public.salon_customer_cancel_booking(uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.salon_customer_cancel_booking(uuid,text)', 'execute')
     or not has_function_privilege('anon', 'public.salon_customer_get_booking_for_review(uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.salon_customer_get_booking_for_review(uuid,text)', 'execute')
     or not has_function_privilege('anon', 'public.salon_customer_submit_review(uuid,text,integer,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.salon_customer_submit_review(uuid,text,integer,text)', 'execute') then
    raise exception 'A replacement Salon customer RPC is not browser-executable.'
      using errcode = '55000';
  end if;

  if has_function_privilege('anon', 'public.salon_issue_booking_access(uuid,text)', 'execute')
     or not has_function_privilege('authenticated', 'public.salon_issue_booking_access(uuid,text)', 'execute')
     or not has_function_privilege('service_role', 'public.salon_issue_booking_access(uuid,text)', 'execute')
     or has_function_privilege('anon', 'public.salon_verify_booking_access(uuid,text,text,uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.salon_verify_booking_access(uuid,text,text,uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.salon_verify_booking_access(uuid,text,text,uuid)', 'execute')
     or has_table_privilege('anon', 'private.salon_booking_access', 'select')
     or has_table_privilege('authenticated', 'private.salon_booking_access', 'select') then
    raise exception 'Salon capability grants are not ready for the legacy ACL cutover.'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.salon_bookings b
    left join public.salon_clients c on c.id = b.client_id
    where b.source = 'app'
      and b.status in ('pending', 'confirmed')
      and b.start_at > now()
      and b.created_by_user_id is null
      and c.user_id is null
      and not exists (
        select 1
        from private.salon_booking_access a
        where a.booking_id = b.id
          and a.scope = 'manage'
          and a.revoked_at is null
          and a.expires_at > now()
      )
  ) then
    raise exception 'A future guest Salon booking is missing an active manage capability.'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.salon_bookings b
    left join public.salon_clients c on c.id = b.client_id
    where b.status = 'completed'
      and b.end_at >= now() - interval '30 days'
      and b.created_by_user_id is null
      and c.user_id is null
      and not exists (
        select 1
        from public.salon_reviews r
        where r.booking_id = b.id
      )
      and not exists (
        select 1
        from private.salon_booking_access a
        where a.booking_id = b.id
          and a.scope = 'review'
          and a.revoked_at is null
          and a.expires_at > now()
      )
  ) then
    raise exception 'A recent reviewable guest Salon booking is missing an active review capability.'
      using errcode = '55000';
  end if;
end;
$assert_salon_booking_capability_cutover_ready$;

-- Twilio/internal callers may continue to use the legacy cancellation
-- function through the service role. Browser roles lose UUID-only authority.
revoke execute on function public.salon_public_get_booking(uuid)
  from public, anon, authenticated;
revoke execute on function public.salon_public_cancel_booking(uuid)
  from public, anon, authenticated;
revoke execute on function public.salon_public_get_booking_for_review(uuid)
  from public, anon, authenticated;
revoke execute on function public.salon_public_submit_review(uuid, integer, text)
  from public, anon, authenticated;

grant execute on function public.salon_public_get_booking(uuid) to service_role;
grant execute on function public.salon_public_cancel_booking(uuid) to service_role;
grant execute on function public.salon_public_get_booking_for_review(uuid) to service_role;
grant execute on function public.salon_public_submit_review(uuid, integer, text) to service_role;

do $assert_salon_booking_capability_legacy_acl$
begin
  if has_function_privilege('anon', 'public.salon_public_get_booking(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.salon_public_get_booking(uuid)', 'execute')
     or has_function_privilege('anon', 'public.salon_public_cancel_booking(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.salon_public_cancel_booking(uuid)', 'execute')
     or has_function_privilege('anon', 'public.salon_public_get_booking_for_review(uuid)', 'execute')
     or has_function_privilege('authenticated', 'public.salon_public_get_booking_for_review(uuid)', 'execute')
     or has_function_privilege('anon', 'public.salon_public_submit_review(uuid,integer,text)', 'execute')
     or has_function_privilege('authenticated', 'public.salon_public_submit_review(uuid,integer,text)', 'execute') then
    raise exception 'A UUID-only salon booking RPC remains browser-executable';
  end if;

  if not has_function_privilege('service_role', 'public.salon_public_get_booking(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.salon_public_cancel_booking(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.salon_public_get_booking_for_review(uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.salon_public_submit_review(uuid,integer,text)', 'execute') then
    raise exception 'A trusted Salon legacy caller lost required service-role access';
  end if;
end;
$assert_salon_booking_capability_legacy_acl$;
