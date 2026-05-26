-- P2P money transfer + group expense splitting (applied via Supabase MCP).

CREATE TABLE IF NOT EXISTS public.p2p_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'declined', 'cancelled')),
  message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_users ON public.p2p_transfers(sender_id, receiver_id, created_at DESC);
ALTER TABLE public.p2p_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own transfers" ON public.p2p_transfers;
CREATE POLICY "Users can read their own transfers" ON public.p2p_transfers FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
DROP POLICY IF EXISTS "Senders create transfers" ON public.p2p_transfers;
CREATE POLICY "Senders create transfers" ON public.p2p_transfers FOR INSERT WITH CHECK (auth.uid() = sender_id);
DROP POLICY IF EXISTS "Receivers can accept or decline" ON public.p2p_transfers;
CREATE POLICY "Receivers can accept or decline" ON public.p2p_transfers FOR UPDATE USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.group_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL,
  paid_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT,
  message_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_group_expenses_group ON public.group_expenses(group_id, created_at DESC);
ALTER TABLE public.group_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members read group expenses" ON public.group_expenses;
CREATE POLICY "Members read group expenses" ON public.group_expenses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = group_expenses.group_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Members create group expenses" ON public.group_expenses;
CREATE POLICY "Members create group expenses" ON public.group_expenses FOR INSERT WITH CHECK (
  auth.uid() = paid_by
  AND EXISTS (SELECT 1 FROM public.chat_group_members m WHERE m.group_id = group_expenses.group_id AND m.user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.group_expense_shares (
  expense_id UUID NOT NULL REFERENCES public.group_expenses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_cents INTEGER NOT NULL CHECK (share_cents >= 0),
  settled_at TIMESTAMPTZ,
  PRIMARY KEY (expense_id, user_id)
);
ALTER TABLE public.group_expense_shares ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read shares involving them" ON public.group_expense_shares;
CREATE POLICY "Users read shares involving them" ON public.group_expense_shares FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.group_expenses e JOIN public.chat_group_members m ON m.group_id = e.group_id WHERE e.id = group_expense_shares.expense_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "Expense owners create shares" ON public.group_expense_shares;
CREATE POLICY "Expense owners create shares" ON public.group_expense_shares FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.group_expenses e WHERE e.id = group_expense_shares.expense_id AND e.paid_by = auth.uid())
);
DROP POLICY IF EXISTS "Users settle their own share" ON public.group_expense_shares;
CREATE POLICY "Users settle their own share" ON public.group_expense_shares FOR UPDATE USING (auth.uid() = user_id);
