import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);
const storeId = '79f7ca8b-fdc7-4a5d-a5b8-46f7c9973edf';

const { data, error } = await supabase
  .from('store_profiles')
  .select('id, category, gallery_images')
  .eq('id', storeId)
  .single();

if (error) console.error(error);
else console.log(JSON.stringify(data, null, 2));
