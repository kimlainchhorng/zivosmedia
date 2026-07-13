import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Look up user by email via admin API with pagination fallback
    let userId: string | null = null;

    for (let page = 1; page <= 10; page++) {
      const { data: pageData, error: pageError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      if (pageError) {
        console.error('listUsers error:', pageError.message);
        break;
      }
      if (!pageData?.users?.length) break;
      
      const found = pageData.users.find(
        (u: any) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (found) {
        userId = found.id;
        break;
      }
      // If we got fewer than perPage, we've reached the end
      if (pageData.users.length < 1000) break;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'No account found with this email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found user for store lookup');

    // Find stores owned by this user (service role bypasses RLS)
    const { data: stores, error: storeError } = await supabase
      .from('store_profiles')
      .select('id, name')
      .eq('owner_id', userId);

    console.log('Store query result:', JSON.stringify({ stores, storeError }));

    if (storeError) throw storeError;

    if (!stores || stores.length === 0) {
      return new Response(JSON.stringify({ error: 'No stores found for this email' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const storeIds = stores.map((s: any) => ({
      name: s.name,
      id: s.id.length > 8
        ? s.id.substring(0, 4) + '****' + s.id.substring(s.id.length - 4)
        : s.id,
      full_id: s.id,
    }));

    return new Response(JSON.stringify({ stores: storeIds }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('lookup-store-id error:', err);
    return new Response(JSON.stringify({ error: (err as Error).message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
