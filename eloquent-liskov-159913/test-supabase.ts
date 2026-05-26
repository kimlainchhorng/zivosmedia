import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const { data, error } = await supabase.from('store').select('id, name').limit(1);

if (error) {
  console.error('Supabase Error:', error);
} else {
  console.log('Successfully connected. Sample store:', data);
}
