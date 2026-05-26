/**
 * Format an engagement count (likes / comments / shares) for compact display.
 * Returns null when there's nothing to render so callers can omit the label.
 *
 *   0           -> null
 *   1..999      -> "1", "42", "999"
 *   1k..9.9k    -> "1.2k"
 *   10k..999k   -> "12k"
 *   1M+         -> "1.2M"
 */
export function formatCount(value: number | null | undefined): string | null {
  if (!value || value <= 0 || !Number.isFinite(value)) return null;
  if (value < 1000) return String(Math.floor(value));
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  if (value < 1_000_000) return `${Math.floor(value / 1000)}k`;
  if (value < 10_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  return `${Math.floor(value / 1_000_000)}M`;
}

/**
 * Comments link copy.
 *   1     -> "View 1 comment"
 *   2-999 -> "View all 12 comments"
 *   1k+   -> "View all 1.2k comments"
 */
export function commentsLinkLabel(count: number): string {
  if (count <= 0) return "";
  if (count === 1) return "View 1 comment";
  return `View all ${formatCount(count)} comments`;
}
