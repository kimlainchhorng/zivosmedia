import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const targetStoreId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

const { data: stores } = await supabase
  .from('store')
  .select('id, name')
  .eq('id', targetStoreId);

console.log('Stores with ID 79f7ca8b...:', stores);

const { data: profiles } = await supabase
  .from('lodge_property_profile')
  .select('id, store_id, name');

console.log('\nLodge Property Profiles (all):', profiles);
