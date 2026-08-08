-- Expose `username` on public_profiles, which three social surfaces already ask for.
--
-- WHY
-- The view selects id, user_id, full_name, avatar_url. Three components select
-- `username` from it as well, and PostgREST rejects an entire request over one
-- unknown column — so those queries returned nothing at all:
--
--   ChannelPostCard      author name and avatar never loaded on channel posts
--   ChannelPostComments  comment authors were blank, and the profile link fell
--                        back to a raw user_id instead of the @handle
--   LikedByModal         the liked-by list rendered empty, and its search box
--                        filters on name AND username, so search was dead too
--
-- WHY ADD IT RATHER THAN DROP IT FROM THE QUERIES
-- `username` is the public handle: it is already in the URL of every profile
-- page (`/u/:username`), so exposing it here reveals nothing new. Dropping it
-- from the callers would instead degrade three working features — profile
-- links would point at opaque user ids and username search would stop matching.
--
-- The view's purpose is unchanged: it hides OF creators from in-app discovery.
-- That WHERE clause is preserved exactly; only the projection grows.

begin;

create or replace view public.public_profiles as
  select p.id, p.user_id, p.full_name, p.avatar_url, p.username
  from public.profiles p
  where p.is_of_creator = false;

-- Re-asserted because CREATE OR REPLACE VIEW resets neither of these reliably
-- across environments, and both were set deliberately: security_invoker keeps
-- the caller's RLS in force (20260522012300), and the grant is what makes the
-- view readable at all (20260507200000).
alter view public.public_profiles set (security_invoker = true);
grant select on public.public_profiles to anon, authenticated;

commit;
