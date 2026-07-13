-- Allow public to read active lodge rooms (so storefront and non-owner viewers see them)
CREATE POLICY "Public can view active lodge rooms"
ON public.lodge_rooms
FOR SELECT
USING (is_active = true);