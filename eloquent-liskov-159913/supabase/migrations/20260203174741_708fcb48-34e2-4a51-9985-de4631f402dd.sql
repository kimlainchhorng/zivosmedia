-- Add INSERT policy for email_consents
-- Users need to be able to record their own consent (anonymous or authenticated)
-- But they should not be able to SELECT/UPDATE/DELETE other consents

-- Allow anonymous users to insert their own consent (for guest checkout flows)
CREATE POLICY "Anyone can record their own consent"
ON public.email_consents
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Add comment explaining security model
COMMENT ON TABLE public.email_consents IS 'Email consent records. INSERT allowed for all (consent recording), SELECT restricted to admins only to protect PII.';