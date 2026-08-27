import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

import {
  centsToDecimalUsd,
  decimalUsdToCents,
  isValidCutluyPaymentId,
  parseCutluyLodgingReference,
} from "../_shared/cutluyPolicy.mjs";
import { verifyCutluyWebhookSignature } from "../_shared/cutluySignature.ts";
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
const MAX_WEBHOOK_BODY_BYTES = 64 * 1_024;
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

type NormalizedIngressEvent = {
  id: string;
  type: string;
  created: string;
  fingerprint: string;
  data: {
    payment: {
      id: string;
      status: string;
      amount: string;
      currency: "USD";
      reference_id: string | null;
    };
  };
};

type LeasedEvent = {
  eventId: string;
  eventType: string;
  paymentId: string;
  paymentStatus: string;
  amountCents: number;
  currency: "USD";
  referenceId: string;
};

function record(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function validEventId(value: unknown): string | null {
  const id = nonEmptyString(value);
  return id && EVENT_ID_PATTERN.test(id) ? id.toLowerCase() : null;
}

function validCreatedAt(value: unknown): string | null {
  const created = nonEmptyString(value);
  if (!created || created.length > 64 || !RFC3339_PATTERN.test(created))
    return null;
  return Number.isFinite(Date.parse(created)) ? created : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function sha256Hex(value: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function readBoundedRawBody(req: Request): Promise<Uint8Array | null> {
  const advertised = req.headers.get("Content-Length")?.trim() ?? "";
  if (advertised) {
    if (!/^\d+$/.test(advertised)) return null;
    const advertisedBytes = Number(advertised);
    if (
      !Number.isSafeInteger(advertisedBytes) ||
      advertisedBytes < 1 ||
      advertisedBytes > MAX_WEBHOOK_BODY_BYTES
    )
      return null;
  }

  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_WEBHOOK_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  if (totalBytes === 0) return null;

  const rawBody = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return rawBody;
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

function normalizeIngressEvent(
  parsed: unknown,
  eventHeader: string | null,
  fingerprint: string,
): NormalizedIngressEvent | null {
  const event = record(parsed);
  const data = record(event?.data);
  const rawPayment = record(data?.payment);
  const id = validEventId(event?.id);
  const created = validCreatedAt(event?.created);

  // CutLuy's webhook contract is deliberately required here. Do not accept
  // alternate flattened shapes even though the shared policy can normalize
  // them for other server-only uses.
  if (!event || !data || !rawPayment || !id || !created) return null;

  const type = nonEmptyString(event.type);
  const headerType = nonEmptyString(eventHeader);
  const paymentId = nonEmptyString(rawPayment.id);
  const paymentStatus =
    nonEmptyString(rawPayment.status)?.toLowerCase() ?? null;
  const amountCents = decimalUsdToCents(rawPayment.amount);
  const amount = amountCents ? centsToDecimalUsd(amountCents) : null;
  const currency = nonEmptyString(rawPayment.currency)?.toUpperCase() ?? null;
  const rawReference = rawPayment.reference_id;
  const referenceId =
    rawReference === null || rawReference === undefined
      ? null
      : nonEmptyString(rawReference);

  if (
    !type ||
    !headerType ||
    type !== headerType ||
    !(type in EVENT_STATUS) ||
    !paymentId ||
    !isValidCutluyPaymentId(paymentId) ||
    !paymentStatus ||
    EVENT_STATUS[type] !== paymentStatus ||
    !amount ||
    currency !== "USD" ||
    (rawReference !== null && rawReference !== undefined && !referenceId) ||
    (referenceId !== null && referenceId.length > 256)
  )
    return null;

  return {
    id,
    type,
    created,
    fingerprint,
    data: {
      payment: {
        id: paymentId,
        status: paymentStatus,
        amount,
        currency: "USD",
        reference_id: referenceId,
      },
    },
  };
}

function parseLease(
  value: unknown,
  expectedEventId: string,
): LeasedEvent | null {
  const lease = record(value);
  const eventId = validEventId(lease?.event_id);
  const eventType = nonEmptyString(lease?.event_type);
  const paymentId = nonEmptyString(lease?.payment_id);
  const paymentStatus =
    nonEmptyString(lease?.payment_status)?.toLowerCase() ?? null;
  const amountCents = positiveInteger(lease?.amount_cents);
  const currency = nonEmptyString(lease?.currency)?.toUpperCase() ?? null;
  const referenceId = nonEmptyString(lease?.reference_id);
  const eventCreatedAt = validCreatedAt(lease?.event_created_at);

  if (
    !eventId ||
    eventId !== expectedEventId ||
    !eventType ||
    !(eventType in EVENT_STATUS) ||
    !paymentId ||
    !isValidCutluyPaymentId(paymentId) ||
    !paymentStatus ||
    EVENT_STATUS[eventType] !== paymentStatus ||
    !amountCents ||
    currency !== "USD" ||
    !referenceId ||
    !parseCutluyLodgingReference(referenceId) ||
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
    console.error("[lodging-cutluy-webhook] lease finalization failed");
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
  if (leaseError) {
    console.error("[lodging-cutluy-webhook] lease unavailable");
    return "failed";
  }

  const leaseResponse = record(leaseData);
  const leaseKind = nonEmptyString(leaseResponse?.kind);
  if (leaseKind === "busy") return "busy";
  if (leaseKind === "done") return "done";
  if (leaseKind === "missing") return "missing";
  if (leaseKind !== "leased") {
    console.error("[lodging-cutluy-webhook] unexpected lease response");
    return "failed";
  }

  const lease = parseLease(leaseResponse, eventId);
  if (!lease) {
    await failLease(
      service,
      eventId,
      leaseToken,
      "invalid_leased_event",
      false,
    );
    return "failed";
  }

  // This boolean is intentionally kept beside the only fulfillment-capable
  // RPC call. The database repeats the same event/status check atomically;
  // scanned, expired, and failed events can be recorded but can never fulfill.
  const isFulfillmentEvent =
    lease.eventType === "payment.completed" && lease.paymentStatus === "paid";

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
  const fulfilled = applied?.fulfilled === true;
  if (fulfilled && !isFulfillmentEvent && kind === "applied") {
    // `ignored`/`duplicate` may describe an attempt fulfilled by an earlier
    // completed event. This rejects only a claim that the current non-paid
    // transition itself applied fulfillment.
    console.error(
      "[lodging-cutluy-webhook] non-completed event reported fulfillment",
    );
    return "failed";
  }
  if (
    kind === "applied" ||
    kind === "duplicate" ||
    kind === "manual_review" ||
    kind === "ignored" ||
    kind === "missing"
  ) {
    return kind;
  }

  await failLease(
    service,
    eventId,
    leaseToken,
    "unexpected_apply_result",
    true,
  );
  return "failed";
}

Deno.serve(
  withSecurity(
    "lodging-cutluy-webhook",
    async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers":
          "Content-Type, X-CutLuy-Event, X-CutLuy-Signature",
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

  const webhookSecret = Deno.env.get("CUTLUY_WEBHOOK_SECRET")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
  const serviceRoleKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim() ?? "";
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error(
      "[lodging-cutluy-webhook] required server configuration unavailable",
    );
    return jsonResponse({ error: "service_unavailable" }, 503);
  }

  // The exact bounded bytes are read once and verified before decoding or
  // JSON.parse touches them.
  const rawBody = await readBoundedRawBody(req);
  if (!rawBody) {
    return jsonResponse({ error: "invalid_payload" }, 413);
  }
  const eventHeader = req.headers.get("X-CutLuy-Event");
  const signatureValid = await verifyCutluyWebhookSignature(
    webhookSecret,
    rawBody,
    req.headers.get("X-CutLuy-Signature"),
  );
  if (!signatureValid) {
    return jsonResponse({ error: "invalid_signature" }, 401);
  }

  let parsed: unknown;
  try {
    const decodedBody = new TextDecoder("utf-8", { fatal: true }).decode(
      rawBody,
    );
    parsed = JSON.parse(decodedBody);
  } catch {
    return jsonResponse({ error: "invalid_payload" }, 400);
  }

  const fingerprint = await sha256Hex(rawBody);
  const event = normalizeIngressEvent(parsed, eventHeader, fingerprint);
  if (!event) {
    return jsonResponse({ error: "invalid_payload" }, 400);
  }

  const referenceId = event.data.payment.reference_id;
  if (!referenceId || !parseCutluyLodgingReference(referenceId)) {
    // CutLuy webhooks are project-wide. A signed event for Driver, a dashboard
    // test, or another integration is valid provider traffic but not lodging
    // data; acknowledge it without retaining it or triggering retries.
    return jsonResponse({ received: true, ignored: true }, 202);
  }

  const lodgingEvent = {
    ...event,
    data: {
      payment: {
        ...event.data.payment,
        reference_id: referenceId,
      },
    },
  };

  const service = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: enqueueData, error: enqueueError } = await service.rpc(
    "enqueue_lodging_cutluy_webhook",
    { p_event: lodgingEvent },
  );
  if (enqueueError) {
    // A verified provider event is acknowledged only after its sanitized facts
    // are durable. CutLuy will retry this non-2xx response.
    console.error("[lodging-cutluy-webhook] durable enqueue failed");
    return jsonResponse({ error: "webhook_inbox_unavailable" }, 503);
  }

  const enqueue = record(enqueueData);
  const enqueueKind = nonEmptyString(enqueue?.kind);
  const eventId = validEventId(enqueue?.event_id);
  if (
    (enqueueKind !== "enqueued" &&
      enqueueKind !== "duplicate" &&
      enqueueKind !== "manual_review" &&
      enqueueKind !== "ignored") ||
    !eventId ||
    eventId !== event.id
  ) {
    console.error("[lodging-cutluy-webhook] durable enqueue was not confirmed");
    return jsonResponse({ error: "webhook_inbox_unavailable" }, 503);
  }

  const work = processEvent(service, eventId).catch(() => {
    console.error("[lodging-cutluy-webhook] asynchronous processing failed");
    return "failed" as const;
  });
  const runtime = (
    globalThis as {
      EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
    }
  ).EdgeRuntime;
  if (runtime && typeof runtime.waitUntil === "function") {
    runtime.waitUntil(work);
  } else {
    // Unit/local runtimes do not always provide EdgeRuntime. Awaiting here
    // keeps processing correct even though the response is not early.
    await work;
  }

      return jsonResponse({ received: true }, 202);
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      // HMAC verification must see the exact provider bytes. The shared WAF
      // clones request bodies, so this route deliberately leaves body
      // inspection to the bounded raw-byte reader after header/IP checks.
      skipWaf: true,
      skipBotDetection: true,
      trackNetwork: "suspicious",
    },
  ),
);
