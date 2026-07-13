import { validateExternalUrl } from "@/lib/urlSafety";
import { assessLinkSync, type LinkRiskLevel } from "@/hooks/useLinkRisk";

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const HTTP_URL_REGEX = /https?:\/\/[^\s<>"']+/gi;

const DANGEROUS_PROTOCOL_TOKEN_REGEX = /(?:^|\s)(?:javascript|data|vbscript|blob)\s*:/i;
const OBFUSCATED_HTTP_REGEX = /hxxps?:\/\//i;
const CREDENTIALS_IN_URL_REGEX = /https?:\/\/[^\s/@]+@[^\s/]+/i;
const PUNYCODE_HOST_REGEX = /https?:\/\/[^\s/]*xn--/i;

export interface ChatMessageRiskAssessment {
  blocked: boolean;
  warnings: string[];
}

export function sanitizeOutgoingMessage(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(CONTROL_CHARS_REGEX, "")
    .trim();
}

export function extractHttpUrls(text: string): string[] {
  return text.match(HTTP_URL_REGEX) || [];
}

export function assessChatMessageRisk(text: string): ChatMessageRiskAssessment {
  const warnings: string[] = [];

  if (DANGEROUS_PROTOCOL_TOKEN_REGEX.test(text)) {
    return { blocked: true, warnings: ["dangerous_protocol"] };
  }

  if (OBFUSCATED_HTTP_REGEX.test(text)) {
    warnings.push("obfuscated_link");
  }

  if (CREDENTIALS_IN_URL_REGEX.test(text)) {
    warnings.push("credentials_in_url");
  }

  if (PUNYCODE_HOST_REGEX.test(text)) {
    warnings.push("punycode_domain");
  }

  const urls = extractHttpUrls(text);
  for (const url of urls) {
    if (!validateExternalUrl(url)) {
      warnings.push("invalid_url");
      break;
    }
  }

  return { blocked: false, warnings };
}

// ── Inbound (recipient-side) risk assessment ────────────────────────────────
// Sender-side gates (assessChatMessageRisk + server contentLinkValidation) catch
// most phishing at write time. But a recipient may still receive a malicious
// link from: (a) a compromised account that bypassed the JS gate, (b) historical
// messages predating the gate, or (c) a bug. Run this in the message renderer
// to mark inbound URLs trusted/suspicious/blocked before exposing them as
// clickable.
export interface InboundUrlRisk {
  url: string;
  level: LinkRiskLevel;
  warnings: string[];
}

export interface InboundChatRiskAssessment {
  worstLevel: LinkRiskLevel;
  urls: InboundUrlRisk[];
  hasBlocked: boolean;
  hasSuspicious: boolean;
}

const RANK: Record<LinkRiskLevel, number> = {
  trusted: 0, neutral: 1, suspicious: 2, blocked: 3,
};

export function assessIncomingChatRisk(text: string): InboundChatRiskAssessment {
  const urls = extractHttpUrls(text);
  const assessed: InboundUrlRisk[] = urls.map((url) => {
    const r = assessLinkSync(url);
    return { url, level: r.level, warnings: r.warnings };
  });

  let worst: LinkRiskLevel = "trusted";
  for (const u of assessed) {
    if (RANK[u.level] > RANK[worst]) worst = u.level;
  }

  return {
    worstLevel: worst,
    urls: assessed,
    hasBlocked: assessed.some((u) => u.level === "blocked"),
    hasSuspicious: assessed.some((u) => u.level === "suspicious"),
  };
}

/** Quick boolean for "should the recipient see a phishing warning banner?" */
export function shouldWarnRecipient(text: string): boolean {
  const r = assessIncomingChatRisk(text);
  return r.hasBlocked || r.hasSuspicious;
}
