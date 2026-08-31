-- Phase two of the hardened car-dealership customer capability rollout.
--
-- Apply only after the additive migration, compatible web/PWA/native clients,
-- and customer links have been deployed and verified. The transaction fails
-- closed if a replacement boundary is missing/wrong or if a guest workflow
-- would be orphaned, then removes raw UUID and direct anonymous lead authority.

do $assert_car_dealership_capability_cutover_ready$
declare
  v_signature text;
  v_function_oid oid;
  v_is_security_definer boolean;
  v_function_config text[];
  v_private_relation text;
  v_safe_browser_signatures constant text[] := array[
    'public.car_dealership_customer_get_test_drive(uuid,text)',
    'public.car_dealership_customer_cancel_test_drive(uuid,text,text)',
    'public.car_dealership_customer_get_sale_for_review(uuid,text)'
  ];
  v_issue_signatures constant text[] := array[
    'public.car_dealership_issue_test_drive_access(uuid)',
    'public.car_dealership_issue_sale_review_access(uuid)'
  ];
  v_service_only_signatures constant text[] := array[
    'public.car_dealership_verify_sale_review_access(uuid,text,uuid)',
    'public.car_dealership_customer_submit_interest(uuid,uuid,text,timestamptz,text,text,text,text,text,integer,boolean,boolean,uuid,uuid)',
    'public.car_dealership_customer_create_test_drive(uuid,uuid,timestamptz,text,text,text,text,uuid)',
    'public.car_dealership_submit_review(uuid,text,uuid,integer,text,text)'
  ];
  v_private_signatures constant text[] := array[
    'private.car_dealership_test_drive_access_allowed(uuid,text,uuid)',
    'private.car_dealership_sale_review_access_allowed(uuid,text,uuid)',
    'private.car_dealership_revoke_access_on_customer_change()',
    'private.car_dealership_revoke_access_on_test_drive_change()',
    'private.car_dealership_revoke_access_on_sale_change()',
    'private.car_dealership_enforce_test_drive_window()'
  ];
begin
  foreach v_private_relation in array array[
    'private.car_dealership_test_drive_access',
    'private.car_dealership_sale_review_access',
    'private.car_dealership_interest_requests'
  ] loop
    if pg_catalog.to_regclass(v_private_relation) is null then
      raise exception 'A dealership capability relation is missing: %',
        v_private_relation
        using errcode = '55000';
    end if;

    if not exists (
      select 1
      from pg_catalog.pg_class relation_info
      where relation_info.oid = pg_catalog.to_regclass(v_private_relation)
        and relation_info.relrowsecurity
    ) then
      raise exception 'A dealership capability relation lacks RLS: %',
        v_private_relation
        using errcode = '55000';
    end if;

    if pg_catalog.has_table_privilege('anon', v_private_relation, 'select')
       or pg_catalog.has_table_privilege('anon', v_private_relation, 'insert')
       or pg_catalog.has_table_privilege('anon', v_private_relation, 'update')
       or pg_catalog.has_table_privilege('anon', v_private_relation, 'delete')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'select')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'insert')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'update')
       or pg_catalog.has_table_privilege('authenticated', v_private_relation, 'delete') then
      raise exception 'A dealership capability relation is browser-accessible: %',
        v_private_relation
        using errcode = '55000';
    end if;
  end loop;

  if exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'private'
      and column_info.table_name in (
        'car_dealership_test_drive_access',
        'car_dealership_sale_review_access',
        'car_dealership_interest_requests'
      )
      and column_info.column_name in ('access_token', 'token', 'raw_token')
  )
  or not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'private'
      and column_info.table_name = 'car_dealership_test_drive_access'
      and column_info.column_name = 'token_hash'
      and column_info.data_type = 'bytea'
      and column_info.is_nullable = 'NO'
  )
  or not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'private'
      and column_info.table_name = 'car_dealership_sale_review_access'
      and column_info.column_name = 'token_hash'
      and column_info.data_type = 'bytea'
      and column_info.is_nullable = 'NO'
  ) then
    raise exception 'Dealership capability token storage is not hash-only.'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from (
      values
        ('car_dealership_test_drive_access', 'test_drive_id'),
        ('car_dealership_test_drive_access', 'expires_at'),
        ('car_dealership_test_drive_access', 'revoked_at'),
        ('car_dealership_test_drive_access', 'used_at'),
        ('car_dealership_test_drive_access', 'created_by_user_id'),
        ('car_dealership_test_drive_access', 'created_at'),
        ('car_dealership_sale_review_access', 'sale_id'),
        ('car_dealership_sale_review_access', 'expires_at'),
        ('car_dealership_sale_review_access', 'revoked_at'),
        ('car_dealership_sale_review_access', 'used_at'),
        ('car_dealership_sale_review_access', 'created_by_user_id'),
        ('car_dealership_sale_review_access', 'created_at'),
        ('car_dealership_interest_requests', 'request_id'),
        ('car_dealership_interest_requests', 'request_hash'),
        ('car_dealership_interest_requests', 'store_id'),
        ('car_dealership_interest_requests', 'mode'),
        ('car_dealership_interest_requests', 'submitted_user_id'),
        ('car_dealership_interest_requests', 'lead_id'),
        ('car_dealership_interest_requests', 'test_drive_id'),
        ('car_dealership_interest_requests', 'completed_at'),
        ('car_dealership_interest_requests', 'created_at')
    ) as required(table_name, column_name)
    where not exists (
      select 1
      from information_schema.columns column_info
      where column_info.table_schema = 'private'
        and column_info.table_name = required.table_name
        and column_info.column_name = required.column_name
    )
  ) then
    raise exception 'A dealership capability/idempotency relation has an incompatible shape.'
      using errcode = '55000';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.connamespace = 'private'::pg_catalog.regnamespace
      and constraint_info.convalidated
      and constraint_info.conname in (
        'car_dealership_test_drive_access_hash_length',
        'car_dealership_test_drive_access_future_expiry',
        'car_dealership_sale_review_access_hash_length',
        'car_dealership_sale_review_access_future_expiry',
        'car_dealership_interest_requests_hash_length',
        'car_dealership_interest_requests_result_shape'
      )
  ) <> 6 then
    raise exception 'A dealership capability/idempotency constraint is missing or unvalidated.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    join pg_catalog.pg_attribute attribute_info
      on attribute_info.attrelid = constraint_info.conrelid
     and attribute_info.attname = 'token_hash'
     and attribute_info.attnum = any(constraint_info.conkey)
    where constraint_info.conrelid =
        'private.car_dealership_test_drive_access'::pg_catalog.regclass
      and constraint_info.contype = 'u'
  )
  or not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    join pg_catalog.pg_attribute attribute_info
      on attribute_info.attrelid = constraint_info.conrelid
     and attribute_info.attname = 'token_hash'
     and attribute_info.attnum = any(constraint_info.conkey)
    where constraint_info.conrelid =
        'private.car_dealership_sale_review_access'::pg_catalog.regclass
      and constraint_info.contype = 'u'
  ) then
    raise exception 'A dealership capability token hash is not unique.'
      using errcode = '55000';
  end if;

  foreach v_signature in array (
    v_safe_browser_signatures
    || v_issue_signatures
    || v_service_only_signatures
    || v_private_signatures
  ) loop
    v_function_oid := pg_catalog.to_regprocedure(v_signature);
    if v_function_oid is null then
      raise exception 'A replacement dealership capability function is missing: %',
        v_signature
        using errcode = '55000';
    end if;

    select function_info.prosecdef, function_info.proconfig
    into v_is_security_definer, v_function_config
    from pg_catalog.pg_proc function_info
    where function_info.oid = v_function_oid;

    if not v_is_security_definer
       or not exists (
         select 1
         from pg_catalog.unnest(
           coalesce(v_function_config, array[]::text[])
         ) as setting(value)
         where pg_catalog.split_part(setting.value, '=', 1) = 'search_path'
           and pg_catalog.btrim(
             pg_catalog.substr(setting.value, 13),
             '"'
           ) = ''
       ) then
      raise exception 'A dealership capability function lacks SECURITY DEFINER with an empty search_path: %',
        v_signature
        using errcode = '55000';
    end if;
  end loop;

  foreach v_signature in array v_safe_browser_signatures loop
    if not pg_catalog.has_function_privilege('anon', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('authenticated', v_signature, 'execute')
       or pg_catalog.has_function_privilege('service_role', v_signature, 'execute') then
      raise exception 'A browser-safe dealership RPC has incorrect grants: %',
        v_signature
        using errcode = '55000';
    end if;
  end loop;

  foreach v_signature in array v_issue_signatures loop
    if pg_catalog.has_function_privilege('anon', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('authenticated', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('service_role', v_signature, 'execute')
       or pg_catalog.pg_get_function_result(
         pg_catalog.to_regprocedure(v_signature)::pg_catalog.oid
       ) not ilike '%account_owned boolean%' then
      raise exception 'A dealership capability issuer has incorrect grants or result shape: %',
        v_signature
        using errcode = '55000';
    end if;
  end loop;

  foreach v_signature in array v_service_only_signatures loop
    if pg_catalog.has_function_privilege('anon', v_signature, 'execute')
       or pg_catalog.has_function_privilege('authenticated', v_signature, 'execute')
       or not pg_catalog.has_function_privilege('service_role', v_signature, 'execute') then
      raise exception 'A trusted dealership mutation/verifier has incorrect grants: %',
        v_signature
        using errcode = '55000';
    end if;
  end loop;

  if pg_catalog.pg_get_function_result(
       'public.car_dealership_customer_submit_interest(uuid,uuid,text,timestamptz,text,text,text,text,text,integer,boolean,boolean,uuid,uuid)'::pg_catalog.regprocedure
     ) not ilike '%account_owned boolean%'
     or pg_catalog.pg_get_function_result(
       'public.car_dealership_customer_submit_interest(uuid,uuid,text,timestamptz,text,text,text,text,text,integer,boolean,boolean,uuid,uuid)'::pg_catalog.regprocedure
     ) not ilike '%already_processed boolean%' then
    raise exception 'The unified dealership intake result shape is incompatible.'
      using errcode = '55000';
  end if;

  if pg_catalog.pg_get_function_result(
       'public.car_dealership_submit_review(uuid,text,uuid,integer,text,text)'::pg_catalog.regprocedure
     ) not ilike '%review_id uuid%'
     or pg_catalog.pg_get_function_result(
       'public.car_dealership_submit_review(uuid,text,uuid,integer,text,text)'::pg_catalog.regprocedure
     ) not ilike '%already_processed boolean%' then
    raise exception 'The dealership review replay result shape is incompatible.'
      using errcode = '55000';
  end if;

  -- The schedule guard trigger and exclusion constraint must both be live;
  -- neither advisory locking nor an index-shaped drift object is sufficient.
  if not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'car_dealership_test_drives'
      and column_info.column_name = 'created_by_user_id'
      and column_info.data_type = 'uuid'
  )
  or not exists (
    select 1
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'car_dealership_test_drives'
      and column_info.column_name = 'scheduled_until_at'
      and column_info.data_type = 'timestamp with time zone'
      and column_info.is_nullable = 'NO'
  )
  or not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    join pg_catalog.pg_attribute attribute_info
      on attribute_info.attrelid = constraint_info.conrelid
     and attribute_info.attname = 'created_by_user_id'
     and attribute_info.attnum = any(constraint_info.conkey)
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.contype = 'f'
      and constraint_info.confrelid = 'auth.users'::pg_catalog.regclass
      and constraint_info.confdeltype = 'n'
  )
  or not exists (
    select 1
    from pg_catalog.pg_index index_info
    join pg_catalog.pg_class relation_info
      on relation_info.oid = index_info.indexrelid
    where relation_info.relnamespace = 'public'::pg_catalog.regnamespace
      and relation_info.relname =
        'car_dealership_test_drives_created_by_user_id_idx'
      and index_info.indisvalid
      and index_info.indnkeyatts = 1
      and index_info.indkey[0] = (
        select attribute_info.attnum
        from pg_catalog.pg_attribute attribute_info
        where attribute_info.attrelid = index_info.indrelid
          and attribute_info.attname = 'created_by_user_id'
          and not attribute_info.attisdropped
      )
  ) then
    raise exception 'The dealership test-drive account/window columns or creator FK are missing.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_customers'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_on_customer_change'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_on_test_drive_change'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_sales'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_on_sale_change'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and trigger_info.tgname = 'car_dealership_test_drives_window_guard'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  )
  or not exists (
    select 1
    from pg_catalog.pg_trigger trigger_info
    where trigger_info.tgrelid =
        'public.car_dealership_customers'::pg_catalog.regclass
      and trigger_info.tgname =
        'car_dealership_revoke_access_before_customer_delete'
      and not trigger_info.tgisinternal
      and trigger_info.tgenabled <> 'D'
  ) then
    raise exception 'Dealership account-transition or schedule triggers are not ready for cutover.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint constraint_info
    where constraint_info.conrelid =
        'public.car_dealership_test_drives'::pg_catalog.regclass
      and constraint_info.conname =
        'car_dealership_test_drives_no_active_overlap'
      and constraint_info.contype = 'x'
      and constraint_info.convalidated
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%vehicle_id with =%'
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%tstzrange(scheduled_at, scheduled_until_at%'
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%with &&%'
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%scheduled%'
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%confirmed%'
      and pg_catalog.pg_get_constraintdef(constraint_info.oid)
        ilike '%in_progress%'
  ) then
    raise exception 'The atomic dealership test-drive overlap constraint is missing or wrong.'
      using errcode = '55000';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index index_info
    join pg_catalog.pg_class relation_info
      on relation_info.oid = index_info.indexrelid
    where relation_info.relnamespace = 'public'::pg_catalog.regnamespace
      and relation_info.relname = 'car_dealership_reviews_unique_per_sale'
      and index_info.indisunique
      and index_info.indisvalid
      and index_info.indnkeyatts = 1
      and index_info.indkey[0] = (
        select attribute_info.attnum
        from pg_catalog.pg_attribute attribute_info
        where attribute_info.attrelid = index_info.indrelid
          and attribute_info.attname = 'sale_id'
          and not attribute_info.attisdropped
      )
      and pg_catalog.pg_get_expr(
        index_info.indpred,
        index_info.indrelid
      ) ilike '%sale_id is not null%'
  ) then
    raise exception 'The dealership one-review-per-sale guard is missing or wrong.'
      using errcode = '55000';
  end if;

  if pg_catalog.to_regclass('public.car_dealership_public_reviews') is null
     or not exists (
       select 1
       from pg_catalog.pg_class relation_info
       where relation_info.oid =
           'public.car_dealership_public_reviews'::pg_catalog.regclass
         and relation_info.relkind in ('r', 'p')
         and relation_info.relrowsecurity
     )
     or exists (
       select 1
       from information_schema.columns column_info
       where column_info.table_schema = 'public'
         and column_info.table_name = 'car_dealership_public_reviews'
         and column_info.column_name in ('sale_id', 'customer_id')
     )
     or not exists (
       select 1
       from pg_catalog.pg_policies policy_info
       where policy_info.schemaname = 'public'
         and policy_info.tablename = 'car_dealership_public_reviews'
         and policy_info.policyname =
           'Public reads visible dealership review projection'
         and policy_info.cmd = 'SELECT'
     )
     or not exists (
       select 1
       from pg_catalog.pg_trigger trigger_info
       where trigger_info.tgrelid =
           'public.car_dealership_reviews'::pg_catalog.regclass
         and trigger_info.tgname = 'car_dealership_sync_public_review'
         and not trigger_info.tgisinternal
         and trigger_info.tgenabled <> 'D'
     )
     or not pg_catalog.has_table_privilege(
       'anon',
       'public.car_dealership_public_reviews',
       'select'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_public_reviews',
       'select'
     ) then
    raise exception 'The safe public-review projection is not ready for cutover.'
      using errcode = '55000';
  end if;

  -- Every future/active guest test drive must already have its plaintext
  -- manage link in a deployed client or a link issued by the dealership.
  -- A digest cannot be backfilled into a usable customer link after cutover.
  if exists (
    select 1
    from public.car_dealership_test_drives test_drive
    left join public.car_dealership_customers customer
      on customer.id = test_drive.customer_id
    where test_drive.created_by_user_id is null
      and customer.user_id is null
      and (
        (
          test_drive.status::text in ('scheduled', 'confirmed')
          and test_drive.scheduled_until_at > pg_catalog.now()
        )
        or test_drive.status::text = 'in_progress'
      )
      and not exists (
        select 1
        from private.car_dealership_test_drive_access access_record
        where access_record.test_drive_id = test_drive.id
          and access_record.revoked_at is null
          and access_record.expires_at > pg_catalog.now()
      )
  ) then
    raise exception 'A future or active guest dealership test drive is missing an active manage capability.'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.car_dealership_sales sale
    left join public.car_dealership_customers customer
      on customer.id = sale.customer_id
    where customer.user_id is null
      and sale.status::text in ('completed', 'delivered')
      and not exists (
        select 1
        from public.car_dealership_reviews review
        where review.sale_id = sale.id
      )
      and not exists (
        select 1
        from private.car_dealership_sale_review_access access_record
        where access_record.sale_id = sale.id
          and access_record.revoked_at is null
          and access_record.used_at is null
          and access_record.expires_at > pg_catalog.now()
      )
  ) then
    raise exception 'A reviewable guest dealership sale is missing an active review capability.'
      using errcode = '55000';
  end if;
end;
$assert_car_dealership_capability_cutover_ready$;

-- Compatible clients now read visible reviews through the safe projection.
-- Cut over the base table only after coverage checks pass so old public reads
-- and browser review writes are removed in the same guarded transaction.
alter table public.car_dealership_reviews enable row level security;

drop policy if exists "Public read dealership reviews"
  on public.car_dealership_reviews;
drop policy if exists "Owners manage car_dealership_reviews - select"
  on public.car_dealership_reviews;
drop policy if exists "car_dealership_reviews_select_combined"
  on public.car_dealership_reviews;

create policy "Dealership owners and admins read full reviews"
  on public.car_dealership_reviews
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_reviews.store_id
        and store_profile.owner_id = (select auth.uid())
    )
    or coalesce(
      public.has_role((select auth.uid()), 'admin'::public.app_role),
      false
    )
  );

create policy "Dealership full review reads require owner or admin"
  on public.car_dealership_reviews
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_reviews.store_id
        and store_profile.owner_id = (select auth.uid())
    )
    or coalesce(
      public.has_role((select auth.uid()), 'admin'::public.app_role),
      false
    )
  );

drop policy if exists "Public submit dealership review"
  on public.car_dealership_reviews;
drop policy if exists "Owners manage car_dealership_reviews - insert"
  on public.car_dealership_reviews;
drop policy if exists "Owners manage car_dealership_reviews - update"
  on public.car_dealership_reviews;
drop policy if exists "Owners manage car_dealership_reviews - delete"
  on public.car_dealership_reviews;
drop policy if exists "car_dealership_reviews_insert_combined"
  on public.car_dealership_reviews;

create policy "Car dealership review inserts require trusted server validation"
  on public.car_dealership_reviews
  as restrictive
  for insert
  to anon, authenticated
  with check (false);

create policy "Car dealership review updates require trusted server validation"
  on public.car_dealership_reviews
  as restrictive
  for update
  to anon, authenticated
  using (false)
  with check (false);

create policy "Car dealership review deletes require trusted server validation"
  on public.car_dealership_reviews
  as restrictive
  for delete
  to anon, authenticated
  using (false);

revoke select, insert, update, delete on table public.car_dealership_reviews
  from public, anon;
revoke insert, update, delete on table public.car_dealership_reviews
  from authenticated;
grant select on table public.car_dealership_reviews to authenticated;
grant all privileges on table public.car_dealership_reviews to service_role;

-- Direct public CRM access is replaced by the service-only idempotent intake.
-- Rebuild the authenticated management boundary explicitly so a drifted live
-- RLS/policy state cannot turn the subsequent CRUD grant into cross-store PII
-- access or mutation authority.
alter table public.car_dealership_leads enable row level security;

drop policy if exists "Public can create dealership leads"
  on public.car_dealership_leads;
drop policy if exists "Owners manage car_dealership_leads - select"
  on public.car_dealership_leads;
drop policy if exists "Owners manage car_dealership_leads - insert"
  on public.car_dealership_leads;
drop policy if exists "Owners manage car_dealership_leads - update"
  on public.car_dealership_leads;
drop policy if exists "Owners manage car_dealership_leads - delete"
  on public.car_dealership_leads;
drop policy if exists "car_dealership_leads_insert_combined"
  on public.car_dealership_leads;

create policy "Dealership owners and admins manage leads"
  on public.car_dealership_leads
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_leads.store_id
        and store_profile.owner_id = (select auth.uid())
    )
    or coalesce(
      public.has_role((select auth.uid()), 'admin'::public.app_role),
      false
    )
  )
  with check (
    exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_leads.store_id
        and store_profile.owner_id = (select auth.uid())
    )
    or coalesce(
      public.has_role((select auth.uid()), 'admin'::public.app_role),
      false
    )
  );

create policy "Dealership lead access requires owner or admin"
  on public.car_dealership_leads
  as restrictive
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_leads.store_id
        and store_profile.owner_id = (select auth.uid())
    )
    or coalesce(
      public.has_role((select auth.uid()), 'admin'::public.app_role),
      false
    )
  )
  with check (
    exists (
      select 1
      from public.store_profiles store_profile
      where store_profile.id = car_dealership_leads.store_id
        and store_profile.owner_id = (select auth.uid())
    )
    or coalesce(
      public.has_role((select auth.uid()), 'admin'::public.app_role),
      false
    )
  );

revoke insert on table public.car_dealership_leads from public, anon;
grant select, insert, update, delete on table public.car_dealership_leads
  to authenticated;

-- Keep legacy routines callable by trusted service workers if an operational
-- path still needs them, while browser roles lose raw sale/test-drive UUID
-- authority. Do not drop the routines or their historical data.
do $revoke_car_dealership_legacy_customer_rpcs$
declare
  v_signature text;
  v_signatures constant text[] := array[
    'public.get_deal_for_review(uuid)',
    'public.schedule_public_test_drive(uuid,uuid,timestamptz,text,text,text,uuid)'
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
$revoke_car_dealership_legacy_customer_rpcs$;

do $assert_car_dealership_capability_legacy_acl$
declare
  v_signature text;
  v_signatures constant text[] := array[
    'public.get_deal_for_review(uuid)',
    'public.schedule_public_test_drive(uuid,uuid,timestamptz,text,text,text,uuid)'
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
        raise exception 'A legacy dealership customer RPC remains browser-executable: %',
          v_signature;
      end if;

      if not pg_catalog.has_function_privilege(
        'service_role',
        v_signature,
        'execute'
      ) then
        raise exception 'A trusted dealership legacy caller lost service-role access: %',
          v_signature;
      end if;
    end if;
  end loop;

  if pg_catalog.has_table_privilege(
       'anon',
       'public.car_dealership_leads',
       'insert'
     ) then
    raise exception 'Anonymous callers can still insert dealership leads directly.';
  end if;

  if not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_leads',
       'select'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_leads',
       'insert'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_leads',
       'update'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_leads',
       'delete'
     ) then
    raise exception 'Authenticated dealership owner/admin lead CRUD privileges were not preserved.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class relation_info
    where relation_info.oid =
        'public.car_dealership_leads'::pg_catalog.regclass
      and relation_info.relrowsecurity
  )
  or not exists (
    select 1
    from pg_catalog.pg_policy policy_info
    where policy_info.polrelid =
        'public.car_dealership_leads'::pg_catalog.regclass
      and policy_info.polname = 'Dealership owners and admins manage leads'
      and policy_info.polcmd = '*'
      and policy_info.polpermissive
      and pg_catalog.pg_get_expr(
        policy_info.polqual,
        policy_info.polrelid
      ) ilike '%store_profiles%owner_id%auth.uid%has_role%admin%'
      and pg_catalog.pg_get_expr(
        policy_info.polwithcheck,
        policy_info.polrelid
      ) ilike '%store_profiles%owner_id%auth.uid%has_role%admin%'
  )
  or not exists (
    select 1
    from pg_catalog.pg_policy policy_info
    where policy_info.polrelid =
        'public.car_dealership_leads'::pg_catalog.regclass
      and policy_info.polname =
        'Dealership lead access requires owner or admin'
      and policy_info.polcmd = '*'
      and not policy_info.polpermissive
      and pg_catalog.pg_get_expr(
        policy_info.polqual,
        policy_info.polrelid
      ) ilike '%store_profiles%owner_id%auth.uid%has_role%admin%'
      and pg_catalog.pg_get_expr(
        policy_info.polwithcheck,
        policy_info.polrelid
      ) ilike '%store_profiles%owner_id%auth.uid%has_role%admin%'
  ) then
    raise exception 'Authenticated dealership lead CRUD is not owner/admin constrained under RLS.';
  end if;

  if pg_catalog.has_table_privilege(
       'anon',
       'public.car_dealership_reviews',
       'select'
     )
     or not pg_catalog.has_table_privilege(
       'anon',
       'public.car_dealership_public_reviews',
       'select'
     )
     or not pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_reviews',
       'select'
     )
     or pg_catalog.has_table_privilege(
       'anon',
       'public.car_dealership_reviews',
       'insert'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_reviews',
       'insert'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_reviews',
       'update'
     )
     or pg_catalog.has_table_privilege(
       'authenticated',
       'public.car_dealership_reviews',
       'delete'
     ) then
    raise exception 'Dealership review identifiers remain publicly exposed after cutover.';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_class relation_info
    where relation_info.oid =
        'public.car_dealership_reviews'::pg_catalog.regclass
      and relation_info.relrowsecurity
  )
  or not exists (
    select 1
    from pg_catalog.pg_policy policy_info
    where policy_info.polrelid =
        'public.car_dealership_reviews'::pg_catalog.regclass
      and policy_info.polname =
        'Dealership owners and admins read full reviews'
      and policy_info.polcmd = 'r'
      and policy_info.polpermissive
  )
  or not exists (
    select 1
    from pg_catalog.pg_policy policy_info
    where policy_info.polrelid =
        'public.car_dealership_reviews'::pg_catalog.regclass
      and policy_info.polname =
        'Dealership full review reads require owner or admin'
      and policy_info.polcmd = 'r'
      and not policy_info.polpermissive
  ) then
    raise exception 'Dealership full-review owner/admin RLS is missing after cutover.';
  end if;
end;
$assert_car_dealership_capability_legacy_acl$;
