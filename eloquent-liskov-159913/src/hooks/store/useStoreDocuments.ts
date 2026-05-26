/**
 * useStoreDocuments — list / upload / delete documents stored in the
 * private `store-documents` Supabase Storage bucket. Path scheme:
 *   {store_id}/{document_id}/{filename}
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DocStatus = "active" | "expired" | "pending";

export interface StoreDocument {
  id: string;
  store_id: string;
  employee_id: string | null;
  name: string;
  category: string;
  file_path: string;
  file_type: string;
  size_bytes: number;
  expires_at: string | null;
  status: DocStatus;
  created_at: string;
}

export interface UploadInput {
  file: File;
  name?: string;
  category: string;
  employee_id?: string | null;
  expires_at?: string | null;
}

const BUCKET = "store-documents";
const KEY = (storeId: string) => ["store-documents", storeId] as const;

function detectFileType(file: File): string {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type.includes("word")) return "doc";
  return "file";
}

export function useStoreDocuments(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY(storeId),
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_documents")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Compute live status based on expires_at
      const now = Date.now();
      return (data || []).map((d) => ({
        ...d,
        status:
          d.expires_at && new Date(d.expires_at).getTime() < now
            ? ("expired" as DocStatus)
            : (d.status as DocStatus),
      })) as StoreDocument[];
    },
  });

  const upload = useMutation({
    mutationFn: async (input: UploadInput) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      const docId = crypto.randomUUID();
      const safeName = input.file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${storeId}/${docId}/${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, input.file, { contentType: input.file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("store_documents").insert({
        id: docId,
        store_id: storeId,
        employee_id: input.employee_id || null,
        name: input.name || input.file.name,
        category: input.category,
        file_path: path,
        file_type: detectFileType(input.file),
        size_bytes: input.file.size,
        expires_at: input.expires_at || null,
        status: "active",
        uploaded_by: uid,
      });
      if (insErr) {
        // best-effort cleanup
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const remove = useMutation({
    mutationFn: async (doc: StoreDocument) => {
      await supabase.storage.from(BUCKET).remove([doc.file_path]);
      const { error } = await supabase.from("store_documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  async function getSignedUrl(filePath: string, expiresInSec = 60): Promise<string> {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, expiresInSec);
    if (error) throw error;
    return data.signedUrl;
  }

  return { list, upload, remove, getSignedUrl };
}
