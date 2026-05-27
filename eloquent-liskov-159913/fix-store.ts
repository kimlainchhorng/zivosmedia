import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

const storeId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

// Add standard hotel check-in/check-out times
const { error } = await supabase
  .from('lodge_property_profile')
  .update({
    check_in_from: '14:00',  // 2 PM standard check-in
    check_out_until: '11:00' // 11 AM standard check-out
  })
  .eq('store_id', storeId);

if (error) {
  console.error('Error updating:', error);
} else {
  console.log('✓ Updated check-in/check-out times');
}

// Verify update
const { data } = await supabase
  .from('lodge_property_profile')
  .select('check_in_from, check_out_until')
  .eq('store_id', storeId)
  .single();

console.log('Check-in:', data?.check_in_from);
console.log('Check-out:', data?.check_out_until);
