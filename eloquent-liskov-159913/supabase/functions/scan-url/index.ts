// Lightweight URL safety scanner — heuristic checks before message/post submission.
// Runs without external API keys; if GOOGLE_SAFE_BROWSING_KEY is set, also queries Safe Browsing.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUSPICIOUS_TLDS = [
  ".zip", ".mov", ".country", ".kim", ".cricket", ".science", ".work",
  ".party", ".gq", ".cf", ".tk", ".ml", ".ga", ".top", ".xin", ".loan",
];

const KNOWN_BAD_HOSTS = new Set<string>([
  // Add internal blocklist entries here
]);

interface ScanResult {
  url: string;
  safe: boolean;
  warnings: string[];
}

function heuristicScan(rawUrl: string): ScanResult {
  const warnings: string[] = [];
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { url: rawUrl, safe: false, warnings: ["invalid_url"] };
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    warnings.push("unsafe_protocol");
  }
  const host = parsed.hostname.toLowerCase();
  if (KNOWN_BAD_HOSTS.has(host)) warnings.push("blocklisted_host");
  if (host.split(".").some(p => p.startsWith("xn--"))) warnings.push("punycode_host");
  if (SUSPICIOUS_TLDS.some(t => host.endsWith(t))) warnings.push("suspicious_tld");
  if (parsed.username || parsed.password) warnings.push("embedded_credentials");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) warnings.push("raw_ip_host");

  const blocking = ["unsafe_protocol", "blocklisted_host", "embedded_credentials"];
  const safe = !warnings.some(w => blocking.includes(w));
  return { url: rawUrl, safe, warnings };
}

async function safeBrowsingScan(urls: string[]): Promise<Set<string>> {
  const key = Deno.env.get("GOOGLE_SAFE_BROWSING_KEY");
  if (!key || urls.length === 0) return new Set();
  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "zivo", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: urls.map(u => ({ url: u })),
          },
        }),
      },
    );
    if (!res.ok) return new Set();
    const data = await res.json();
    const flagged = new Set<string>();
    for (const m of data.matches || []) {
      if (m?.threat?.url) flagged.add(m.threat.url);
    }
    return flagged;
  } catch {
    return new Set();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const body = await req.json();
    const urls: string[] = Array.isArray(body?.urls)
      ? body.urls.filter((u: unknown) => typeof u === "string").slice(0, 25)
      : typeof body?.url === "string" ? [body.url] : [];

    if (urls.length === 0) {
      return new Response(JSON.stringify({ results: [], safe: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = urls.map(heuristicScan);
    const candidates = results.filter(r => r.safe).map(r => r.url);
    const flagged = await safeBrowsingScan(candidates);
    for (const r of results) {
      if (flagged.has(r.url)) {
        r.safe = false;
        r.warnings.push("safe_browsing_threat");
      }
    }
    const allSafe = results.every(r => r.safe);
    return new Response(JSON.stringify({ results, safe: allSafe }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scan-url error:", err);
    return new Response(JSON.stringify({ error: "scan_failed", safe: true, results: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
