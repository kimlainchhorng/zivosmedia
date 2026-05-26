-- Set Villa bed_config and seed store-level lodge_amenities so editor checkboxes appear pre-ticked
UPDATE public.lodge_rooms
SET bed_config = '[{"type":"King","qty":1},{"type":"Sofa bed","qty":1}]'::jsonb
WHERE id = '69dfd9e2-a02e-48c6-82df-2d46e346b5a0';

INSERT INTO public.lodge_amenities (store_id, amenities, policies, categories, extra_charge_keys, parking_mode, internet_mode)
VALUES (
  '7322b460-2c23-4d3d-bdc5-55a31cc65fab',
  '{}'::jsonb,
  '{}'::jsonb,
  jsonb_build_object(
    'Private bathroom', to_jsonb(ARRAY['Free toiletries','Shower','Bathtub','Bathrobe','Slippers','Hairdryer','Bidet','Toilet','Toilet paper','Towels','Hot shower']),
    'Bedroom', to_jsonb(ARRAY['Linens','Wardrobe or closet','Alarm clock']),
    'View', to_jsonb(ARRAY['Sea view','Garden view','Pool view']),
    'Outdoors', to_jsonb(ARRAY['Balcony','Terrace','Patio','Outdoor furniture','Beach access','Beachfront']),
    'Facilities', to_jsonb(ARRAY['Electric kettle','Socket near the bed','Dining area','Desk','Clothes rack','Sitting area','Drying rack for clothing','Minibar','Tile/Marble floor','Soundproofing','Air conditioning','Fan','Iron','Ironing facilities','Safety deposit box','Private entrance']),
    'Food & drink', to_jsonb(ARRAY['Mini-fridge','Refrigerator','Coffee machine','Tea/Coffee maker','Dining table']),
    'Media & technology', to_jsonb(ARRAY['Wi-Fi','Free Wi-Fi','TV','Flat-screen TV','Cable channels','Telephone']),
    'Family', to_jsonb(ARRAY['Crib available','Family-friendly']),
    'Wellness', to_jsonb(ARRAY['Private pool']),
    'Services', to_jsonb(ARRAY['Daily housekeeping','Room service','24h reception','Wake-up service','Laundry service']),
    'Accessibility & policy', to_jsonb(ARRAY['Non-smoking','Free parking','Private parking','Pet-friendly'])
  ),
  ARRAY[]::text[],
  'free',
  'free'
)
ON CONFLICT (store_id) DO UPDATE
SET categories = EXCLUDED.categories,
    parking_mode = EXCLUDED.parking_mode,
    internet_mode = EXCLUDED.internet_mode,
    updated_at = now();