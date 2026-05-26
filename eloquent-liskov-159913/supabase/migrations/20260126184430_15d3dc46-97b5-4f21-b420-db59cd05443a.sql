-- Add RLS policies for driver-documents storage bucket
CREATE POLICY "Authenticated users can upload driver documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own driver documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all driver documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'driver-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can delete their own driver documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'driver-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add RLS policies for driver_documents table
CREATE POLICY "Users can insert their own driver documents"
ON public.driver_documents FOR INSERT
TO authenticated
WITH CHECK (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their own driver documents"
ON public.driver_documents FOR SELECT
TO authenticated
USING (driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all driver documents"
ON public.driver_documents FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add policy for drivers to insert their own record during registration
CREATE POLICY "Users can register as driver"
ON public.drivers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);