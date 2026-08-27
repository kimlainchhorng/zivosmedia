/**
 * Travel-order queries for customer trip history and detail views.
 * RLS remains authoritative; explicit user filters keep these customer
 * surfaces owner-only even when the signed-in account also has a staff role.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TripFilter = "upcoming" | "past" | "cancelled" | "all";

export interface TravelOrderSummaryItem {
  id: string;
  type: "hotel" | "activity" | "transfer";
  title: string;
  start_date: string;
  end_date: string | null;
  meta: Record<string, unknown>;
  status: string;
  supplier_status: string | null;
}

export interface TravelOrderSummary {
  id: string;
  user_id: string | null;
  order_number: string;
  currency: string;
  total: number;
  status: string;
  cancellation_status: string;
  created_at: string;
  travel_order_items: TravelOrderSummaryItem[];
}

export interface TravelOrderItem extends TravelOrderSummaryItem {
  provider: string;
  provider_reference: string | null;
  adults: number;
  children: number;
  quantity: number;
  price: number;
  cancellation_policy: string | null;
  cancellable: boolean;
  cancellation_deadline: string | null;
  supplier_status: string;
  created_at: string;
}

export type TravelOrder = TravelOrderSummary;

export interface TravelOrderDetail extends TravelOrderSummary {
  subtotal: number;
  taxes: number;
  fees: number;
  provider: string;
  holder_name: string;
  holder_email: string;
  holder_phone: string | null;
  cancellation_reason: string | null;
  cancellation_requested_at: string | null;
  cancelled_at: string | null;
  updated_at: string;
  travel_order_items: TravelOrderItem[];
}

const TRAVEL_ORDER_SUMMARY_SELECT = `
  id,
  user_id,
  order_number,
  currency,
  total,
  status,
  cancellation_status,
  created_at,
  travel_order_items (
    id,
    type,
    title,
    start_date,
    end_date,
    meta,
    status,
    supplier_status
  )
`;

const TRAVEL_ORDER_DETAIL_SELECT = `
  id,
  user_id,
  order_number,
  currency,
  subtotal,
  taxes,
  fees,
  total,
  status,
  provider,
  holder_name,
  holder_email,
  holder_phone,
  cancellation_status,
  cancellation_reason,
  cancellation_requested_at,
  cancelled_at,
  created_at,
  updated_at,
  travel_order_items (
    id,
    type,
    provider,
    provider_reference,
    title,
    start_date,
    end_date,
    adults,
    children,
    quantity,
    price,
    meta,
    status,
    cancellation_policy,
    cancellable,
    cancellation_deadline,
    supplier_status,
    created_at
  )
`;

const UPCOMING_STATUSES = new Set(["confirmed", "pending_payment"]);
const CANCELLED_STATUSES = new Set(["cancelled", "refunded"]);
const CANCELLATION_STATES = new Set([
  "requested",
  "under_review",
  "approved",
  "processed",
]);

function asObjectMeta(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function parseTravelOrderDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);
}

function earliestStartDate(order: TravelOrderSummary): Date | null {
  const timestamps = order.travel_order_items
    .map((item) => parseTravelOrderDate(item.start_date).getTime())
    .filter(Number.isFinite);

  return timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
}

export function filterTravelOrders(
  orders: TravelOrderSummary[],
  filter: TripFilter,
  now = new Date(),
): TravelOrderSummary[] {
  if (filter === "all") return orders;

  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return orders.filter((order) => {
    const startDate = earliestStartDate(order);
    const hasCancellation = CANCELLATION_STATES.has(order.cancellation_status);

    if (filter === "cancelled") {
      return CANCELLED_STATUSES.has(order.status) || hasCancellation;
    }

    if (!startDate || CANCELLED_STATUSES.has(order.status) || hasCancellation) {
      return false;
    }

    if (filter === "upcoming") {
      return startDate >= today && UPCOMING_STATUSES.has(order.status);
    }

    return startDate < today && order.status === "confirmed";
  });
}

export function shouldRetryTravelOrderQuery(
  failureCount: number,
  error: unknown,
): boolean {
  const code =
    error !== null && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";

  return code !== "42501" && failureCount < 2;
}

export function useMyTrips(filter: TripFilter = "all") {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["my-trips", userId, filter],
    queryFn: async (): Promise<TravelOrderSummary[]> => {
      if (!userId) {
        throw new Error("Sign in is required to load travel orders.");
      }

      const { data, error } = await supabase
        .from("travel_orders")
        .select(TRAVEL_ORDER_SUMMARY_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching trips:", error);
        throw error;
      }

      const orders: TravelOrderSummary[] = (data ?? []).map((order) => ({
        ...order,
        cancellation_status: order.cancellation_status ?? "none",
        travel_order_items: (order.travel_order_items ?? []).map((item) => ({
          ...item,
          type: item.type as TravelOrderSummaryItem["type"],
          meta: asObjectMeta(item.meta),
        })),
      }));

      return filterTravelOrders(orders, filter);
    },
    enabled: Boolean(userId),
    retry: shouldRetryTravelOrderQuery,
  });
}

export function useTripDetails(orderNumber: string | undefined) {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ["trip-details", userId, orderNumber],
    queryFn: async (): Promise<TravelOrderDetail | null> => {
      if (!orderNumber || !userId) {
        throw new Error(
          "Sign in and an order number are required to load trip details.",
        );
      }

      const { data, error } = await supabase
        .from("travel_orders")
        .select(TRAVEL_ORDER_DETAIL_SELECT)
        .eq("user_id", userId)
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (error) {
        console.error("Error fetching trip details:", error);
        throw error;
      }

      if (!data) return null;

      return {
        ...data,
        cancellation_status: data.cancellation_status ?? "none",
        travel_order_items: (data.travel_order_items ?? []).map((item) => ({
          ...item,
          type: item.type as TravelOrderItem["type"],
          meta: asObjectMeta(item.meta),
          cancellable: item.cancellable ?? false,
          supplier_status: item.supplier_status ?? "pending",
        })),
      };
    },
    enabled: Boolean(orderNumber && userId),
    retry: shouldRetryTravelOrderQuery,
  });
}
