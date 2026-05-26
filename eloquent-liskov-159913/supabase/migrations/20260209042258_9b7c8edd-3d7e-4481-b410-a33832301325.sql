-- =============================================
-- Business Accounts: Invite Codes & Updates
-- =============================================

-- 1) Create company_invite_codes table
CREATE TABLE public.company_invite_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.business_accounts(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint on invite_code
CREATE UNIQUE INDEX idx_company_invite_codes_code ON public.company_invite_codes(invite_code);
-- Index for fast lookups by business
CREATE INDEX idx_company_invite_codes_business_id ON public.company_invite_codes(business_id);

-- 2) Add columns to business_accounts
ALTER TABLE public.business_accounts 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_code_enabled BOOLEAN NOT NULL DEFAULT true;

-- 3) Add columns to business_account_users
ALTER TABLE public.business_account_users 
  ADD COLUMN IF NOT EXISTS payment_preference TEXT NOT NULL DEFAULT 'personal' CHECK (payment_preference IN ('personal', 'company')),
  ADD COLUMN IF NOT EXISTS joined_via TEXT DEFAULT 'direct' CHECK (joined_via IN ('invite_code', 'direct', 'admin_added')),
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- 4) Add billing columns to food_orders
ALTER TABLE public.food_orders
  ADD COLUMN IF NOT EXISTS billing_type TEXT DEFAULT 'personal' CHECK (billing_type IN ('personal', 'company')),
  ADD COLUMN IF NOT EXISTS business_account_id UUID REFERENCES public.business_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS business_account_name TEXT;

-- Index for company orders lookup
CREATE INDEX IF NOT EXISTS idx_food_orders_business_account_id ON public.food_orders(business_account_id) WHERE business_account_id IS NOT NULL;

-- =============================================
-- RLS Policies
-- =============================================

-- Enable RLS
ALTER TABLE public.company_invite_codes ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user is admin of a business account
CREATE OR REPLACE FUNCTION public.is_business_admin(_user_id uuid, _business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.business_account_users
    WHERE user_id = _user_id
      AND business_id = _business_id
      AND role = 'admin'
  )
$$;

-- company_invite_codes policies
CREATE POLICY "Users can view invite codes for their company"
  ON public.company_invite_codes
  FOR SELECT
  USING (
    public.is_business_admin(auth.uid(), business_id)
  );

CREATE POLICY "Company admins can create invite codes"
  ON public.company_invite_codes
  FOR INSERT
  WITH CHECK (
    public.is_business_admin(auth.uid(), business_id)
  );

CREATE POLICY "Company admins can update their codes"
  ON public.company_invite_codes
  FOR UPDATE
  USING (
    public.is_business_admin(auth.uid(), business_id)
  );

CREATE POLICY "Company admins can delete their codes"
  ON public.company_invite_codes
  FOR DELETE
  USING (
    public.is_business_admin(auth.uid(), business_id)
  );

-- Anyone can check if a code is valid (for joining)
CREATE POLICY "Anyone can validate invite codes"
  ON public.company_invite_codes
  FOR SELECT
  USING (is_active = true);

-- business_account_users: users can view their own membership
CREATE POLICY "Users can view own business membership"
  ON public.business_account_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- business_account_users: admins can view all members
CREATE POLICY "Admins can view company members"
  ON public.business_account_users
  FOR SELECT
  USING (
    public.is_business_admin(auth.uid(), business_id)
  );

-- Users can update their own payment preference
CREATE POLICY "Users can update own payment preference"
  ON public.business_account_users
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can leave a company (delete their membership)
CREATE POLICY "Users can leave company"
  ON public.business_account_users
  FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- RPC: Redeem Invite Code
-- =============================================
CREATE OR REPLACE FUNCTION public.redeem_company_invite_code(_code TEXT)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code_record RECORD;
  v_business RECORD;
  v_existing RECORD;
  v_user_id UUID := auth.uid();
BEGIN
  -- Check user is authenticated
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Authentication required');
  END IF;

  -- Find the invite code
  SELECT * INTO v_code_record
  FROM public.company_invite_codes
  WHERE UPPER(invite_code) = UPPER(_code)
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check expiration
  IF v_code_record.expires_at IS NOT NULL AND v_code_record.expires_at < now() THEN
    RETURN json_build_object('success', false, 'error', 'Invite code has expired');
  END IF;

  -- Check max uses
  IF v_code_record.max_uses IS NOT NULL AND v_code_record.uses_count >= v_code_record.max_uses THEN
    RETURN json_build_object('success', false, 'error', 'Invite code has reached maximum uses');
  END IF;

  -- Get business info
  SELECT id, company_name INTO v_business
  FROM public.business_accounts
  WHERE id = v_code_record.business_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Company not found');
  END IF;

  -- Check if user already in this company
  SELECT * INTO v_existing
  FROM public.business_account_users
  WHERE user_id = v_user_id AND business_id = v_code_record.business_id;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'You are already a member of this company');
  END IF;

  -- Add user to company
  INSERT INTO public.business_account_users (business_id, user_id, role, payment_preference, joined_via, joined_at)
  VALUES (v_code_record.business_id, v_user_id, 'member', 'company', 'invite_code', now());

  -- Increment uses count
  UPDATE public.company_invite_codes
  SET uses_count = uses_count + 1
  WHERE id = v_code_record.id;

  RETURN json_build_object(
    'success', true,
    'company_id', v_business.id,
    'company_name', v_business.company_name
  );
END;
$$;