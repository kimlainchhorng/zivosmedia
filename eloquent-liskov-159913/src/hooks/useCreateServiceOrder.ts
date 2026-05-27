// useCreateServiceOrder
// Single hook to create a ride or delivery order via zivo-request-service.

import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder, ServiceOrderItem } from "@/types/serviceOrder";

export interface CreateRideInput {
  kind: "ride";
  pickup_address?: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  passenger_count?: number;
  vehicle_class?: string;
  subtotal_cents: number;
  service_fee_cents?: number;
  tip_cents?: number;
  distance_km?: number;
  duration_minutes?: number;
  promo_code?: string;
}

export interface CreateDeliveryInput {
  kind: "delivery";
  shop_id: string;
  dropoff_address: string;
  dropoff_lat?: number;
  dropoff_lng?: number;
  items: ServiceOrderItem[];
  special_notes?: string;
  subtotal_cents: number;
  delivery_fee_cents?: number;
  service_fee_cents?: number;
  tip_cents?: number;
  distance_km?: number;
  promo_code?: string;
}

export type CreateServiceOrderInput = CreateRideInput | CreateDeliveryInput;

export function useCreateServiceOrder() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (input: CreateServiceOrderInput): Promise<ServiceOrder | null> => {
    setIsPending(true);
    setError(null);
    try {
      const { data, error: invErr } = await supabase.functions.invoke<{
        ok?: boolean; order?: ServiceOrder; error?: string; missing?: string[];
      }>("zivo-request-service", { body: input });
      if (invErr) { setError(invErr.message); return null; }
      if (!data?.ok || !data.order) {
        setError(data?.error ?? "create_failed");
        return null;
      }
      return data.order;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return null;
    } finally {
      setIsPending(false);
    }
  }, []);

  return { mutate, isPending, error };
}
