// Lightweight Web Application Firewall for edge functions.
// Pattern-based blocklist for SQLi / XSS / path-traversal / oversize payloads /
// SSTI / command injection / LDAP injection / XXE / CRLF / NoSQL / prototype pollution.
// Fail-open on unexpected errors so it never blocks legitimate traffic during incidents.

const SQLI = /(\bunion\b\s+\bselect\b|\bselect\b.+\bfrom\b|\bdrop\s+table\b|\bdrop\s+database\b|\binsert\s+into\b|--\s|;\s*--|\bor\s+1=1\b|\bor\s+'[^']*'='[^']*'|\bxp_cmdshell\b|\bsleep\s*\(|\bbenchmark\s*\(|information_schema\.|sys\.tables|exec\s*\(|cast\s*\(.*\bas\b)/i;
const XSS = /(<script\b|<\/script>|javascript\s*:|vbscript\s*:|data\s*:\s*text\/html|onerror\s*=|onload\s*=|onfocus\s*=|onclick\s*=|onmouseover\s*=|<iframe\b|<frame\b|<object\b|<embed\b|<applet\b|<meta\b|<svg[^>]*on\w+=|expression\s*\()/i;
const TRAVERSAL = /(\.\.[\/\\]){2,}|\/etc\/(?:passwd|shadow|hosts|sudoers)|\/proc\/self|\\windows\\system32|\/var\/www|\/home\/[^/]+\/\.|%2e%2e[%2f%5c]/i;
const NULL_BYTE = /%00|\x00/;

// Server-Side Template Injection (SSTI)
const SSTI = /\{\{.*?\}\}|\$\{[^}]*\}|<%.*?%>|#\{[^}]*\}|\{%.*?%\}/;

// OS command injection
const CMD_INJECTION = /(?:^|[;&|`$])\s*(?:ls|cat|id|whoami|uname|wget|curl|chmod|chown|rm\s+-rf|nc\s+|ncat\s+|bash\s+-[ci]|sh\s+-[ci]|python[23]?\s+-c|perl\s+-e|ruby\s+-e|php\s+-r)\b|\$\([^)]+\)|`[^`]+`/i;

// LDAP injection
const LDAP_INJECTION = /\)\s*\(\s*[|&!]|\*\s*\)\s*\(|\(\s*uid\s*=\s*\*|\(\s*objectClass\s*=\s*\*|%29%28|%2a%29/i;

// XXE (XML External Entities)
const XXE = /<!DOCTYPE\s[^>]*\[|<!ENTITY\s+\S+\s+(?:SYSTEM|PUBLIC)\s+["'][^"']*["']|&\w+;/i;

// CRLF injection / HTTP response splitting
const CRLF = /\r\n|\r|\n|%0[dD]%0[aA]|%0[aA]%0[dD]|%0[aA]|%0[dD]/;

// NoSQL / MongoDB injection
const NOSQL = /\$(?:where|gt|gte|lt|lte|ne|in|nin|or|and|not|nor|exists|type|mod|regex|text|search|geoIntersects|geoWithin|nearSphere|near)\b|\{\s*\$|\[\s*\$|\beval\s*\(/i;

// Prototype pollution
const PROTO_POLLUTION = /__proto__|constructor\s*\[|prototype\s*\[|\[['"]__proto__['"]\]|\[['"]constructor['"]\]/i;

// Double URL encoding (bypass attempt: %25xx)
const DOUBLE_ENCODE = /%25(?:2[fF]|5[cC]|2[eE]|00|0[aAdD])/;

export const MAX_BODY_BYTES = 1_048_576; // 1 MB

export type WafResult =
  | { ok: true }
  | { ok: false; reason: string; pattern: string };

function scan(text: string): WafResult {
  if (NULL_BYTE.test(text))       return { ok: false, reason: 'null_byte',         pattern: 'null' };
  if (DOUBLE_ENCODE.test(text))   return { ok: false, reason: 'double_encoding',   pattern: 'encode' };
  if (SQLI.test(text))            return { ok: false, reason: 'sqli',              pattern: 'sqli' };
  if (XSS.test(text))             return { ok: false, reason: 'xss',               pattern: 'xss' };
  if (TRAVERSAL.test(text))       return { ok: false, reason: 'path_traversal',    pattern: 'traversal' };
  if (SSTI.test(text))            return { ok: false, reason: 'ssti',              pattern: 'ssti' };
  if (CMD_INJECTION.test(text))   return { ok: false, reason: 'cmd_injection',     pattern: 'cmdi' };
  if (LDAP_INJECTION.test(text))  return { ok: false, reason: 'ldap_injection',    pattern: 'ldap' };
  if (XXE.test(text))             return { ok: false, reason: 'xxe',               pattern: 'xxe' };
  if (NOSQL.test(text))           return { ok: false, reason: 'nosql_injection',   pattern: 'nosql' };
  if (PROTO_POLLUTION.test(text)) return { ok: false, reason: 'proto_pollution',   pattern: 'proto' };
  return { ok: true };
}

// CRLF check is applied only to header-injected values, not body
export function scanHeaderValue(value: string): WafResult {
  if (CRLF.test(value)) return { ok: false, reason: 'crlf_injection', pattern: 'crlf' };
  return scan(value);
}

/**
 * Inspect the URL (path + query) plus a snapshot of the body (first 64 KB)
 * for malicious patterns. Returns {ok:false} when a pattern matches.
 */
export async function inspectRequest(req: Request): Promise<WafResult> {
  try {
    const url = new URL(req.url);
    let target = `${url.pathname}${url.search}`;
    try { target = decodeURIComponent(target); } catch { /* keep raw */ }
    const headCheck = scan(target);
    if (!headCheck.ok) return headCheck;

    const lenHeader = req.headers.get('content-length');
    if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
      return { ok: false, reason: 'payload_too_large', pattern: 'size' };
    }

    const ct = req.headers.get('content-type') ?? '';
    if (req.method !== 'GET' && req.method !== 'HEAD' && /json|text|form/i.test(ct)) {
      const cloned = req.clone();
      const buf = await cloned.arrayBuffer();
      if (buf.byteLength > MAX_BODY_BYTES) {
        return { ok: false, reason: 'payload_too_large', pattern: 'size' };
      }
      const slice = new TextDecoder().decode(buf.slice(0, 65_536));
      const bodyCheck = scan(slice);
      if (!bodyCheck.ok) return bodyCheck;
    }
    return { ok: true };
  } catch {
    // Fail-open on inspection errors — better to let the handler decide than to 500.
    return { ok: true };
  }
}

export function clientIp(req: Request): string | null {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-real-ip')
    ?? null;
}
