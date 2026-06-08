import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type SupabaseHealth =
  | "reachable"
  | "reachable_rls_protected"
  | "configuration_missing"
  | "degraded";

const APP_NAME = "zivosmedia";
const DEFAULT_VERSION = "1.3.0";

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function isRlsOrPermissionError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "42501" ||
    error.code === "PGRST301" ||
    message.includes("permission denied") ||
    message.includes("row-level security");
}

async function checkSupabaseStatus(): Promise<SupabaseHealth> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return "configuration_missing";
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (!error) return "reachable";
    if (isRlsOrPermissionError(error)) return "reachable_rls_protected";
    return "degraded";
  } catch {
    return "degraded";
  }
}

Deno.serve(withSecurity("zivosmedia-health", async (_req, ctx) => {
  const supabaseStatus = await checkSupabaseStatus();
  const ok = supabaseStatus === "reachable" || supabaseStatus === "reachable_rls_protected";

  return json({
    app: APP_NAME,
    status: ok ? "ok" : "degraded",
    version: Deno.env.get("ZIVOSMEDIA_VERSION") ?? DEFAULT_VERSION,
    supabase_status: supabaseStatus,
    timestamp: new Date().toISOString(),
  }, ok ? 200 : 503, ctx.corsHeaders);
}, {
  strictCors: true,
  allowedMethods: ["GET"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
  skipBotDetection: true,
}));
