UPDATE public.restaurants
SET hours = jsonb_build_object(
  'mon', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true),
  'tue', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true),
  'wed', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true),
  'thu', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true),
  'fri', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true),
  'sat', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true),
  'sun', jsonb_build_object('open','12:00 AM','close','11:59 PM','closed',false,'is24h',true)
)
WHERE id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab';