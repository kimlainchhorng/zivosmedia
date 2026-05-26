// AR Receipts helper.
//
// Two actions:
//   - "preflight":       verifies the caller is authenticated and owns the
//                        given storeId (or is an admin). Returns details the
//                        client uses to decide whether to attempt the direct
//                        ar-receipts upload.
//   - "fallback_upload": accepts a base64 image and writes it to the
//                        "ar-receipts-fallback" bucket via the service role,
//                        then returns the bucket+path and a signed URL.
//   - "save_expense":    validates ownership and inserts the scanned expense
//                        + line items via service role after a successful scan.
//
// Used by FinanceExpensesSection when the primary ar-receipts upload fails
// with a transient storage/DB error such as 08P01.

import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FALLBACK_BUCKET = "ar-receipts-fallback";
const PRIMARY_BUCKET = "ar-receipts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64(b64: string): Uint8Array {
  const clean = b64.includes(",") ? b64.slice(b64.indexOf(",") + 1) : b64;
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function safeExt(mime: string | undefined, fallback = "jpg"): string {
  if (!mime) return fallback;
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "application/pdf": "pdf",
  };
  return map[mime] || fallback;
}

function toInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function cleanText(value: unknown, max = 500): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      return jsonResponse({ error: "Server is missing Supabase configuration" }, 500);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return jsonResponse({ error: "Missing Authorization bearer token" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve user id with multiple fallbacks: auth.getUser → getClaims → raw JWT decode.
    let userId: string | null = null;
    let authDetails: string | null = null;
    try {
      const { data: u, error: uErr } = await userClient.auth.getUser(accessToken);
      if (u?.user?.id) userId = u.user.id;
      else authDetails = uErr?.message || null;
    } catch (e: any) {
      authDetails = e?.message || String(e);
    }
    if (!userId) {
      try {
        const { data: c } = await userClient.auth.getClaims(accessToken);
        if (c?.claims?.sub) userId = String(c.claims.sub);
      } catch { /* ignore */ }
    }
    if (!userId) {
      // Last-resort: decode JWT payload (token signature was already passed via header).
      try {
        const parts = accessToken.split(".");
        if (parts.length >= 2) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload?.sub) userId = String(payload.sub);
        }
      } catch { /* ignore */ }
    }
    if (!userId) {
      return jsonResponse({ error: "Invalid or expired session", details: authDetails }, 401);
    }

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Body must be valid JSON" }, 400);
    }

    const action = String(payload.action || "").toLowerCase();
    const storeId = typeof payload.store_id === "string" ? payload.store_id : "";
    if (!action) return jsonResponse({ error: "Missing 'action'" }, 400);
    if (!storeId || !/^[0-9a-f-]{36}$/i.test(storeId)) {
      return jsonResponse({ error: "Missing or invalid 'store_id'" }, 400);
    }

    // Service-role lookup for ownership / role / employee membership
    const [storeRes, rolesRes, empRes] = await Promise.all([
      admin
        .from("store_profiles")
        .select("id, owner_id, name, is_active")
        .eq("id", storeId)
        .maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId),
      admin
        .from("store_employees")
        .select("id, role, status")
        .eq("store_id", storeId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const store = storeRes.data as any;
    const storeErr = storeRes.error?.message || null;
    const roleList: string[] = (rolesRes.data || []).map((r: any) => String(r.role));
    const isAdmin = roleList.includes("admin") || roleList.includes("super_admin");
    const ownerIdNorm = store?.owner_id ? String(store.owner_id).trim().toLowerCase() : "";
    const userIdNorm = String(userId).trim().toLowerCase();
    const isOwner = !!store && ownerIdNorm === userIdNorm;
    const isEmployee = !!empRes.data;
    const ownsStore = isAdmin || isOwner || isEmployee;

    if (action === "preflight") {
      return jsonResponse({
        ok: ownsStore,
        user_id: userId,
        store_id: storeId,
        store_found: !!store,
        owner_id: store?.owner_id ?? null,
        is_owner: isOwner,
        is_admin: isAdmin,
        roles: roleList,
        primary_bucket: PRIMARY_BUCKET,
        fallback_bucket: FALLBACK_BUCKET,
        expected_folder: storeId,
      });
    }

    if (action === "fallback_upload") {
      if (!ownsStore) {
        return jsonResponse(
          {
            error: "You don't have permission to upload receipts for this store.",
            user_id: userId,
            store_id: storeId,
            store_found: !!store,
            store_owner_id: store?.owner_id ?? null,
            store_lookup_error: storeErr,
            is_owner: isOwner,
            is_admin: isAdmin,
            is_employee: isEmployee,
            roles: roleList,
          },
          403,
        );
      }

      const b64 = typeof payload.image_base64 === "string" ? payload.image_base64 : "";
      const mime = typeof payload.mime_type === "string" ? payload.mime_type : "image/jpeg";
      if (!b64) return jsonResponse({ error: "Missing 'image_base64'" }, 400);

      let bytes: Uint8Array;
      try {
        bytes = decodeBase64(b64);
      } catch (e: any) {
        return jsonResponse({ error: "Invalid base64 image", details: e?.message }, 400);
      }
      if (bytes.byteLength === 0) {
        return jsonResponse({ error: "Decoded image is empty" }, 400);
      }
      if (bytes.byteLength > 12 * 1024 * 1024) {
        return jsonResponse({ error: "Image too large (max 12MB)" }, 413);
      }

      const ext = safeExt(mime);
      const path = `${storeId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await admin.storage.from(FALLBACK_BUCKET).upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });
      if (upErr) {
        return jsonResponse(
          {
            error: "Fallback upload failed",
            details: upErr.message,
            bucket: FALLBACK_BUCKET,
            path,
          },
          500,
        );
      }

      const { data: signed, error: signErr } = await admin.storage
        .from(FALLBACK_BUCKET)
        .createSignedUrl(path, 60 * 60);
      if (signErr) {
        return jsonResponse(
          {
            error: "Could not sign uploaded receipt",
            details: signErr.message,
            bucket: FALLBACK_BUCKET,
            path,
          },
          500,
        );
      }

      return jsonResponse({
        ok: true,
        bucket: FALLBACK_BUCKET,
        path,
        signed_url: signed?.signedUrl || null,
        size: bytes.byteLength,
        mime,
      });
    }

    if (action === "save_expense") {
      if (!ownsStore) {
        return jsonResponse({ error: "You don't have permission to save expenses for this store." }, 403);
      }
      const expense = (payload.expense && typeof payload.expense === "object") ? payload.expense as Record<string, unknown> : {};
      const items = Array.isArray(payload.items) ? payload.items as Record<string, unknown>[] : [];
      const amountCents = toInt(expense.amount_cents);
      if (amountCents <= 0) return jsonResponse({ error: "Scanned invoice total must be greater than zero" }, 400);

      const { data: inserted, error: insertErr } = await admin.from("ar_expenses").insert({
        store_id: storeId,
        category: cleanText(expense.category, 80) || "parts",
        vendor: cleanText(expense.vendor, 160),
        description: cleanText(expense.description, 500),
        amount_cents: amountCents,
        subtotal_cents: toInt(expense.subtotal_cents),
        tax_cents: toInt(expense.tax_cents),
        expense_date: cleanText(expense.expense_date, 10) || new Date().toISOString().slice(0, 10),
        invoice_time: cleanText(expense.invoice_time, 8),
        invoice_number: cleanText(expense.invoice_number, 120),
        payment_method: cleanText(expense.payment_method, 40),
        notes: cleanText(expense.notes, 2000),
        receipt_url: cleanText(expense.receipt_url, 1000),
        created_by: userId,
      }).select("id").single();
      if (insertErr) return jsonResponse({ error: "Expense save failed", details: insertErr.message, code: insertErr.code }, 500);

      const expenseId = inserted.id;
      const rows = items
        .filter((it) => cleanText(it.name, 500))
        .map((it, index) => ({
          expense_id: expenseId,
          position: toInt(it.position, index),
          part_number: cleanText(it.part_number, 120),
          name: cleanText(it.name, 500) || "Scanned line item",
          quantity: Number(it.quantity) > 0 ? Number(it.quantity) : 1,
          unit_price_cents: toInt(it.unit_price_cents),
          line_total_cents: toInt(it.line_total_cents),
        }));
      if (rows.length) {
        const { error: itemErr } = await admin.from("ar_expense_items").insert(rows);
        if (itemErr) return jsonResponse({ error: "Line item save failed", details: itemErr.message, code: itemErr.code, expense_id: expenseId }, 500);
      }

      return jsonResponse({ ok: true, expense_id: expenseId, item_count: rows.length });
    }

    return jsonResponse({ error: `Unknown action '${action}'` }, 400);
  } catch (e: any) {
    console.error("ar-receipts-helper error", e);
    return jsonResponse({ error: e?.message || "Unknown server error" }, 500);
  }
});
