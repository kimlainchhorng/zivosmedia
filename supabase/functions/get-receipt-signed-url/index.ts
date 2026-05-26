import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isBakongReceiptRide(ride: Record<string, unknown> | null | undefined): boolean {
  if (!ride) return false;
  const currency = String(ride.payment_currency ?? "").toUpperCase();
  const status = String(ride.payment_status ?? "");
  const reference = String(ride.bakong_reference ?? "").trim();
  return currency === "KHR" || status.startsWith("bakong") || Boolean(reference);
}

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
    const lookupReceipt = async () => {
      const { data } = await admin
        .from("receipts")
        .select("user_id, pdf_path")
        .eq("type", "ride")
        .eq("reference_id", ride_request_id)
        .maybeSingle();
      return data;
    };

    let receipt = await lookupReceipt();

    if (!receipt) {
      const { data: ride } = await admin
        .from("ride_requests")
        .select("id, user_id, status, payment_status, payment_currency, bakong_reference")
        .eq("id", ride_request_id)
        .maybeSingle();

      if (!ride) return new Response(JSON.stringify({ error: "ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      let canGenerate = ride.user_id === user.id;
      if (!canGenerate) {
        const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
        canGenerate = !!isAdmin;
      }
      if (!canGenerate) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      if (!["completed", "finished"].includes(String(ride.status || "").toLowerCase())) {
        return new Response(JSON.stringify({ error: "receipt not ready yet" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { error: genErr } = await admin.functions.invoke("generate-trip-receipt", {
        body: { ride_request_id },
      });
      if (genErr) {
        console.error("[get-receipt-signed-url] generate error", genErr);
        return new Response(JSON.stringify({ error: "could not generate receipt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      receipt = await lookupReceipt();
    }

    if (!receipt) return new Response(JSON.stringify({ error: "receipt not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Allow owner OR admin
    let allowed = receipt.user_id === user.id;
    if (!allowed) {
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" } as any);
      allowed = !!isAdmin;
    }
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: ridePayment } = await admin
      .from("ride_requests")
      .select("payment_status, payment_currency, bakong_reference")
      .eq("id", ride_request_id)
      .maybeSingle();

    if (isBakongReceiptRide(ridePayment as Record<string, unknown> | null) && !String(receipt.pdf_path || "").startsWith("bakong-v2/")) {
      const { error: refreshErr } = await admin.functions.invoke("generate-trip-receipt", {
        body: { ride_request_id, force: true },
      });
      if (refreshErr) {
        console.error("[get-receipt-signed-url] refresh generate error", refreshErr);
        return new Response(JSON.stringify({ error: "could not refresh receipt" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      receipt = await lookupReceipt();
      if (!receipt) return new Response(JSON.stringify({ error: "receipt not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

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
