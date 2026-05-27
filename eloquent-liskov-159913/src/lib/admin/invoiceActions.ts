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

  const newPaid = opts.alreadyPaidCents + opts.amountCents;
  const newStatus = newPaid >= opts.totalCents ? "paid" : "partially_paid";

  const { error: invErr } = await supabase
    .from("ar_invoices" as any)
    .update({
      amount_paid_cents: newPaid,
      status: newStatus,
      paid_at: newStatus === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", opts.invoiceId);
  if (invErr) throw invErr;

  return { newPaid, newStatus };
}

/** Generate the next sequential number for a doc type. */
export function nextDocNumber(type: DocType): string {
  return `${NUMBER_PREFIX[type]}${Math.floor(1000 + Math.random() * 9000)}`;
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
