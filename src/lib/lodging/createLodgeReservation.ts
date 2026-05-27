import { supabase } from "@/integrations/supabase/client";

export type LodgeReservationPaymentMethod =
  | "cash"
  | "card"
  | "pay_at_property"
  | "card_on_arrival"
  | "bank_transfer"
  | "khqr";

export interface CreateLodgeReservationPayload {
  store_id: string;
  room_id: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string | null;
  guest_country?: string | null;
  adults: number;
  children: number;
  check_in: string;
  check_out: string;
  status?: "hold" | "confirmed";
  source?: string;
  payment_method: LodgeReservationPaymentMethod;
  addons?: unknown[];
  addon_selections?: unknown[];
  guest_details?: Record<string, unknown>;
  notes?: string | null;
  policy_consent?: Record<string, unknown> | null;
  policy_consent_version?: string | null;
}

export interface CreateLodgeReservationResult {
  id: string;
  number: string;
  status: string;
  payment_status: string;
  payment_provider: string | null;
  rate_cents: number;
  extras_cents: number;
  tax_cents: number;
  total_cents: number;
  deposit_cents: number;
  check_in: string;
  check_out: string;
  nights: number;
}

export async function createLodgeGuestReservation(
  payload: CreateLodgeReservationPayload,
): Promise<CreateLodgeReservationResult> {
  const { data, error } = await (supabase as any).rpc("create_lodge_guest_reservation", {
    p_payload: payload,
  });

  if (error) throw error;
  if (!data?.id) throw new Error("Booking could not be created");

  return data as CreateLodgeReservationResult;
}
