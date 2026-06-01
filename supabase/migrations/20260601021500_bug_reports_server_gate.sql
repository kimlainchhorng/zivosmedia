-- Bug reports are accepted through bug-report-submit so clients cannot spoof
-- user_id, schema-only columns, or review metadata. Authenticated users can
-- still read their own reports; admins can inspect the support queue.

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

REVOKE INSERT ON TABLE public.bug_reports FROM authenticated;

DROP POLICY IF EXISTS bug_reports_select_own ON public.bug_reports;
DROP POLICY IF EXISTS "bug_reports_select_own" ON public.bug_reports;

CREATE POLICY "bug_reports_select_own"
ON public.bug_reports
FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR public.has_role((SELECT auth.uid()), 'admin')
);

COMMENT ON TABLE public.bug_reports IS
  'Bug report records with trusted server-side ingestion through bug-report-submit; direct browser inserts are revoked.';
