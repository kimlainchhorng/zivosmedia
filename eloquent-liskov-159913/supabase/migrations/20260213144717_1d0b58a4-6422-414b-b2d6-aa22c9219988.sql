
INSERT INTO public.pricing_settings (service_type, setting_key, setting_value, description)
VALUES 
  ('driver', 'destination_mode_max_daily_uses', 2, 'Max destination mode uses per day'),
  ('driver', 'destination_mode_min_trip_km', 2, 'Min trip distance (km) in destination mode'),
  ('driver', 'destination_mode_direction_threshold', 45, 'Max angle deviation (degrees) for route match')
ON CONFLICT DO NOTHING;
