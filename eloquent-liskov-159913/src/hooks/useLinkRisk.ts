import { useEffect, useState } from "react";
import {
  isAllowedPartnerUrl, isPunycodeHost, hasSuspiciousTld,
  hasEmbeddedCredentials, isSafeProtocol, isUrlShortener, isZivoTyposquat,
} from "@/lib/urlSafety";

export type LinkRiskLevel = "trusted" | "neutral" | "suspicious" | "blocked";

export interface LinkRisk {
  level: LinkRiskLevel;
  warnings: string[];
}

/** Synchronous heuristic-only assessment — fast, runs on every render */
export function assessLinkSync(url: string): LinkRisk {
  const warnings: string[] = [];
  let host = "";
  try { host = new URL(url).hostname; } catch {
    return { level: "blocked", warnings: ["Invalid URL"] };
  }

  if (!isSafeProtocol(url)) warnings.push("Unsafe protocol");
  if (hasEmbeddedCredentials(url)) warnings.push("Embedded credentials");
  if (isPunycodeHost(url)) warnings.push("Punycode/IDN domain");
  if (hasSuspiciousTld(url)) warnings.push("Suspicious TLD");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) warnings.push("Raw IP address");
  if (url.length > 250) warnings.push("Unusually long URL");
  if (isUrlShortener(url)) warnings.push("URL shortener — destination is hidden");
  if (isZivoTyposquat(url)) warnings.push("Domain impersonates a ZIVO site");

  if (warnings.some(w => w.includes("Unsafe") || w.includes("Embedded") || w.includes("impersonates"))) {
    return { level: "blocked", warnings };
  }
  if (isAllowedPartnerUrl(url) && warnings.length === 0) {
    return { level: "trusted", warnings };
  }
  if (warnings.length > 0) return { level: "suspicious", warnings };
  return { level: "neutral", warnings };
}

/** Hook variant — exposes mutable state if you want to refine via async scan-url later */
export function useLinkRisk(url: string | null | undefined): LinkRisk | null {
  const [risk, setRisk] = useState<LinkRisk | null>(null);
  useEffect(() => {
    if (!url) { setRisk(null); return; }
    setRisk(assessLinkSync(url));
  }, [url]);
  return risk;
}
