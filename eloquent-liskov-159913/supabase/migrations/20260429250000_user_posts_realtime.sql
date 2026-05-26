-- Enable realtime broadcasts for user_posts INSERTs so the feed page can
-- show a "N new posts — tap to refresh" banner without polling.
-- Wrapped in DO blocks because adding a table to a publication errors if the
-- table is already a member, and we want the migration to be idempotent.

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_posts;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL; -- publication missing in some envs (CI)
END $$;
