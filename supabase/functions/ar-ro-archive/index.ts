// ar-ro-archive — store a copy of a printed repair order.
//
// Accepts a base64 PDF + RO metadata, verifies the caller owns the store,
// uploads the PDF to the private `ro-documents` bucket via the service role,
// logs a row in `ar_ro_documents`, and returns a short-lived signed URL.
// Mirrors the auth + ownership + service-role-upload pattern of
// `ar-receipts-helper`.

import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const BUCKET = "ro-documents";

function jsonResponse(body: unknown, status = 200, corsHeaders: Record<string, string>) {
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

function cleanText(value: unknown, max = 200): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.slice(0, max);
}

function toInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : fallback;
}

function slug(value: string | null, fallback: string): string {
  const s = (value || "").replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "");
  return s || fallback;
}

Deno.serve(withSecurity("ar-ro-archive", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !SERVICE_ROLE || !ANON_KEY) {
      return jsonResponse({ error: "Server is missing Supabase configuration" }, 500, corsHeaders);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!accessToken) return jsonResponse({ error: "Missing Authorization bearer token" }, 401, corsHeaders);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Resolve user id only from Supabase-verified authentication results.
    // Never trust an unverified JWT payload for service-role writes.
    let userId: string | null = null;
    try {
      const { data: u } = await userClient.auth.getUser(accessToken);
      if (u?.user?.id) userId = u.user.id;
    } catch { /* ignore */ }
    if (!userId) {
      try {
        const { data: c } = await userClient.auth.getClaims(accessToken);
        if (c?.claims?.sub) userId = String(c.claims.sub);
      } catch { /* ignore */ }
    }
    if (!userId) return jsonResponse({ error: "Invalid or expired session" }, 401, corsHeaders);

    let payload: Record<string, unknown> = {};
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ error: "Body must be valid JSON" }, 400, corsHeaders);
    }

    const storeId = typeof payload.store_id === "string" ? payload.store_id : "";
    if (!storeId || !/^[0-9a-f-]{36}$/i.test(storeId)) {
      return jsonResponse({ error: "Missing or invalid 'store_id'" }, 400, corsHeaders);
    }

    // Ownership: store owner, platform admin, or an employee of the store.
    const [storeRes, rolesRes, empRes] = await Promise.all([
      admin.from("store_profiles").select("id, owner_id").eq("id", storeId).maybeSingle(),
      admin.from("user_roles").select("role").eq("user_id", userId),
      admin.from("store_employees").select("id").eq("store_id", storeId).eq("user_id", userId).maybeSingle(),
    ]);
    const store = storeRes.data as { owner_id?: string } | null;
    const roleList: string[] = (rolesRes.data || []).map((r: { role: string }) => String(r.role));
    const isAdmin = roleList.includes("admin") || roleList.includes("super_admin");
    const isOwner = !!store && String(store.owner_id).toLowerCase() === userId.toLowerCase();
    const ownsStore = isAdmin || isOwner || !!empRes.data;
    if (!ownsStore) {
      return jsonResponse({ error: "You don't have permission to save documents for this store." }, 403, corsHeaders);
    }

    const b64 = typeof payload.pdf_base64 === "string" ? payload.pdf_base64 : "";
    if (!b64) return jsonResponse({ error: "Missing 'pdf_base64'" }, 400, corsHeaders);

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(b64);
    } catch (e) {
      return jsonResponse({ error: "Invalid base64 PDF", details: (e as Error)?.message }, 400, corsHeaders);
    }
    if (bytes.byteLength === 0) return jsonResponse({ error: "Decoded PDF is empty" }, 400, corsHeaders);
    if (bytes.byteLength > 25 * 1024 * 1024) return jsonResponse({ error: "PDF too large (max 25MB)" }, 413, corsHeaders);

    const roNumber = cleanText(payload.ro_number, 60);
    const docType = cleanText(payload.doc_type, 40) || "repair_order";
    const path = `${storeId}/${slug(roNumber, "ro")}-${Date.now()}.pdf`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: "application/pdf",
      upsert: false,
    });
    if (upErr) {
      return jsonResponse({ error: "Upload failed", details: upErr.message, bucket: BUCKET, path }, 500, corsHeaders);
    }

    const { data: row, error: insErr } = await admin.from("ar_ro_documents").insert({
      store_id: storeId,
      ro_number: roNumber,
      doc_type: docType,
      customer_name: cleanText(payload.customer_name, 200),
      vehicle_label: cleanText(payload.vehicle_label, 200),
      total_cents: toInt(payload.total_cents),
      bucket: BUCKET,
      path,
      printed_by: userId,
    }).select("id").single();
    if (insErr) {
      return jsonResponse({ error: "Log insert failed", details: insErr.message, code: insErr.code }, 500, corsHeaders);
    }

    const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 60 * 60);

    return jsonResponse(
      { ok: true, id: row.id, bucket: BUCKET, path, signed_url: signed?.signedUrl || null, size: bytes.byteLength },
      200,
      corsHeaders,
    );
  } catch (e) {
    console.error("ar-ro-archive error", e);
    return jsonResponse({ error: (e as Error)?.message || "Unknown server error" }, 500, corsHeaders);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
