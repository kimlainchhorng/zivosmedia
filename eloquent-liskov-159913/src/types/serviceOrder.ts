// Shared TypeScript types for the Zivo unified service-order pipeline.
// Mirrors the schema in supabase/migrations/20260502120000_zivo_unified_service_pipeline.sql

export type ServiceOrderKind = "ride" | "delivery";

export type ServiceOrderStatus =
  | "requested"
  | "shop_pending"
  | "shop_accepted"
  | "shop_rejected"
  | "preparing"
  | "ready_for_pickup"
  | "searching"
  | "assigned"
  | "driver_en_route"
  | "driver_arrived"
  | "picked_up"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ServiceOfferStatus =
  | "pending" | "accepted" | "declined" | "expired" | "cancelled";

export interface ServiceOrderItem {
  name: string;
  qty: number;
  price_cents: number;
  notes?: string;
}

export interface ServiceOrder {
  id: string;
  kind: ServiceOrderKind;
  status: ServiceOrderStatus;
  customer_id: string;
  shop_id: string | null;
  driver_id: string | null;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  passenger_count: number | null;
  vehicle_class: string | null;
  items: ServiceOrderItem[] | null;
  special_notes: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  service_fee_cents: number;
  tip_cents: number;
  total_cents: number;
  currency: string;
  distance_km: number | null;
  duration_minutes: number | null;
  estimated_pickup_at: string | null;
  estimated_dropoff_at: string | null;
  eta_pickup_at: string | null;
  eta_dropoff_at: string | null;
  eta_updated_at: string | null;
  shop_accepted_at: string | null;
  prepared_at: string | null;
  driver_assigned_at: string | null;
  picked_up_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  dispatch_attempts: number;
  last_dispatch_at: string | null;
  rating_by_customer: number | null;
  rating_by_driver: number | null;
  payment_status: string;
  payment_intent_id: string | null;
  service_promo_code_id: string | null;
  service_promo_discount_cents: number;
  created_at: string;
  updated_at: string;
}

export interface ServiceOrderEvent {
  id: string;
  order_id: string;
  actor_role: "customer" | "shop" | "driver" | "system";
  actor_id: string | null;
  event_type: string;
  from_status: ServiceOrderStatus | null;
  to_status: ServiceOrderStatus | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export const STATUS_LABEL: Record<ServiceOrderStatus, string> = {
  requested:        "Requested",
  shop_pending:     "Waiting for shop",
  shop_accepted:    "Shop accepted",
  shop_rejected:    "Shop rejected",
  preparing:        "Preparing",
  ready_for_pickup: "Ready for pickup",
  searching:        "Finding driver",
  assigned:         "Driver assigned",
  driver_en_route:  "Driver on the way",
  driver_arrived:   "Driver arrived",
  picked_up:        "Picked up",
  in_progress:      "On the way",
  completed:        "Completed",
  cancelled:        "Cancelled",
};

const RIDE_FLOW: ServiceOrderStatus[] = [
  "requested","searching","assigned","driver_en_route","driver_arrived","in_progress","completed",
];
const DELIVERY_FLOW: ServiceOrderStatus[] = [
  "requested","shop_pending","shop_accepted","preparing","ready_for_pickup",
  "searching","assigned","driver_en_route","driver_arrived","picked_up","in_progress","completed",
];

export const flowFor = (kind: ServiceOrderKind) =>
  kind === "ride" ? RIDE_FLOW : DELIVERY_FLOW;

export const isTerminal = (s: ServiceOrderStatus) =>
  s === "completed" || s === "cancelled" || s === "shop_rejected";
