
INSERT INTO public.travel_deals (title, description, category, origin, destination, destination_country, destination_flag, price_from, currency, discount_percent, deal_type, cta_url, expires_at, priority) VALUES
('NYC to Cancún', 'Nonstop flights from New York to Cancún. Book early for the best rates.', 'flights', 'New York', 'Cancún', 'Mexico', '🇲🇽', 189, 'USD', 35, 'flash', '/flights?from=JFK&to=CUN', now() + interval '3 days', 10),
('Barcelona Getaway', 'Round-trip flights to Barcelona from major US cities.', 'flights', NULL, 'Barcelona', 'Spain', '🇪🇸', 342, 'USD', 22, 'seasonal', '/flights?to=BCN', now() + interval '14 days', 8),
('Bali Paradise', 'Flights to Bali with flexible dates. Peak season deals available.', 'flights', NULL, 'Bali', 'Indonesia', '🇮🇩', 425, 'USD', 18, 'trending', '/flights?to=DPS', now() + interval '30 days', 7),
('Dubai Luxury Hotels', 'Top-rated 5-star hotels in Dubai from $129/night.', 'hotels', NULL, 'Dubai', 'UAE', '🇦🇪', 129, 'USD', 40, 'flash', '/hotels?city=dubai', now() + interval '5 days', 9),
('Miami Beach Hotels', 'Beachfront hotels in Miami with free cancellation.', 'hotels', NULL, 'Miami', 'United States', '🇺🇸', 89, 'USD', 25, 'seasonal', '/hotels?city=miami', now() + interval '21 days', 6),
('LA Car Rental', 'Compact cars from $19/day in Los Angeles. Unlimited mileage included.', 'cars', NULL, 'Los Angeles', 'United States', '🇺🇸', 19, 'USD', 30, 'last-minute', '/rent-car?city=los-angeles', now() + interval '2 days', 5),
('Tokyo Adventure', 'Discover Tokyo: flights from the West Coast starting at $399.', 'flights', NULL, 'Tokyo', 'Japan', '🇯🇵', 399, 'USD', 28, 'trending', '/flights?to=NRT', now() + interval '21 days', 8),
('Paris Spring Package', 'Flight + hotel bundles for a Parisian spring getaway.', 'packages', NULL, 'Paris', 'France', '🇫🇷', 599, 'USD', 20, 'seasonal', '/flights?to=CDG', now() + interval '30 days', 7),
('Orlando Car Rental', 'SUVs and minivans for family trips to Orlando from $29/day.', 'cars', NULL, 'Orlando', 'United States', '🇺🇸', 29, 'USD', 15, 'seasonal', '/rent-car?city=orlando', now() + interval '14 days', 4),
('London Last Minute', 'Last-minute flights to London. Departing within 48 hours.', 'flights', NULL, 'London', 'United Kingdom', '🇬🇧', 279, 'USD', 45, 'last-minute', '/flights?to=LHR', now() + interval '2 days', 10),
('Santorini Hotels', 'Cliffside hotels in Santorini with caldera views from $159/night.', 'hotels', NULL, 'Santorini', 'Greece', '🇬🇷', 159, 'USD', 30, 'trending', '/hotels?city=santorini', now() + interval '21 days', 6),
('Lisbon Discovery', 'Explore Lisbon: flights from East Coast cities starting $289.', 'flights', NULL, 'Lisbon', 'Portugal', '🇵🇹', 289, 'USD', 20, 'seasonal', '/flights?to=LIS', now() + interval '30 days', 5);
