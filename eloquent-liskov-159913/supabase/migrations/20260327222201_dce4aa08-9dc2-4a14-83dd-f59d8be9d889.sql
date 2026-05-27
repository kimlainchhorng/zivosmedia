ALTER TABLE public.store_profiles
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS setup_complete BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_store_profiles_owner ON public.store_profiles(owner_id);

-- RLS: store owners can read/update their own stores
CREATE POLICY "Store owners can view their store"
ON public.store_profiles
FOR SELECT
TO authenticated
USING (owner_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Store owners can update their store"
ON public.store_profiles
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());