-- Enable realtime broadcasts on post_comments so viewers of a post see new
-- comments arrive without having to close and reopen the comment sheet.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
