// CSP violation report sink.
// Browsers POST violation reports here. We log them to public.csp_violations
// so admins can review and tune the policy before switching to enforce mode.

import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

Deno.serve(withSecurity("csp-report", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const reportHeaders = { ...corsHeaders, "Access-Control-Allow-Methods": "POST, OPTIONS" };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: reportHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: reportHeaders });
  }

  try {
    const raw = await req.json().catch(() => null);
    const report = raw?.["csp-report"] ?? raw ?? {};

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await sb.from("csp_violations").insert({
      document_uri: report["document-uri"] ?? null,
      violated_directive: report["violated-directive"] ?? report["effective-directive"] ?? null,
      blocked_uri: report["blocked-uri"] ?? null,
      source_file: report["source-file"] ?? null,
      line_number: report["line-number"] ?? null,
      user_agent: req.headers.get("user-agent"),
      raw: report,
    });
  } catch (e) {
    console.error("[csp-report] failed", e);
  }

  // Always return 204 — never give attackers signal.
  return new Response(null, { status: 204, headers: reportHeaders });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
