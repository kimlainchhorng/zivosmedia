-- Add RLS policies for job_postings and job_applications.
--
-- Both tables had `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` in
-- 20260505210000_super_app_mega_features.sql and grants to authenticated in
-- 20260522012300_database_security_forward_hardening.sql, but no
-- CREATE POLICY anywhere. Postgres default-deny means every authenticated
-- query against either table returned zero rows. The Jobs feature
-- (06c4d8281 Complete Jobs (gig-hub) create flow end-to-end) shipped on top
-- of that, working only in environments where someone had hand-configured
-- policies via the Supabase dashboard.
--
-- Policy shape:
--
--   job_postings:
--     • Anyone authenticated can read OPEN postings. Closed/filled stay
--       visible to the original poster so they can see their history.
--     • Posters create / update / delete their own postings.
--
--   job_applications:
--     • Applicant can read their own applications.
--     • Poster can read applications addressed to their postings.
--     • Applicant inserts new applications for themselves, but only for
--       postings that are still status='open'. (UNIQUE(job_id, applicant_id)
--       already prevents re-applying.)
--     • Both applicant and poster can UPDATE rows — the applicant typically
--       withdraws, the poster typically advances status. Status-value
--       constraints aren't enforced here; the CHECK constraint on the column
--       limits the value set and the client controls which side does what.
--     • Applicant can DELETE (withdraw) their own; poster cannot delete
--       other people's applications — they should mark rejected instead.

-- ─── job_postings ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "job_postings_read" ON public.job_postings;
CREATE POLICY "job_postings_read"
  ON public.job_postings
  FOR SELECT
  TO authenticated
  USING (
    status = 'open'
    OR auth.uid() = poster_id
  );

DROP POLICY IF EXISTS "job_postings_insert_own" ON public.job_postings;
CREATE POLICY "job_postings_insert_own"
  ON public.job_postings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = poster_id);

DROP POLICY IF EXISTS "job_postings_update_own" ON public.job_postings;
CREATE POLICY "job_postings_update_own"
  ON public.job_postings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = poster_id)
  WITH CHECK (auth.uid() = poster_id);

DROP POLICY IF EXISTS "job_postings_delete_own" ON public.job_postings;
CREATE POLICY "job_postings_delete_own"
  ON public.job_postings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = poster_id);

-- ─── job_applications ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "job_applications_read" ON public.job_applications;
CREATE POLICY "job_applications_read"
  ON public.job_applications
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM public.job_postings p
       WHERE p.id = job_applications.job_id
         AND p.poster_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "job_applications_insert_own" ON public.job_applications;
CREATE POLICY "job_applications_insert_own"
  ON public.job_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = applicant_id
    AND EXISTS (
      SELECT 1 FROM public.job_postings p
       WHERE p.id = job_applications.job_id
         AND p.status = 'open'
    )
  );

DROP POLICY IF EXISTS "job_applications_update" ON public.job_applications;
CREATE POLICY "job_applications_update"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = applicant_id
    OR EXISTS (
      SELECT 1 FROM public.job_postings p
       WHERE p.id = job_applications.job_id
         AND p.poster_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "job_applications_delete_own" ON public.job_applications;
CREATE POLICY "job_applications_delete_own"
  ON public.job_applications
  FOR DELETE
  TO authenticated
  USING (auth.uid() = applicant_id);
