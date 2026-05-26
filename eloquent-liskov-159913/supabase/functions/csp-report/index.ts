// CSP violation report sink.
// Browsers POST violation reports here. We log them to public.csp_violations
// so admins can review and tune the policy before switching to enforce mode.

import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
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
  return new Response(null, { status: 204, headers: corsHeaders });
});
