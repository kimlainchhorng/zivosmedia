/**
 * Listens for new cafe_orders INSERTs and pops a toast for each one so the
 * owner gets pinged from anywhere in the admin — not just the Orders tab.
 * Mirrors the salon pattern: prime the "seen" set on mount so historic rows
 * don't fire on every page load.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface OrderRow {
  id: string;
  ticket_number: number;
  customer_name: string | null;
  channel: string;
  status: string;
  table_id: string | null;
  total_cents: number;
}

const NOTIFY_CHANNELS = new Set(["qr_table", "pickup", "delivery", "phone"]);

export function useCafeRealtimeNotifications(storeId: string | undefined, isCafe: boolean) {
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  // Prime the seen-set with the last hour of open orders so the channel
  // catches up without spamming. Anything older we don't care about.
  useEffect(() => {
    if (!storeId || !isCafe) return;
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("cafe_orders" as never)
        .select("id")
        .eq("store_id", storeId)
        .gte("placed_at", since);
      if (cancelled) return;
      for (const r of ((data ?? []) as { id: string }[])) {
        seenRef.current.add(r.id);
      }
      primedRef.current = true;
    })();
    return () => { cancelled = true; };
  }, [storeId, isCafe]);

  useEffect(() => {
    if (!storeId || !isCafe) return;
    const channel = supabase
      .channel(`cafe-notifications:${storeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cafe_orders", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row = payload.new as Partial<OrderRow> | null;
          if (!row?.id) return;
          if (!primedRef.current) {
            seenRef.current.add(row.id);
            return;
          }
          // Counter orders are placed by staff at the till; the owner doesn't
          // need a toast for those.
          if (!row.channel || !NOTIFY_CHANNELS.has(row.channel)) return;
          if (seenRef.current.has(row.id)) return;
          seenRef.current.add(row.id);

          const customer = row.customer_name?.trim() || "Customer";
          const ticket = row.ticket_number ? `#${row.ticket_number}` : "";
          const amount = typeof row.total_cents === "number" ? ` · $${(row.total_cents / 100).toFixed(2)}` : "";
          toast.info(`New order ${ticket}`, {
            description: `${customer} via ${(row.channel ?? "").replace("_", " ")}${amount}`,
            duration: 8000,
            action: {
              label: "View",
              onClick: () => {
                // Best-effort jump to the orders tab. Owners on a different
                // store admin URL won't be redirected; this just updates the
                // tab when the path already matches /admin/stores/<id>.
                if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/stores/")) {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "cafe-orders");
                  window.history.pushState({}, "", url.toString());
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }
              },
            },
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "cafe_inventory_items", filter: `store_id=eq.${storeId}` },
        (payload) => {
          // Fire only on the *crossing* — old was above, new is at or below
          // threshold. Repeated UPDATEs while already low are silent.
          const newRow = payload.new as { id: string; name: string; unit: string; on_hand_qty: number; low_stock_threshold: number; is_active: boolean } | null;
          const oldRow = payload.old as { on_hand_qty: number; low_stock_threshold: number } | null;
          if (!newRow || !oldRow) return;
          if (newRow.is_active === false) return;
          const threshold = newRow.low_stock_threshold;
          if (!threshold || threshold <= 0) return;
          const wasOk = oldRow.on_hand_qty > oldRow.low_stock_threshold;
          const isLow = newRow.on_hand_qty <= threshold;
          if (!(wasOk && isLow)) return;
          toast.warning(`Low stock: ${newRow.name}`, {
            description: `${newRow.on_hand_qty} ${newRow.unit} left · reorder threshold ${threshold} ${newRow.unit}`,
            duration: 10000,
            action: {
              label: "Inventory",
              onClick: () => {
                if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/stores/")) {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "cafe-inventory");
                  window.history.pushState({}, "", url.toString());
                  window.dispatchEvent(new PopStateEvent("popstate"));
                }
              },
            },
          });
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, isCafe]);
}
