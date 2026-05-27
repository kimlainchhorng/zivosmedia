-- Add RLS policy to allow business members to view their company's invoices
CREATE POLICY "Users can view invoices for their business"
  ON public.invoices
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id 
      FROM public.business_account_users 
      WHERE user_id = auth.uid()
    )
  );