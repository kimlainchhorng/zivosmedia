import type { ReactNode } from "react";
import SafeExternalLink from "@/components/security/SafeExternalLink";

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;

/**
 * Turn plain text into ReactNode array, replacing URLs with <SafeExternalLink>.
 * Use anywhere user-generated text is rendered: captions, comments, bios, chat.
 */
export function linkifySafe(text: string, opts?: { showBadge?: boolean }): ReactNode[] {
  if (!text) return [];
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(URL_REGEX);
  let i = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(
      <SafeExternalLink
        key={`lnk-${i++}-${match.index}`}
        href={match[0]}
        showBadge={opts?.showBadge ?? true}
        className="text-primary"
      />
    );
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
