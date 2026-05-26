-- User-scoped wallet, loyalty program, partner applications (applied via Supabase MCP).
-- Note: existing wallet_balances/wallet_transactions tables are driver-scoped;
-- these new tables (user_wallets, user_wallet_transactions) are end-user-scoped.

CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_cents BIGINT NOT NULL DEFAULT 0 CHECK (available_cents >= 0),
  pending_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own wallet" ON public.user_wallets;
CREATE POLICY "Users read own wallet" ON public.user_wallets FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.user_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('topup', 'withdraw', 'transfer_out', 'transfer_in', 'purchase', 'refund', 'reward')),
  amount_cents BIGINT NOT NULL,
  balance_after_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_wallet_tx_user ON public.user_wallet_transactions(user_id, created_at DESC);
ALTER TABLE public.user_wallet_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own transactions" ON public.user_wallet_transactions;
CREATE POLICY "Users read own transactions" ON public.user_wallet_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_accounts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  tier TEXT NOT NULL DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own loyalty" ON public.loyalty_accounts;
CREATE POLICY "Users read own loyalty" ON public.loyalty_accounts FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.loyalty_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_events_user ON public.loyalty_events(user_id, created_at DESC);
ALTER TABLE public.loyalty_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own loyalty events" ON public.loyalty_events;
CREATE POLICY "Users read own loyalty events" ON public.loyalty_events FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_kind TEXT NOT NULL CHECK (partner_kind IN ('driver', 'restaurant', 'hotel', 'rental', 'creator')),
  business_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  description TEXT,
  documents JSONB,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'approved', 'rejected')),
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_partner_apps_user ON public.partner_applications(user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON public.partner_applications(status);
ALTER TABLE public.partner_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own applications" ON public.partner_applications;
CREATE POLICY "Users read own applications" ON public.partner_applications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users create own applications" ON public.partner_applications;
CREATE POLICY "Users create own applications" ON public.partner_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
