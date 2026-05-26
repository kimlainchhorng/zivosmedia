import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const storeId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

// Get gallery images
const { data: profile } = await supabase
  .from('store_profiles')
  .select('gallery_images')
  .eq('id', storeId)
  .single();

if (profile?.gallery_images && Array.isArray(profile.gallery_images) && profile.gallery_images.length > 0) {
  // Extract first image URL
  const firstImage = profile.gallery_images[0];
  const bannerUrl = typeof firstImage === 'string' ? firstImage : firstImage?.url;

  if (bannerUrl) {
    // Update banner_url
    const { error } = await supabase
      .from('store_profiles')
      .update({ banner_url: bannerUrl })
      .eq('id', storeId);

    if (error) {
      console.error('Error updating:', error);
    } else {
      console.log('✓ Added banner URL from gallery images');
      console.log('Banner URL:', bannerUrl.substring(0, 80) + '...');
    }
  }
}
