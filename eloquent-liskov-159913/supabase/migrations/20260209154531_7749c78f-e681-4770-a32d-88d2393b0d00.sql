
-- Seed customer achievement badges into zivo_badges
-- Skip if badge with same id already exists
INSERT INTO public.zivo_badges (id, name, description, icon, category, tier, criteria_type, criteria_threshold, sort_order)
VALUES
  ('first_order', 'First Order', 'Complete your very first order on ZIVO', '🎉', 'customer', 'bronze', 'order_count', 1, 10),
  ('orders_5', 'Regular', 'Complete 5 orders across any service', '⭐', 'customer', 'silver', 'order_count', 5, 20),
  ('orders_10', 'Super Fan', 'Complete 10 orders — you''re a true ZIVO fan!', '🔥', 'customer', 'gold', 'order_count', 10, 30),
  ('orders_25', 'Legend', 'Complete 25 orders — legendary status!', '🏆', 'customer', 'gold', 'order_count', 25, 40),
  ('streak_3', 'Hot Streak', 'Place orders on 3 consecutive days', '🔥', 'customer', 'silver', 'order_streak', 3, 50),
  ('first_eats', 'Foodie', 'Place your first Eats order', '🍔', 'customer', 'bronze', 'eats_count', 1, 60),
  ('first_ride', 'Rider', 'Complete your first ride', '🚗', 'customer', 'bronze', 'ride_count', 1, 70),
  ('first_travel', 'Jet Setter', 'Book your first travel experience', '✈️', 'customer', 'bronze', 'travel_count', 1, 80)
ON CONFLICT (id) DO NOTHING;
