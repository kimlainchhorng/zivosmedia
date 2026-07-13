
-- Add express config to pricing_settings
INSERT INTO public.pricing_settings (service_type, setting_key, setting_value, description)
VALUES 
  ('eats', 'express_fee_default', 2.99, 'Default express delivery fee in USD'),
  ('eats', 'express_eta_multiplier', 0.7, 'ETA multiplier for express orders (0.7 = 30% faster)'),
  ('eats', 'express_cap_percent', 30, 'Max percentage of active orders that can be express per zone')
ON CONFLICT DO NOTHING;
