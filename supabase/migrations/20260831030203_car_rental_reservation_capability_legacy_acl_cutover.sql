-- Phase two of the car-rental reservation capability rollout.
--
-- Apply only after the additive migration and compatible web/PWA/native
-- clients have been deployed and verified. This transaction fails closed if
-- any active guest workflow would be orphaned, then removes confirmation-code
-- and raw-UUID authority from browser roles.

do $assert_car_rental_capability_cutover_ready$
begin
  if pg_catalog.to_regclass('private.car_rental_reservation_access') is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_issue_reservation_access(uuid,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_verify_reservation_access(uuid,text,text,uuid)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_customer_get_reservation(uuid,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_customer_cancel_reservation(uuid,text,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_customer_reschedule_reservation(uuid,text,timestamptz,timestamptz)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_customer_get_payment_status(uuid,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_customer_get_reservation_for_review(uuid,text)'
     ) is null
     or pg_catalog.to_regprocedure(
       'public.car_rental_customer_list_reservations()'
     ) is null then
    raise exception 'Car-rental capability RPCs are not ready for the legacy ACL cutover.'
      using errcode = '55000';
  end if;

  if not pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_customer_get_reservation(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_customer_get_reservation(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_customer_cancel_reservation(uuid,text,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_customer_cancel_reservation(uuid,text,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_customer_reschedule_reservation(uuid,text,timestamptz,timestamptz)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_customer_reschedule_reservation(uuid,text,timestamptz,timestamptz)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_customer_get_payment_status(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_customer_get_payment_status(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_customer_get_reservation_for_review(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_customer_get_reservation_for_review(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_customer_list_reservations()',
       'execute'
     ) then
    raise exception 'A replacement car-rental customer RPC is not executable by its intended browser role.'
      using errcode = '55000';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_issue_reservation_access(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_issue_reservation_access(uuid,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.car_rental_issue_reservation_access(uuid,text)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_verify_reservation_access(uuid,text,text,uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_verify_reservation_access(uuid,text,text,uuid)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.car_rental_verify_reservation_access(uuid,text,text,uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.car_rental_apply_booking_extras(uuid,uuid,jsonb,uuid,text,text,uuid)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'anon',
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)',
       'execute'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)',
       'execute'
     )
     or not pg_catalog.has_function_privilege(
       'service_role',
       'public.car_rental_submit_review(uuid,text,uuid,integer,integer,integer,integer,text)',
       'execute'
     )
     or pg_catalog.has_table_privilege(
       'anon',
       'private.car_rental_reservation_access',
       'select'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'private.car_rental_reservation_access',
       'select'
     ) then
    raise exception 'Car-rental capability grants are not ready for the legacy ACL cutover.'
      using errcode = '55000';
  end if;

  if not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_customers'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_revoke_access_on_customer_change'
         and not trigger.tgisinternal
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_reservations'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_revoke_access_on_reservation_link'
         and not trigger.tgisinternal
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_reservations'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_reservations_schedule_guard'
         and not trigger.tgisinternal
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger
       where trigger.tgrelid =
         'public.car_rental_vehicle_blackouts'::pg_catalog.regclass
         and trigger.tgname = 'car_rental_blackouts_schedule_guard'
         and not trigger.tgisinternal
     ) then
    raise exception 'Car-rental account-transition or vehicle-schedule guards are not ready for cutover.'
      using errcode = '55000';
  end if;

  -- Every future/active guest reservation must already have a plaintext
  -- manage link in the deployed client or a link issued by the rental team.
  -- A hash cannot be backfilled into a usable customer link after cutover.
  if exists (
    select 1
    from public.car_rental_reservations r
    left join public.car_rental_customers c on c.id = r.customer_id
    where c.user_id is null
      and (
        (
          r.status in ('pending', 'confirmed')
          and r.pickup_at > pg_catalog.now()
        )
        or (
          r.status = 'picked_up'
          and r.dropoff_at > pg_catalog.now()
        )
      )
      and not exists (
        select 1
        from private.car_rental_reservation_access a
        where a.reservation_id = r.id
          and a.scope = 'manage'
          and a.revoked_at is null
          and a.expires_at > pg_catalog.now()
      )
  ) then
    raise exception 'A future or active guest car-rental reservation is missing an active manage capability.'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.car_rental_reservations r
    left join public.car_rental_customers c on c.id = r.customer_id
    where c.user_id is null
      and r.status = 'returned'
      and r.dropoff_at >= pg_catalog.now() - interval '30 days'
      and not exists (
        select 1
        from public.car_rental_reviews review
        where review.reservation_id = r.id
      )
      and not exists (
        select 1
        from private.car_rental_reservation_access a
        where a.reservation_id = r.id
          and a.scope = 'review'
          and a.revoked_at is null
          and a.expires_at > pg_catalog.now()
      )
  ) then
    raise exception 'A recent reviewable guest car-rental reservation is missing an active review capability.'
      using errcode = '55000';
  end if;

  -- Only an in-flight payment still needs browser polling. Unpaid bookings do
  -- not require a status capability, and completed payment states are already
  -- reflected in their stored reservation status.
  if exists (
    select 1
    from public.car_rental_reservations r
    left join public.car_rental_customers c on c.id = r.customer_id
    where c.user_id is null
      and r.payment_status = 'processing'
      and not exists (
        select 1
        from private.car_rental_reservation_access a
        where a.reservation_id = r.id
          and a.scope = 'status'
          and a.revoked_at is null
          and a.expires_at > pg_catalog.now()
      )
  ) then
    raise exception 'A guest car-rental payment in progress is missing an active status capability.'
      using errcode = '55000';
  end if;
end;
$assert_car_rental_capability_cutover_ready$;

-- Customer account pages now use the narrow account-owned RPC. Remove the
-- direct full-row SELECT policy so internal notes and Stripe identifiers are
-- not exposed to an otherwise legitimate customer session.
drop policy if exists "Customers view their own reservations"
  on public.car_rental_reservations;

-- Defensive cleanup for a legacy migration that once treated every
-- reservation row as publicly readable. It is normally already absent.
drop policy if exists "Public lookup reservation by code"
  on public.car_rental_reservations;

-- Keep legacy routines callable by trusted service-role workers while browser
-- roles lose confirmation-code/raw-UUID authority. Optional historical
-- helpers are revoked when present, allowing drifted environments to converge.
do $revoke_car_rental_legacy_customer_rpcs$
declare
  v_signature text;
  v_signatures constant text[] := array[
    'public.get_car_rental_reservation(text,uuid)',
    'public.get_car_rental_reservation_by_code(text)',
    'public.get_car_rental_reservation_for_review(uuid)',
    'public.get_car_rental_reservation_payment_status(uuid)'
  ];
begin
  foreach v_signature in array v_signatures loop
    if pg_catalog.to_regprocedure(v_signature) is not null then
      execute pg_catalog.format(
        'revoke execute on function %s from public, anon, authenticated',
        v_signature
      );
      execute pg_catalog.format(
        'grant execute on function %s to service_role',
        v_signature
      );
    end if;
  end loop;
end;
$revoke_car_rental_legacy_customer_rpcs$;

do $assert_car_rental_capability_legacy_acl$
declare
  v_signature text;
  v_signatures constant text[] := array[
    'public.get_car_rental_reservation(text,uuid)',
    'public.get_car_rental_reservation_by_code(text)',
    'public.get_car_rental_reservation_for_review(uuid)',
    'public.get_car_rental_reservation_payment_status(uuid)'
  ];
begin
  foreach v_signature in array v_signatures loop
    if pg_catalog.to_regprocedure(v_signature) is not null then
      if pg_catalog.has_function_privilege('anon', v_signature, 'execute')
         or pg_catalog.has_function_privilege(
           'authenticated',
           v_signature,
           'execute'
         ) then
        raise exception 'A legacy car-rental customer RPC remains browser-executable: %',
          v_signature;
      end if;

      if not pg_catalog.has_function_privilege(
        'service_role',
        v_signature,
        'execute'
      ) then
        raise exception 'A trusted car-rental legacy caller lost service-role access: %',
          v_signature;
      end if;
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_policy policy
    where policy.polrelid = 'public.car_rental_reservations'::pg_catalog.regclass
      and policy.polname in (
        'Customers view their own reservations',
        'Public lookup reservation by code'
      )
  ) then
    raise exception 'A legacy direct reservation SELECT policy remains after cutover.';
  end if;
end;
$assert_car_rental_capability_legacy_acl$;
