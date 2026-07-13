// useServiceOrder
// Realtime subscription to a single service_orders row + its event stream
// + the assigned driver's location.

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceOrder, ServiceOrderEvent, ServiceOrderStatus } from "@/types/serviceOrder";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";

export interface DriverPin {
  lat: number;
  lng: number;
  updated_at: string;
}

export interface UseServiceOrderResult {
  order: ServiceOrder | null;
  events: ServiceOrderEvent[];
  driverLocation: DriverPin | null;
  isLoading: boolean;
  error: string | null;
  cancel: (reason?: string) => Promise<void>;
  rate: (stars: number) => Promise<void>;
}

export function useServiceOrder(orderId: string | null | undefined): UseServiceOrderResult {
  const [order, setOrder] = useState<ServiceOrder | null>(null);
  const [events, setEvents] = useState<ServiceOrderEvent[]>([]);
  const [driverLocation, setDriverLocation] = useState<DriverPin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const driverUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!orderId) { setOrder(null); setEvents([]); setIsLoading(false); return; }
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      const [oRes, eRes] = await Promise.all([
        supabase.from("service_orders").select("*").eq("id", orderId).single(),
        supabase.from("service_order_events")
          .select("*").eq("order_id", orderId).order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (oRes.error) setError(oRes.error.message);
      if (oRes.data) setOrder(oRes.data as unknown as ServiceOrder);
      if (eRes.data) setEvents(eRes.data as unknown as ServiceOrderEvent[]);
      setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const unsubscribeOrder = subscribeToPooledPostgresChanges(
      {
        poolKey: `service-order:${orderId}`,
        event: "UPDATE",
        schema: "public",
        table: "service_orders",
        filter: `id=eq.${orderId}`,
      },
      (p) => setOrder(p.new as unknown as ServiceOrder),
    );

    const unsubscribeEvents = subscribeToPooledPostgresChanges(
      {
        poolKey: `service-order:${orderId}`,
        event: "INSERT",
        schema: "public",
        table: "service_order_events",
        filter: `order_id=eq.${orderId}`,
      },
      (p) => setEvents((prev) => [...prev, p.new as unknown as ServiceOrderEvent]),
    );

    return () => {
      unsubscribeOrder();
      unsubscribeEvents();
    };
  }, [orderId]);

  useEffect(() => {
    const driverId = order?.driver_id;
    if (driverUnsubscribeRef.current) {
      driverUnsubscribeRef.current();
      driverUnsubscribeRef.current = null;
    }
    if (!driverId) { setDriverLocation(null); return; }

    supabase.from("drivers")
      .select("current_lat, current_lng, updated_at")
      .eq("id", driverId).maybeSingle()
      .then(({ data }) => {
        if (data?.current_lat != null && data.current_lng != null) {
          setDriverLocation({ lat: data.current_lat, lng: data.current_lng, updated_at: data.updated_at });
        }
      });

    driverUnsubscribeRef.current = subscribeToPooledPostgresChanges(
      {
        poolKey: `service-order-driver:${driverId}`,
        event: "UPDATE",
        schema: "public",
        table: "drivers",
        filter: `id=eq.${driverId}`,
      },
      (p) => {
        const row = p.new as { current_lat: number | null; current_lng: number | null; updated_at: string };
        if (row.current_lat != null && row.current_lng != null) {
          setDriverLocation({ lat: row.current_lat, lng: row.current_lng, updated_at: row.updated_at });
        }
      }
    );

    return () => {
      if (driverUnsubscribeRef.current) {
        driverUnsubscribeRef.current();
        driverUnsubscribeRef.current = null;
      }
    };
  }, [order?.driver_id]);

  const cancel = useCallback(async (reason?: string) => {
    if (!orderId) return;
    const { error: invErr } = await supabase.functions.invoke("zivo-update-status", {
      body: { order_id: orderId, to_status: "cancelled" as ServiceOrderStatus, meta: { reason: reason ?? "customer_cancelled" } },
    });
    if (invErr) setError(invErr.message);
  }, [orderId]);

  const rate = useCallback(async (stars: number) => {
    if (!orderId || stars < 1 || stars > 5) return;
    const { error: rErr } = await supabase.from("service_orders")
      .update({ rating_by_customer: stars }).eq("id", orderId);
    if (rErr) setError(rErr.message);
  }, [orderId]);

  return { order, events, driverLocation, isLoading, error, cancel, rate };
}
