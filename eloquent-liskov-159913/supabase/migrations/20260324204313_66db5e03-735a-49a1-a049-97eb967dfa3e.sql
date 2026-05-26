-- Insert Phnom Penh pricing for all other Cambodian cities
-- Cities: Siem Reap, Battambang, Sihanoukville, Kampong Cham, Poipet, Kampot, Takeo, Svay Rieng, Prey Veng, Pursat, Kratie, Koh Kong, Stung Treng, Ratanakiri, Mondulkiri, Pailin, Kep, Banteay Meanchey, Kandal, Kampong Chhnang, Kampong Speu, Kampong Thom, Preah Vihear, Oddar Meanchey, Tboung Khmum

INSERT INTO city_pricing (city, ride_type, base_fare, per_mile, per_minute, booking_fee, minimum_fare, card_fee_pct, is_active, updated_at)
SELECT c.city, pp.ride_type, pp.base_fare, pp.per_mile, pp.per_minute, pp.booking_fee, pp.minimum_fare, pp.card_fee_pct, pp.is_active, now()
FROM city_pricing pp
CROSS JOIN (VALUES 
  ('Siem Reap'), ('Battambang'), ('Sihanoukville'), ('Kampong Cham'), ('Poipet'), ('Kampot'),
  ('Takeo'), ('Svay Rieng'), ('Prey Veng'), ('Pursat'), ('Kratie'), ('Koh Kong'),
  ('Stung Treng'), ('Ratanakiri'), ('Mondulkiri'), ('Pailin'), ('Kep'),
  ('Banteay Meanchey'), ('Kandal'), ('Kampong Chhnang'), ('Kampong Speu'),
  ('Kampong Thom'), ('Preah Vihear'), ('Oddar Meanchey'), ('Tboung Khmum')
) AS c(city)
WHERE pp.city = 'Phnom Penh'
ON CONFLICT DO NOTHING;