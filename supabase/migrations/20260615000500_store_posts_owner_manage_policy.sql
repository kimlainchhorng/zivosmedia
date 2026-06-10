-- Store owners can view (incl. unpublished), edit, and delete their own posts.
-- Previously only admins could manage and SELECT was published-only, so owners
-- couldn't see their drafts or manage what they created from the Marketing →
-- Posts tab.
create policy "Store-profile owners manage their posts"
on public.store_posts for all to authenticated
using (public.user_owns_store(store_id, (select auth.uid())))
with check (public.user_owns_store(store_id, (select auth.uid())));
