/**
 * affiliate-link-redirect
 * -----------------------
 * Resolves an affiliate slug and records the click server-side before the
 * browser redirects. This keeps affiliate metrics out of client-controlled
 * updates while preserving the lightweight /r/:slug route.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const slugPattern = /^[a-z0-9-]{3,80}$/;

serve(withSecurity("affiliate-link-redirect", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const slug = String(body.slug || "").trim().toLowerCase();
    if (!slugPattern.test(slug)) return json({ error: "Invalid affiliate link" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data, error } = await supabase.rpc("record_affiliate_link_click", { p_slug: slug });
    if (error || !data) return json({ error: "Affiliate link not found" }, 404);

    return json({ target_url: addUtm(String(data), slug) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[affiliate-link-redirect]", message);
    return json({ error: message }, 400);
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function addUtm(targetUrl: string, slug: string): string {
  const url = new URL(targetUrl);
  url.searchParams.set("utm_source", "zivo");
  url.searchParams.set("utm_medium", "affiliate");
  url.searchParams.set("utm_campaign", slug);
  return url.toString();
}
