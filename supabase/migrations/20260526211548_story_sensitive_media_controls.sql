-- Story 18+ safety workflow.
-- Extends sensitive-media reporting to stories and story comments so reported
-- sexual/18+ content is hidden, queued for admin review, and isolated for the
-- reporter while the safety team reviews it.

alter table public.stories
  add column if not exists is_sensitive boolean not null default false,
  add column if not exists sensitive_reason text,
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

alter table public.story_comments
  add column if not exists hidden_at timestamptz,
  add column if not exists hidden_by uuid references auth.users(id) on delete set null,
  add column if not exists hidden_reason text,
  add column if not exists sensitive_report_count integer not null default 0;

create index if not exists idx_stories_visible_active_created
  on public.stories (expires_at, created_at desc)
  where hidden_at is null;

create index if not exists idx_stories_sensitive_created
  on public.stories (created_at desc)
  where is_sensitive = true or hidden_at is not null;

create index if not exists idx_story_comments_visible_story_created
  on public.story_comments (story_id, created_at)
  where hidden_at is null;

create table if not exists public.story_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(reason) <= 200),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (reporter_id, story_id)
);

create index if not exists idx_story_reports_status_created
  on public.story_reports (status, created_at desc);

create index if not exists idx_story_reports_story
  on public.story_reports (story_id);

alter table public.story_reports enable row level security;

drop policy if exists "story_reports_insert_own" on public.story_reports;
create policy "story_reports_insert_own"
  on public.story_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and owner_id <> auth.uid()
    and exists (
      select 1
      from public.stories s
      where s.id = story_reports.story_id
        and s.user_id = story_reports.owner_id
        and s.expires_at > now()
    )
  );

drop policy if exists "story_reports_select_own" on public.story_reports;
create policy "story_reports_select_own"
  on public.story_reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Admins can read story reports" on public.story_reports;
create policy "Admins can read story reports"
  on public.story_reports for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can update story reports" on public.story_reports;
create policy "Admins can update story reports"
  on public.story_reports for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select, insert, update on public.story_reports to authenticated;

create table if not exists public.story_comment_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  comment_id uuid not null references public.story_comments(id) on delete cascade,
  story_id uuid not null,
  comment_author_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (length(reason) <= 200),
  description text,
  status text not null default 'pending' check (status in ('pending', 'reviewed', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  unique (reporter_id, comment_id)
);

create index if not exists idx_story_comment_reports_status_created
  on public.story_comment_reports (status, created_at desc);

create index if not exists idx_story_comment_reports_comment
  on public.story_comment_reports (comment_id);

create index if not exists idx_story_comment_reports_story_created
  on public.story_comment_reports (story_id, created_at desc);

alter table public.story_comment_reports enable row level security;

drop policy if exists "story_comment_reports_insert_own" on public.story_comment_reports;
create policy "story_comment_reports_insert_own"
  on public.story_comment_reports for insert
  to authenticated
  with check (
    reporter_id = auth.uid()
    and comment_author_id <> auth.uid()
    and exists (
      select 1
      from public.story_comments sc
      where sc.id = story_comment_reports.comment_id
        and sc.story_id = story_comment_reports.story_id
        and sc.user_id = story_comment_reports.comment_author_id
    )
  );

drop policy if exists "story_comment_reports_select_own" on public.story_comment_reports;
create policy "story_comment_reports_select_own"
  on public.story_comment_reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "Admins can read story comment reports" on public.story_comment_reports;
create policy "Admins can read story comment reports"
  on public.story_comment_reports for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Admins can update story comment reports" on public.story_comment_reports;
create policy "Admins can update story comment reports"
  on public.story_comment_reports for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select, insert, update on public.story_comment_reports to authenticated;

drop policy if exists "Anyone can read active stories" on public.stories;
drop policy if exists "Anyone can read visible active stories" on public.stories;
create policy "Anyone can read visible active stories"
  on public.stories for select
  using (
    expires_at > now()
    and (
      hidden_at is null
      or user_id = auth.uid()
      or hidden_by = auth.uid()
    )
  );

drop policy if exists "Admins can update story safety" on public.stories;
create policy "Admins can update story safety"
  on public.stories for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated can see story comments" on public.story_comments;
drop policy if exists "Authenticated can see visible story comments" on public.story_comments;
create policy "Authenticated can see visible story comments"
  on public.story_comments for select
  to authenticated
  using (
    hidden_at is null
    or user_id = auth.uid()
    or hidden_by = auth.uid()
  );

drop policy if exists "Admins can update story comment safety" on public.story_comments;
create policy "Admins can update story comment safety"
  on public.story_comments for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select, insert, update on public.stories to authenticated;
grant select, insert, update on public.story_comments to authenticated;

create schema if not exists private;

create or replace function private.hide_story_from_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  report_text text := coalesce(new.reason, '');
  sensitive_report boolean := report_text ~* '(nudity|sexual|non[- ]?consensual|minor|exploitation|intimate)';
  severe_report boolean := report_text ~* '(content involving minors|minor|non[- ]?consensual|exploitation)';
  v_owner_id uuid;
begin
  select user_id
  into v_owner_id
  from public.stories
  where id = new.story_id;

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
    'story',
    new.story_id::text,
    new.reporter_id,
    sensitive_report,
    report_text,
    case when severe_report then 'high' when sensitive_report then 'medium' else 'low' end,
    'pending',
    case when severe_report then 95 when sensitive_report then 70 else 40 end,
    case when sensitive_report then 'sensitive_content' else 'story_report' end
  );

  if sensitive_report then
    update public.stories
    set
      is_sensitive = true,
      sensitive_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
      hidden_at = coalesce(hidden_at, now()),
      hidden_by = coalesce(hidden_by, new.reporter_id),
      hidden_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
      sensitive_report_count = coalesce(sensitive_report_count, 0) + 1
    where id = new.story_id;

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
        'sensitive_story_review',
        'Story under review',
        'Your story was reported for sensitive content and hidden while our safety team reviews it.',
        '/stories/' || new.story_id::text,
        'queued',
        false,
        jsonb_build_object(
          'notification_type', 'sensitive_story_review',
          'story_id', new.story_id::text,
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

drop trigger if exists hide_story_after_report on public.story_reports;
create trigger hide_story_after_report
  after insert on public.story_reports
  for each row
  execute function private.hide_story_from_report();

revoke all on function private.hide_story_from_report() from public, anon, authenticated;

create or replace function private.hide_story_comment_from_report()
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
  v_story_id uuid;
begin
  select user_id, story_id
  into v_comment_author_id, v_story_id
  from public.story_comments
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
    'story_comment',
    new.comment_id::text,
    new.reporter_id,
    sensitive_report,
    report_text,
    case when severe_report then 'high' when sensitive_report then 'medium' else 'low' end,
    'pending',
    case when severe_report then 95 when sensitive_report then 70 else 40 end,
    case when sensitive_report then 'sensitive_content' else 'story_comment_report' end
  );

  if sensitive_report then
    update public.story_comments
    set
      hidden_at = coalesce(hidden_at, now()),
      hidden_by = coalesce(hidden_by, new.reporter_id),
      hidden_reason = case when severe_report then 'severe_sensitive_report' else 'reported_sensitive' end,
      sensitive_report_count = coalesce(sensitive_report_count, 0) + 1
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
        'sensitive_story_comment_review',
        'Story comment under review',
        'Your story comment was reported for sensitive content and hidden while our safety team reviews it.',
        '/stories/' || coalesce(v_story_id, new.story_id)::text,
        'queued',
        false,
        jsonb_build_object(
          'notification_type', 'sensitive_story_comment_review',
          'story_id', coalesce(v_story_id, new.story_id)::text,
          'comment_id', new.comment_id::text,
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

drop trigger if exists hide_story_comment_after_report on public.story_comment_reports;
create trigger hide_story_comment_after_report
  after insert on public.story_comment_reports
  for each row
  execute function private.hide_story_comment_from_report();

revoke all on function private.hide_story_comment_from_report() from public, anon, authenticated;
