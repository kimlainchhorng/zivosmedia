-- ZIVO Super-App: Wallet & Support System (Complete)
-- Single account, one wallet, unified support across all services

-- =============================================
-- 1) ZIVO WALLET SYSTEM
-- =============================================

-- Payment Methods Vault (shared across all services)
CREATE TABLE IF NOT EXISTS public.zivo_payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL DEFAULT 'card',
  brand TEXT,
  last_four TEXT,
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  nickname TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ZIVO Wallet Transactions
CREATE TABLE IF NOT EXISTS public.zivo_wallet_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('flights', 'cars', 'p2p_cars', 'rides', 'eats', 'move', 'hotels', 'extras')),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('payment', 'refund', 'credit', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT,
  reference_id TEXT,
  reference_type TEXT,
  payment_method_id UUID REFERENCES public.zivo_payment_methods(id) ON DELETE SET NULL,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ZIVO Credits/Balance
CREATE TABLE IF NOT EXISTS public.zivo_wallet_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL CHECK (credit_type IN ('promo', 'refund', 'loyalty', 'referral', 'adjustment')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  expires_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false,
  used_at TIMESTAMP WITH TIME ZONE,
  source_description TEXT,
  source_reference_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 2) GLOBAL SUPPORT CENTER
-- =============================================

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.zivo_support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('flights', 'cars', 'p2p_cars', 'rides', 'eats', 'move', 'hotels', 'extras', 'account', 'general')),
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'waiting_partner', 'resolved', 'closed')),
  reference_id TEXT,
  reference_type TEXT,
  assigned_to UUID,
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Support Ticket Messages
CREATE TABLE IF NOT EXISTS public.zivo_support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.zivo_support_tickets(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'agent', 'system')),
  sender_id UUID,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 3) UNIFIED USER PREFERENCES
-- =============================================

CREATE TABLE IF NOT EXISTS public.zivo_user_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  notifications_email BOOLEAN DEFAULT true,
  notifications_push BOOLEAN DEFAULT true,
  notifications_sms BOOLEAN DEFAULT false,
  preferred_currency TEXT DEFAULT 'USD',
  preferred_language TEXT DEFAULT 'en',
  preferred_seat_type TEXT,
  preferred_cabin_class TEXT DEFAULT 'economy',
  dietary_restrictions TEXT[],
  zivo_miles_balance INTEGER DEFAULT 0,
  tier_status TEXT DEFAULT 'bronze' CHECK (tier_status IN ('bronze', 'silver', 'gold', 'platinum')),
  marketing_opt_in BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 4) CROSS-SERVICE SUGGESTIONS
-- =============================================

CREATE TABLE IF NOT EXISTS public.zivo_cross_sell_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_service TEXT NOT NULL,
  suggested_service TEXT NOT NULL,
  suggestion_type TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  is_shown BOOLEAN DEFAULT false,
  is_clicked BOOLEAN DEFAULT false,
  is_converted BOOLEAN DEFAULT false,
  shown_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  converted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- 5) ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.zivo_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_wallet_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zivo_cross_sell_suggestions ENABLE ROW LEVEL SECURITY;

-- Payment Methods policies
CREATE POLICY "Users can manage their own payment methods"
  ON public.zivo_payment_methods FOR ALL USING (auth.uid() = user_id);

-- Wallet Transactions policies
CREATE POLICY "Users can view their own transactions"
  ON public.zivo_wallet_transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.zivo_wallet_transactions FOR INSERT WITH CHECK (true);

-- Wallet Credits policies
CREATE POLICY "Users can view their own credits"
  ON public.zivo_wallet_credits FOR SELECT USING (auth.uid() = user_id);

-- Support Tickets policies
CREATE POLICY "Users can manage their own tickets"
  ON public.zivo_support_tickets FOR ALL USING (auth.uid() = user_id);

-- Support Messages policies
CREATE POLICY "Users can view messages on their tickets"
  ON public.zivo_support_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.zivo_support_tickets t 
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add messages to their tickets"
  ON public.zivo_support_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.zivo_support_tickets t 
      WHERE t.id = ticket_id AND t.user_id = auth.uid()
    )
  );

-- User Preferences policies
CREATE POLICY "Users can manage their own preferences"
  ON public.zivo_user_preferences FOR ALL USING (auth.uid() = user_id);

-- Cross-sell Suggestions policies
CREATE POLICY "Users can view their own suggestions"
  ON public.zivo_cross_sell_suggestions FOR SELECT USING (auth.uid() = user_id);

-- =============================================
-- 6) INDEXES
-- =============================================

CREATE INDEX idx_zivo_payment_methods_user ON public.zivo_payment_methods(user_id);
CREATE INDEX idx_zivo_wallet_transactions_user ON public.zivo_wallet_transactions(user_id);
CREATE INDEX idx_zivo_wallet_transactions_service ON public.zivo_wallet_transactions(service_type);
CREATE INDEX idx_zivo_wallet_credits_user ON public.zivo_wallet_credits(user_id);
CREATE INDEX idx_zivo_support_tickets_user ON public.zivo_support_tickets(user_id);
CREATE INDEX idx_zivo_support_tickets_status ON public.zivo_support_tickets(status);
CREATE INDEX idx_zivo_support_messages_ticket ON public.zivo_support_messages(ticket_id);

-- =============================================
-- 7) TICKET NUMBER GENERATOR
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_zivo_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ticket_number := 'ZS-' || to_char(now(), 'YYYYMMDD') || '-' || 
    lpad(floor(random() * 10000)::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER set_zivo_ticket_number
  BEFORE INSERT ON public.zivo_support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_zivo_ticket_number();