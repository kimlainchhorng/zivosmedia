import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const storeId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

// Check store gallery images
const { data: profile } = await supabase
  .from('store_profiles')
  .select('id, name, gallery_images, banner_url, logo_url')
  .eq('id', storeId)
  .single();

console.log('=== STORE PROFILE ===');
console.log('Name:', profile?.name);
console.log('Gallery images count:', profile?.gallery_images?.length || 0);
console.log('Gallery images (first 3):');
if (profile?.gallery_images) {
  profile.gallery_images.slice(0, 3).forEach((img, i) => {
    const url = typeof img === 'string' ? img : img.url;
    console.log(`  [${i}] ${typeof img === 'string' ? 'string' : 'object'}: ${url?.substring(0, 80)}...`);
  });
}
console.log('Banner URL:', profile?.banner_url || 'NULL');
console.log('Logo URL:', profile?.logo_url || 'NULL');
console.log('');

// Check room photos
const { data: rooms } = await supabase
  .from('lodge_rooms')
  .select('name, photos')
  .eq('store_id', storeId);

console.log('=== ROOM PHOTOS ===');
rooms?.forEach((room) => {
  console.log(`${room.name}: ${room.photos?.length || 0} photos`);
  if (room.photos && room.photos.length > 0) {
    const firstPhoto = typeof room.photos[0] === 'string' ? room.photos[0] : room.photos[0]?.url;
    console.log(`  First: ${typeof firstPhoto === 'string' ? firstPhoto.substring(0, 80) : 'N/A'}...`);
  }
});
