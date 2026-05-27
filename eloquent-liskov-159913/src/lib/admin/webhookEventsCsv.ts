/**
 * webhookEventsCsv — Build + download a CSV snapshot of lodging Stripe webhook events.
 * Excel-friendly: UTF-8 BOM, CRLF, RFC4180 quoting. Schema-versioned for downstream consumers.
 */
export const WEBHOOK_EVENTS_CSV_SCHEMA_VERSION = 1;

export interface WebhookEventRow {
  stripe_event_id: string;
  event_type: string;
  event_created_at: string | null;
  received_at: string;
  reservation_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  processing_status: string;
  error_message: string | null;
}

const escape = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;

export function buildWebhookEventsCsv(rows: WebhookEventRow[]): string {
  const headers = [
    "received_at_iso",
    "event_created_at_iso",
    "stripe_event_id",
    "event_type",
    "processing_status",
    "reservation_id",
    "stripe_payment_intent_id",
    "stripe_session_id",
    "error_message",
  ];
  const dataRows = rows.map((e) =>
    [
      e.received_at,
      e.event_created_at || "",
      e.stripe_event_id,
      e.event_type,
      e.processing_status,
      e.reservation_id || "",
      e.stripe_payment_intent_id || "",
      e.stripe_session_id || "",
      e.error_message || "",
    ].map(escape).join(",")
  );
  const meta = [
    `# schema_version=${WEBHOOK_EVENTS_CSV_SCHEMA_VERSION}`,
    `# generated_at=${new Date().toISOString()}`,
    `# row_count=${rows.length}`,
  ];
  return "\uFEFF" + [...meta, headers.join(","), ...dataRows].join("\r\n");
}

export function downloadWebhookEventsCsv(rows: WebhookEventRow[]): void {
  const csv = buildWebhookEventsCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lodging-webhook-events-${stamp(new Date())}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
