
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  parent_id UUID REFERENCES public.marketplace_categories(id),
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories publicly readable" ON public.marketplace_categories FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.marketplace_seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  store_description TEXT,
  store_avatar_url TEXT,
  store_banner_url TEXT,
  rating NUMERIC DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  return_policy TEXT,
  shipping_policy TEXT,
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_seller_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seller profiles publicly readable" ON public.marketplace_seller_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own seller profile" ON public.marketplace_seller_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own seller profile" ON public.marketplace_seller_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  category_id UUID REFERENCES public.marketplace_categories(id),
  title TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD',
  condition TEXT DEFAULT 'new',
  images JSONB DEFAULT '[]',
  tags TEXT[],
  location TEXT,
  quantity INTEGER DEFAULT 1,
  views_count INTEGER DEFAULT 0,
  favorites_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  is_negotiable BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Listings publicly readable" ON public.marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Sellers create listings" ON public.marketplace_listings FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "Sellers update own listings" ON public.marketplace_listings FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "Sellers delete own listings" ON public.marketplace_listings FOR DELETE USING (auth.uid() = seller_id);
CREATE INDEX idx_listings_seller ON public.marketplace_listings(seller_id);
CREATE INDEX idx_listings_category ON public.marketplace_listings(category_id);
CREATE INDEX idx_listings_status ON public.marketplace_listings(status);

CREATE TABLE IF NOT EXISTS public.marketplace_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see own offers" ON public.marketplace_offers FOR SELECT USING (
  auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id = listing_id AND seller_id = auth.uid())
);
CREATE POLICY "Buyers create offers" ON public.marketplace_offers FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Offer participants update" ON public.marketplace_offers FOR UPDATE USING (
  auth.uid() = buyer_id OR EXISTS (SELECT 1 FROM public.marketplace_listings WHERE id = listing_id AND seller_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.marketplace_listings(id),
  reviewer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  order_id UUID,
  rating INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  images JSONB DEFAULT '[]',
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews publicly readable" ON public.marketplace_reviews FOR SELECT USING (true);
CREATE POLICY "Users create own reviews" ON public.marketplace_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users update own reviews" ON public.marketplace_reviews FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE TABLE IF NOT EXISTS public.marketplace_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);
ALTER TABLE public.marketplace_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own favorites" ON public.marketplace_favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add favorites" ON public.marketplace_favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove favorites" ON public.marketplace_favorites FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants see messages" ON public.marketplace_messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.marketplace_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE TABLE IF NOT EXISTS public.marketplace_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID NOT NULL,
  seller_id UUID NOT NULL,
  total_cents INTEGER NOT NULL,
  shipping_cents INTEGER DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_intent_id TEXT,
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  cancelled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers see own orders" ON public.marketplace_orders FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);
CREATE POLICY "Buyers create orders" ON public.marketplace_orders FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Participants update orders" ON public.marketplace_orders FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS public.marketplace_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.marketplace_listings(id),
  title TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  price_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants see items" ON public.marketplace_order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY "Buyers add items" ON public.marketplace_order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = order_id AND buyer_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.marketplace_shipping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  tracking_url TEXT,
  status TEXT DEFAULT 'pending',
  estimated_delivery TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_shipping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Order participants see shipping" ON public.marketplace_shipping FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY "Sellers update shipping" ON public.marketplace_shipping FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = order_id AND seller_id = auth.uid())
);
CREATE POLICY "Sellers manage shipping" ON public.marketplace_shipping FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = order_id AND seller_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.marketplace_orders(id),
  filed_by UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  evidence JSONB DEFAULT '[]',
  status TEXT DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_disputes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dispute participants see disputes" ON public.marketplace_disputes FOR SELECT USING (
  auth.uid() = filed_by OR EXISTS (SELECT 1 FROM public.marketplace_orders WHERE id = order_id AND (buyer_id = auth.uid() OR seller_id = auth.uid()))
);
CREATE POLICY "Users file disputes" ON public.marketplace_disputes FOR INSERT WITH CHECK (auth.uid() = filed_by);

CREATE TABLE IF NOT EXISTS public.marketplace_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL,
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  net_cents INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  payout_method TEXT,
  reference_id TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.marketplace_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sellers see own payouts" ON public.marketplace_payouts FOR SELECT USING (auth.uid() = seller_id);

CREATE TABLE IF NOT EXISTS public.marketplace_cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  listing_id UUID NOT NULL REFERENCES public.marketplace_listings(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, listing_id)
);
ALTER TABLE public.marketplace_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own cart" ON public.marketplace_cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add to cart" ON public.marketplace_cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update cart" ON public.marketplace_cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users remove from cart" ON public.marketplace_cart FOR DELETE USING (auth.uid() = user_id);
