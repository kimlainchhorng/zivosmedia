
-- Update Villa room to exact Booking.com spec
UPDATE public.lodge_rooms
SET
  size_sqm = 30,
  max_guests = 2,
  bed_config = '[{"type":"Queen","qty":1}]'::jsonb,
  beds = '1 Queen bed',
  amenities = ARRAY[
    'Free toiletries','Shower','Bathrobe','Bidet','Toilet','Towels','Slippers','Hairdryer','Towels/Sheets','Toilet paper',
    'Garden view',
    'Balcony','Terrace','Air conditioning','Socket near the bed','Desk','Sitting area','Minibar','Carpeted','Electric kettle','Wardrobe or closet','Dining area','Clothes rack','Drying rack for clothing',
    'No smoking'
  ]
WHERE id = '69dfd9e2-a02e-48c6-82df-2d46e346b5a0';

-- Overwrite store amenity catalog to only the groups in the spec
INSERT INTO public.lodge_amenities (store_id, amenities, policies, categories, extra_charge_keys, parking_mode, internet_mode)
VALUES (
  '7322b460-2c23-4d3d-bdc5-55a31cc65fab',
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object(
    'Private bathroom', to_jsonb(ARRAY['Free toiletries','Shower','Bathrobe','Bidet','Toilet','Towels','Slippers','Hairdryer','Toilet paper']),
    'View', to_jsonb(ARRAY['Garden view']),
    'Facilities', to_jsonb(ARRAY['Balcony','Terrace','Air conditioning','Socket near the bed','Desk','Sitting area','Minibar','Carpeted','Electric kettle','Wardrobe or closet','Dining area','Clothes rack','Drying rack for clothing']),
    'Accessibility & policy', to_jsonb(ARRAY['No smoking'])
  ),
  ARRAY['Towels/Sheets']::text[],
  'free',
  'free'
)
ON CONFLICT (store_id) DO UPDATE
SET categories = EXCLUDED.categories,
    extra_charge_keys = EXCLUDED.extra_charge_keys,
    updated_at = now();
