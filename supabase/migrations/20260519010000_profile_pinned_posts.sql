-- Instagram-style pinned posts on profile: a user can pin up to 3 of their
-- own posts to the top of their profile grid.
--
-- The previous migration (20260503184000_user_posts_is_pinned.sql) created
-- a partial unique index allowing exactly ONE pin per user. We replace that
-- with a count-based trigger that allows up to 3, and add a `pinned_at`
-- timestamp so pinned posts have a stable, user-controllable order.

-- 1. Add pinned_at; backfill for existing pinned rows so order is deterministic.
alter table public.user_posts
  add column if not exists pinned_at timestamptz;

update public.user_posts
  set pinned_at = coalesce(pinned_at, created_at)
  where is_pinned and pinned_at is null;

-- 2. Drop the old 1-pin partial unique index and replace with a 3-pin trigger.
drop index if exists public.idx_user_posts_one_pin_per_user;

create or replace function public.enforce_user_posts_pin_limit()
returns trigger language plpgsql as $$
declare
  pin_count integer;
begin
  -- Only check on transitions that could push the count above 3.
  if new.is_pinned is true and (tg_op = 'INSERT' or old.is_pinned is distinct from true) then
    select count(*) into pin_count
      from public.user_posts
      where user_id = new.user_id
        and is_pinned is true
        and id <> new.id;
    if pin_count >= 3 then
      raise exception 'A user can pin at most 3 posts to their profile'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Keep pinned_at in sync with the boolean so the client never has to set both.
  if new.is_pinned is true and new.pinned_at is null then
    new.pinned_at := now();
  elsif new.is_pinned is not true then
    new.pinned_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_user_posts_pin_limit on public.user_posts;
create trigger trg_user_posts_pin_limit
  before insert or update of is_pinned on public.user_posts
  for each row execute function public.enforce_user_posts_pin_limit();

-- 3. Helpful index for "pinned posts for this profile" lookups.
create index if not exists idx_user_posts_pinned
  on public.user_posts (user_id, pinned_at desc)
  where is_pinned is true;

comment on column public.user_posts.is_pinned is
  'When true, this post floats above non-pinned posts on the author profile grid. Capped at 3 per user.';
comment on column public.user_posts.pinned_at is
  'Timestamp of the pin action; used to order pinned posts left-to-right on the grid.';
