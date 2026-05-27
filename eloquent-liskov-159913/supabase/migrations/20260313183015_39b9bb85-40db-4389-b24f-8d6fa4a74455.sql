-- 1. Fix auth_relay_tokens: drop overly permissive SELECT policy
DROP POLICY IF EXISTS "authenticated_select_relay" ON public.auth_relay_tokens;

-- Create proper owner-only SELECT policy (relay_id is text, auth.uid() is uuid)
CREATE POLICY "Users can read own relay tokens"
ON public.auth_relay_tokens
FOR SELECT
TO authenticated
USING (relay_id = auth.uid()::text);

-- 2. Fix customer_wallets: drop overly broad policy
DROP POLICY IF EXISTS "cw_read_auth" ON public.customer_wallets;

-- 3. Fix zivo_credits: drop overly broad policy
DROP POLICY IF EXISTS "zivo_credits_read_auth" ON public.zivo_credits;

-- 4. Fix demand_forecasts: drop overly broad policy
DROP POLICY IF EXISTS "df_select_auth" ON public.demand_forecasts;

-- 5. Fix demand_snapshots: drop overly broad policy
DROP POLICY IF EXISTS "ds_select_auth" ON public.demand_snapshots;

-- 6. Fix sla_metrics: drop overly broad policy
DROP POLICY IF EXISTS "sla_select_auth" ON public.sla_metrics;

-- 7. Fix customer_order_items: replace overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create order items" ON public.customer_order_items;

CREATE POLICY "Users can insert items into own orders"
ON public.customer_order_items
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.food_orders fo
    WHERE fo.id = order_id
    AND fo.user_id = auth.uid()
  )
);