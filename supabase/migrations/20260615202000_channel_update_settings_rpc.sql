-- Validated channel settings update for Telegram-style channel management.
-- Owner/admin only; logs changed fields to channel_admin_log.
create or replace function public.channel_update_settings(
  p_channel_id uuid,
  p_name text default null,
  p_description text default null,
  p_avatar_url text default null,
  p_banner_url text default null,
  p_is_public boolean default null,
  p_channel_join_approval_required boolean default null,
  p_restrict_saving_content boolean default null,
  p_reaction_policy text default null,
  p_slow_mode_seconds integer default null,
  p_hide_members boolean default null,
  p_topics_enabled boolean default null,
  p_wallpaper_style text default null,
  p_subscriber_permissions jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_channel public.channels%rowtype;
  v_changes jsonb := '{}'::jsonb;
begin
  if v_actor is null then
    raise exception 'Sign in required';
  end if;

  if not public.is_channel_manager(p_channel_id, v_actor) then
    raise exception 'Only channel owners and admins can update settings';
  end if;

  select * into v_channel
  from public.channels
  where id = p_channel_id;

  if not found then
    raise exception 'Channel not found';
  end if;

  if p_name is not null then
    if length(trim(p_name)) = 0 then
      raise exception 'Channel name is required';
    end if;
    if length(trim(p_name)) > 80 then
      raise exception 'Channel name must be 80 characters or fewer';
    end if;
  end if;

  if p_description is not null and length(p_description) > 240 then
    raise exception 'Description must be 240 characters or fewer';
  end if;

  if p_reaction_policy is not null and p_reaction_policy not in ('all', 'some', 'none') then
    raise exception 'Invalid reaction policy';
  end if;

  if p_slow_mode_seconds is not null and (p_slow_mode_seconds < 0 or p_slow_mode_seconds > 3600) then
    raise exception 'Slow mode must be between 0 and 3600 seconds';
  end if;

  if p_wallpaper_style is not null and p_wallpaper_style not in ('green', 'blue', 'pink', 'none') then
    raise exception 'Invalid wallpaper style';
  end if;

  update public.channels
  set
    name = coalesce(nullif(trim(p_name), ''), name),
    description = case when p_description is null then description else nullif(trim(p_description), '') end,
    avatar_url = coalesce(p_avatar_url, avatar_url),
    banner_url = coalesce(p_banner_url, banner_url),
    is_public = coalesce(p_is_public, is_public),
    channel_join_approval_required = coalesce(p_channel_join_approval_required, channel_join_approval_required),
    restrict_saving_content = coalesce(p_restrict_saving_content, restrict_saving_content),
    reaction_policy = coalesce(p_reaction_policy::public.channel_reaction_policy, reaction_policy),
    slow_mode_seconds = coalesce(p_slow_mode_seconds, slow_mode_seconds),
    hide_members = coalesce(p_hide_members, hide_members),
    topics_enabled = coalesce(p_topics_enabled, topics_enabled),
    wallpaper_style = coalesce(p_wallpaper_style::public.channel_wallpaper_style, wallpaper_style),
    subscriber_permissions = coalesce(p_subscriber_permissions, subscriber_permissions),
    updated_at = now()
  where id = p_channel_id
  returning * into v_channel;

  if p_name is not null then
    v_changes := v_changes || jsonb_build_object('name', v_channel.name);
  end if;
  if p_description is not null then
    v_changes := v_changes || jsonb_build_object('description', v_channel.description);
  end if;
  if p_avatar_url is not null then
    v_changes := v_changes || jsonb_build_object('avatar_url', v_channel.avatar_url);
  end if;
  if p_banner_url is not null then
    v_changes := v_changes || jsonb_build_object('banner_url', v_channel.banner_url);
  end if;
  if p_is_public is not null then
    v_changes := v_changes || jsonb_build_object('is_public', v_channel.is_public);
  end if;
  if p_channel_join_approval_required is not null then
    v_changes := v_changes || jsonb_build_object('channel_join_approval_required', v_channel.channel_join_approval_required);
  end if;
  if p_restrict_saving_content is not null then
    v_changes := v_changes || jsonb_build_object('restrict_saving_content', v_channel.restrict_saving_content);
  end if;
  if p_reaction_policy is not null then
    v_changes := v_changes || jsonb_build_object('reaction_policy', v_channel.reaction_policy);
  end if;
  if p_slow_mode_seconds is not null then
    v_changes := v_changes || jsonb_build_object('slow_mode_seconds', v_channel.slow_mode_seconds);
  end if;
  if p_hide_members is not null then
    v_changes := v_changes || jsonb_build_object('hide_members', v_channel.hide_members);
  end if;
  if p_topics_enabled is not null then
    v_changes := v_changes || jsonb_build_object('topics_enabled', v_channel.topics_enabled);
  end if;
  if p_wallpaper_style is not null then
    v_changes := v_changes || jsonb_build_object('wallpaper_style', v_channel.wallpaper_style);
  end if;
  if p_subscriber_permissions is not null then
    v_changes := v_changes || jsonb_build_object('subscriber_permissions', v_channel.subscriber_permissions);
  end if;

  if v_changes <> '{}'::jsonb then
    insert into public.channel_admin_log (channel_id, actor_id, action, meta)
    values (p_channel_id, v_actor, 'settings_changed', v_changes);
  end if;

  return to_jsonb(v_channel);
end;
$$;

grant execute on function public.channel_update_settings(
  uuid, text, text, text, text, boolean, boolean, boolean, text, integer, boolean, boolean, text, jsonb
) to authenticated;
