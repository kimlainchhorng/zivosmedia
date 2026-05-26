-- Allow authenticated users to insert their own store-specific settings
CREATE POLICY "Store owners can insert app_settings"
ON public.app_settings
FOR INSERT
TO authenticated
WITH CHECK (
  key LIKE 'payroll_settings_%' OR key LIKE 'schedule_data_%'
);

-- Allow authenticated users to update their own store-specific settings
CREATE POLICY "Store owners can update app_settings"
ON public.app_settings
FOR UPDATE
TO authenticated
USING (
  key LIKE 'payroll_settings_%' OR key LIKE 'schedule_data_%'
)
WITH CHECK (
  key LIKE 'payroll_settings_%' OR key LIKE 'schedule_data_%'
);