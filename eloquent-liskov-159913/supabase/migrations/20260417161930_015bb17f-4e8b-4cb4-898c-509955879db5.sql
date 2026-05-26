-- Grant table-level access so RLS policies can apply for anon/authenticated readers.
-- Without these grants, REST queries return [] silently even when RLS would allow rows.
GRANT SELECT ON public.live_streams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.live_streams TO authenticated;

-- Also ensure related tables used by the watcher are readable
GRANT SELECT ON public.live_comments TO anon, authenticated;
GRANT INSERT ON public.live_comments TO authenticated;

GRANT SELECT ON public.live_viewers TO anon, authenticated;
GRANT INSERT, DELETE ON public.live_viewers TO authenticated;

GRANT SELECT ON public.live_likes TO anon, authenticated;
GRANT INSERT ON public.live_likes TO authenticated;

GRANT SELECT ON public.live_gift_displays TO anon, authenticated;