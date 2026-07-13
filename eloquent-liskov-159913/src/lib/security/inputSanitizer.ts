/**
 * Input sanitizer for user-generated content (UGC).
 * Strips dangerous HTML, encodes entities, and blocks common injection patterns
 * before content is stored or displayed.
 *
 * This is a defence-in-depth layer — do not rely on this alone; also rely on
 * CSP and parameterized DB queries.
 */

// HTML entity encoding map
const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Encode all HTML special characters. Safe for displaying user text in HTML.
 */
export function encodeHtml(input: string): string {
  return input.replace(/[&<>"'`=/]/g, (char) => ENTITY_MAP[char] ?? char);
}

/**
 * Strip all HTML tags. Useful for plain-text fields (names, bio, titles).
 */
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')               // strip tags
    .replace(/&(?:#\d+|#x[\da-f]+|\w+);/gi, ' ') // decode residual entities → space
    .trim();
}

/**
 * Sanitize a plain-text field:
 * - Remove HTML tags
 * - Normalize whitespace
 * - Truncate to maxLength
 */
export function sanitizeText(input: string, maxLength = 1000): string {
  return stripHtml(input)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a name field (profile names, titles, etc.).
 * More restrictive: only allows letters, numbers, spaces, hyphens, apostrophes, dots.
 */
export function sanitizeName(input: string, maxLength = 100): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[^\p{L}\p{N}\s\-'.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitize a URL string. Returns null if the URL is unsafe.
 * Blocks javascript:, data:text/html, and other dangerous schemes.
 */
export function sanitizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase().replace(/\s/g, '');
  const DANGEROUS_SCHEMES = ['javascript:', 'vbscript:', 'data:text/html', 'data:text/javascript', 'blob:'];
  if (DANGEROUS_SCHEMES.some(s => lower.startsWith(s))) return null;
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.href;
  } catch {
    // Relative URLs allowed
    if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
    return null;
  }
}

/**
 * Sanitize multiline user content (bio, descriptions, chat messages).
 * Preserves newlines but removes all HTML.
 */
export function sanitizeContent(input: string, maxLength = 5000): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#\d+|#x[\da-f]+|\w+);/gi, ' ')
    .replace(/[ \t]+/g, ' ')               // collapse horizontal whitespace only
    .trim()
    .slice(0, maxLength);
}

/**
 * Check if a string contains suspicious injection patterns.
 * Returns an array of detected threat types (empty = clean).
 */
export function detectInjection(input: string): string[] {
  const threats: string[] = [];
  if (/<script\b|javascript:|onerror\s*=|onload\s*=/i.test(input)) threats.push('xss');
  if (/(\bunion\b\s+\bselect\b|\bdrop\s+table\b)/i.test(input))    threats.push('sqli');
  if (/\{\{.*?\}\}|\$\{[^}]*\}/i.test(input))                      threats.push('ssti');
  if (/__proto__|prototype\s*\[/i.test(input))                       threats.push('proto_pollution');
  return threats;
}
