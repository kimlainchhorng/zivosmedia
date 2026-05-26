/**
 * Per-deal document attachments hook.
 *
 * Lazy: pass `dealId = null` when the parent dialog is in "new deal" mode
 * (no deal_id yet) — the hook returns an empty list and skips the query.
 *
 * Returns the metadata list + an `upload()` method that handles both the
 * Supabase Storage upload and the metadata-row insert in one call.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  uploadDealDocument, deleteDealDocument,
} from "@/lib/car-dealership/uploadDealDocument";

// ─── types ───────────────────────────────────────────────────────────────────

export type DealDocumentType =
  | "purchase_agreement"
  | "bill_of_sale"
  | "title"
  | "registration"
  | "financing_contract"
  | "insurance"
  | "license_copy"
  | "lemon_law_disclosure"
  | "warranty"
  | "inspection"
  | "odometer_disclosure"
  | "photo"
  | "other";

export interface DealDocument {
  id: string;
  store_id: string;
  deal_id: string;
  uploaded_by_user_id: string | null;
  doc_type: DealDocumentType;
  file_url: string;
  file_path: string;
  file_name: string;
  file_size_bytes: number | null;
  mime_type: string | null;
  notes: string | null;
  created_at: string;
}

interface UploadInput {
  file: File;
  doc_type: DealDocumentType;
  notes?: string | null;
}

// ─── hook ────────────────────────────────────────────────────────────────────

export function useDealershipDealDocuments(
  storeId: string | undefined,
  dealId: string | null,
) {
  const [documents, setDocuments] = useState<DealDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!storeId || !dealId) { setDocuments([]); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("car_dealership_deal_documents")
      .select("*")
      .eq("store_id", storeId)
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[useDealershipDealDocuments] load failed", error);
      setDocuments([]);
    } else {
      setDocuments((data ?? []) as unknown as DealDocument[]);
    }
    setLoading(false);
  }, [storeId, dealId]);

  useEffect(() => { void load(); }, [load]);

  const upload = useCallback(async (input: UploadInput): Promise<boolean> => {
    if (!storeId || !dealId) return false;
    setSaving(true);

    try {
      // 1. Upload file to storage
      const uploaded = await uploadDealDocument({ storeId, dealId, file: input.file });

      // 2. Insert metadata row
      const payload = {
        store_id: storeId,
        deal_id: dealId,
        doc_type: input.doc_type,
        file_url: uploaded.publicUrl,
        file_path: uploaded.path,
        file_name: input.file.name,
        file_size_bytes: input.file.size,
        mime_type: input.file.type || null,
        notes: input.notes?.trim() || null,
      };
      const { data, error } = await supabase
        .from("car_dealership_deal_documents")
        .insert(payload as never)
        .select("*")
        .single();

      if (error) {
        console.error("[useDealershipDealDocuments] insert failed", error);
        // Storage upload succeeded but row insert failed — best-effort cleanup
        await deleteDealDocument(uploaded.path);
        setSaving(false);
        return false;
      }

      setDocuments((prev) => [data as unknown as DealDocument, ...prev]);
      setSaving(false);
      return true;
    } catch (e: any) {
      console.error("[useDealershipDealDocuments] upload failed", e);
      setSaving(false);
      return false;
    }
  }, [storeId, dealId]);

  const remove = useCallback(async (doc: DealDocument): Promise<boolean> => {
    setSaving(true);
    const snapshot = documents;
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

    // Delete metadata row first; if successful, clean up the storage object.
    const { error } = await supabase
      .from("car_dealership_deal_documents")
      .delete()
      .eq("id", doc.id);

    if (error) {
      console.error("[useDealershipDealDocuments] delete failed", error);
      setDocuments(snapshot);
      setSaving(false);
      return false;
    }

    // Fire-and-forget storage cleanup
    void deleteDealDocument(doc.file_path);
    setSaving(false);
    return true;
  }, [documents]);

  return { documents, loading, saving, upload, remove, refresh: load };
}
