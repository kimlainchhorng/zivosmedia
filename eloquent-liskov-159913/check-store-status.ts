import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const storeId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

const { data: store } = await supabase
  .from('lodge_property_profile')
  .select('id, banner_url, gallery_images')
  .eq('store_id', storeId)
  .single();

console.log('Store Profile:');
console.log('Banner URL:', store?.banner_url);
console.log('Gallery Images:', JSON.stringify(store?.gallery_images, null, 2));

const { data: rooms } = await supabase
  .from('lodge_room_type')
  .select('id, name, gallery_images')
  .eq('store_id', storeId);

console.log('\nRoom Types:');
rooms?.forEach(r => {
  console.log(`Room: ${r.name}`);
  console.log(`Gallery: ${JSON.stringify(r.gallery_images, null, 2)}`);
});
