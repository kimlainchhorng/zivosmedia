-- Sensitive media controls for social posts and chats.
-- Viewers can keep 18+ / sexual media blurred by default, while reports
-- immediately mark posts, comments, direct messages, and group messages for review.

alter table public.privacy_settings
  add column if not exists blur_sensitive_media boolean not null default true;

alter table public.user_posts
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists sensitive_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

alter table public.post_comments
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

alter table public.direct_messages
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

alter table public.group_messages
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

alter table public.post_reports
  add column if not exists post_source text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'post_reports_post_source_check'
      and conrelid = 'public.post_reports'::regclass
  ) then
    alter table public.post_reports
      add constraint post_reports_post_source_check
      check (post_source in ('store', 'user'));
  end if;
end $$;

create index if not exists idx_user_posts_sensitive
  on public.user_posts (created_at desc)
  where is_sensitive = true;

create index if not exists idx_post_comments_visible_post_created
  on public.post_comments (post_id, post_source, created_at)
  where hidden_at is null;

create index if not exists idx_direct_messages_visible_pair_created
  on public.direct_messages (
    least(sender_id, receiver_id),
    greatest(sender_id, receiver_id),
    created_at desc
  )
  where hidden_at is null;

create index if not exists idx_group_messages_visible_group_created
  on public.group_messages (group_id, created_at desc)
  where hidden_at is null;

create table if not exists public.comment_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.post_comments(id) on delete cascade,
  post_id text not null,
  post_source text not null default 'user' check (post_source in ('store', 'user')),
  reason text not null check (length(reason) <= 200),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (reporter_id, comment_id)
);

create index if not exists idx_comment_reports_status_created
  on public.comment_reports (status, created_at desc);

create index if not exists idx_comment_reports_comment
  on public.comment_reports (comment_id);

alter table public.comment_reports enable row level security;

drop policy if exists "comment_reports_insert_own" on public.comment_reports;
create policy "comment_reports_insert_own"
  on public.comment_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "comment_reports_select_own" on public.comment_reports;
create policy "comment_reports_select_own"
  on public.comment_reports for select
  to authenticated
  using (reporter_id = auth.uid());

grant select, insert on public.comment_reports to authenticated;

create table if not exists public.chat_message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  receiver_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(reason) <= 200),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (reporter_id, message_id)
);

create index if not exists idx_chat_message_reports_status_created
  on public.chat_message_reports (status, created_at desc);

create index if not exists idx_chat_message_reports_message
  on public.chat_message_reports (message_id);

alter table public.chat_message_reports enable row level security;

drop policy if exists "chat_message_reports_insert_own" on public.chat_message_reports;
create policy "chat_message_reports_insert_own"
  on public.chat_message_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and (
      receiver_id = auth.uid()
      or sender_id = auth.uid()
    )
  );

drop policy if exists "chat_message_reports_select_own" on public.chat_message_reports;
create policy "chat_message_reports_select_own"
  on public.chat_message_reports for select
  to authenticated
  using (reporter_id = auth.uid());

grant select, insert on public.chat_message_reports to authenticated;

create table if not exists public.group_message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  message_id uuid not null references public.group_messages(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(reason) <= 200),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (reporter_id, message_id)
);

create index if not exists idx_group_message_reports_status_created
  on public.group_message_reports (status, created_at desc);

create index if not exists idx_group_message_reports_message
  on public.group_message_reports (message_id);

create index if not exists idx_group_message_reports_group_created
  on public.group_message_reports (group_id, created_at desc);

alter table public.group_message_reports enable row level security;

drop policy if exists "group_message_reports_insert_own" on public.group_message_reports;
create policy "group_message_reports_insert_own"
  on public.group_message_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and sender_id <> auth.uid()
    and exists (
      select 1
      from public.group_messages gm
      join public.chat_group_members cgm
        on cgm.group_id = gm.group_id
      where gm.id = group_message_reports.message_id
        and gm.group_id = group_message_reports.group_id
        and gm.sender_id = group_message_reports.sender_id
        and cgm.user_id = auth.uid()
    )
  );

drop policy if exists "group_message_reports_select_own" on public.group_message_reports;
create policy "group_message_reports_select_own"
  on public.group_message_reports for select
  to authenticated
  using (reporter_id = auth.uid());

grant select, insert on public.group_message_reports to authenticated;

drop policy if exists "Anyone can read comments" on public.post_comments;
drop policy if exists "Comments publicly readable" on public.post_comments;
drop policy if exists "Visible comments publicly readable" on public.post_comments;
create policy "Visible comments publicly readable"
  on public.post_comments for select
  using (
    hidden_at is null
    or user_id = auth.uid()
    or hidden_by = auth.uid()
  );

drop policy if exists "Members can view group messages" on public.group_messages;
create policy "Members can view group messages"
  on public.group_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.chat_group_members cgm
      where cgm.group_id = group_messages.group_id
        and cgm.user_id = auth.uid()
    )
    and (
      hidden_at is null
      or sender_id = auth.uid()
      or hidden_by = auth.uid()
    )
  );

create schema if not exists private;

create or replace function private.mark_user_post_sensitive_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_text text := coalesce(new.reason, '');
  severe_report boolean := report_text ~* '(content involving minors|minor|non[- ]?consensual|exploitation)';
  v_post_id uuid;
  v_owner_id uuid;
begin
  if coalesce(new.post_source, 'user') = 'user'
    and report_text ~* '(nudity|sexual|non[- ]?consensual|minor|exploitation|intimate)'
  then
    begin
      v_post_id := new.post_id::uuid;

      select user_id
      into v_owner_id
      from public.user_posts
      where id = v_post_id;

      update public.user_posts
      set
        is_sensitive = true,
        sensitive_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
        sensitive_report_count = coalesce(sensitive_report_count, 0) + 1,
        comments_enabled = case when severe_report then false else comments_enabled end,
        sharing_enabled = case when severe_report then false else sharing_enabled end,
        updated_at = now()
      where id = v_post_id;

      insert into public.content_moderation_queue (
        content_type,
        content_id,
        reported_by,
        auto_flagged,
        reason,
        severity,
        status,
        priority,
        ai_category
      ) values (
        'post',
        v_post_id::text,
        new.reporter_id,
        true,
        report_text,
        case when severe_report then 'high' else 'medium' end,
        'pending',
        case when severe_report then 95 else 70 end,
        'sensitive_content'
      );

      if v_owner_id is not null and v_owner_id <> new.reporter_id then
        insert into public.user_safety_actions (
          user_id,
          target_user_id,
          action
        ) values (
          new.reporter_id,
          v_owner_id,
          'block'
        )
        on conflict (user_id, target_user_id, action) do nothing;

        insert into public.notifications (
          user_id,
          channel,
          category,
          template,
          title,
          body,
          action_url,
          status,
          is_read,
          metadata
        ) values (
          v_owner_id,
          'in_app',
          'account',
          'sensitive_content_review',
          'Post under review',
          'Your post was reported for sensitive content. We blurred it while our safety team reviews it.',
          '/feed?post=u-' || v_post_id::text,
          'queued',
          false,
          jsonb_build_object(
            'notification_type', 'sensitive_content_review',
            'post_id', v_post_id::text,
            'post_source', 'user',
            'report_id', new.id::text,
            'severity', case when severe_report then 'high' else 'medium' end,
            'requires_review', true
          )
        );
      end if;
    exception
      when invalid_text_representation then
        null;
    end;
  end if;

  return new;
end;
$$;

drop trigger if exists mark_user_post_sensitive_after_report on public.post_reports;
drop function if exists public.mark_user_post_sensitive_from_report();
create trigger mark_user_post_sensitive_after_report
  after insert on public.post_reports
  for each row
  execute function private.mark_user_post_sensitive_from_report();

revoke all on function private.mark_user_post_sensitive_from_report() from public, anon, authenticated;

create or replace function private.hide_post_comment_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_text text := coalesce(new.reason, '');
  sensitive_report boolean := report_text ~* '(nudity|sexual|non[- ]?consensual|minor|exploitation|intimate)';
  severe_report boolean := report_text ~* '(content involving minors|minor|non[- ]?consensual|exploitation)';
  v_comment_author_id uuid;
begin
  select user_id
  into v_comment_author_id
  from public.post_comments
  where id = new.comment_id;

  insert into public.content_moderation_queue (
    content_type,
    content_id,
    reported_by,
    auto_flagged,
    reason,
    severity,
    status,
    priority,
    ai_category
  ) values (
    'comment',
    new.comment_id::text,
    new.reporter_id,
    sensitive_report,
    report_text,
    case when severe_report then 'high' when sensitive_report then 'medium' else 'low' end,
    'pending',
    case when severe_report then 95 when sensitive_report then 70 else 40 end,
    case when sensitive_report then 'sensitive_content' else 'comment_report' end
  );

  if sensitive_report then
    update public.post_comments
    set
      hidden_at = coalesce(hidden_at, now()),
      hidden_by = coalesce(hidden_by, new.reporter_id),
      hidden_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
      sensitive_report_count = coalesce(sensitive_report_count, 0) + 1,
      updated_at = now()
    where id = new.comment_id;

    if v_comment_author_id is not null and v_comment_author_id <> new.reporter_id then
      insert into public.user_safety_actions (
        user_id,
        target_user_id,
        action
      ) values (
        new.reporter_id,
        v_comment_author_id,
        'block'
      )
      on conflict (user_id, target_user_id, action) do nothing;

      insert into public.notifications (
        user_id,
        channel,
        category,
        template,
        title,
        body,
        action_url,
        status,
        is_read,
        metadata
      ) values (
        v_comment_author_id,
        'in_app',
        'account',
        'sensitive_comment_review',
        'Comment under review',
        'Your comment was reported for sensitive content and hidden while our safety team reviews it.',
        '/feed?post=' || case when new.post_source = 'user' then 'u-' else 's-' end || new.post_id,
        'queued',
        false,
        jsonb_build_object(
          'notification_type', 'sensitive_comment_review',
          'comment_id', new.comment_id::text,
          'post_id', new.post_id,
          'post_source', new.post_source,
          'report_id', new.id::text,
          'severity', case when severe_report then 'high' else 'medium' end,
          'requires_review', true
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hide_post_comment_after_report on public.comment_reports;
create trigger hide_post_comment_after_report
  after insert on public.comment_reports
  for each row
  execute function private.hide_post_comment_from_report();

revoke all on function private.hide_post_comment_from_report() from public, anon, authenticated;

create or replace function private.hide_chat_message_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_text text := coalesce(new.reason, '');
  sensitive_report boolean := report_text ~* '(nudity|sexual|non[- ]?consensual|minor|exploitation|intimate)';
  severe_report boolean := report_text ~* '(content involving minors|minor|non[- ]?consensual|exploitation)';
  v_sender_id uuid;
begin
  select sender_id
  into v_sender_id
  from public.direct_messages
  where id = new.message_id;

  insert into public.content_moderation_queue (
    content_type,
    content_id,
    reported_by,
    auto_flagged,
    reason,
    severity,
    status,
    priority,
    ai_category
  ) values (
    'direct_message',
    new.message_id::text,
    new.reporter_id,
    sensitive_report,
    report_text,
    case when severe_report then 'high' when sensitive_report then 'medium' else 'low' end,
    'pending',
    case when severe_report then 95 when sensitive_report then 70 else 40 end,
    case when sensitive_report then 'sensitive_content' else 'message_report' end
  );

  if sensitive_report then
    update public.direct_messages
    set
      hidden_at = coalesce(hidden_at, now()),
      hidden_by = coalesce(hidden_by, new.reporter_id),
      hidden_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
      sensitive_report_count = coalesce(sensitive_report_count, 0) + 1
    where id = new.message_id;

    if v_sender_id is not null and v_sender_id <> new.reporter_id then
      insert into public.user_safety_actions (
        user_id,
        target_user_id,
        action
      ) values (
        new.reporter_id,
        v_sender_id,
        'block'
      )
      on conflict (user_id, target_user_id, action) do nothing;

      insert into public.notifications (
        user_id,
        channel,
        category,
        template,
        title,
        body,
        action_url,
        status,
        is_read,
        metadata
      ) values (
        v_sender_id,
        'in_app',
        'account',
        'sensitive_message_review',
        'Message under review',
        'Your message was reported for sensitive content and hidden while our safety team reviews it.',
        '/chat',
        'queued',
        false,
        jsonb_build_object(
          'notification_type', 'sensitive_message_review',
          'message_id', new.message_id::text,
          'report_id', new.id::text,
          'severity', case when severe_report then 'high' else 'medium' end,
          'requires_review', true
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hide_chat_message_after_report on public.chat_message_reports;
create trigger hide_chat_message_after_report
  after insert on public.chat_message_reports
  for each row
  execute function private.hide_chat_message_from_report();

revoke all on function private.hide_chat_message_from_report() from public, anon, authenticated;

create or replace function private.hide_group_message_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_text text := coalesce(new.reason, '');
  sensitive_report boolean := report_text ~* '(nudity|sexual|non[- ]?consensual|minor|exploitation|intimate)';
  severe_report boolean := report_text ~* '(content involving minors|minor|non[- ]?consensual|exploitation)';
  v_sender_id uuid;
begin
  select sender_id
  into v_sender_id
  from public.group_messages
  where id = new.message_id
    and group_id = new.group_id;

  insert into public.content_moderation_queue (
    content_type,
    content_id,
    reported_by,
    auto_flagged,
    reason,
    severity,
    status,
    priority,
    ai_category
  ) values (
    'group_message',
    new.message_id::text,
    new.reporter_id,
    sensitive_report,
    report_text,
    case when severe_report then 'high' when sensitive_report then 'medium' else 'low' end,
    'pending',
    case when severe_report then 95 when sensitive_report then 70 else 40 end,
    case when sensitive_report then 'sensitive_content' else 'group_message_report' end
  );

  if sensitive_report then
    update public.group_messages
    set
      hidden_at = coalesce(hidden_at, now()),
      hidden_by = coalesce(hidden_by, new.reporter_id),
      hidden_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
      sensitive_report_count = coalesce(sensitive_report_count, 0) + 1
    where id = new.message_id
      and group_id = new.group_id;

    if v_sender_id is not null and v_sender_id <> new.reporter_id then
      insert into public.user_safety_actions (
        user_id,
        target_user_id,
        action
      ) values (
        new.reporter_id,
        v_sender_id,
        'block'
      )
      on conflict (user_id, target_user_id, action) do nothing;

      insert into public.notifications (
        user_id,
        channel,
        category,
        template,
        title,
        body,
        action_url,
        status,
        is_read,
        metadata
      ) values (
        v_sender_id,
        'in_app',
        'account',
        'sensitive_group_message_review',
        'Group message under review',
        'Your group message was reported for sensitive content and hidden while our safety team reviews it.',
        '/chat?group=' || new.group_id::text,
        'queued',
        false,
        jsonb_build_object(
          'notification_type', 'sensitive_group_message_review',
          'group_id', new.group_id::text,
          'message_id', new.message_id::text,
          'report_id', new.id::text,
          'severity', case when severe_report then 'high' else 'medium' end,
          'requires_review', true
        )
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists hide_group_message_after_report on public.group_message_reports;
create trigger hide_group_message_after_report
  after insert on public.group_message_reports
  for each row
  execute function private.hide_group_message_from_report();

revoke all on function private.hide_group_message_from_report() from public, anon, authenticated;
