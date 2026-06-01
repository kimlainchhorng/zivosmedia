-- Customer support ticket mutations now go through support-ticket-manage.
-- Customers keep read access to their own legacy tickets while direct
-- insert/update/delete is removed from the broad self-service policy.

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users view own tickets" ON public.support_tickets;

CREATE POLICY "Users view own tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMENT ON TABLE public.support_tickets IS
  'Legacy support ticket conversation records. Customer writes require trusted server-side support-ticket-manage or newer feedback_submissions intake.';
