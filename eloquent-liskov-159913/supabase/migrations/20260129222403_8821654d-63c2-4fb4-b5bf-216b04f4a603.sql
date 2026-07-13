INSERT INTO commission_settings (name, service_type, vehicle_type, commission_percentage, minimum_fee, maximum_fee, is_active)
VALUES 
  ('XXL Rides', 'rides', 'xxl', 25, 2.50, NULL, true),
  ('Black Premium', 'rides', 'black', 30, 3.00, NULL, true),
  ('VIP Premium', 'rides', 'vip', 35, 5.00, NULL, true),
  ('Luxury Rides', 'rides', 'luxury', 35, 4.00, NULL, true),
  ('SUV Rides', 'rides', 'suv', 25, 2.00, NULL, true),
  ('Bike Delivery', 'delivery', 'bike', 20, 0.75, NULL, true)
ON CONFLICT DO NOTHING;