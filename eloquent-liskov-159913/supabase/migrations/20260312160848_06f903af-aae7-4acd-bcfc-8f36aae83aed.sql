-- Create storage bucket for receipt photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipt-photos', 'receipt-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated drivers to upload receipt photos
CREATE POLICY "Drivers can upload receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'receipt-photos');

-- Allow anyone to view receipt photos (for admin/customer)
CREATE POLICY "Public can view receipts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipt-photos');

-- Allow uploaders to update their own files
CREATE POLICY "Uploaders can update own receipts"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'receipt-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
