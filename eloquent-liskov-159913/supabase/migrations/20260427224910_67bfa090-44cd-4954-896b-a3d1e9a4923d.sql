-- ============================================================
-- KOH SDACH RESORT — Public storefront populate
-- store_id = 7322b460-2c23-4d3d-bdc5-55a31cc65fab
-- ============================================================

-- A) Rebuild lodge_amenities so the public LodgingAmenitiesPanel renders
--    the full Booking.com-style list using canonical amenityCatalog keys.
UPDATE public.lodge_amenities
SET
  categories = jsonb_build_object(
    'popular', jsonb_build_array(
      'outdoor_pool','non_smoking_rooms','restaurant','wifi',
      'fitness_centre','beachfront','family_rooms','private_beach'
    ),
    'great_for_stay', jsonb_build_array(
      'private_bathroom','ac','breakfast','watersports','free_shuttle'
    ),
    'bathroom', jsonb_build_array(
      'toilet_paper','towels','bidet','extra_linen','private_bathroom',
      'toilet','shower','hairdryer','bathrobe','slippers','free_toiletries'
    ),
    'bedroom', jsonb_build_array('linens','wardrobe'),
    'outdoors', jsonb_build_array(
      'beachfront','private_beach','terrace','garden','outdoor_furniture'
    ),
    'room_amenities', jsonb_build_array(
      'socket_near_bed','drying_rack','fan','mosquito_net'
    ),
    'activities', jsonb_build_array(
      'bicycle_rental','themed_dinners','beach','watersports','evening_entertainment'
    ),
    'food_drink', jsonb_build_array(
      'bar','restaurant','kids_meals','special_diet_meals'
    ),
    'transportation', jsonb_build_array('airport_shuttle','bicycle_hire'),
    'services', jsonb_build_array(
      'daily_housekeeping','baggage_storage','tour_desk','laundry',
      'front_desk_24h','currency_exchange'
    ),
    'front_desk', jsonb_build_array('invoice_provided'),
    'entertainment_family', jsonb_build_array(
      'board_games','playground','family_rooms'
    ),
    'safety_security', jsonb_build_array(
      'fire_extinguishers','cctv_common','smoke_alarms','security_24h','safe'
    ),
    'general', jsonb_build_array(
      'non_smoking_rooms','ac','soundproof','soundproof_rooms','designated_smoking'
    ),
    'pool', jsonb_build_array('pool_open_year','loungers','pool_towels'),
    'spa', jsonb_build_array('fitness_centre','beach_umbrellas','massage'),
    'languages', jsonb_build_array('english','khmer')
  ),
  internet_mode = 'free_all',
  parking_mode  = 'none',
  extra_charge_keys = ARRAY[
    'laundry','watersports','kids_meals','themed_dinners',
    'bicycle_rental','airport_shuttle','massage','extra_linen'
  ],
  updated_at = now()
WHERE store_id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab';

-- B) Insert 10 new villa types (idempotent on (store_id, name))
WITH photo_set AS (
  SELECT to_jsonb(ARRAY[
    'https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884994525-bghf6.webp',
    'https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884991392-s7pfv.webp',
    'https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884991962-np6he.webp',
    'https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884992579-8wbbo.webp',
    'https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884976699-is3wa.webp',
    'https://slirphzzwcogdbkeicff.supabase.co/storage/v1/object/public/store-assets/7322b460-2c23-4d3d-bdc5-55a31cc65fab/products/room-1776884990803-8hof5.webp'
  ]) AS photos
),
new_rooms(name, room_type, beds, max_guests, size_sqm, units_total, base_rate_cents, weekend_rate_cents, breakfast_included, view, sort_order) AS (
  VALUES
    ('Sea View Villa',          'Villa',    '1 King bed',           2, 32::numeric, 4, 11900, 13900, true,  'Sea view',     4),
    ('Sea View Villa Class',    'Villa',    '1 King bed',           2, 34::numeric, 4, 13900, 15900, true,  'Sea view',     5),
    ('Beachfront Villa',        'Villa',    '1 King bed',           2, 38::numeric, 3, 15900, 17900, true,  'Beachfront',   6),
    ('Beachfront Villa Class',  'Villa',    '1 King bed',           2, 40::numeric, 3, 17900, 19900, true,  'Beachfront',   7),
    ('Family Villa',            'Villa',    '1 Queen + 1 Single',   3, 42::numeric, 3, 14500, 16500, true,  'Garden view',  8),
    ('Family Villa Class',      'Villa',    '1 Queen + 2 Single',   4, 48::numeric, 2, 16900, 18900, true,  'Garden view',  9),
    ('Garden Bungalow',         'Bungalow', '1 Queen bed',          2, 26::numeric, 6,  6500,  7500, false, 'Garden view', 10),
    ('Twin Garden Bungalow',    'Bungalow', '2 Single beds',        2, 26::numeric, 4,  6900,  7900, false, 'Garden view', 11),
    ('Honeymoon Suite',         'Suite',    '1 King bed',           2, 36::numeric, 2, 19900, 22900, true,  'Sea view',    12),
    ('Two-Bedroom Pool Villa',  'Villa',    '1 King + 1 Queen',     4, 60::numeric, 2, 25900, 28900, true,  'Beachfront',  13)
)
INSERT INTO public.lodge_rooms (
  store_id, name, room_type, beds, max_guests, size_sqm, units_total,
  base_rate_cents, weekend_rate_cents, breakfast_included,
  amenities, photos, view, sort_order, is_active,
  badges, expandable_features
)
SELECT
  '7322b460-2c23-4d3d-bdc5-55a31cc65fab'::uuid,
  nr.name, nr.room_type, nr.beds, nr.max_guests, nr.size_sqm, nr.units_total,
  nr.base_rate_cents, nr.weekend_rate_cents, nr.breakfast_included,
  ARRAY['free_toiletries','shower','bathrobe','bidet','toilet','towels',
        'slippers','hairdryer','toilet_paper','private_bathroom',
        'ac','wifi','non_smoking_rooms']::text[],
  (SELECT photos FROM photo_set),
  nr.view, nr.sort_order, true,
  ARRAY['Free cancellation','No prepayment needed']::text[],
  ARRAY['Slippers','Bidet','Bathrobe','Free toiletries','Hairdryer',
        'Towels','Toilet paper','Private bathroom','Air conditioning',
        'Free Wi-Fi','Non-smoking']::text[]
FROM new_rooms nr
WHERE NOT EXISTS (
  SELECT 1 FROM public.lodge_rooms lr
  WHERE lr.store_id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab'
    AND lr.name = nr.name
);
