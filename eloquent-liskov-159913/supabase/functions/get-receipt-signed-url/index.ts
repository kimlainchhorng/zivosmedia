import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { ride_request_id } = await req.json();
    if (!ride_request_id) return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: receipt } = await admin
      .from("receipts")
      .select("user_id, pdf_path")
      .eq("type", "ride")
      .eq("reference_id", ride_request_id)
      .maybeSingle();

    if (!receipt) return new Response(JSON.stringify({ error: "receipt not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Allow owner OR admin
    let allowed = receipt.user_id === user.id;
    if (!allowed) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
      allowed = !!isAdmin;
    }
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: signed, error: signErr } = await admin.storage.from("trip-receipts").createSignedUrl(receipt.pdf_path, 3600);
    if (signErr || !signed) {
      console.error("[get-receipt-signed-url] sign error", signErr);
      return new Response(JSON.stringify({ error: "could not sign url" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[get-receipt-signed-url]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
