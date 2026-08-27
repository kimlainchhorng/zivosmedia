import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  isValidCutluyPaymentId,
  parseCutluyLodgingReference,
} from "../_shared/cutluyPolicy.mjs";
import { withSecurity } from "../_shared/withSecurity.ts";

const EVENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
const EVENT_STATUS: Readonly<Record<string, string>> = {
  "payment.completed": "paid",
  "payment.scanned": "scanned",
  "payment.expired": "expired",
  "payment.failed": "failed",
};
const DEFAULT_BATCH_SIZE = 10;
const MAX_BATCH_SIZE = 20;
const MAX_CONCURRENCY = 4;
const LEASE_SECONDS = 30;

type JsonRecord = Record<string, unknown>;
type ServiceClient = ReturnType<typeof createClient>;
type ProcessingOutcome =
  | "applied"
  | "duplicate"
  | "manual_review"
  | "ignored"
  | "busy"
  | "done"
  | "missing"
  | "failed";

type LeasedEvent = {
  eventId: string;
  eventType: string;
  paymentId: string;
  paymentStatus: string;
  amountCents: number;
  currency: "USD";
  referenceId: string;
};

type Candidate = {
  eventId: string;
  dueAtMs: number;
  receivedAtMs: number;
};

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function validEventId(value: unknown): string | null {
  const id = nonEmptyString(value);
  return id && EVENT_ID_PATTERN.test(id) ? id.toLowerCase() : null;
}

function validCreatedAt(value: unknown): string | null {
  const created = nonEmptyString(value);
  if (!created || created.length > 64 || !RFC3339_PATTERN.test(created)) return null;
  return Number.isFinite(Date.parse(created)) ? created : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = typeof value === "number"
    ? value
    : typeof value === "string" && /^\d+$/.test(value)
    ? Number(value)
    : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function candidateFromRow(
  value: unknown,
  dueColumn: "next_attempt_at" | "lease_expires_at",
): Candidate | null {
  const row = record(value);
  const eventId = validEventId(row?.event_id);
  const dueAtMs = Date.parse(nonEmptyString(row?.[dueColumn]) ?? "");
  const receivedAtMs = Date.parse(nonEmptyString(row?.received_at) ?? "");
  return eventId && Number.isFinite(dueAtMs) && Number.isFinite(receivedAtMs)
    ? { eventId, dueAtMs, receivedAtMs }
    : null;
}

function jsonResponse(body: JsonRecord, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function parseLease(value: unknown, expectedEventId: string): LeasedEvent | null {
  const lease = record(value);
  const eventId = validEventId(lease?.event_id);
  const eventType = nonEmptyString(lease?.event_type);
  const paymentId = nonEmptyString(lease?.payment_id);
  const paymentStatus = nonEmptyString(lease?.payment_status)?.toLowerCase() ?? null;
  const amountCents = positiveInteger(lease?.amount_cents);
  const currency = nonEmptyString(lease?.currency)?.toUpperCase() ?? null;
  const referenceId = nonEmptyString(lease?.reference_id);
  const eventCreatedAt = validCreatedAt(lease?.event_created_at);

  if (
    !eventId || eventId !== expectedEventId ||
    !eventType || !(eventType in EVENT_STATUS) ||
    !paymentId || !isValidCutluyPaymentId(paymentId) ||
    !paymentStatus || EVENT_STATUS[eventType] !== paymentStatus ||
    !amountCents || currency !== "USD" ||
    !referenceId || !parseCutluyLodgingReference(referenceId) ||
    !eventCreatedAt
  ) {
    return null;
  }

  return {
    eventId,
    eventType,
    paymentId,
    paymentStatus,
    amountCents,
    currency: "USD",
    referenceId,
  };
}

async function constantTimeSecretEqual(left: string, right: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = left.length ^ right.length;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

function presentedSecrets(req: Request): string[] {
  const values: string[] = [];
  const authorization = req.headers.get("Authorization")?.trim() ?? "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]?.trim()) values.push(bearerMatch[1].trim());
  const dedicated = req.headers.get("x-cutluy-reconcile-secret")?.trim() ?? "";
  if (dedicated) values.push(dedicated);
  return values;
}

async function authorized(req: Request, configuredSecret: string): Promise<boolean> {
  if (configuredSecret.length < 32) return false;
  const candidates = presentedSecrets(req);
  let accepted = false;
  // Compare every supplied candidate so timing does not reveal which header
  // carried the valid worker credential.
  for (const candidate of candidates) {
    accepted = (await constantTimeSecretEqual(configuredSecret, candidate)) || accepted;
  }
  return accepted;
}

async function readBatchSize(req: Request): Promise<number | null> {
  const raw = await req.text();
  if (!raw.trim()) return DEFAULT_BATCH_SIZE;
  if (raw.length > 1_024) return null;
  try {
    const body = record(JSON.parse(raw));
    if (!body) return null;
    if (body.limit === undefined) return DEFAULT_BATCH_SIZE;
    if (
      typeof body.limit !== "number" || !Number.isFinite(body.limit) ||
      !Number.isInteger(body.limit)
    ) return null;
    return Math.max(1, Math.min(MAX_BATCH_SIZE, body.limit));
  } catch {
    return null;
  }
}

async function failLease(
  service: ServiceClient,
  eventId: string,
  leaseToken: string,
  errorCode: string,
  retryable: boolean,
): Promise<void> {
  const { error } = await service.rpc("fail_lodging_cutluy_webhook", {
    p_event_id: eventId,
    p_lease_token: leaseToken,
    p_error: errorCode,
    p_retryable: retryable,
  });
  if (error) {
    console.error("[reconcile-lodging-cutluy-webhooks] lease finalization failed");
  }
}

async function processEvent(
  service: ServiceClient,
  eventId: string,
): Promise<ProcessingOutcome> {
  const leaseToken = crypto.randomUUID();
  const { data: leaseData, error: leaseError } = await service.rpc(
    "lease_lodging_cutluy_webhook",
    {
      p_event_id: eventId,
      p_lease_token: leaseToken,
      p_lease_seconds: LEASE_SECONDS,
    },
  );
  if (leaseError) return "failed";

  const leaseResponse = record(leaseData);
  const leaseKind = nonEmptyString(leaseResponse?.kind);
  if (leaseKind === "busy") return "busy";
  if (leaseKind === "done") return "done";
  if (leaseKind === "missing") return "missing";
  if (leaseKind !== "leased") return "failed";

  const lease = parseLease(leaseResponse, eventId);
  if (!lease) {
    await failLease(service, eventId, leaseToken, "invalid_leased_event", false);
    return "failed";
  }

  // Only this exact provider transition is fulfillment-capable. The database
  // repeats this gate atomically; every other signed status is record-only.
  const isFulfillmentEvent = lease.eventType === "payment.completed" &&
    lease.paymentStatus === "paid";

  const { data: applyData, error: applyError } = await service.rpc(
    "apply_lodging_cutluy_webhook",
    {
      p_event_id: eventId,
      p_lease_token: leaseToken,
    },
  );
  if (applyError) {
    await failLease(service, eventId, leaseToken, "apply_unavailable", true);
    return "failed";
  }

  const applied = record(applyData);
  const kind = nonEmptyString(applied?.kind);
  if (applied?.fulfilled === true && !isFulfillmentEvent && kind === "applied") {
    console.error(
      "[reconcile-lodging-cutluy-webhooks] non-completed event reported fulfillment",
    );
    return "failed";
  }
  if (
    kind === "applied" || kind === "duplicate" || kind === "manual_review" ||
    kind === "ignored" || kind === "missing"
  ) return kind;

  await failLease(service, eventId, leaseToken, "unexpected_apply_result", true);
  return "failed";
}

Deno.serve(
  withSecurity(
    "reconcile-lodging-cutluy-webhooks",
    async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, X-CutLuy-Reconcile-Secret",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Cache-Control": "no-store",
      },
    });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "POST, OPTIONS", "Cache-Control": "no-store" },
    });
  }

  const reconcileSecret = Deno.env.get("CUTLUY_RECONCILE_SECRET")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (reconcileSecret.length < 32 || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "[reconcile-lodging-cutluy-webhooks] required server configuration unavailable",
    );
    return jsonResponse({ error: "service_unavailable" }, 503);
  }
  if (!(await authorized(req, reconcileSecret))) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const batchSize = await readBatchSize(req);
  if (batchSize === null) {
    return jsonResponse({ error: "invalid_request" }, 400);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const now = new Date().toISOString();
  const [dueResult, staleResult] = await Promise.all([
    service
      .from("lodging_cutluy_webhook_events")
      .select("event_id, next_attempt_at, received_at")
      .in("processing_status", ["queued", "error"])
      .lte("next_attempt_at", now)
      .order("next_attempt_at", { ascending: true })
      .order("received_at", { ascending: true })
      .limit(batchSize),
    service
      .from("lodging_cutluy_webhook_events")
      .select("event_id, lease_expires_at, received_at")
      .eq("processing_status", "processing")
      .lte("lease_expires_at", now)
      .order("lease_expires_at", { ascending: true })
      .order("received_at", { ascending: true })
      .limit(batchSize),
  ]);
  if (dueResult.error || staleResult.error) {
    console.error("[reconcile-lodging-cutluy-webhooks] inbox selection failed");
    return jsonResponse({ error: "webhook_inbox_unavailable" }, 503);
  }

  const rawCandidates = [
    ...(dueResult.data ?? []).map((row: unknown) =>
      candidateFromRow(row, "next_attempt_at")
    ),
    ...(staleResult.data ?? []).map((row: unknown) =>
      candidateFromRow(row, "lease_expires_at")
    ),
  ];
  const candidates = rawCandidates
    .filter((candidate: Candidate | null): candidate is Candidate => Boolean(candidate))
    .sort((left, right) =>
      left.dueAtMs - right.dueAtMs ||
      left.receivedAtMs - right.receivedAtMs ||
      left.eventId.localeCompare(right.eventId)
    );
  const seen = new Set<string>();
  const eventIds: string[] = [];
  for (const candidate of candidates) {
    if (seen.has(candidate.eventId)) continue;
    seen.add(candidate.eventId);
    eventIds.push(candidate.eventId);
    if (eventIds.length >= batchSize) break;
  }
  const counts: Record<ProcessingOutcome, number> = {
    applied: 0,
    duplicate: 0,
    manual_review: 0,
    ignored: 0,
    busy: 0,
    done: 0,
    missing: 0,
    failed: rawCandidates.length - candidates.length,
  };

  for (let offset = 0; offset < eventIds.length; offset += MAX_CONCURRENCY) {
    const outcomes = await Promise.all(
      eventIds.slice(offset, offset + MAX_CONCURRENCY).map((eventId) =>
        processEvent(service, eventId).catch(() => "failed" as const)
      ),
    );
    for (const outcome of outcomes) counts[outcome] += 1;
  }

      return jsonResponse({
        ok: true,
        selected: eventIds.length,
        processed: eventIds.length,
        outcomes: counts,
      }, 200);
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      skipBotDetection: true,
      trackNetwork: "suspicious",
    },
  ),
);
