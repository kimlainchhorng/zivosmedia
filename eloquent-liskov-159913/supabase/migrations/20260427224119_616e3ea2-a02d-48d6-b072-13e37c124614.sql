-- Populate Koh Sdach Resort by EHM (store CBD7322B460) storefront from Booking.com reference
-- Idempotent: only updates fields that are currently empty/default

UPDATE public.lodge_property_profile
SET
  description_sections = CASE
    WHEN description_sections IS NULL OR jsonb_array_length(description_sections) = 0 THEN
      '[
        {"title":"Welcome to Koh Sdach Resort by EHM","body":"Set on the peaceful island of Koh Sdach, our beachfront resort offers garden and sea-view villas surrounded by tropical greenery. Unwind by the outdoor swimming pool, sip a drink at the bar, or enjoy fresh meals at our on-site restaurant. With direct access to a private beach, water sports, and family-friendly rooms, the resort is the perfect base for an island getaway."},
        {"title":"Things to do","body":"Snorkeling, fishing, and water sports are available right at the property. Guests can also join bike and walking tours, hiking excursions, themed dinners, and tours about local Khmer culture. Spend the day relaxing on the private beach, exploring nearby islands, or trying a class led by our entertainment staff."},
        {"title":"Good to know","body":"Daily housekeeping and a 24-hour front desk are included. Concierge, baggage storage, currency exchange, and a tour desk make planning easy. The whole property is non-smoking with free Wi-Fi everywhere. Family rooms are available, and our team speaks English and Khmer. Note: there is no parking on-site."}
      ]'::jsonb
    ELSE description_sections
  END,
  property_highlights = CASE
    WHEN property_highlights IS NULL OR property_highlights = '{}'::jsonb THEN
      '{
        "perfect_for":"Two travelers · Beach getaway",
        "top_location_score":9.0,
        "breakfast_info":"Cooked-to-order breakfast with Asian, Vegetarian and Continental options.",
        "rooms_with":["Sea view","Garden view","Private bathroom","Air conditioning"]
      }'::jsonb
    ELSE property_highlights
  END,
  popular_amenities = CASE
    WHEN popular_amenities IS NULL OR cardinality(popular_amenities) = 0 THEN
      ARRAY[
        'Outdoor swimming pool','Non-smoking rooms','Restaurant','Free Wifi',
        'Fitness center','Beachfront','Family rooms','Private beach area','Breakfast'
      ]
    ELSE popular_amenities
  END,
  facilities = CASE
    WHEN facilities IS NULL OR cardinality(facilities) <= 1 THEN
      ARRAY[
        -- Great for your stay
        'Restaurant','Bar','Balcony','Private bathroom','Air conditioning','View','Free Wifi','Terrace','Family rooms','Shuttle service','Fitness center',
        -- Bathroom
        'Toilet paper','Towels','Towels/Sheets (extra fee)','Slippers','Toilet','Free toiletries','Bathrobe','Hairdryer','Shower','Bidet',
        -- Bedroom
        'Linens','Wardrobe or closet',
        -- View
        'Mountain view','Pool view','Garden view','Sea view',
        -- Outdoors
        'Picnic area','Outdoor furniture','Beachfront','Outdoor dining area','Private beach area','BBQ facilities (additional charge)','Patio','Garden',
        -- Kitchen
        'Dining table','Electric kettle','Refrigerator',
        -- Room amenities
        'Sofa bed','Clothes rack',
        -- Activities
        'Bicycle rental (additional charge)','Tour or class about local culture (additional charge)','Themed dinners (additional charge)','Bike tours (additional charge)','Walking tours (additional charge)','Beach','Water sports facilities on site (additional charge)','Entertainment staff','Snorkeling (additional charge)','Cycling (off-site)','Hiking (additional charge)','Pool table (additional charge)','Fishing (additional charge)',
        -- Living Area
        'Desk',
        -- Media & Technology
        'Flat-screen TV','TV',
        -- Food & Drink
        'Fruit (additional charge)','Wine/Champagne (additional charge)','Kids meals (additional charge)','Special diet meals (on request)','Minibar',
        -- Internet
        'Free Wi-Fi in all areas',
        -- Parking
        'No parking available',
        -- Transportation
        'Public transit tickets (additional charge)',
        -- Front Desk Services
        'Invoice provided','Concierge','Baggage storage','Tour desk','Currency exchange','24-hour front desk',
        -- Entertainment & Family Services
        'Baby safety gates','Outdoor play equipment for kids','Indoor play area','Board games/Puzzles',
        -- Cleaning Services
        'Daily housekeeping','Ironing service (additional charge)','Laundry (additional charge)',
        -- Business Facilities
        'Fax/Photocopying (additional charge)','Business center',
        -- Safety & security
        'Fire extinguishers','CCTV outside property','CCTV in common areas','Security alarm','Key card access','Key access','24-hour security','Safe',
        -- General
        'Carbon monoxide detector','Designated smoking area','Wake-up service','Soundproof','Private entrance','Soundproof rooms','Fan','Non-smoking rooms','Wake-up service/Alarm clock',
        -- Outdoor swimming pool
        'Outdoor swimming pool (Free)','Open all year','Adults only','Infinity pool','Pool with view','Saltwater pool','Pool/Beach towels','Pool bar','Beach chairs/Loungers','Beach umbrellas',
        -- Spa
        'Locker rooms','Spa fitness','Spa beach umbrellas','Spa beach chairs/Loungers',
        -- Languages Spoken
        'English','Khmer'
      ]
    ELSE facilities
  END,
  updated_at = now()
WHERE store_id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab';

-- Populate badges + expandable bathroom features on all 4 villas (only if empty)
UPDATE public.lodge_rooms
SET
  badges = CASE
    WHEN badges IS NULL OR cardinality(badges) = 0
      THEN ARRAY['Free cancellation','No prepayment needed']
    ELSE badges
  END,
  expandable_features = CASE
    WHEN expandable_features IS NULL OR cardinality(expandable_features) = 0
      THEN ARRAY['Free toiletries','Bidet','Shower','Bathrobe','Slippers','Hairdryer','Towels']
    ELSE expandable_features
  END,
  updated_at = now()
WHERE store_id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab';