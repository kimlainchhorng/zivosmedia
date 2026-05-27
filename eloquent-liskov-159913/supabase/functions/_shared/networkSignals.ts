import { clientIp } from "./waf.ts";

export interface NetworkSignals {
  ip: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  asn: string | null;
  colo: string | null;
  forwardedForCount: number;
  riskScore: number;
  signals: string[];
  probableProxyOrVpn: boolean;
}

const SUSPICIOUS_PROXY_HEADERS = [
  "x-proxy-id",
  "x-vpn",
  "x-real-ip-country",
  "x-anonymous-proxy",
  "x-forwarded-host",
  "via",
  "forwarded",
] as const;

function clean(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function forwardedForCount(req: Request): number {
  const value = req.headers.get("x-forwarded-for");
  if (!value) return 0;
  return value.split(",").map((part) => part.trim()).filter(Boolean).length;
}

export function assessNetwork(req: Request): NetworkSignals {
  const signals: string[] = [];
  const ip = clientIp(req);
  const count = forwardedForCount(req);
  const userAgent = req.headers.get("user-agent") ?? "";

  let riskScore = 0;

  if (!ip) {
    signals.push("missing_ip");
    riskScore += 15;
  }

  if (count >= 3) {
    signals.push("long_forwarded_chain");
    riskScore += Math.min(30, count * 8);
  }

  for (const header of SUSPICIOUS_PROXY_HEADERS) {
    if (req.headers.has(header)) {
      signals.push(`header:${header}`);
      riskScore += 10;
    }
  }

  if (/vpn|proxy|tor|anonym/i.test(userAgent)) {
    signals.push("ua_proxy_keyword");
    riskScore += 20;
  }

  const country = clean(
    req.headers.get("cf-ipcountry") ??
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("x-country-code"),
  );
  const region = clean(req.headers.get("x-vercel-ip-country-region"));
  const city = clean(req.headers.get("x-vercel-ip-city"));
  const asn = clean(req.headers.get("cf-asn") ?? req.headers.get("x-asn"));
  const colo = clean(req.headers.get("cf-colo"));

  if (country === "T1") {
    signals.push("tor_exit_country_code");
    riskScore += 45;
  }

  const probableProxyOrVpn = riskScore >= 35;

  return {
    ip,
    country,
    region,
    city,
    asn,
    colo,
    forwardedForCount: count,
    riskScore: Math.min(riskScore, 100),
    signals,
    probableProxyOrVpn,
  };
}
