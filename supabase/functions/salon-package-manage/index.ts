/**
 * salon-package-manage
 * --------------------
 * Owner/admin mutation gate for salon packages and package-service links.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["save", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  package_id?: unknown;
  package?: unknown;
};

serve(withSecurity("salon-package-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid package action" }, 400);

  if (action === "save") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const pkg = await cleanPackage(admin, body.package, storeId);
    if (!pkg.ok) return json({ error: pkg.error }, 400);

    const packageId = cleanOptionalUuid(body.package_id);
    const query = packageId
      ? admin.from("salon_packages").update(pkg.values).eq("id", packageId).eq("store_id", storeId)
      : admin.from("salon_packages").insert({ ...pkg.values, store_id: storeId });
    const { data: saved, error: saveError } = await query.select("*").single();
    if (saveError) {
      console.error("[salon-package-manage:save]", saveError.message);
      return json({ error: "Could not save package" }, 500);
    }

    const savedId = saved.id as string;
    const { error: deleteLinksError } = await admin
      .from("salon_package_services")
      .delete()
      .eq("package_id", savedId);
    if (deleteLinksError) {
      console.error("[salon-package-manage:delete-links]", deleteLinksError.message);
      return json({ error: "Could not update package services" }, 500);
    }

    if (pkg.serviceLinks.length > 0) {
      const { error: insertLinksError } = await admin
        .from("salon_package_services")
        .insert(pkg.serviceLinks.map((link) => ({ package_id: savedId, ...link })));
      if (insertLinksError) {
        console.error("[salon-package-manage:insert-links]", insertLinksError.message);
        return json({ error: "Could not attach package services" }, 500);
      }
    }

    return json({ ok: true, package: saved });
  }

  const packageId = cleanUuid(body.package_id);
  if (!packageId) return json({ error: "Invalid package id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("salon_packages")
    .select("id, store_id")
    .eq("id", packageId)
    .maybeSingle();
  if (lookupError) {
    console.error("[salon-package-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify package" }, 500);
  }
  if (!existing) return json({ error: "Package not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  const { error } = await admin
    .from("salon_packages")
    .delete()
    .eq("id", existing.id)
    .eq("store_id", existing.store_id);
  if (error) {
    console.error("[salon-package-manage:delete]", error.message);
    return json({ error: "Could not delete package" }, 500);
  }
  return json({ ok: true, package_id: existing.id });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-package-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-package-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function cleanPackage(admin: any, value: unknown, storeId: string):
  Promise<
    | { ok: true; values: Record<string, string | number | boolean | null>; serviceLinks: Array<{ service_id: string; quantity: number }> }
    | { ok: false; error: string }
  > {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Package payload is required" };
  }
  const input = value as Record<string, unknown>;
  const name = cleanText(input.name, 1, 80);
  if (!name) return { ok: false, error: "Package name is required" };
  const bundlePriceCents = cleanInteger(input.bundle_price_cents, 0, 10_000_000);
  if (bundlePriceCents === null) return { ok: false, error: "Invalid package price" };

  let validityDays: number | null = null;
  if (input.validity_days !== null && input.validity_days !== "" && input.validity_days !== undefined) {
    validityDays = cleanInteger(input.validity_days, 1, 730);
    if (validityDays === null) return { ok: false, error: "Invalid validity window" };
  }

  const serviceQuantities = input.service_quantities;
  if (!serviceQuantities || typeof serviceQuantities !== "object" || Array.isArray(serviceQuantities)) {
    return { ok: false, error: "At least one service is required" };
  }
  const serviceLinks: Array<{ service_id: string; quantity: number }> = [];
  for (const [rawServiceId, rawQuantity] of Object.entries(serviceQuantities as Record<string, unknown>)) {
    const serviceId = cleanUuid(rawServiceId);
    const quantity = cleanInteger(rawQuantity, 1, 100);
    if (!serviceId || quantity === null) return { ok: false, error: "Invalid package service" };
    serviceLinks.push({ service_id: serviceId, quantity });
  }
  if (serviceLinks.length === 0) return { ok: false, error: "At least one service is required" };

  const { data: services, error: servicesError } = await admin
    .from("salon_services")
    .select("id")
    .eq("store_id", storeId)
    .in("id", serviceLinks.map((link) => link.service_id));
  if (servicesError) {
    console.error("[salon-package-manage:services]", servicesError.message);
    return { ok: false, error: "Could not verify package services" };
  }
  if ((services ?? []).length !== serviceLinks.length) {
    return { ok: false, error: "Package services must belong to this store" };
  }

  return {
    ok: true,
    values: {
      name,
      description: cleanNullableText(input.description, 500),
      bundle_price_cents: bundlePriceCents,
      validity_days: validityDays,
      is_active: typeof input.is_active === "boolean" ? input.is_active : true,
    },
    serviceLinks,
  };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
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

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
