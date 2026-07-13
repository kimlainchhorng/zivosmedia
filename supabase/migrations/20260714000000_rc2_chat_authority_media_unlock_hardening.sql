-- RC2 chat authority hardening.
--
-- This migration belongs to the shared media/identity authority project
-- (slirphzzwcogdbkeicff). It deliberately makes no remote changes on its own:
-- a non-production project/branch must run the migration and its preflight
-- checks before it is promoted anywhere.
--
-- Invariants:
--   * A direct-message buyer has at most one active (pending) or completed
--     Stripe media unlock for a message.
--   * A Stripe Checkout Session ID identifies at most one media_unlocks row.
--   * Browsers can inspect only their own unlock state; all mutation is
--     server/service-role owned after message and payment validation.
--   * Chat and voice attachment buckets are private.
--   * Transcript-cache rows, if the legacy cache relation exists, are readable
--     only through the same voice-note participant boundary.
--
-- Legacy data is intentionally never deleted, merged, or rewritten here. Any
-- duplicate state prevents this migration from applying so an operator can
-- resolve it with an auditable, product-specific plan.

-- Hold writers while the duplicate preflight and uniqueness indexes run. The
-- lock is released with this migration transaction, after both indexes exist.
lock table public.media_unlocks in share row exclusive mode;

do $$
declare
  v_message_id text;
  v_buyer_id uuid;
  v_stripe_session_id text;
begin
  select mu.message_id, mu.buyer_id
    into v_message_id, v_buyer_id
    from public.media_unlocks mu
   where mu.message_table = 'direct_messages'
     and mu.status in ('pending', 'completed')
   group by mu.message_id, mu.buyer_id
  having count(*) > 1
   limit 1;

  if found then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = format(
        'RC2 preflight blocked: duplicate direct-message active/completed media unlocks for message_id=%s buyer_id=%s. Resolve legacy rows manually; this migration will not delete or merge them.',
        v_message_id,
        v_buyer_id
      );
  end if;

  select mu.stripe_session_id
    into v_stripe_session_id
    from public.media_unlocks mu
   where mu.stripe_session_id is not null
   group by mu.stripe_session_id
  having count(*) > 1
   limit 1;

  if found then
    raise exception using
      errcode = 'integrity_constraint_violation',
      message = format(
        'RC2 preflight blocked: duplicate Stripe Checkout Session ID %s in media_unlocks. Resolve legacy rows manually; this migration will not delete or merge them.',
        v_stripe_session_id
      );
  end if;
end;
$$;

-- This is intentionally direct-message-only. The existing group-message
-- completed-unlock uniqueness rule remains independent and unchanged.
create unique index idx_media_unlocks_direct_active_completed_unique
  on public.media_unlocks (message_id, buyer_id)
  where message_table = 'direct_messages'
    and status in ('pending', 'completed');

create unique index idx_media_unlocks_stripe_session_unique
  on public.media_unlocks (stripe_session_id)
  where stripe_session_id is not null;

-- Do not leave an old permissive policy as an alternate browser path. Group
-- and direct payment workers use the service role, which is intentionally not
-- revoked here. Browser callers may read only their own unlock state.
alter table public.media_unlocks enable row level security;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'media_unlocks'
  loop
    execute format('drop policy if exists %I on public.media_unlocks', v_policy.policyname);
  end loop;
end;
$$;

revoke all on table public.media_unlocks from public;
revoke all on table public.media_unlocks from anon, authenticated;
grant select on table public.media_unlocks to authenticated;

create policy "Media unlock buyers read own rows"
  on public.media_unlocks
  for select
  to authenticated
  using ((select auth.uid()) = buyer_id);

-- Require both authority buckets to exist instead of silently accepting a
-- typo or divergent project schema. They were introduced by prior authority
-- migrations and are only made private here.
do $$
declare
  v_missing_buckets text[];
begin
  select array_agg(required_bucket order by required_bucket)
    into v_missing_buckets
    from (
      values ('chat-media-files'::text), ('voice-notes'::text)
    ) as required(required_bucket)
   where not exists (
     select 1
       from storage.buckets b
      where b.id = required.required_bucket
   );

  if v_missing_buckets is not null then
    raise exception using
      errcode = 'undefined_object',
      message = format(
        'RC2 preflight blocked: required chat storage bucket(s) missing: %s.',
        array_to_string(v_missing_buckets, ', ')
      );
  end if;
end;
$$;

update storage.buckets
   set public = false
 where id in ('chat-media-files', 'voice-notes');

-- The repository-defined voice-note boundary is a note owner or a participant
-- in its linked direct message. Do not infer an undocumented conversation or
-- group-membership schema from conversation_id.
do $$
declare
  v_voice_message_type text;
  v_direct_message_id_type text;
begin
  if to_regclass('public.voice_notes') is null
     or to_regclass('public.direct_messages') is null then
    raise exception using
      errcode = 'undefined_table',
      message = 'RC2 preflight blocked: public.voice_notes and public.direct_messages are required for transcript authorization.';
  end if;

  if not exists (
    select 1
      from pg_attribute a
     where a.attrelid = 'public.voice_notes'::regclass
       and a.attname in ('user_id', 'message_id')
       and a.attnum > 0
       and not a.attisdropped
     group by a.attrelid
    having count(*) = 2
  ) or not exists (
    select 1
      from pg_attribute a
     where a.attrelid = 'public.direct_messages'::regclass
       and a.attname in ('id', 'sender_id', 'receiver_id')
       and a.attnum > 0
       and not a.attisdropped
     group by a.attrelid
    having count(*) = 3
  ) then
    raise exception using
      errcode = 'undefined_column',
      message = 'RC2 preflight blocked: voice-note/direct-message participant columns are missing.';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into v_voice_message_type
    from pg_attribute a
   where a.attrelid = 'public.voice_notes'::regclass
     and a.attname = 'message_id'
     and a.attnum > 0
     and not a.attisdropped;

  select format_type(a.atttypid, a.atttypmod)
    into v_direct_message_id_type
    from pg_attribute a
   where a.attrelid = 'public.direct_messages'::regclass
     and a.attname = 'id'
     and a.attnum > 0
     and not a.attisdropped;

  if v_voice_message_type <> v_direct_message_id_type then
    raise exception using
      errcode = 'datatype_mismatch',
      message = format(
        'RC2 preflight blocked: public.voice_notes.message_id must match public.direct_messages.id (voice_note=%s, direct_message=%s).',
        v_voice_message_type,
        v_direct_message_id_type
      );
  end if;
end;
$$;

alter table public.voice_notes enable row level security;

do $$
declare
  v_policy record;
begin
  for v_policy in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'voice_notes'
       and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy if exists %I on public.voice_notes', v_policy.policyname);
  end loop;
end;
$$;

create policy "Voice note owner or direct-message participant can read"
  on public.voice_notes
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
        from public.direct_messages dm
       where dm.id = voice_notes.message_id
         and ((select auth.uid()) = dm.sender_id or (select auth.uid()) = dm.receiver_id)
    )
  );

-- voice_transcriptions is present in generated authority types but has no
-- repository migration. Secure it only when it really exists, and verify its
-- cache key can be joined to the documented voice_notes.message_id boundary.
-- A mismatch fails closed rather than inventing a relation or an access rule.
do $$
declare
  v_cache regclass := to_regclass('public.voice_transcriptions');
  v_cache_kind "char";
  v_cache_message_type text;
  v_note_message_type text;
  v_policy record;
begin
  if to_regclass('public.voice_notes') is null then
    raise exception using
      errcode = 'undefined_table',
      message = 'RC2 preflight blocked: public.voice_notes is required for transcript-cache authorization.';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into v_note_message_type
    from pg_attribute a
   where a.attrelid = 'public.voice_notes'::regclass
     and a.attname = 'message_id'
     and a.attnum > 0
     and not a.attisdropped;

  if v_note_message_type is null then
    raise exception using
      errcode = 'undefined_column',
      message = 'RC2 preflight blocked: public.voice_notes.message_id is required for transcript-cache authorization.';
  end if;

  if v_cache is null then
    raise notice 'RC2 transcript-cache hardening skipped: public.voice_transcriptions is not present in this authority schema.';
    return;
  end if;

  select c.relkind
    into v_cache_kind
    from pg_class c
   where c.oid = v_cache;

  if v_cache_kind not in ('r', 'p') then
    raise exception using
      errcode = 'wrong_object_type',
      message = 'RC2 preflight blocked: public.voice_transcriptions must be a table, not a view or other relation.';
  end if;

  select format_type(a.atttypid, a.atttypmod)
    into v_cache_message_type
    from pg_attribute a
   where a.attrelid = v_cache
     and a.attname = 'message_id'
     and a.attnum > 0
     and not a.attisdropped;

  if v_cache_message_type is null or v_cache_message_type <> v_note_message_type then
    raise exception using
      errcode = 'datatype_mismatch',
      message = format(
        'RC2 preflight blocked: public.voice_transcriptions.message_id must exist and match public.voice_notes.message_id (cache=%s, voice_note=%s).',
        coalesce(v_cache_message_type, '<missing>'),
        v_note_message_type
      );
  end if;

  execute 'alter table public.voice_transcriptions enable row level security';

  for v_policy in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'voice_transcriptions'
  loop
    execute format('drop policy if exists %I on public.voice_transcriptions', v_policy.policyname);
  end loop;

  execute 'revoke all on table public.voice_transcriptions from public';
  execute 'revoke all on table public.voice_transcriptions from anon, authenticated';
  execute 'grant select on table public.voice_transcriptions to authenticated';
  execute $policy$
    create policy "Voice transcription cache participants can read"
      on public.voice_transcriptions
      for select
      to authenticated
      using (
        exists (
          select 1
            from public.voice_notes vn
           where vn.message_id = voice_transcriptions.message_id
        )
      )
  $policy$;
end;
$$;
