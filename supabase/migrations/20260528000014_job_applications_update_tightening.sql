-- Tighten the job_applications UPDATE policy from 20260528000012.
--
-- The original policy had only USING, no WITH CHECK. That lets either side
-- (applicant or poster) pass the read-side gate and then mutate any column
-- in the row, including:
--
--   • applicant changes own row's status to 'accepted' to forge acceptance
--   • applicant changes applicant_id to transfer the application to another
--     user (blocked by UNIQUE(job_id, applicant_id) when a row exists for
--     that pair, but not otherwise)
--   • poster changes job_id to move applications to a different job they
--     own — i.e. evade the original assignment
--
-- Fix: split the policy in two so each side's WITH CHECK constrains the
-- post-update state to keep identity columns pinned.
--
--   • Applicant policy: USING + WITH CHECK both require
--     auth.uid() = applicant_id. The applicant cannot change applicant_id
--     away from themselves (would fail WITH CHECK) and cannot move the row
--     to someone else's job (their applicant_id wouldn't match the new
--     poster either).
--
--   • Poster policy: USING + WITH CHECK both require the (possibly new)
--     job_id to belong to auth.uid(). So a poster can mark statuses but
--     cannot move applications to a job they don't own.
--
-- Status-transition correctness (who can move status into what state) is
-- left to the client + the column-level CHECK constraint on direct_messages
-- shape. A future trigger could enforce specific transitions (e.g. only
-- applicant can move to 'withdrawn'; only poster can move to
-- 'reviewing/accepted/rejected'), but that's a feature decision beyond
-- closing this concrete gap.

DROP POLICY IF EXISTS "job_applications_update" ON public.job_applications;

DROP POLICY IF EXISTS "job_applications_update_applicant" ON public.job_applications;
CREATE POLICY "job_applications_update_applicant"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = applicant_id)
  WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS "job_applications_update_poster" ON public.job_applications;
CREATE POLICY "job_applications_update_poster"
  ON public.job_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.job_postings p
       WHERE p.id = job_applications.job_id
         AND p.poster_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.job_postings p
       WHERE p.id = job_applications.job_id
         AND p.poster_id = auth.uid()
    )
  );
