// Audit + security event recording with PII auto-redaction.

import { createClient } from './deps.ts';

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g;
const CARD_RE = /\b(?:\d[ -]*?){13,19}\b/g;

export function redactPii<T>(input: T): T {
  if (input == null) return input;
  if (typeof input === 'string') {
    return input
      .replace(EMAIL_RE, '[email]')
      .replace(CARD_RE, '[card]')
      .replace(PHONE_RE, '[phone]') as unknown as T;
  }
  if (Array.isArray(input)) return input.map(redactPii) as unknown as T;
  if (typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (/password|secret|token|api[_-]?key|authorization/i.test(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = redactPii(v);
      }
    }
    return out as T;
  }
  return input;
}

function adminClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

export interface SecurityEventInput {
  eventType: string;
  severity?: 'info' | 'warn' | 'error' | 'critical';
  userId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  route?: string;
  data?: Record<string, unknown>;
  blocked?: boolean;
}

export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  try {
    const sb = adminClient();
    await sb.from('security_events').insert({
      event_type: input.eventType,
      severity: input.severity ?? 'info',
      user_id: input.userId ?? null,
      ip_address: input.ip ?? null,
      user_agent: input.userAgent ?? null,
      event_data: redactPii({ route: input.route, ...(input.data ?? {}) }),
      is_blocked: input.blocked ?? false,
    });
  } catch (e) {
    // never let audit failures bubble up
    console.error(JSON.stringify({ level: 'error', msg: 'audit_failed', error: String(e) }));
  }
}

export interface NetworkEventInput {
  route: string;
  ipHash?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  asn?: string | null;
  colo?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  riskScore: number;
  signals: string[];
  blocked?: boolean;
}

export async function recordNetworkEvent(input: NetworkEventInput): Promise<void> {
  try {
    const sb = adminClient();
    await sb.from("network_security_events").insert({
      route: input.route,
      ip_hash: input.ipHash ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      city: input.city ?? null,
      asn: input.asn ?? null,
      colo: input.colo ?? null,
      user_agent: input.userAgent ?? null,
      request_id: input.requestId ?? null,
      risk_score: input.riskScore,
      signals: input.signals,
      blocked: input.blocked ?? false,
    });
  } catch (e) {
    console.error(JSON.stringify({ level: "error", msg: "network_event_failed", error: String(e) }));
  }
}

export interface AuditInput {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const sb = adminClient();
    await sb.from('audit_logs').insert({
      user_id: input.actorId ?? null,
      action: input.action,
      table_name: input.resource,
      record_id: input.resourceId ?? null,
      old_values: input.before ? redactPii(input.before) : null,
      new_values: input.after ? redactPii(input.after) : null,
      ip_address: input.ip ?? null,
    });
  } catch (e) {
    console.error(JSON.stringify({ level: 'error', msg: 'audit_log_failed', error: String(e) }));
  }
}
