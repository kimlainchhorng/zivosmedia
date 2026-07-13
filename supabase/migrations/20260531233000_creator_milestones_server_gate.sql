-- Creator milestones are system-awarded proof/status rows. Clients can read
-- milestone rows, but mutation goes through creator-milestone-celebrate or
-- future trusted server award jobs.

COMMENT ON TABLE public.creator_milestones
IS 'Creator milestone rows are awarded and updated by trusted server flows only; clients read milestones via RLS.';
