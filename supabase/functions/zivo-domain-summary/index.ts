// zivo-domain-summary
//
// Main ZivosMedia aggregation bridge. This endpoint validates a main ZIVO auth
// token, then calls configured per-domain summary RPCs with that same user JWT.
// It intentionally does not probe operational tables directly.
import { createClient } from "../_shared/deps.ts";
import { err, ok } from "../_shared/respond.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type DomainKey = "driver" | "travel" | "software";

type DomainConfig = {
  key: DomainKey;
  label: string;
  fallbackUrl: string;
  urlEnv: string;
  browserUrlEnv: string;
  keyEnv: string;
  browserKeyEnv: string;
  rpcEnv: string;
  defaultRpc: string;
};

const DOMAINS: DomainConfig[] = [
  {
    key: "driver",
    label: "Zivo Driver",
    fallbackUrl: "https://yiedlgoxwjmansszdypf.supabase.co",
    urlEnv: "ZIVO_DRIVER_SUPABASE_URL",
    browserUrlEnv: "VITE_ZIVO_DRIVER_SUPABASE_URL",
    keyEnv: "ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY",
    browserKeyEnv: "VITE_ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY",
    rpcEnv: "ZIVO_DRIVER_SUMMARY_RPC",
    defaultRpc: "zivo_driver_share_summary",
  },
  {
    key: "travel",
    label: "Zivo Travel",
    fallbackUrl: "https://xbllvmpomorawkcrtbcq.supabase.co",
    urlEnv: "ZIVO_TRAVEL_SUPABASE_URL",
    browserUrlEnv: "VITE_ZIVO_TRAVEL_SUPABASE_URL",
    keyEnv: "ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY",
    browserKeyEnv: "VITE_ZIVO_TRAVEL_SUPABASE_PUBLISHABLE_KEY",
    rpcEnv: "ZIVO_TRAVEL_SUMMARY_RPC",
    defaultRpc: "zivo_travel_share_summary",
  },
  {
    key: "software",
    label: "Zivo Software",
    fallbackUrl: "https://ydxztoresbdeoeijhxww.supabase.co",
    urlEnv: "ZIVO_SOFTWARE_SUPABASE_URL",
    browserUrlEnv: "VITE_ZIVO_SOFTWARE_SUPABASE_URL",
    keyEnv: "ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
    browserKeyEnv: "VITE_ZIVO_SOFTWARE_SUPABASE_PUBLISHABLE_KEY",
    rpcEnv: "ZIVO_SOFTWARE_SUMMARY_RPC",
    defaultRpc: "zivo_software_share_summary",
  },
];

const DOMAIN_KEYS = new Set(DOMAINS.map((domain) => domain.key));

function env(name: string): string {
  return Deno.env.get(name)?.trim() ?? "";
}

function domainUrl(config: DomainConfig): string {
  return env(config.urlEnv) || env(config.browserUrlEnv) || config.fallbackUrl;
}

function domainPublishableKey(config: DomainConfig): string {
  return env(config.keyEnv) || env(config.browserKeyEnv);
}

function domainRpc(config: DomainConfig): string {
  return env(config.rpcEnv) || config.defaultRpc;
}

function pickDomains(value: unknown): DomainConfig[] {
  if (!Array.isArray(value)) return DOMAINS;
  const requested = value
    .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : ""))
    .filter((item): item is DomainKey => DOMAIN_KEYS.has(item as DomainKey));
  if (!requested.length) return DOMAINS;
  return DOMAINS.filter((domain) => requested.includes(domain.key));
}

async function readJsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? body as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function publicDomainState(config: DomainConfig, status: string, extra: Record<string, unknown> = {}) {
  return {
    key: config.key,
    label: config.label,
    status,
    ...extra,
  };
}

async function callDomainSummary(
  config: DomainConfig,
  authHeader: string,
  userId: string,
  limit: number,
) {
  const url = domainUrl(config);
  const publishableKey = domainPublishableKey(config);
  const rpc = domainRpc(config);

  if (!publishableKey) {
    return publicDomainState(config, "missing_publishable_key");
  }

  if (!rpc) {
    return publicDomainState(config, "pending_summary_rpc", {
      project_url: url,
      expected_secret: config.rpcEnv,
    });
  }

  const client = createClient(url, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.rpc(rpc, {
    p_user_id: userId,
    p_limit: limit,
  });

  if (error) {
    return publicDomainState(config, "summary_rpc_error", {
      message: error.message,
    });
  }

  return publicDomainState(config, "ok", {
    summary: data ?? null,
  });
}

Deno.serve(withSecurity("zivo-domain-summary", async (req, ctx) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return err(ctx.corsHeaders, "Unauthorized", 401);
  }

  const mainUrl = env("SUPABASE_URL");
  const mainAnonKey = env("SUPABASE_ANON_KEY") || env("SUPABASE_PUBLISHABLE_KEY");
  if (!mainUrl || !mainAnonKey) {
    return err(ctx.corsHeaders, "Main ZIVO auth is not configured", 500);
  }

  const token = authHeader.replace(/^bearer\s+/i, "");
  const main = createClient(mainUrl, mainAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: claimsData, error: claimsError } = await main.auth.getClaims(token);
  const userId = claimsData?.claims?.sub as string | undefined;
  if (claimsError || !userId) {
    return err(ctx.corsHeaders, "Unauthorized", 401);
  }

  const body = await readJsonBody(req);
  const limit = Math.min(Math.max(Number(body.limit ?? 10) || 10, 1), 25);
  const domains = pickDomains(body.domains);

  const summaries = await Promise.all(
    domains.map((domain) => callDomainSummary(domain, authHeader, userId, limit)),
  );

  return ok(ctx.corsHeaders, {
    user_id: userId,
    domains: summaries,
    generated_at: new Date().toISOString(),
  });
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));
