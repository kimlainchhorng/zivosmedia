/**
 * Invoice/Estimate actions — soft delete, update, duplicate, mark paid, convert.
 * Centralises every mutation so the UI stays clean.
 */
import { supabase } from "@/integrations/supabase/client";

export type DocType = "invoice" | "estimate";

const TABLE: Record<DocType, "ar_invoices" | "ar_estimates"> = {
  invoice: "ar_invoices",
  estimate: "ar_estimates",
};

const NUMBER_PREFIX: Record<DocType, string> = {
  invoice: "INV-",
  estimate: "EST-",
};

/** Soft-delete a document — keeps row for finance history. */
export async function softDeleteDocument(type: DocType, id: string) {
  const { error } = await supabase
    .from(TABLE[type] as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

/** Update arbitrary fields on a document. */
export async function updateDocument(type: DocType, id: string, patch: Record<string, any>) {
  const { error } = await supabase
    .from(TABLE[type] as any)
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

/** Mark a document as sent (used by Send action). */
export async function markSent(type: DocType, id: string) {
  await updateDocument(type, id, {
    status: "sent",
    sent_at: new Date().toISOString(),
  });
}

/** Record a payment against an invoice and roll up amount_paid_cents / status. */
export async function recordInvoicePayment(opts: {
  storeId: string;
  invoiceId: string;
  amountCents: number;
  method: string;
  reference?: string;
  notes?: string;
  totalCents: number;
  alreadyPaidCents: number;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error: payErr } = await supabase
    .from("ar_invoice_payments" as any)
    .insert({
      store_id: opts.storeId,
      invoice_id: opts.invoiceId,
      amount_cents: opts.amountCents,
      method: opts.method,
      reference: opts.reference || null,
      notes: opts.notes || null,
      paid_at: new Date().toISOString(),
      created_by: user?.id,
    });
  if (payErr) throw payErr;

  // The ar_recalc_invoice_payment DB trigger is the single source of truth for
  // amount_paid_cents / status / paid_at (it sums all payment rows). We do NOT
  // write those here — doing so would race the trigger and could drift if the
  // passed-in alreadyPaidCents is stale. We just derive the new status for the
  // toast message.
  const newPaid = opts.alreadyPaidCents + opts.amountCents;
  const newStatus = newPaid >= opts.totalCents ? "paid" : "partially_paid";

  return { newPaid, newStatus };
}

/**
 * Provisional, client-side number for display while a draft is being edited.
 * NOT authoritative — the real, guaranteed-unique number is assigned by
 * assignDocNumber() at save time. Random suffix avoids two open drafts showing
 * the same placeholder.
 */
export function nextDocNumber(type: DocType): string {
  return `${NUMBER_PREFIX[type]}${Math.floor(1000 + Math.random() * 9000)}`;
}

/**
 * Preview the number a NEW document WILL get, without consuming one.
 *
 * The authoritative counter (ar_doc_counters) is RLS-locked — only the
 * SECURITY DEFINER allocator can read it — so we derive the next number the
 * same way that counter was seeded: max numeric suffix of existing docs + 1,
 * floored at 1000 (→ first number 1001). This is DISPLAY-ONLY; the real,
 * guaranteed-unique number is still allocated atomically by assignDocNumber()
 * at save time, so two open drafts can never collide.
 */
export async function peekDocNumber(storeId: string, type: DocType): Promise<string> {
  // Include soft-deleted rows: the atomic counter is seeded from the max of ALL
  // docs and never decrements on delete, so counting them mirrors it most closely.
  const { data, error } = await supabase
    .from(TABLE[type] as any)
    .select("number")
    .eq("store_id", storeId);
  if (error || !data) return `${NUMBER_PREFIX[type]}1001`;
  let max = 1000;
  for (const row of data as any[]) {
    const digits = String(row?.number ?? "").replace(/\D/g, "");
    if (digits.length >= 1 && digits.length <= 5) {
      const n = parseInt(digits, 10);
      if (Number.isFinite(n) && n > max) max = n;
    }
  }
  return `${NUMBER_PREFIX[type]}${max + 1}`;
}

/**
 * Allocate the authoritative, per-store sequential number for a NEW document
 * via the ar_next_doc_number RPC (atomic counter + UNIQUE constraint at the DB).
 * Falls back to a provisional number if the RPC is unavailable so saving never
 * hard-fails on numbering alone.
 */
export async function assignDocNumber(storeId: string, type: DocType): Promise<string> {
  const { data, error } = await supabase.rpc("ar_next_doc_number" as any, {
    _store_id: storeId,
    _doc_type: type,
  });
  if (error || !data) return nextDocNumber(type);
  return data as string;
}

/**
 * Allocate the authoritative, per-store sequential WORK ORDER number (WO-####)
 * via the same atomic counter RPC. Falls back to a timestamp number so saving
 * never hard-fails on numbering alone.
 */
export async function assignWorkOrderNumber(storeId: string): Promise<string> {
  const { data, error } = await supabase.rpc("ar_next_doc_number" as any, {
    _store_id: storeId,
    _doc_type: "workorder",
  });
  if (error || !data) return `WO-${Date.now().toString().slice(-6)}`;
  return data as string;
}

/** Create a public share link valid for N days. */
export async function createShareLink(opts: {
  storeId: string;
  docId: string;
  docType: DocType;
  expiresInDays?: number;
}): Promise<{ token: string; url: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  const expiresAt = new Date(Date.now() + (opts.expiresInDays ?? 60) * 86400000);
  const { data, error } = await supabase
    .from("ar_document_share_links" as any)
    .insert({
      store_id: opts.storeId,
      doc_id: opts.docId,
      doc_type: opts.docType,
      expires_at: expiresAt.toISOString(),
      created_by: user?.id,
    })
    .select("token")
    .single();
  if (error) throw error;
  const token = (data as any).token as string;
  const url = `${window.location.origin}/d/${token}`;
  return { token, url };
}
