-- =========================================================
-- Chat Mega Upgrade Phase A: gifts, coin transfers, chat files
-- =========================================================

-- 1. gift_transactions ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  message_id UUID,
  gift_key TEXT NOT NULL,
  gift_name TEXT,
  coins INTEGER NOT NULL CHECK (coins >= 0),
  combo INTEGER NOT NULL DEFAULT 1 CHECK (combo >= 1),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gift_tx_sender ON public.gift_transactions(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gift_tx_receiver ON public.gift_transactions(receiver_id, created_at DESC);
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view gift transactions"
  ON public.gift_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 2. coin_transfers ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coin_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  message_id UUID,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coin_tx_from ON public.coin_transfers(from_user, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coin_tx_to ON public.coin_transfers(to_user, created_at DESC);
ALTER TABLE public.coin_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view coin transfers"
  ON public.coin_transfers FOR SELECT
  USING (auth.uid() = from_user OR auth.uid() = to_user);

-- 3. chat_files -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chat_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  message_id UUID,
  bucket TEXT NOT NULL DEFAULT 'chat-files',
  bucket_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  pages INTEGER,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_files_owner ON public.chat_files(owner_id, created_at DESC);
ALTER TABLE public.chat_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their chat files"
  ON public.chat_files FOR SELECT
  USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their chat files"
  ON public.chat_files FOR INSERT
  WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their chat files"
  ON public.chat_files FOR DELETE
  USING (auth.uid() = owner_id);

-- 4. Storage bucket for chat files (private) --------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read their own chat files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can upload their own chat files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own chat files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5. Helper: atomic coin transfer ------------------------------------
-- Assumes a public.user_coin_balances table with (user_id uuid PK, balance integer)
CREATE TABLE IF NOT EXISTS public.user_coin_balances (
  user_id UUID PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own coin balance"
  ON public.user_coin_balances FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.fn_transfer_coins(
  p_from UUID,
  p_to UUID,
  p_amount INTEGER
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_balance INTEGER;
BEGIN
  IF p_amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF p_from = p_to THEN RAISE EXCEPTION 'cannot transfer to self'; END IF;

  INSERT INTO public.user_coin_balances(user_id, balance) VALUES (p_from, 0) ON CONFLICT DO NOTHING;
  INSERT INTO public.user_coin_balances(user_id, balance) VALUES (p_to, 0) ON CONFLICT DO NOTHING;

  SELECT balance INTO v_from_balance FROM public.user_coin_balances WHERE user_id = p_from FOR UPDATE;
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'insufficient balance';
  END IF;

  UPDATE public.user_coin_balances SET balance = balance - p_amount, updated_at = now() WHERE user_id = p_from;
  UPDATE public.user_coin_balances SET balance = balance + p_amount, updated_at = now() WHERE user_id = p_to;

  RETURN jsonb_build_object('ok', true, 'from_balance', v_from_balance - p_amount);
END;
$$;

-- 6. Helper: record a gift (called by edge fn after coins debited) ---
CREATE OR REPLACE FUNCTION public.fn_record_gift_transaction(
  p_sender UUID,
  p_receiver UUID,
  p_gift_key TEXT,
  p_gift_name TEXT,
  p_coins INTEGER,
  p_combo INTEGER,
  p_note TEXT,
  p_message_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.gift_transactions(sender_id, receiver_id, gift_key, gift_name, coins, combo, note, message_id)
  VALUES (p_sender, p_receiver, p_gift_key, p_gift_name, p_coins, p_combo, p_note, p_message_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;