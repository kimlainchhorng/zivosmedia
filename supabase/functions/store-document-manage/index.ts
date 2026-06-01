/**
 * store-document-manage
 * ---------------------
 * Server-gated owner/admin metadata mutations for private store documents.
 * Storage object writes remain bucket-RLS protected; document rows and cleanup
 * are validated here so clients cannot forge store, employee, or uploader data.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "delete"]);
const STATUSES = new Set(["active", "expired", "pending"]);
const BUCKET = "store-documents";

type Body = {
  action?: unknown;
  store_id?: unknown;
  document_id?: unknown;
  document?: unknown;
};

serve(withSecurity("store-document-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid document action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const document = cleanDocument(body.document, storeId);
    if (!document.ok) return json({ error: document.error }, 400);

    const employeeId = document.values.employee_id;
    if (employeeId && !await employeeBelongsToStore(admin, employeeId as string, storeId)) {
      return json({ error: "Employee does not belong to this store" }, 400);
    }

    const { data, error } = await admin
      .from("store_documents")
      .insert({ ...document.values, store_id: storeId, uploaded_by: user.id })
      .select("*")
      .single();
    if (error) {
      console.error("[store-document-manage:create]", error.message);
      await admin.storage.from(BUCKET).remove([document.values.file_path]).catch(() => {});
      return json({ error: "Could not create document" }, 500);
    }
    return json({ ok: true, document: data });
  }

  const documentId = cleanUuid(body.document_id);
  if (!documentId) return json({ error: "Invalid document id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("store_documents")
    .select("id, store_id, file_path")
    .eq("id", documentId)
    .maybeSingle();
  if (lookupError) {
    console.error("[store-document-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify document" }, 500);
  }
  if (!existing) return json({ error: "Document not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);
  if (!pathBelongsToDocument(existing.file_path, existing.store_id, existing.id)) {
    return json({ error: "Document path is invalid" }, 409);
  }

  const { error: deleteError } = await admin
    .from("store_documents")
    .delete()
    .eq("id", existing.id)
    .eq("store_id", existing.store_id);
  if (deleteError) {
    console.error("[store-document-manage:delete]", deleteError.message);
    return json({ error: "Could not delete document" }, 500);
  }

  const { error: storageError } = await admin.storage.from(BUCKET).remove([existing.file_path]);
  if (storageError) {
    console.error("[store-document-manage:storage-delete]", storageError.message);
    return json({ ok: true, document_id: existing.id, storage_removed: false });
  }
  return json({ ok: true, document_id: existing.id, storage_removed: true });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-document-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-document-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function employeeBelongsToStore(admin: any, employeeId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("store_employees")
    .select("id")
    .eq("id", employeeId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[store-document-manage:employee]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanDocument(value: unknown, storeId: string):
  | { ok: true; values: Record<string, string | number | null> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Document payload is required" };
  }
  const input = value as Record<string, unknown>;
  const id = cleanUuid(input.id);
  if (!id) return { ok: false, error: "Invalid document id" };

  const name = cleanText(input.name, 1, 220);
  if (!name) return { ok: false, error: "Document name is required" };

  const category = cleanText(input.category, 1, 120);
  if (!category) return { ok: false, error: "Document category is required" };

  const filePath = cleanText(input.file_path, 1, 900);
  if (!filePath || !pathBelongsToDocument(filePath, storeId, id)) return { ok: false, error: "Invalid document path" };

  const sizeBytes = cleanInteger(input.size_bytes, 1, 52_428_800);
  if (sizeBytes === null) return { ok: false, error: "Invalid document size" };

  const fileType = cleanFileType(input.file_type, filePath);
  const status = cleanStatus(input.status);
  const employeeId = cleanOptionalUuid(input.employee_id);
  if (input.employee_id && !employeeId) return { ok: false, error: "Invalid employee id" };

  const expiresAt = cleanOptionalDate(input.expires_at);
  if (expiresAt === undefined) return { ok: false, error: "Invalid expiration date" };

  return {
    ok: true,
    values: {
      id,
      employee_id: employeeId,
      name,
      category,
      file_path: filePath,
      file_type: fileType,
      size_bytes: sizeBytes,
      expires_at: expiresAt,
      status,
    },
  };
}

function pathBelongsToDocument(path: string, storeId: string, documentId: string): boolean {
  if (path.includes("..") || path.includes("//")) return false;
  return path.startsWith(`${storeId}/${documentId}/`) && path.split("/").length >= 3;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanOptionalUuid(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value);
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanStatus(value: unknown): string {
  if (typeof value !== "string") return "active";
  return STATUSES.has(value) ? value : "active";
}

function cleanFileType(value: unknown, path: string): string {
  if (typeof value === "string") {
    const type = value.trim().toLowerCase();
    if (["image", "pdf", "doc", "file"].includes(type)) return type;
  }
  const lower = path.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.(jpg|jpeg|png|webp|heic)$/.test(lower)) return "image";
  if (/\.(doc|docx)$/.test(lower)) return "doc";
  return "file";
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
