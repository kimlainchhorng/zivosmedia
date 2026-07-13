create or replace function public.get_my_profile()
returns table (
  id uuid,
  user_id uuid,
  username text,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  is_verified boolean,
  cover_url text,
  cover_position integer,
  status text,
  bio text,
  social_facebook text,
  social_onlyfans text,
  social_instagram text,
  social_tiktok text,
  social_snapchat text,
  social_x text,
  social_linkedin text,
  social_telegram text,
  social_links_visible boolean,
  comment_control text,
  hide_like_counts boolean,
  allow_mentions boolean,
  allow_sharing boolean,
  allow_friend_requests boolean,
  hide_from_drivers boolean,
  profile_visibility text,
  profile_completion_score integer,
  has_username boolean,
  has_avatar boolean,
  has_cover boolean,
  has_bio boolean,
  last_profile_polished_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text := coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    nullif(current_setting('request.jwt.claim.email', true), '')
  );
begin
  if current_user_id is null then
    return;
  end if;

  insert into public.profiles (user_id, created_at, updated_at)
  values (current_user_id, now(), now())
  on conflict on constraint profiles_user_id_key do nothing;

  return query
  select
    profile.id,
    profile.user_id,
    null::text as username,
    profile.full_name,
    current_email as email,
    profile.phone,
    null::text as avatar_url,
    false::boolean as is_verified,
    null::text as cover_url,
    null::integer as cover_position,
    null::text as status,
    null::text as bio,
    null::text as social_facebook,
    null::text as social_onlyfans,
    null::text as social_instagram,
    null::text as social_tiktok,
    null::text as social_snapchat,
    null::text as social_x,
    null::text as social_linkedin,
    null::text as social_telegram,
    false::boolean as social_links_visible,
    'everyone'::text as comment_control,
    false::boolean as hide_like_counts,
    true::boolean as allow_mentions,
    true::boolean as allow_sharing,
    true::boolean as allow_friend_requests,
    false::boolean as hide_from_drivers,
    'public'::text as profile_visibility,
    case
      when profile.full_name is not null and profile.phone is not null then 40
      when profile.full_name is not null or profile.phone is not null then 20
      else 0
    end::integer as profile_completion_score,
    false::boolean as has_username,
    false::boolean as has_avatar,
    false::boolean as has_cover,
    false::boolean as has_bio,
    null::timestamptz as last_profile_polished_at,
    profile.created_at,
    profile.updated_at
  from public.profiles as profile
  where profile.user_id = current_user_id
  limit 1;
end;
$$;

revoke all on function public.get_my_profile() from public;
revoke all on function public.get_my_profile() from anon;
grant execute on function public.get_my_profile() to authenticated;
