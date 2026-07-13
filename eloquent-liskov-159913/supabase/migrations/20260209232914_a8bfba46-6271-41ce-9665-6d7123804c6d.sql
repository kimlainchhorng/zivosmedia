-- Make restaurant_id nullable for platform-wide ZIVO gift cards
ALTER TABLE public.gift_cards ALTER COLUMN restaurant_id DROP NOT NULL;

-- Add purchaser_user_id to track who bought the gift card
ALTER TABLE public.gift_cards ADD COLUMN IF NOT EXISTS purchaser_user_id uuid REFERENCES auth.users(id);

-- Add RLS policy for users to see their own gift cards (purchased or received)
CREATE POLICY "Users can view their purchased gift cards"
ON public.gift_cards
FOR SELECT
USING (
  purchaser_user_id = auth.uid()
  OR recipient_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Allow edge functions (service role) to insert/update gift cards
CREATE POLICY "Service role can manage gift cards"
ON public.gift_cards
FOR ALL
USING (true)
WITH CHECK (true);
