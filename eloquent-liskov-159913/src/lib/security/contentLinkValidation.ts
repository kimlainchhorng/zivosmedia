import { assessLinkSync } from "@/hooks/useLinkRisk";
import { toast } from "sonner";

const URL_REGEX = /(https?:\/\/[^\s<>"']+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"']*)/gi;

export interface ContentLinkScan {
  blocked: string[];
  suspicious: string[];
  ok: boolean;
}

/**
 * Scan free-form user text for URLs and assess each via assessLinkSync.
 * `ok` is true when no link is hard-blocked. Suspicious links are reported
 * but don't fail validation — that decision is up to the caller.
 */
export function scanContentForLinks(text: string | null | undefined): ContentLinkScan {
  const result: ContentLinkScan = { blocked: [], suspicious: [], ok: true };
  if (!text) return result;

  const seen = new Set<string>();
  const matches = text.match(URL_REGEX) || [];
  for (const raw of matches) {
    const cleaned = raw.replace(/[.,;:!?)"']+$/g, "");
    const href = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    if (seen.has(href)) continue;
    seen.add(href);
    const { level } = assessLinkSync(href);
    if (level === "blocked") result.blocked.push(href);
    else if (level === "suspicious") result.suspicious.push(href);
  }
  result.ok = result.blocked.length === 0;
  return result;
}

/**
 * Convenience: scan and toast a clear rejection message if any link is
 * hard-blocked (impersonation, unsafe protocol, embedded creds). Returns
 * `true` if the text is safe enough to save.
 */
export function confirmContentSafe(text: string | null | undefined, label = "content"): boolean {
  const scan = scanContentForLinks(text);
  if (!scan.ok) {
    const sample = scan.blocked[0]?.slice(0, 80) || "";
    toast.error(`Your ${label} contains a blocked link${sample ? ` (${sample}…)` : ""}. Remove it and try again.`);
    return false;
  }
  if (scan.suspicious.length > 0) {
    toast.warning(`Your ${label} contains a suspicious link — viewers will see a warning before opening it.`);
  }
  return true;
}
