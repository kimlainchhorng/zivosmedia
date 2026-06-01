-- Fix Auto-Repair RLS: point owner checks at store_profiles, not restaurants.
--
-- Auto-repair stores live in `store_profiles` (owner_id = auth.uid()), but a batch
-- of ar_* tables had RLS policies whose EXISTS subquery checked the legacy
-- `restaurants` table. Since these stores are not in `restaurants`, the owner
-- check never matched and every INSERT/UPDATE/DELETE was denied with
-- "42501: new row violates row-level security policy" for the actual store owner.
--
-- The newer ar_* tables (ar_invoices, ar_estimates, ar_expenses, ar_invoice_payments)
-- already use store_profiles correctly; this aligns the rest with that pattern.
-- Logic, policy names, and target roles are preserved exactly — only the table
-- referenced in the ownership subquery changes (restaurants -> store_profiles).

-- ── merged_all_authenticated · TO authenticated · admin OR owner(store_id) ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'ar_bays','ar_fleet_accounts','ar_payouts','ar_recall_checks',
    'ar_service_reminders','ar_technicians','ar_tires','ar_warranties','ar_work_orders'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS merged_all_authenticated ON public.%I;', t);
    EXECUTE format($f$
      CREATE POLICY merged_all_authenticated ON public.%1$I
        FOR ALL TO authenticated
        USING (
          has_role((SELECT auth.uid()), 'admin')
          OR EXISTS (SELECT 1 FROM public.store_profiles r
                     WHERE r.id = %1$I.store_id AND r.owner_id = (SELECT auth.uid()))
        )
        WITH CHECK (
          has_role((SELECT auth.uid()), 'admin')
          OR EXISTS (SELECT 1 FROM public.store_profiles r
                     WHERE r.id = %1$I.store_id AND r.owner_id = (SELECT auth.uid()))
        );
    $f$, t);
  END LOOP;
END $$;

-- ── merged_all_authenticated · TO public · admin OR owner(store_id) ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ar_job_photos','ar_labor_entries','ar_loaner_vehicles'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS merged_all_authenticated ON public.%I;', t);
    EXECUTE format($f$
      CREATE POLICY merged_all_authenticated ON public.%1$I
        FOR ALL TO public
        USING (
          has_role((SELECT auth.uid()), 'admin')
          OR EXISTS (SELECT 1 FROM public.store_profiles r
                     WHERE r.id = %1$I.store_id AND r.owner_id = (SELECT auth.uid()))
        )
        WITH CHECK (
          has_role((SELECT auth.uid()), 'admin')
          OR EXISTS (SELECT 1 FROM public.store_profiles r
                     WHERE r.id = %1$I.store_id AND r.owner_id = (SELECT auth.uid()))
        );
    $f$, t);
  END LOOP;
END $$;

-- ── merged_all_public · TO public · admin OR owner(store_id) ──
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ar_customer_vehicles','ar_inspections','ar_parts','ar_vin_lookups'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS merged_all_public ON public.%I;', t);
    EXECUTE format($f$
      CREATE POLICY merged_all_public ON public.%1$I
        FOR ALL TO public
        USING (
          has_role((SELECT auth.uid()), 'admin')
          OR EXISTS (SELECT 1 FROM public.store_profiles r
                     WHERE r.id = %1$I.store_id AND r.owner_id = (SELECT auth.uid()))
        )
        WITH CHECK (
          has_role((SELECT auth.uid()), 'admin')
          OR EXISTS (SELECT 1 FROM public.store_profiles r
                     WHERE r.id = %1$I.store_id AND r.owner_id = (SELECT auth.uid()))
        );
    $f$, t);
  END LOOP;
END $$;

-- ── ar_fleet_vehicles · owner resolved through ar_fleet_accounts ──
DROP POLICY IF EXISTS merged_all_authenticated ON public.ar_fleet_vehicles;
CREATE POLICY merged_all_authenticated ON public.ar_fleet_vehicles
  FOR ALL TO authenticated
  USING (
    has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.ar_fleet_accounts fa
      JOIN public.store_profiles r ON r.id = fa.store_id
      WHERE fa.id = ar_fleet_vehicles.fleet_account_id
        AND r.owner_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    has_role((SELECT auth.uid()), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.ar_fleet_accounts fa
      JOIN public.store_profiles r ON r.id = fa.store_id
      WHERE fa.id = ar_fleet_vehicles.fleet_account_id
        AND r.owner_id = (SELECT auth.uid())
    )
  );

-- ── "Owners manage their ..." · TO public · owner only (admins covered by a separate policy) ──
DROP POLICY IF EXISTS "Owners manage their ar_customer_notes" ON public.ar_customer_notes;
CREATE POLICY "Owners manage their ar_customer_notes" ON public.ar_customer_notes
  FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.store_profiles r
                 WHERE r.id = ar_customer_notes.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles r
                      WHERE r.id = ar_customer_notes.store_id AND r.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Owners manage their ar_service_catalog" ON public.ar_service_catalog;
CREATE POLICY "Owners manage their ar_service_catalog" ON public.ar_service_catalog
  FOR ALL TO public
  USING (EXISTS (SELECT 1 FROM public.store_profiles r
                 WHERE r.id = ar_service_catalog.store_id AND r.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles r
                      WHERE r.id = ar_service_catalog.store_id AND r.owner_id = auth.uid()));
