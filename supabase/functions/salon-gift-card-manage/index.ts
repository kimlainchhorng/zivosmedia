/**
 * salon-gift-card-manage
 * ----------------------
 * Owner/admin write gate for salon store-credit gift cards. The client keeps
 * read-only table access, while issue/redeem/activate/delete are validated
 * here with service-role writes.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["issue", "redeem", "set_active", "delete"]);
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

type Body = {
  action?: unknown;
  store_id?: unknown;
  card_id?: unknown;
  card?: unknown;
  amount_cents?: unknown;
  booking_id?: unknown;
  notes?: unknown;
  active?: unknown;
};

serve(withSecurity("salon-gift-card-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid gift card action" }, 400);

  if (action === "issue") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const card = cleanGiftCard(body.card);
    if (!card.ok) return json({ error: card.error }, 400);

    for (let attempt = 0; attempt < 4; attempt++) {
      const code = makeCode();
      const { data, error } = await admin
        .from("salon_gift_cards")
        .insert({
          ...card.values,
          store_id: storeId,
          code,
          balance_cents: card.values.initial_cents,
          issued_by_user_id: user.id,
        })
        .select("*")
        .single();

      if (!error) return json({ ok: true, card: data });
      if ((error as any).code === "23505") continue;
      console.error("[salon-gift-card-manage:issue]", error.message);
      return json({ error: "Could not issue gift card" }, 500);
    }
    return json({ error: "Could not generate a unique gift card code" }, 409);
  }

  const cardId = cleanUuid(body.card_id);
  if (!cardId) return json({ error: "Invalid gift card id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("salon_gift_cards")
    .select("id, store_id, balance_cents, is_active, expires_at")
    .eq("id", cardId)
    .maybeSingle();
  if (lookupError) {
    console.error("[salon-gift-card-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify gift card" }, 500);
  }
  if (!existing) return json({ error: "Gift card not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "redeem") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId || storeId !== existing.store_id) return json({ error: "Invalid store id" }, 400);
    if (!existing.is_active) return json({ error: "Gift card is disabled" }, 400);
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      return json({ error: "Gift card has expired" }, 400);
    }

    const amountCents = cleanInteger(body.amount_cents, 1, Math.max(1, existing.balance_cents));
    if (amountCents === null) return json({ error: "Invalid redemption amount" }, 400);
    const bookingId = cleanOptionalUuid(body.booking_id);
    if (body.booking_id && !bookingId) return json({ error: "Invalid booking id" }, 400);
    if (bookingId && !await bookingBelongsToStore(admin, bookingId, storeId)) {
      return json({ error: "Booking does not belong to this store" }, 400);
    }

    const { data, error } = await admin
      .from("salon_gift_card_redemptions")
      .insert({
        gift_card_id: cardId,
        store_id: storeId,
        booking_id: bookingId,
        amount_cents: amountCents,
        notes: cleanNullableText(body.notes, 500),
        redeemed_by_user_id: user.id,
      })
      .select("*")
      .single();
    if (error) {
      console.error("[salon-gift-card-manage:redeem]", error.message);
      return json({ error: "Could not redeem gift card" }, 500);
    }
    return json({ ok: true, redemption: data });
  }

  if (action === "set_active") {
    if (typeof body.active !== "boolean") return json({ error: "Invalid active flag" }, 400);
    const { data, error } = await admin
      .from("salon_gift_cards")
      .update({ is_active: body.active })
      .eq("id", cardId)
      .eq("store_id", existing.store_id)
      .select("*")
      .single();
    if (error) {
      console.error("[salon-gift-card-manage:set-active]", error.message);
      return json({ error: "Could not update gift card" }, 500);
    }
    return json({ ok: true, card: data });
  }

  const { error } = await admin
    .from("salon_gift_cards")
    .delete()
    .eq("id", cardId)
    .eq("store_id", existing.store_id);
  if (error) {
    console.error("[salon-gift-card-manage:delete]", error.message);
    return json({ error: "Could not delete gift card" }, 500);
  }
  return json({ ok: true, card_id: cardId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-gift-card-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-gift-card-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function bookingBelongsToStore(admin: any, bookingId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("salon_bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-gift-card-manage:booking]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanGiftCard(value: unknown):
  | { ok: true; values: Record<string, string | number | null> & { initial_cents: number } }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Gift card payload is required" };
  }
  const input = value as Record<string, unknown>;
  const initialCents = cleanInteger(input.initial_cents, 1, 500_000);
  if (initialCents === null) return { ok: false, error: "Invalid initial balance" };

  const recipientEmail = cleanNullableText(input.recipient_email, 160);
  if (recipientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return { ok: false, error: "Invalid recipient email" };
  }

  const expiresAt = cleanOptionalDate(input.expires_at);
  if (expiresAt === undefined) return { ok: false, error: "Invalid expiration date" };

  return {
    ok: true,
    values: {
      initial_cents: initialCents,
      recipient_name: cleanNullableText(input.recipient_name, 120),
      recipient_email: recipientEmail,
      recipient_phone: cleanNullableText(input.recipient_phone, 40),
      purchaser_name: cleanNullableText(input.purchaser_name, 120),
      message: cleanNullableText(input.message, 500),
      expires_at: expiresAt,
    },
  };
}

function makeCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}-${chars.slice(8, 12).join("")}`;
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

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanOptionalDate(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
