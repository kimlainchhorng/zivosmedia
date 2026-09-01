/**
 * useEatsData - Fetch restaurants & menu items from Supabase
 * Replaces hardcoded mock data in EatsLanding
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EatsRestaurant {
  id: string;
  name: string;
  cuisine_type: string;
  rating: number | null;
  avg_prep_time: number | null;
  delivery_fee_cents: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string;
  is_open: boolean | null;
  description: string | null;
  accepts_delivery: boolean | null;
  accepts_pickup: boolean | null;
  min_order_cents: number | null;
  lat: number | null;
  lng: number | null;
  service_fee_percent: number | null;
  rating_count: number | null;
}

export interface EatsMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  category_id: string | null;
  is_available: boolean | null;
  is_featured: boolean | null;
  preparation_time: number | null;
  restaurant_id: string;
}

export interface EatsCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  imageUrl?: string | null;
  specialInstructions?: string;
}

const EATS_ORDER_ATTEMPT_PREFIX = "zivo:eats-order-attempt:v1:";
const EATS_ORDER_ATTEMPT_TTL_MS = 24 * 60 * 60 * 1_000;
const MAX_SAVED_EATS_ATTEMPTS = 10;

type StoredEatsOrderAttempt = {
  fingerprint: string;
  idempotencyKey: string;
  createdAt: number;
};

type SavedEatsOrder = {
  id: string;
  customer_id: string;
  restaurant_id: string;
  tracking_code: string;
  total_amount: number | string;
  payment_type: string;
  status: string;
  payment_status: string;
  payment_expires_at: string | null;
};

/** Fetch open restaurants that accept delivery */
export function useEatsRestaurants() {
  return useQuery({
    queryKey: ["eats-restaurants"],
    queryFn: async (): Promise<EatsRestaurant[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "id, name, cuisine_type, rating, avg_prep_time, delivery_fee_cents, logo_url, cover_image_url, address, is_open, description, accepts_delivery, accepts_pickup, min_order_cents, lat, lng, service_fee_percent, rating_count",
        )
        .eq("accepts_delivery", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EatsRestaurant[];
    },
    staleTime: 60_000,
  });
}

/** Fetch menu items for a specific restaurant */
export function useEatsMenu(restaurantId: string | null) {
  return useQuery({
    queryKey: ["eats-menu", restaurantId],
    queryFn: async (): Promise<EatsMenuItem[]> => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id, name, description, price, image_url, category, category_id, is_available, is_featured, preparation_time, restaurant_id",
        )
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("is_featured", { ascending: false })
        .order("name");

      if (error) throw error;
      return (data ?? []) as EatsMenuItem[];
    },
    enabled: !!restaurantId,
    staleTime: 30_000,
  });
}

/** Fetch menu categories for a restaurant */
export function useEatsCategories(restaurantId: string | null) {
  return useQuery({
    queryKey: ["eats-categories", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });
}

/**
 * Create a food order through the authenticated server-pricing boundary.
 *
 * Customer identity, item names/prices, and caller totals are never written
 * directly. The Edge Function resolves the authenticated customer and live
 * catalog prices, then rejects a changed quote before saving anything.
 */
export async function createFoodOrder(params: {
  customerId: string;
  restaurantId: string;
  orderMode: "delivery" | "pickup";
  items: EatsCartItem[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tipAmount: number;
  totalAmount: number;
  paymentType: "cash" | "card" | "wallet" | "paypal" | "square";
  specialInstructions?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
  isExpress?: boolean;
  expressFee?: number;
  promoCode?: string;
  discountAmount?: number;
}) {
  const subtotalCents = toUsdCents(params.subtotal, "subtotal");
  const totalCents = toUsdCents(params.totalAmount, "total");
  const requestBody = {
    restaurant_id: params.restaurantId,
    items: params.items.map((item) => ({
      menu_item_id: item.menuItemId,
      quantity: item.quantity,
      special_instructions: item.specialInstructions?.trim() || null,
    })),
    order_mode: params.orderMode,
    delivery_address:
      params.orderMode === "delivery" ? params.deliveryAddress.trim() : null,
    delivery_lat: params.orderMode === "delivery" ? params.deliveryLat : null,
    delivery_lng: params.orderMode === "delivery" ? params.deliveryLng : null,
    payment_type: params.paymentType,
    special_instructions: params.specialInstructions?.trim() || null,
    is_scheduled: params.isScheduled === true,
    scheduled_for: params.isScheduled ? params.scheduledFor || null : null,
    is_express: params.orderMode === "delivery" && params.isExpress === true,
    promo_code: params.promoCode?.trim().toUpperCase() || null,
    quote: {
      subtotal_cents: subtotalCents,
      delivery_fee_cents: toUsdCents(params.deliveryFee, "delivery fee"),
      service_fee_cents: toUsdCents(params.serviceFee, "service fee"),
      tax_cents: Math.round(subtotalCents * 0.1),
      tip_cents: toUsdCents(params.tipAmount, "tip"),
      express_fee_cents: toUsdCents(params.expressFee || 0, "priority fee"),
      discount_cents: toUsdCents(params.discountAmount || 0, "discount"),
      total_cents: totalCents,
    },
  };
  const attemptFingerprint = await createEatsAttemptFingerprint(requestBody);
  const idempotencyKey = getOrCreateEatsIdempotencyKey(
    params.customerId,
    attemptFingerprint,
  );

  const { data, error } = await supabase.functions.invoke("create-eats-order", {
    body: {
      ...requestBody,
      idempotency_key: idempotencyKey,
    },
  });

  if (error) throw new Error(await eatsOrderErrorMessage(error));
  if (!isSavedOrderResponse(data)) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Could not save the order",
    );
  }
  if (data.total_cents !== totalCents) {
    throw new Error(
      "The saved order total changed. Review the order before paying.",
    );
  }
  if (data.order.customer_id !== params.customerId) {
    throw new Error("The saved order account does not match this checkout");
  }

  clearEatsOrderAttempt(params.customerId, attemptFingerprint, idempotencyKey);

  return {
    order: data.order,
    trackingCode: data.tracking_code,
    idempotentReplay: data.idempotent_replay,
  };
}

function toUsdCents(value: number, label: string): number {
  const cents = Math.round(Number(value) * 100);
  if (!Number.isFinite(value) || !Number.isSafeInteger(cents) || cents < 0) {
    throw new Error(`Invalid ${label}`);
  }
  return cents;
}

function isSavedOrderResponse(value: unknown): value is {
  ok: true;
  idempotent_replay: boolean;
  order: SavedEatsOrder;
  tracking_code: string;
  total_cents: number;
} {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  const order = response.order as Record<string, unknown> | null;
  return (
    response.ok === true &&
    typeof response.idempotent_replay === "boolean" &&
    typeof order?.id === "string" &&
    typeof order.customer_id === "string" &&
    typeof order.restaurant_id === "string" &&
    typeof order.tracking_code === "string" &&
    typeof order.status === "string" &&
    typeof order.payment_status === "string" &&
    typeof response.tracking_code === "string" &&
    Number.isSafeInteger(response.total_cents)
  );
}

async function createEatsAttemptFingerprint(requestBody: {
  restaurant_id: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions: string | null;
  }>;
  order_mode: "delivery" | "pickup";
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  payment_type: "cash" | "card" | "wallet" | "paypal" | "square";
  special_instructions: string | null;
  is_scheduled: boolean;
  scheduled_for: string | null;
  is_express: boolean;
  promo_code: string | null;
  quote: {
    subtotal_cents: number;
    delivery_fee_cents: number;
    service_fee_cents: number;
    tax_cents: number;
    tip_cents: number;
    express_fee_cents: number;
    discount_cents: number;
    total_cents: number;
  };
}): Promise<string> {
  const canonical = JSON.stringify({
    ...requestBody,
    items: [...requestBody.items].sort((left, right) =>
      left.menu_item_id.localeCompare(right.menu_item_id),
    ),
  });
  if (!globalThis.crypto?.subtle) {
    throw new Error("Secure checkout storage is unavailable");
  }
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function getOrCreateEatsIdempotencyKey(
  customerId: string,
  fingerprint: string,
): string {
  const storage = getEatsAttemptStorage();
  const now = Date.now();
  const attempts = readEatsOrderAttempts(storage, customerId).filter(
    (attempt) => now - attempt.createdAt <= EATS_ORDER_ATTEMPT_TTL_MS,
  );
  const existing = attempts.find(
    (attempt) => attempt.fingerprint === fingerprint,
  );
  if (existing) return existing.idempotencyKey;

  const attempt: StoredEatsOrderAttempt = {
    fingerprint,
    idempotencyKey: createIdempotencyUuid(),
    createdAt: now,
  };
  writeEatsOrderAttempts(
    storage,
    customerId,
    [attempt, ...attempts].slice(0, MAX_SAVED_EATS_ATTEMPTS),
  );
  return attempt.idempotencyKey;
}

function clearEatsOrderAttempt(
  customerId: string,
  fingerprint: string,
  idempotencyKey: string,
): void {
  try {
    const storage = getEatsAttemptStorage();
    const remaining = readEatsOrderAttempts(storage, customerId).filter(
      (attempt) =>
        attempt.fingerprint !== fingerprint ||
        attempt.idempotencyKey !== idempotencyKey,
    );
    writeEatsOrderAttempts(storage, customerId, remaining);
  } catch (error) {
    // The server already returned the exact saved order. Do not turn that
    // success into an ambiguous retry merely because local cleanup failed.
    console.warn("[EatsOrder] idempotency cleanup failed", error);
  }
}

function getEatsAttemptStorage(): Storage {
  try {
    if (!globalThis.localStorage) throw new Error("localStorage unavailable");
    return globalThis.localStorage;
  } catch {
    throw new Error(
      "Secure checkout storage is unavailable. Enable site storage and retry.",
    );
  }
}

function readEatsOrderAttempts(
  storage: Storage,
  customerId: string,
): StoredEatsOrderAttempt[] {
  try {
    const parsed = JSON.parse(
      storage.getItem(`${EATS_ORDER_ATTEMPT_PREFIX}${customerId}`) || "[]",
    ) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStoredEatsOrderAttempt);
  } catch {
    return [];
  }
}

function writeEatsOrderAttempts(
  storage: Storage,
  customerId: string,
  attempts: StoredEatsOrderAttempt[],
): void {
  const key = `${EATS_ORDER_ATTEMPT_PREFIX}${customerId}`;
  try {
    if (attempts.length === 0) storage.removeItem(key);
    else storage.setItem(key, JSON.stringify(attempts));
  } catch {
    throw new Error(
      "Secure checkout storage is unavailable. Enable site storage and retry.",
    );
  }
}

function isStoredEatsOrderAttempt(
  value: unknown,
): value is StoredEatsOrderAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<StoredEatsOrderAttempt>;
  return (
    typeof attempt.fingerprint === "string" &&
    /^[0-9a-f]{64}$/.test(attempt.fingerprint) &&
    typeof attempt.idempotencyKey === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      attempt.idempotencyKey,
    ) &&
    typeof attempt.createdAt === "number" &&
    Number.isFinite(attempt.createdAt) &&
    attempt.createdAt > 0
  );
}

function createIdempotencyUuid(): string {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error("Secure checkout storage is unavailable");
  }
  return globalThis.crypto.randomUUID();
}

async function eatsOrderErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      const payload = (await context
        .clone()
        .json()
        .catch(() => null)) as { error?: unknown } | null;
      if (typeof payload?.error === "string" && payload.error.trim()) {
        return payload.error;
      }
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return "Could not save the order";
}
