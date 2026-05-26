UPDATE public.lodge_rooms
SET amenities = ARRAY[
  'Free toiletries','Shower','Bathtub','Bathrobe','Slippers','Hairdryer','Bidet','Toilet','Toilet paper','Towels','Hot shower',
  'Linens','Wardrobe or closet','Alarm clock',
  'Sea view','Garden view','Pool view',
  'Balcony','Terrace','Patio','Outdoor furniture','Beach access','Beachfront',
  'Electric kettle','Socket near the bed','Dining area','Desk','Clothes rack','Sitting area','Drying rack for clothing','Minibar','Tile/Marble floor','Soundproofing','Air conditioning','Fan','Iron','Ironing facilities','Safety deposit box','Private entrance',
  'Mini-fridge','Refrigerator','Coffee machine','Tea/Coffee maker','Dining table',
  'Wi-Fi','Free Wi-Fi','TV','Flat-screen TV','Cable channels','Telephone',
  'Crib available','Family-friendly',
  'Private pool',
  'Daily housekeeping','Room service','24h reception','Wake-up service','Laundry service',
  'Non-smoking','Free parking','Private parking','Pet-friendly'
]
WHERE id = '69dfd9e2-a02e-48c6-82df-2d46e346b5a0';