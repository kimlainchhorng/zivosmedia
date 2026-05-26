-- ============================================================
-- SEED: Koh Sdach Resort by EHM — Rooms, Property, Amenities
-- Matches the hotel's live Booking.com / TripAdvisor listing
-- ============================================================

DO $$
DECLARE
  v_store_id uuid;
BEGIN
  -- Find the store by name or slug
  SELECT id INTO v_store_id
  FROM public.store_profiles
  WHERE name ILIKE '%Koh Sdach%' OR slug ILIKE '%koh-sdach%'
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE NOTICE 'Store "Koh Sdach Resort" not found in store_profiles. Create the store first then re-run this seed.';
    RETURN;
  END IF;

  RAISE NOTICE 'Seeding Koh Sdach Resort — store_id: %', v_store_id;

  -- ============================================================
  -- ROOMS (11 room types from Booking.com listing)
  -- base_rate_cents is in USD cents (e.g. 10000 = $100.00)
  -- ============================================================
  IF NOT EXISTS (SELECT 1 FROM public.lodge_rooms WHERE store_id = v_store_id LIMIT 1) THEN

    INSERT INTO public.lodge_rooms (
      store_id, name, room_type, view, max_guests, units_total,
      base_rate_cents, weekend_rate_cents, breakfast_included,
      cancellation_policy, check_in_time, check_out_time,
      description, sort_order, is_active
    ) VALUES
    (v_store_id, 'Deluxe Sea View', 'Deluxe', 'Sea view', 2, 6,
     10000, 11500, false, 'flexible', '14:00', '12:00',
     'Deluxe room with stunning panoramic sea view. Features air conditioning, flat-screen TV, private bathroom with free toiletries, and balcony overlooking the Gulf of Thailand.',
     1, true),

    (v_store_id, 'Deluxe Garden View', 'Deluxe', 'Garden view', 2, 8,
     8000, 9200, false, 'flexible', '14:00', '12:00',
     'Comfortable deluxe room with tropical garden views. Air conditioning, flat-screen TV, private bathroom with hot shower.',
     2, true),

    (v_store_id, 'Family Room Garden View', 'Family', 'Garden view', 4, 4,
     11000, 12600, false, 'flexible', '14:00', '12:00',
     'Spacious family room with garden views. Two separate sleeping areas, private bathroom, air conditioning. Ideal for families of up to 4.',
     3, true),

    (v_store_id, 'Family Room Private Pool', 'Family', 'Pool view', 4, 2,
     13900, 15900, false, 'flexible', '14:00', '12:00',
     'Exclusive family room with private plunge pool. Garden terrace, two sleeping areas, en-suite bathroom. Perfect for families seeking total privacy.',
     4, true),

    (v_store_id, 'Junior Suite Sea View', 'Suite', 'Sea view', 2, 4,
     11500, 13200, false, 'flexible', '14:00', '12:00',
     'Elegant junior suite overlooking the sea. King bed, separate seating area, private balcony with sea view, premium bathroom.',
     5, true),

    (v_store_id, 'Junior Suite Bathtub', 'Suite', 'Garden view', 2, 3,
     11000, 12600, false, 'flexible', '14:00', '12:00',
     'Junior suite with a freestanding bathtub. Romantic atmosphere, king bed, separate seating area, premium bath products.',
     6, true),

    (v_store_id, 'Junior Suite', 'Suite', '', 2, 4,
     10000, 11500, false, 'flexible', '14:00', '12:00',
     'Generous junior suite with refined comfort. King bed, separate sitting area, upgraded in-room amenities.',
     7, true),

    (v_store_id, 'Suite Sea View', 'Suite', 'Sea view', 2, 3,
     13000, 14900, false, 'flexible', '14:00', '12:00',
     'Premium suite with expansive sea views. Spacious living room, king bedroom, large private balcony, premium bathroom with bathtub and shower.',
     8, true),

    (v_store_id, 'Suite Private Pool Sea View', 'Suite', 'Sea view', 2, 2,
     13900, 15900, false, 'flexible', '14:00', '12:00',
     'The ultimate island experience — private infinity pool with direct sea views. Separate living area, king bedroom, butler service on request.',
     9, true),

    (v_store_id, 'Suite Private Pool', 'Suite', 'Pool view', 2, 2,
     13500, 15500, false, 'flexible', '14:00', '12:00',
     'Luxurious suite with private plunge pool in tropical garden setting. Spacious living area, king bedroom, premium bath amenities.',
     10, true),

    (v_store_id, 'Suite', 'Suite', '', 2, 4,
     12000, 13800, false, 'flexible', '14:00', '12:00',
     'Generously sized suite with refined island living. Separate living room, king bedroom, upgraded bathroom and in-room amenities.',
     11, true);

    RAISE NOTICE 'Inserted 11 room types.';
  ELSE
    RAISE NOTICE 'Rooms already exist — skipping room insert.';
  END IF;

  -- ============================================================
  -- PROPERTY PROFILE (full detail including contact info)
  -- ============================================================
  INSERT INTO public.lodge_property_profile (
    store_id,
    languages,
    facilities,
    meal_plans,
    house_rules,
    accessibility,
    sustainability,
    hero_badges,
    included_highlights,
    nearby,
    check_in_from,
    check_in_until,
    check_out_from,
    check_out_until,
    cancellation_policy,
    cancellation_window_hours,
    pet_policy,
    child_policy,
    contact,
    payment_methods,
    currencies_accepted,
    deposit_required,
    popular_amenities,
    property_highlights,
    description_sections
  ) VALUES (
    v_store_id,
    -- languages
    ARRAY['English', 'Khmer'],
    -- facilities
    ARRAY[
      'Private beach', 'Free WiFi', 'Restaurant', 'Bar/Lounge',
      'Terrace', 'Garden', 'Picnic area', 'Charcoal grills',
      'Beach chairs', 'Room service', '24-hour front desk', 'Concierge',
      'Playground', 'Private pool (select rooms)', 'Pet-friendly',
      'Laundry service', 'Luggage storage', 'Tour desk'
    ],
    -- meal_plans
    ARRAY['Room only', 'Breakfast included', 'Half board', 'Full board'],
    -- house_rules
    jsonb_build_object(
      'smoking_allowed', false,
      'parties_allowed', false,
      'pets_allowed', true,
      'quiet_hours_from', '22:00',
      'quiet_hours_until', '07:00'
    ),
    -- accessibility
    ARRAY[]::text[],
    -- sustainability
    ARRAY['Eco-friendly toiletries', 'Local seafood sourcing', 'Solar-assisted water heating'],
    -- hero_badges
    ARRAY['4-Star Resort', 'Private Beach', 'Island Location', 'Pet Friendly', 'Free WiFi'],
    -- included_highlights
    ARRAY['Free WiFi', 'Daily housekeeping', '24hr front desk', 'Concierge service', 'Beach access'],
    -- nearby
    jsonb_build_array(
      jsonb_build_object('name', 'Koh Sdach Village', 'distance_km', 0.5, 'type', 'attraction'),
      jsonb_build_object('name', 'Coral Reef Snorkeling Site', 'distance_km', 1.0, 'type', 'attraction'),
      jsonb_build_object('name', 'Sunset Viewpoint', 'distance_km', 0.3, 'type', 'attraction'),
      jsonb_build_object('name', 'Sihanoukville Ferry Terminal', 'distance_km', 70, 'type', 'transport'),
      jsonb_build_object('name', 'Sihanoukville Airport (KOS)', 'distance_km', 73, 'type', 'airport')
    ),
    -- check_in / check_out times
    '14:00', '23:59',
    '00:00', '12:00',
    -- cancellation_policy
    'Free cancellation up to 48 hours before check-in. After that, the first night will be charged.',
    48,
    -- pet_policy
    jsonb_build_object(
      'allowed', true,
      'fee', false,
      'fee_amount_cents', 0,
      'notes', 'Pets are welcome at no extra charge. Please inform us in advance.'
    ),
    -- child_policy
    jsonb_build_object(
      'children_welcome', true,
      'free_age_limit', 4,
      'notes', 'Children aged 4 and under eat breakfast for free. Extra beds available on request.'
    ),
    -- contact
    jsonb_build_object(
      'phone_primary', '+855 81 577 875',
      'phone_secondary', '+855 12 577 875',
      'email', 'info@kohsdachresort.com',
      'website', 'https://kohsdachresort.com',
      'address', 'Koh Sdach Island, Kiri Sakor, Koh Kong Province 09301, Cambodia',
      'google_maps_url', ''
    ),
    -- payment_methods
    ARRAY['Cash (USD)', 'Cash (KHR)', 'Visa', 'Mastercard', 'Bank transfer'],
    -- currencies_accepted
    ARRAY['USD', 'KHR'],
    -- deposit_required
    false,
    -- popular_amenities
    ARRAY['Free WiFi', 'Private beach', 'Restaurant', 'Room service', 'Bar/Lounge', 'Concierge', '24hr front desk'],
    -- property_highlights
    jsonb_build_object(
      'star_rating', 4,
      'total_rooms', 48,
      'year_opened', 2018,
      'review_score', 8.0,
      'review_count', 59,
      'tripadvisor_score', 4.2,
      'tripadvisor_count', 16,
      'tripadvisor_ranking', '#2 of 4 hotels on Koh Sdach Island'
    ),
    -- description_sections
    jsonb_build_array(
      jsonb_build_object(
        'title', 'About the Resort',
        'body', 'Koh Sdach Resort by EHM is a 4-star island resort nestled on Koh Sdach (King Island) in the Gulf of Thailand, Cambodia. Surrounded by crystal-clear waters, coral reefs, and tropical jungle, the resort offers a true island escape with modern comforts.'
      ),
      jsonb_build_object(
        'title', 'Location',
        'body', 'Located on Koh Sdach Island, 1.5 hours by boat from Sihanoukville. The island is home to a traditional fishing village, pristine beaches, and some of Cambodia''s best snorkeling and diving sites.'
      ),
      jsonb_build_object(
        'title', 'Dining',
        'body', 'Our open-air terrace restaurant serves traditional Cambodian and international cuisine. Breakfast buffet is available daily from 6:30 AM to 10:30 AM. À la carte, Asian, Western, Continental, and American menus available throughout the day. Fresh BBQ on the beach by arrangement.'
      ),
      jsonb_build_object(
        'title', 'Activities',
        'body', 'Kayaking, scuba diving, island hopping, snorkeling, sunset cruises, fishing trips, coral reef viewing, village exploration, and exclusive FPV drone tours of the island.'
      )
    )
  )
  ON CONFLICT (store_id) DO UPDATE SET
    languages               = EXCLUDED.languages,
    facilities              = EXCLUDED.facilities,
    meal_plans              = EXCLUDED.meal_plans,
    house_rules             = EXCLUDED.house_rules,
    sustainability          = EXCLUDED.sustainability,
    hero_badges             = EXCLUDED.hero_badges,
    included_highlights     = EXCLUDED.included_highlights,
    nearby                  = EXCLUDED.nearby,
    check_in_from           = EXCLUDED.check_in_from,
    check_in_until          = EXCLUDED.check_in_until,
    check_out_from          = EXCLUDED.check_out_from,
    check_out_until         = EXCLUDED.check_out_until,
    cancellation_policy     = EXCLUDED.cancellation_policy,
    cancellation_window_hours = EXCLUDED.cancellation_window_hours,
    pet_policy              = EXCLUDED.pet_policy,
    child_policy            = EXCLUDED.child_policy,
    contact                 = EXCLUDED.contact,
    payment_methods         = EXCLUDED.payment_methods,
    currencies_accepted     = EXCLUDED.currencies_accepted,
    deposit_required        = EXCLUDED.deposit_required,
    popular_amenities       = EXCLUDED.popular_amenities,
    property_highlights     = EXCLUDED.property_highlights,
    description_sections    = EXCLUDED.description_sections,
    updated_at              = now();

  RAISE NOTICE 'Upserted property profile with contact info.';

  -- ============================================================
  -- AMENITIES & POLICIES
  -- ============================================================
  INSERT INTO public.lodge_amenities (store_id, amenities, policies)
  VALUES (
    v_store_id,
    jsonb_build_object(
      'beach_pool', jsonb_build_array(
        'Private beach', 'Beach chairs', 'Snorkeling equipment',
        'Kayak rental', 'Private pool (select rooms)'
      ),
      'food_drink', jsonb_build_array(
        'Restaurant', 'Bar/Lounge', 'Room service',
        'Breakfast (charged separately)', 'À la carte',
        'BBQ facilities', 'Picnic area', 'Charcoal grills'
      ),
      'internet', jsonb_build_array('Free WiFi in all rooms', 'Free WiFi in public areas'),
      'services', jsonb_build_array(
        '24-hour front desk', 'Concierge', 'Daily housekeeping',
        'Luggage storage', 'Tour desk', 'Boat transfer (on request)',
        'Laundry service', 'Wake-up service', 'Airport shuttle (on request)'
      ),
      'outdoor', jsonb_build_array(
        'Terrace', 'Garden', 'Picnic area', 'Charcoal grills', 'Playground'
      ),
      'family', jsonb_build_array(
        'Playground', 'Family rooms available',
        'Children aged 4 and under eat breakfast free'
      ),
      'pets', jsonb_build_array('Pets allowed at no extra charge'),
      'activities', jsonb_build_array(
        'Kayaking', 'Scuba diving', 'Island hopping', 'Snorkeling',
        'Fishing trips', 'Coral reef viewing', 'Sunset viewing',
        'Village exploration', 'FPV drone tours'
      )
    ),
    jsonb_build_object(
      'check_in', '14:00',
      'check_out', '12:00',
      'pets', 'Pets welcome at no extra charge. Please inform us in advance.',
      'smoking', 'Non-smoking property',
      'breakfast', 'Breakfast not included in room rate. Available 6:30–10:30 AM. Children aged 4 and under eat free.',
      'cancellation', 'Free cancellation up to 48 hours before check-in.',
      'payment_methods', jsonb_build_array('Cash (USD)', 'Cash (KHR)', 'Visa', 'Mastercard', 'Bank transfer')
    )
  )
  ON CONFLICT (store_id) DO UPDATE SET
    amenities  = EXCLUDED.amenities,
    policies   = EXCLUDED.policies,
    updated_at = now();

  RAISE NOTICE 'Upserted amenities and policies.';
  RAISE NOTICE '✓ Koh Sdach Resort seed complete — 11 rooms, property profile, amenities all set.';
END $$;
