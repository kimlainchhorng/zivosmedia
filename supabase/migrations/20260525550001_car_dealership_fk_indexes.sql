-- Add covering indexes for foreign keys flagged by the Supabase performance
-- advisor (unindexed_foreign_keys). Each of these FKs would otherwise force a
-- full-table scan on parent deletes and slow down joins. CREATE INDEX IF NOT
-- EXISTS is idempotent.

CREATE INDEX IF NOT EXISTS car_dealership_customer_interactions_user_id_idx
  ON public.car_dealership_customer_interactions (user_id);

CREATE INDEX IF NOT EXISTS car_dealership_customers_user_id_idx
  ON public.car_dealership_customers (user_id);

CREATE INDEX IF NOT EXISTS car_dealership_deal_documents_uploaded_by_user_id_idx
  ON public.car_dealership_deal_documents (uploaded_by_user_id);

CREATE INDEX IF NOT EXISTS car_dealership_financing_customer_id_idx
  ON public.car_dealership_financing (customer_id);

CREATE INDEX IF NOT EXISTS car_dealership_lead_activities_user_id_idx
  ON public.car_dealership_lead_activities (user_id);

CREATE INDEX IF NOT EXISTS car_dealership_leads_assigned_to_user_id_idx
  ON public.car_dealership_leads (assigned_to_user_id);

CREATE INDEX IF NOT EXISTS car_dealership_reviews_customer_id_idx
  ON public.car_dealership_reviews (customer_id);

CREATE INDEX IF NOT EXISTS car_dealership_sales_lead_id_idx
  ON public.car_dealership_sales (lead_id);

CREATE INDEX IF NOT EXISTS car_dealership_sales_salesperson_user_id_idx
  ON public.car_dealership_sales (salesperson_user_id);

CREATE INDEX IF NOT EXISTS car_dealership_test_drives_customer_id_idx
  ON public.car_dealership_test_drives (customer_id);

CREATE INDEX IF NOT EXISTS car_dealership_test_drives_lead_id_idx
  ON public.car_dealership_test_drives (lead_id);

CREATE INDEX IF NOT EXISTS car_dealership_test_drives_salesperson_user_id_idx
  ON public.car_dealership_test_drives (salesperson_user_id);

CREATE INDEX IF NOT EXISTS car_dealership_trade_ins_appraiser_user_id_idx
  ON public.car_dealership_trade_ins (appraiser_user_id);

CREATE INDEX IF NOT EXISTS car_dealership_trade_ins_customer_id_idx
  ON public.car_dealership_trade_ins (customer_id);
