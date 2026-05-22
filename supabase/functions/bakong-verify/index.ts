/**
 * bakong-verify — Verifies a KHQR payment via the Bakong Open API.
 *
 * The client sends the KHQR string it generated for the payment.
 * We compute MD5 of the string, then ask Bakong API
 * `check_transaction_by_md5`. Bakong returns `SUCCESS` once a customer
 * has paid that exact KHQR.
 *
 * Required Supabase secret: `BAKONG_TOKEN` (JWT from api-bakong.nbc.gov.kh).
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const BAKONG_API = "https://api-bakong.nbc.gov.kh/v1";

async function md5Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(withSecurity("bakong-verify", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const token = Deno.env.get("BAKONG_TOKEN");
    if (!token) throw new Error("BAKONG_TOKEN not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const qrString: string | undefined = body.qr;
    if (!qrString || typeof qrString !== "string") {
      return new Response(JSON.stringify({ error: "Missing qr" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const md5 = await md5Hex(qrString);

    const resp = await fetch(`${BAKONG_API}/check_transaction_by_md5`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ md5 }),
    });

    const data = await resp.json().catch(() => ({}));

    // Bakong returns { responseCode: 0, responseMessage: "Success", data: {...} } when paid.
    const paid = data?.responseCode === 0;

    return new Response(
      JSON.stringify({
        ok: true,
        paid,
        md5,
        bakong: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
