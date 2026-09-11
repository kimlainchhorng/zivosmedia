-- Enable only reviewed main-app subscriptions; do not publish every vertical's tables.
-- The existing permissive post policy ignored visibility. This restrictive layer
-- protects drafts, hidden posts, friend-only posts and excluded viewers on REST
-- as well as Realtime without rewriting ownership or content.
create policy media_post_visibility_boundary on public.user_posts
as restrictive for select to anon, authenticated using (
  user_id = (select auth.uid()) or public.is_admin((select auth.uid())) or (
    hidden_at is null and is_published = true
    and ((select auth.uid()) is null or not ((select auth.uid()) = any(coalesce(visibility_hidden_from,'{}'::uuid[]))))
    and (
      visibility in ('public','everyone') or (
        visibility = 'friends' and exists (
          select 1 from public.friendships f where f.status='accepted'
          and ((f.user_id=user_posts.user_id and f.friend_id=(select auth.uid()))
            or (f.friend_id=user_posts.user_id and f.user_id=(select auth.uid())))
        )
      )
    )
  )
);
do $$
declare t text;
begin
  foreach t in array array['user_posts','stories','story_views','friendships'] loop
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I',t);
    end if;
  end loop;
end $$;
notify pgrst, 'reload schema';
