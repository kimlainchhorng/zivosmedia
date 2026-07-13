-- Add payment_type column to food_orders
ALTER TABLE food_orders 
ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'card' 
CHECK (payment_type IN ('card', 'cash'));

-- Add paid_at timestamp
ALTER TABLE food_orders 
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create eats_reviews table
CREATE TABLE IF NOT EXISTS eats_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES food_orders(id) NOT NULL,
  user_id UUID NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for eats_reviews
ALTER TABLE eats_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reviews" ON eats_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create own reviews" ON eats_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews" ON eats_reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_eats_reviews_restaurant ON eats_reviews(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_eats_reviews_order ON eats_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_eats_reviews_user ON eats_reviews(user_id);