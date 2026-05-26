INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, card_fee_pct, is_active)
SELECT city, 'moto', 0, 900, 0, 0, 3000, 3.5, true
FROM (VALUES
  ('Banteay Meanchey'),('Battambang'),('Kampong Cham'),('Kampong Chhnang'),('Kampong Speu'),
  ('Kampong Thom'),('Kampot'),('Kandal'),('Kep'),('Koh Kong'),('Kratie'),('Mondulkiri'),
  ('Oddar Meanchey'),('Pailin'),('Poipet'),('Preah Vihear'),('Prey Veng'),('Pursat'),
  ('Ratanakiri'),('Siem Reap'),('Sihanoukville'),('Stung Treng'),('Svay Rieng'),('Takeo'),
  ('Tboung Khmum')
) AS cities(city)
WHERE NOT EXISTS (
  SELECT 1 FROM city_pricing cp WHERE cp.city = cities.city AND cp.ride_type = 'moto'
);