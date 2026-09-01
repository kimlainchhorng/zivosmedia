/**
 * create-eats-order
 * -----------------
 * Authenticated, server-priced creation boundary for one ZIVO Eats order.
 * The browser supplies item IDs, quantities, fulfillment choices, and the
 * quote it displayed. Live restaurant/menu/promo rows determine every saved
 * price. If that authoritative quote differs, the request fails before insert
 * so a changed or tampered amount can never be charged silently.
 */
import { serve } from "../_shared/deps.ts";
import {
  getServiceRoleClient,
  requireUser,
  requireUserNotBlocked,
} from "../_shared/auth.ts";
import { HttpError, withErrorHandling } from "../_shared/errors.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_TYPES = ["cash", "card", "wallet", "paypal", "square"] as const;
const FREE_DELIVERY_SUBTOTAL_CENTS = 2_000;
const DEFAULT_DELIVERY_FEE_CENTS = 399;
const DEFAULT_SERVICE_FEE_PERCENT = 5;
const TAX_RATE = 0.1;
const PRIORITY_FEE_CENTS = 299;
const MAX_LINES = 50;
const MAX_QUANTITY_PER_LINE = 50;
const MAX_TIP_CENTS = 10_000;
const MAX_SCHEDULE_DAYS = 30;

type PaymentType = (typeof PAYMENT_TYPES)[number];
type FulfillmentType = "delivery" | "pickup";

type RequestItem = {
  menuItemId: string;
  quantity: number;
  specialInstructions: string | null;
};

type ClientQuote = {
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  tax_cents: number;
  tip_cents: number;
  express_fee_cents: number;
  discount_cents: number;
  total_cents: number;
};

type RestaurantRow = {
  id: string;
  address: string;
  lat: number | string | null;
  lng: number | string | null;
  status: string | null;
  is_open: boolean | null;
  pause_new_orders: boolean | null;
  accepts_delivery: boolean | null;
  accepts_pickup: boolean | null;
  min_order_cents: number | null;
  delivery_fee_cents: number | null;
  service_fee_percent: number | string | null;
  currency: string | null;
};

type MenuItemRow = {
  id: string;
  restaurant_id: string;
  name: string;
  price: number | string;
  is_available: boolean | null;
  stock_mode: string | null;
  stock_qty: number | null;
  stock_quantity: number | null;
};

type PromoRow = {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number | string;
  is_active: boolean | null;
  start_at: string | null;
  end_at: string | null;
  expires_at: string | null;
  min_fare: number | string | null;
  max_discount: number | string | null;
  max_uses: number | null;
  uses: number | null;
  usage_count: number | null;
  max_uses_per_user: number | null;
};

type CreatedOrderRow = {
  id: string;
  customer_id: string;
  restaurant_id: string;
  tracking_code: string | null;
  total_amount: number | string;
  payment_type: string | null;
  status: string | null;
  payment_status: string | null;
  payment_expires_at: string | null;
};

type AtomicOrderProjection = {
  idempotentReplay: boolean;
  order: CreatedOrderRow;
};

serve(
  withSecurity(
    "create-eats-order",
    withErrorHandling(async (req, ctx) => {
      const { userId } = await requireUser(req);
      await requireUserNotBlocked(userId);

      const body = asRecord(await req.json().catch(() => null));
      if (!body) throw new HttpError(400, "Invalid order request");

      const restaurantId = cleanUuid(body.restaurant_id);
      const idempotencyKey = cleanUuid(body.idempotency_key);
      const orderMode = cleanOrderMode(body.order_mode);
      const paymentType = cleanPaymentType(body.payment_type);
      const clientQuote = cleanQuote(body.quote);
      const items = cleanItems(body.items);
      if (
        !restaurantId ||
        !idempotencyKey ||
        !orderMode ||
        !paymentType ||
        !clientQuote
      ) {
        throw new HttpError(400, "Invalid order details");
      }

      const deliveryAddress = cleanRequiredText(body.delivery_address, 500);
      const deliveryLat = cleanCoordinate(body.delivery_lat, -90, 90);
      const deliveryLng = cleanCoordinate(body.delivery_lng, -180, 180);
      if (
        orderMode === "delivery" &&
        (!deliveryAddress ||
          deliveryLat == null ||
          deliveryLng == null ||
          (deliveryLat === 0 && deliveryLng === 0))
      ) {
        throw new HttpError(400, "A valid delivery location is required");
      }

      const isScheduled = body.is_scheduled === true;
      const scheduledFor = cleanScheduleTimestamp(
        body.scheduled_for,
        isScheduled,
      );
      const isExpress = orderMode === "delivery" && body.is_express === true;
      const specialInstructions = cleanOptionalText(
        body.special_instructions,
        1_000,
      );
      const requestedPromoCode = cleanPromoCode(body.promo_code);

      const requestFingerprint = await createRequestFingerprint({
        restaurantId,
        orderMode,
        items,
        deliveryAddress: orderMode === "delivery" ? deliveryAddress : null,
        deliveryLat: orderMode === "delivery" ? deliveryLat : null,
        deliveryLng: orderMode === "delivery" ? deliveryLng : null,
        paymentType,
        clientQuote,
        specialInstructions,
        isScheduled,
        scheduledFor,
        isExpress,
        requestedPromoCode,
      });

      const admin = getServiceRoleClient();

      // Recover an already-committed response before validating mutable
      // restaurant/menu/promo state. The database takes the same per-request
      // advisory lock here and during creation.
      const { data: replayData, error: replayError } = await (admin as any).rpc(
        "find_eats_order_idempotency_v1",
        {
          p_customer_id: userId,
          p_idempotency_key: idempotencyKey,
          p_request_fingerprint: requestFingerprint,
        },
      );
      if (replayError) {
        const message = String(replayError.message ?? "");
        if (message.includes("eats_atomic_idempotency_conflict")) {
          throw new HttpError(
            409,
            "This checkout request was already used for a different order",
            { code: "idempotency_conflict" },
          );
        }
        ctx?.log.error("food_order_idempotency_lookup_failed", {
          error: message,
        });
        throw new HttpError(503, "Could not verify the order request");
      }
      if (replayData != null) {
        const replay = cleanAtomicOrderProjection(replayData, userId);
        if (!replay || replay.idempotentReplay !== true) {
          ctx?.log.error("food_order_idempotency_lookup_invalid_projection");
          throw new HttpError(503, "Could not verify the saved order");
        }
        return orderResponse(replay, clientQuote, 200, ctx?.corsHeaders ?? {});
      }

      assertScheduleWindow(scheduledFor, isScheduled);

      const { data: restaurantData, error: restaurantError } = await admin
        .from("restaurants")
        .select(
          "id, address, lat, lng, status, is_open, pause_new_orders, accepts_delivery, accepts_pickup, min_order_cents, delivery_fee_cents, service_fee_percent, currency",
        )
        .eq("id", restaurantId)
        .maybeSingle();
      if (restaurantError) {
        ctx?.log.error("restaurant_lookup_failed", {
          error: restaurantError.message,
        });
        throw new HttpError(503, "Could not verify restaurant availability");
      }
      if (!restaurantData) throw new HttpError(404, "Restaurant not found");

      const restaurant = restaurantData as RestaurantRow;
      assertRestaurantAvailable(restaurant, orderMode);

      const pickupAddress = cleanRequiredText(restaurant.address, 500);
      const pickupLat = cleanDatabaseCoordinate(restaurant.lat, -90, 90);
      const pickupLng = cleanDatabaseCoordinate(restaurant.lng, -180, 180);
      if (
        !pickupAddress ||
        pickupLat == null ||
        pickupLng == null ||
        (pickupLat === 0 && pickupLng === 0)
      ) {
        throw new HttpError(503, "Restaurant pickup location is unavailable");
      }

      const menuItemIds = items.map((item) => item.menuItemId);
      const { data: menuData, error: menuError } = await admin
        .from("menu_items")
        .select(
          "id, restaurant_id, name, price, is_available, stock_mode, stock_qty, stock_quantity",
        )
        .in("id", menuItemIds);
      if (menuError) {
        ctx?.log.error("menu_lookup_failed", { error: menuError.message });
        throw new HttpError(503, "Could not verify menu availability");
      }

      const menuRows = (menuData ?? []) as MenuItemRow[];
      if (menuRows.length !== items.length) {
        throw new HttpError(
          409,
          "One or more menu items are no longer available",
          {
            code: "menu_changed",
          },
        );
      }

      const menuById = new Map(menuRows.map((row) => [row.id, row]));
      let subtotalCents = 0;
      const authoritativeItems = items.map((item) => {
        const menuItem = menuById.get(item.menuItemId);
        if (
          !menuItem ||
          menuItem.restaurant_id !== restaurantId ||
          menuItem.is_available !== true ||
          menuItem.stock_mode === "out"
        ) {
          throw new HttpError(
            409,
            "One or more menu items are no longer available",
            {
              code: "menu_changed",
            },
          );
        }

        if (menuItem.stock_mode === "limited") {
          const availableStock =
            menuItem.stock_quantity ?? menuItem.stock_qty ?? 0;
          if (availableStock < item.quantity) {
            throw new HttpError(
              409,
              `${menuItem.name} does not have enough stock`,
              {
                code: "menu_changed",
              },
            );
          }
        }

        const unitPriceCents = dollarsToCents(menuItem.price, "menu price");
        subtotalCents = safeAdd(
          subtotalCents,
          safeMultiply(unitPriceCents, item.quantity),
        );
        return {
          id: menuItem.id,
          name: menuItem.name,
          price: unitPriceCents / 100,
          quantity: item.quantity,
          specialInstructions: item.specialInstructions,
        };
      });

      const minOrderCents = cleanDatabaseCents(restaurant.min_order_cents, 0);
      if (subtotalCents < minOrderCents) {
        throw new HttpError(409, "The restaurant minimum order has changed", {
          code: "price_changed",
          minimum_order_cents: minOrderCents,
        });
      }

      const rawDeliveryFeeCents = cleanDatabaseCents(
        restaurant.delivery_fee_cents,
        DEFAULT_DELIVERY_FEE_CENTS,
      );
      const deliveryFeeCents =
        orderMode === "pickup" || subtotalCents >= FREE_DELIVERY_SUBTOTAL_CENTS
          ? 0
          : rawDeliveryFeeCents;

      const serviceFeePercent = cleanPercent(
        restaurant.service_fee_percent,
        DEFAULT_SERVICE_FEE_PERCENT,
      );
      const serviceFeeCents = Math.round(
        subtotalCents * (serviceFeePercent / 100),
      );
      const taxCents = Math.round(subtotalCents * TAX_RATE);
      const expressFeeCents = isExpress ? PRIORITY_FEE_CENTS : 0;

      const tipCents = orderMode === "delivery" ? clientQuote.tip_cents : 0;
      if (tipCents > MAX_TIP_CENTS || tipCents > subtotalCents) {
        throw new HttpError(400, "Tip is outside the supported range");
      }

      const promo = await resolvePromo(
        admin,
        requestedPromoCode,
        userId,
        subtotalCents,
      );
      const discountCents = promo.valid ? promo.discountCents : 0;
      const totalCents = Math.max(
        0,
        safeAdd(
          subtotalCents,
          deliveryFeeCents,
          serviceFeeCents,
          taxCents,
          tipCents,
          expressFeeCents,
          -discountCents,
        ),
      );

      const authoritativeQuote: ClientQuote = {
        subtotal_cents: subtotalCents,
        delivery_fee_cents: deliveryFeeCents,
        service_fee_cents: serviceFeeCents,
        tax_cents: taxCents,
        tip_cents: tipCents,
        express_fee_cents: expressFeeCents,
        discount_cents: discountCents,
        total_cents: totalCents,
      };

      const changedFields = quoteChangedFields(clientQuote, authoritativeQuote);
      if (!promo.valid || changedFields.length > 0) {
        throw new HttpError(
          409,
          promo.error ??
            "The price changed. Review the updated total before placing your order.",
          {
            code: "price_changed",
            changed_fields: changedFields,
            authoritative_quote: authoritativeQuote,
          },
        );
      }

      const savedDeliveryAddress =
        orderMode === "pickup" ? pickupAddress : deliveryAddress;
      const savedDeliveryLat = orderMode === "pickup" ? pickupLat : deliveryLat;
      const savedDeliveryLng = orderMode === "pickup" ? pickupLng : deliveryLng;
      const trackingCode = createTrackingCode();

      const orderPayload = {
        subtotal: subtotalCents / 100,
        delivery_fee: deliveryFeeCents / 100,
        delivery_fee_cents: deliveryFeeCents,
        service_fee: serviceFeeCents / 100,
        service_fee_cents: serviceFeeCents,
        tax: taxCents / 100,
        tip_amount: tipCents / 100,
        express_fee_cents: expressFeeCents,
        discount_amount: discountCents / 100,
        total_amount: totalCents / 100,
        delivery_address: savedDeliveryAddress,
        delivery_lat: savedDeliveryLat,
        delivery_lng: savedDeliveryLng,
        pickup_lat: pickupLat,
        pickup_lng: pickupLng,
        special_instructions: specialInstructions,
        payment_type: paymentType,
        payment_provider: paymentProvider(paymentType),
        is_scheduled: isScheduled,
        scheduled_for: scheduledFor,
        is_express: isExpress,
        promo_code: promo.code,
        tracking_code: trackingCode,
        needs_driver: orderMode === "delivery",
        ride_type: orderMode,
      };

      // The atomic RPC owns the final .from("food_orders") insert together
      // with stock reservation and promo consumption in one transaction.
      const { data: atomicOrder, error: atomicError } = await (
        admin as any
      ).rpc("create_eats_order_atomic_v1", {
        p_customer_id: userId,
        p_idempotency_key: idempotencyKey,
        p_request_fingerprint: requestFingerprint,
        p_restaurant_id: restaurantId,
        p_order_mode: orderMode,
        p_items: authoritativeItems,
        p_order: orderPayload,
        p_promo_id: promo.id,
      });

      if (atomicError) {
        const message = String(atomicError.message ?? "");
        ctx?.log.error("food_order_atomic_create_failed", { error: message });

        if (message.includes("eats_atomic_idempotency_conflict")) {
          throw new HttpError(
            409,
            "This checkout request was already used for a different order",
            { code: "idempotency_conflict" },
          );
        }
        if (message.includes("eats_atomic_menu_changed")) {
          throw new HttpError(
            409,
            "One or more menu items are no longer available",
            { code: "menu_changed" },
          );
        }
        if (message.includes("eats_atomic_restaurant_unavailable")) {
          throw new HttpError(409, "Restaurant is not accepting orders", {
            code: "restaurant_unavailable",
          });
        }
        if (message.includes("eats_atomic_restaurant_location_unavailable")) {
          throw new HttpError(
            503,
            "Restaurant pickup location is unavailable",
            { code: "restaurant_location_unavailable" },
          );
        }
        if (
          message.includes("eats_atomic_promo_unavailable") ||
          message.includes("eats_atomic_promo_limit")
        ) {
          const withoutPromo: ClientQuote = {
            ...authoritativeQuote,
            discount_cents: 0,
            total_cents: safeAdd(totalCents, discountCents),
          };
          throw new HttpError(
            409,
            "Promo code is no longer available. Review the updated total.",
            {
              code: "price_changed",
              changed_fields: ["discount_cents", "total_cents"],
              authoritative_quote: withoutPromo,
            },
          );
        }
        if (message.includes("eats_atomic_price_changed")) {
          throw new HttpError(
            409,
            "The price changed. Review the updated total before placing your order.",
            { code: "price_changed" },
          );
        }
        throw new HttpError(503, "Could not save the order");
      }

      const projection = cleanAtomicOrderProjection(atomicOrder, userId);
      if (!projection) {
        ctx?.log.error("food_order_atomic_create_missing_row", {
          order_id: null,
        });
        throw new HttpError(503, "Could not save the order");
      }

      return orderResponse(
        projection,
        authoritativeQuote,
        projection.idempotentReplay ? 200 : 201,
        ctx?.corsHeaders ?? {},
      );
    }, "create-eats-order"),
    {
      allowedMethods: ["POST"],
      strictCors: true,
      rateLimit: "payment",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function cleanPaymentType(value: unknown): PaymentType | null {
  return typeof value === "string" &&
    PAYMENT_TYPES.includes(value as PaymentType)
    ? (value as PaymentType)
    : null;
}

function cleanOrderMode(value: unknown): FulfillmentType | null {
  return value === "delivery" || value === "pickup" ? value : null;
}

function cleanItems(value: unknown): RequestItem[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_LINES) {
    throw new HttpError(400, "Order must contain 1 to 50 menu items");
  }

  const seen = new Set<string>();
  return value.map((raw) => {
    const item = asRecord(raw);
    const menuItemId = cleanUuid(item?.menu_item_id);
    const quantity = cleanInteger(item?.quantity, 1, MAX_QUANTITY_PER_LINE);
    if (!menuItemId || quantity == null || seen.has(menuItemId)) {
      throw new HttpError(400, "Invalid or duplicate menu item");
    }
    seen.add(menuItemId);
    return {
      menuItemId,
      quantity,
      specialInstructions: cleanOptionalText(item?.special_instructions, 500),
    };
  });
}

function cleanQuote(value: unknown): ClientQuote | null {
  const quote = asRecord(value);
  if (!quote) return null;
  const fields = [
    "subtotal_cents",
    "delivery_fee_cents",
    "service_fee_cents",
    "tax_cents",
    "tip_cents",
    "express_fee_cents",
    "discount_cents",
    "total_cents",
  ] as const;
  const result = {} as ClientQuote;
  for (const field of fields) {
    const amount = cleanInteger(quote[field], 0, 5_000_000);
    if (amount == null) return null;
    result[field] = amount;
  }
  return result;
}

function cleanInteger(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

function cleanCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : null;
}

function cleanRequiredText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned.length > 0 && cleaned.length <= maxLength ? cleaned : null;
}

function cleanOptionalText(value: unknown, maxLength: number): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "Invalid order instructions");
  }
  const cleaned = value.trim();
  if (cleaned.length > maxLength) {
    throw new HttpError(400, "Order instructions are too long");
  }
  return cleaned || null;
}

function cleanPromoCode(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") throw new HttpError(400, "Invalid promo code");
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,40}$/.test(code)) {
    throw new HttpError(400, "Invalid promo code");
  }
  return code;
}

function cleanScheduleTimestamp(
  value: unknown,
  isScheduled: boolean,
): string | null {
  if (!isScheduled) return null;
  if (typeof value !== "string") {
    throw new HttpError(400, "Scheduled time is required");
  }
  const scheduledMs = Date.parse(value);
  if (!Number.isFinite(scheduledMs)) {
    throw new HttpError(400, "Scheduled time is invalid");
  }
  return new Date(scheduledMs).toISOString();
}

function assertScheduleWindow(
  scheduledFor: string | null,
  isScheduled: boolean,
): void {
  if (!isScheduled) return;
  const scheduledMs = scheduledFor ? Date.parse(scheduledFor) : Number.NaN;
  const now = Date.now();
  if (
    !Number.isFinite(scheduledMs) ||
    scheduledMs < now + 15 * 60 * 1_000 ||
    scheduledMs > now + MAX_SCHEDULE_DAYS * 24 * 60 * 60 * 1_000
  ) {
    throw new HttpError(
      400,
      "Scheduled time must be 15 minutes to 30 days ahead",
    );
  }
}

function assertRestaurantAvailable(
  restaurant: RestaurantRow,
  fulfillmentType: FulfillmentType,
): void {
  if (
    restaurant.status !== "active" ||
    restaurant.is_open !== true ||
    restaurant.pause_new_orders === true
  ) {
    throw new HttpError(409, "Restaurant is not accepting orders", {
      code: "restaurant_unavailable",
    });
  }
  if (restaurant.currency !== "USD") {
    throw new HttpError(409, "Restaurant currency is not supported");
  }
  if (
    (fulfillmentType === "delivery" && restaurant.accepts_delivery !== true) ||
    (fulfillmentType === "pickup" && restaurant.accepts_pickup !== true)
  ) {
    throw new HttpError(
      409,
      `Restaurant does not accept ${fulfillmentType} orders`,
    );
  }
}

async function createRequestFingerprint(input: {
  restaurantId: string;
  orderMode: FulfillmentType;
  items: RequestItem[];
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  paymentType: PaymentType;
  clientQuote: ClientQuote;
  specialInstructions: string | null;
  isScheduled: boolean;
  scheduledFor: string | null;
  isExpress: boolean;
  requestedPromoCode: string | null;
}): Promise<string> {
  const canonical = JSON.stringify({
    version: 1,
    restaurant_id: input.restaurantId,
    order_mode: input.orderMode,
    items: [...input.items]
      .sort((left, right) => left.menuItemId.localeCompare(right.menuItemId))
      .map((item) => ({
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        special_instructions: item.specialInstructions,
      })),
    delivery_address: input.deliveryAddress,
    delivery_lat: input.deliveryLat,
    delivery_lng: input.deliveryLng,
    payment_type: input.paymentType,
    quote: {
      subtotal_cents: input.clientQuote.subtotal_cents,
      delivery_fee_cents: input.clientQuote.delivery_fee_cents,
      service_fee_cents: input.clientQuote.service_fee_cents,
      tax_cents: input.clientQuote.tax_cents,
      tip_cents: input.clientQuote.tip_cents,
      express_fee_cents: input.clientQuote.express_fee_cents,
      discount_cents: input.clientQuote.discount_cents,
      total_cents: input.clientQuote.total_cents,
    },
    special_instructions: input.specialInstructions,
    is_scheduled: input.isScheduled,
    scheduled_for: input.scheduledFor,
    is_express: input.isExpress,
    promo_code: input.requestedPromoCode,
  });
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function cleanAtomicOrderProjection(
  value: unknown,
  expectedCustomerId: string,
): AtomicOrderProjection | null {
  const envelope = asRecord(value);
  const rawOrder = asRecord(envelope?.order);
  if (
    !envelope ||
    typeof envelope.idempotent_replay !== "boolean" ||
    !rawOrder ||
    !cleanUuid(rawOrder.id) ||
    rawOrder.customer_id !== expectedCustomerId ||
    !cleanUuid(rawOrder.restaurant_id) ||
    typeof rawOrder.tracking_code !== "string" ||
    !rawOrder.tracking_code.trim() ||
    !cleanPaymentType(rawOrder.payment_type) ||
    typeof rawOrder.status !== "string" ||
    typeof rawOrder.payment_status !== "string"
  ) {
    return null;
  }

  const totalAmount = Number(rawOrder.total_amount);
  if (!Number.isFinite(totalAmount) || totalAmount < 0) return null;
  const paymentExpiresAt =
    rawOrder.payment_expires_at == null
      ? null
      : typeof rawOrder.payment_expires_at === "string" &&
          Number.isFinite(Date.parse(rawOrder.payment_expires_at))
        ? rawOrder.payment_expires_at
        : undefined;
  if (paymentExpiresAt === undefined) return null;

  return {
    idempotentReplay: envelope.idempotent_replay,
    order: {
      id: String(rawOrder.id),
      customer_id: expectedCustomerId,
      restaurant_id: String(rawOrder.restaurant_id),
      tracking_code: rawOrder.tracking_code.trim(),
      total_amount: totalAmount,
      payment_type: String(rawOrder.payment_type),
      status: rawOrder.status,
      payment_status: rawOrder.payment_status,
      payment_expires_at: paymentExpiresAt,
    },
  };
}

function orderResponse(
  projection: AtomicOrderProjection,
  authoritativeQuote: ClientQuote,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  const order = projection.order;
  const totalCents = dollarsToCents(order.total_amount, "saved order total");
  return json(
    {
      ok: true,
      idempotent_replay: projection.idempotentReplay,
      order: {
        id: order.id,
        customer_id: order.customer_id,
        restaurant_id: order.restaurant_id,
        tracking_code: order.tracking_code,
        total_amount: order.total_amount,
        payment_type: order.payment_type,
        status: order.status,
        payment_status: order.payment_status,
        payment_expires_at: order.payment_expires_at,
      },
      tracking_code: order.tracking_code,
      total_cents: totalCents,
      authoritative_quote: authoritativeQuote,
    },
    status,
    corsHeaders,
  );
}

function dollarsToCents(value: unknown, label: string): number {
  const amount = Number(value);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || !Number.isSafeInteger(cents) || cents < 0) {
    throw new HttpError(503, `Invalid ${label}`);
  }
  return cents;
}

function cleanDatabaseCents(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 1_000_000) {
    throw new HttpError(503, "Restaurant fee configuration is invalid");
  }
  return parsed;
}

function cleanPercent(value: unknown, fallback: number): number {
  if (value == null) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 50) {
    throw new HttpError(503, "Restaurant service fee is invalid");
  }
  return parsed;
}

async function resolvePromo(
  admin: ReturnType<typeof getServiceRoleClient>,
  requestedCode: string | null,
  userId: string,
  subtotalCents: number,
): Promise<
  | {
      valid: true;
      id: string | null;
      code: string | null;
      discountCents: number;
      error: null;
    }
  | {
      valid: false;
      id: null;
      code: null;
      discountCents: 0;
      error: string;
    }
> {
  if (!requestedCode) {
    return {
      valid: true,
      id: null,
      code: null,
      discountCents: 0,
      error: null,
    };
  }

  const { data, error } = await admin
    .from("promo_codes")
    .select(
      "id, code, discount_type, discount_value, is_active, start_at, end_at, expires_at, min_fare, max_discount, max_uses, uses, usage_count, max_uses_per_user",
    )
    .eq("code", requestedCode)
    .limit(2);
  if (error) throw new HttpError(503, "Could not verify promo code");
  const matches = (data ?? []) as PromoRow[];
  if (matches.length !== 1) {
    return unavailablePromo("Promo code is no longer available");
  }

  const promo = matches[0];
  const now = Date.now();
  const startMs = promo.start_at ? Date.parse(promo.start_at) : null;
  const endValues = [promo.end_at, promo.expires_at]
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value));
  if (
    promo.is_active !== true ||
    (startMs != null && (!Number.isFinite(startMs) || startMs > now)) ||
    endValues.some((value) => !Number.isFinite(value) || value <= now)
  ) {
    return unavailablePromo("Promo code is no longer active");
  }

  const useCount = Math.max(promo.uses ?? 0, promo.usage_count ?? 0);
  if (promo.max_uses != null && useCount >= promo.max_uses) {
    return unavailablePromo("Promo code has reached its usage limit");
  }

  if (promo.max_uses_per_user != null) {
    const { count, error: usageError } = await admin
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promo_id", promo.id)
      .eq("user_id", userId);
    if (usageError) throw new HttpError(503, "Could not verify promo usage");
    if ((count ?? 0) >= promo.max_uses_per_user) {
      return unavailablePromo("Promo code has reached your usage limit");
    }
  }

  const minFareCents =
    promo.min_fare == null
      ? 0
      : dollarsToCents(promo.min_fare, "promo minimum");
  if (subtotalCents < minFareCents) {
    return unavailablePromo("Order no longer meets the promo minimum");
  }

  const discountValue = Number(promo.discount_value);
  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new HttpError(503, "Promo configuration is invalid");
  }
  let discountCents =
    promo.discount_type === "percent"
      ? Math.round(subtotalCents * (discountValue / 100))
      : promo.discount_type === "fixed"
        ? Math.round(discountValue * 100)
        : 0;
  if (promo.discount_type !== "percent" && promo.discount_type !== "fixed") {
    throw new HttpError(503, "Promo configuration is invalid");
  }
  if (promo.max_discount != null) {
    discountCents = Math.min(
      discountCents,
      dollarsToCents(promo.max_discount, "promo maximum"),
    );
  }
  discountCents = Math.min(Math.max(discountCents, 0), subtotalCents);

  return {
    valid: true,
    id: promo.id,
    code: promo.code,
    discountCents,
    error: null,
  };
}

function unavailablePromo(error: string) {
  return {
    valid: false as const,
    id: null,
    code: null,
    discountCents: 0 as const,
    error,
  };
}

function quoteChangedFields(
  client: ClientQuote,
  authoritative: ClientQuote,
): string[] {
  return (Object.keys(authoritative) as Array<keyof ClientQuote>).filter(
    (field) => client[field] !== authoritative[field],
  );
}

function safeMultiply(left: number, right: number): number {
  const result = left * right;
  if (!Number.isSafeInteger(result))
    throw new HttpError(400, "Order is too large");
  return result;
}

function safeAdd(...values: number[]): number {
  const result = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isSafeInteger(result))
    throw new HttpError(400, "Order is too large");
  return result;
}

function cleanDatabaseCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : null;
}

function paymentProvider(paymentType: PaymentType): string {
  return paymentType === "card" ? "stripe" : paymentType;
}

function createTrackingCode(): string {
  return `ZE-${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`;
}

function json(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
