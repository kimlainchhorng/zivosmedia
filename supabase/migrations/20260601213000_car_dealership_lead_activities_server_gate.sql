-- Dealership lead activities are owner/admin CRM notes. Browser writes are
-- revoked; trusted server-side validation records the authenticated staff user
-- and validates the lead belongs to the store.

ALTER TABLE public.car_dealership_lead_activities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.car_dealership_lead_activities
  DROP CONSTRAINT IF EXISTS car_dealership_lead_activities_activity_type_check;

ALTER TABLE public.car_dealership_lead_activities
  ADD CONSTRAINT car_dealership_lead_activities_activity_type_check
  CHECK (activity_type IN ('note', 'call', 'email', 'sms', 'meeting', 'test_drive', 'offer_made', 'status_change', 'other', 'system'));

DROP POLICY IF EXISTS "Owners manage car_dealership_lead_activities - insert"
  ON public.car_dealership_lead_activities;
DROP POLICY IF EXISTS "Owners manage car_dealership_lead_activities - update"
  ON public.car_dealership_lead_activities;
DROP POLICY IF EXISTS "Owners manage car_dealership_lead_activities - delete"
  ON public.car_dealership_lead_activities;

CREATE POLICY "Car dealership lead activity inserts require trusted server-side validation"
  ON public.car_dealership_lead_activities
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Car dealership lead activity updates require trusted server-side validation"
  ON public.car_dealership_lead_activities
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Car dealership lead activity deletes require trusted server-side validation"
  ON public.car_dealership_lead_activities
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_dealership_lead_activities FROM authenticated;
GRANT SELECT ON TABLE public.car_dealership_lead_activities TO authenticated;
GRANT ALL PRIVILEGES ON TABLE public.car_dealership_lead_activities TO service_role;
