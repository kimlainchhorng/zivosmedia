-- Narrow live-drift hardening for two generic counter mutators.
--
-- Deliberately preserved in this migration:
--   * create_car_rental_app_reservation(jsonb) is the public storefront's
--     reservation-creation boundary.
--   * salon_public_cancel_booking(uuid) and
--     salon_public_submit_review(uuid, integer, text) are bearer-link flows
--     whose UUID is currently the customer-facing secret.
--
-- Those public booking functions need a separate product-compatible token and
-- server-pricing design before their anonymous grants can be removed. This
-- migration does not silently break those customer flows.

do $anonymous_counter_hardening$
declare
  v_function regprocedure;
begin
  -- No repository caller invokes this live-drift helper. Promo redemption
  -- counters must be advanced by a trusted order/redemption transaction, not
  -- by a browser that only knows a promo UUID.
  v_function := to_regprocedure('public.bbq_bump_promo(uuid)');
  if v_function is not null then
    execute 'revoke execute on function public.bbq_bump_promo(uuid) from public, anon, authenticated';
    execute 'grant execute on function public.bbq_bump_promo(uuid) to service_role';
  end if;

  -- The only repository text that references this helper lives in an exported
  -- but unused redemption hook whose preceding insert is not authorized by the
  -- live RLS policy. Do not preserve a browser grant to a postgres-owned
  -- SECURITY DEFINER function that accepts arbitrary row IDs and signed amounts.
  v_function := to_regprocedure('public.increment_counter(text,text,uuid,integer)');
  if v_function is not null then
    execute 'revoke execute on function public.increment_counter(text,text,uuid,integer) from public, anon, authenticated';
    execute 'grant execute on function public.increment_counter(text,text,uuid,integer) to service_role';
  end if;
end
$anonymous_counter_hardening$;

-- Fail the migration if role inheritance or a surviving PUBLIC grant still
-- makes either function anonymously executable.
do $anonymous_counter_assertions$
declare
  v_function regprocedure;
begin
  v_function := to_regprocedure('public.bbq_bump_promo(uuid)');
  if v_function is not null
     and (
       has_function_privilege('anon', v_function, 'execute')
       or has_function_privilege('authenticated', v_function, 'execute')
       or not has_function_privilege('service_role', v_function, 'execute')
     ) then
    raise exception 'bbq_bump_promo(uuid) effective ACL is not service-role-only';
  end if;

  v_function := to_regprocedure('public.increment_counter(text,text,uuid,integer)');
  if v_function is not null
     and (
       has_function_privilege('anon', v_function, 'execute')
       or has_function_privilege('authenticated', v_function, 'execute')
       or not has_function_privilege('service_role', v_function, 'execute')
     ) then
    raise exception 'increment_counter(text,text,uuid,integer) effective ACL is not service-role-only';
  end if;
end
$anonymous_counter_assertions$;
