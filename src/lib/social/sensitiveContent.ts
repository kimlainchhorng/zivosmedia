export type SensitiveContentMatch = {
  isSensitive: boolean;
  reason: "creator_marked" | "report_marked" | "keyword_match" | null;
  label: string;
};

const SENSITIVE_CONTENT_PATTERNS: RegExp[] = [
  /\b18\+\b/i,
  /\bnsfw\b/i,
  /\badult\s+content\b/i,
  /\bexplicit\b/i,
  /\bnudity\b/i,
  /\bnude(s)?\b/i,
  /\bsexual(ly)?\b/i,
  /\bporn(ography)?\b/i,
  /\bxxx\b/i,
  /\bonly\s*fans\b/i,
  /\bonlyfans\b/i,
  /\bintimate\s+(image|photo|video|content)s?\b/i,
  /\bnon[-\s]?consensual\b/i,
  /\bsexual\s+exploitation\b/i,
];

const SENSITIVE_REPORT_PATTERNS: RegExp[] = [
  /\bnudity\b/i,
  /\bsexual\b/i,
  /\bnon[-\s]?consensual\b/i,
  /\bminor(s)?\b/i,
  /\bexploitation\b/i,
  /\bintimate\b/i,
];

export const SENSITIVE_MEDIA_PREF_EVENT = "zivo-sensitive-media-preference";
export const SENSITIVE_MEDIA_PREF_STORAGE_PREFIX = "zivo.blur-sensitive-media";

export const getSensitiveMediaPreferenceKey = (userId?: string | null) =>
  `${SENSITIVE_MEDIA_PREF_STORAGE_PREFIX}:${userId || "guest"}`;

export function detectSensitiveContent(
  text?: string | null,
  options: { creatorMarked?: boolean; reportMarked?: boolean; reason?: string | null } = {},
): SensitiveContentMatch {
  if (options.creatorMarked) {
    return { isSensitive: true, reason: "creator_marked", label: "18+ sensitive media" };
  }
  if (options.reportMarked) {
    return { isSensitive: true, reason: "report_marked", label: "Reported sensitive media" };
  }

  const haystack = `${text || ""} ${options.reason || ""}`.trim();
  if (haystack && SENSITIVE_CONTENT_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return { isSensitive: true, reason: "keyword_match", label: "18+ sensitive media" };
  }

  return { isSensitive: false, reason: null, label: "Sensitive media" };
}

export function isSensitiveReportReason(...parts: Array<string | null | undefined>): boolean {
  const reportText = parts.filter(Boolean).join(" ");
  return Boolean(reportText && SENSITIVE_REPORT_PATTERNS.some((pattern) => pattern.test(reportText)));
}

export function isSensitiveSchemaDriftError(error: unknown): boolean {
  const message = String((error as any)?.message || (error as any)?.details || (error as any)?.hint || "");
  return /is_sensitive|sensitive_reason|sensitive_report_count|schema cache|column/i.test(message);
}

export function isCommentSafetySchemaDriftError(error: unknown): boolean {
  const message = String((error as any)?.message || (error as any)?.details || (error as any)?.hint || "");
  return /comment_reports|hidden_at|hidden_by|hidden_reason|sensitive_report_count|schema cache|column|relation .* does not exist/i.test(message);
}

export function isChatMessageSafetySchemaDriftError(error: unknown): boolean {
  const message = String((error as any)?.message || (error as any)?.details || (error as any)?.hint || "");
  return /chat_message_reports|direct_messages.*hidden_at|hidden_by|hidden_reason|sensitive_report_count|schema cache|column|relation .* does not exist/i.test(message);
}

export function isGroupMessageSafetySchemaDriftError(error: unknown): boolean {
  const message = String((error as any)?.message || (error as any)?.details || (error as any)?.hint || "");
  return /group_message_reports|group_messages.*hidden_at|hidden_by|hidden_reason|sensitive_report_count|schema cache|column|relation .* does not exist/i.test(message);
}
