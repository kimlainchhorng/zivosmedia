/**
 * Listens for new cafe_orders INSERTs and pops a toast for each one so the
 * owner gets pinged from anywhere in the admin — not just the Orders tab.
 * Mirrors the salon pattern: prime the "seen" set on mount so historic rows
 * don't fire on every page load.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";

interface OrderRow {
  id: string;
  ticket_number: number;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  status: string;
  table_id: string | null;
  total_cents: number;
}

const NOTIFY_CHANNELS = new Set(["qr_table", "pickup", "delivery", "phone"]);

export function useCafeRealtimeNotifications(storeId: string | undefined, isCafe: boolean) {
  const seenRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);
  const { code: currencyCode } = useCafeCurrency(storeId);

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
          const amount = typeof row.total_cents === "number"
            ? ` · ${formatCafeMoney(row.total_cents, currencyCode)}`
            : "";
          const channelLabel = (row.channel ?? "").replace("_", " ");
          const description = `${customer} via ${channelLabel}${amount}`;

          const onView = () => {
            // Best-effort jump to the orders tab. Owners on a different
            // store admin URL won't be redirected; this just updates the
            // tab when the path already matches /admin/stores/<id>.
            if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/stores/")) {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "cafe-orders");
              window.history.pushState({}, "", url.toString());
              window.dispatchEvent(new PopStateEvent("popstate"));
            }
          };

          // VIP lookup: phones marked is_vip in cafe_customer_notes get a
          // distinct toast so the barista can prep something special.
          const phone = row.customer_phone?.trim();
          if (phone && storeId) {
            void supabase
              .from("cafe_customer_notes" as never)
              .select("is_vip, notes")
              .eq("store_id", storeId)
              .eq("phone", phone)
              .maybeSingle()
              .then(({ data }) => {
                const note = data as { is_vip?: boolean; notes?: string | null } | null;
                if (note?.is_vip) {
                  toast.success(`★ VIP · New order ${ticket}`, {
                    description: note.notes
                      ? `${description}\n📝 ${note.notes}`
                      : description,
                    duration: 12000,
                    action: { label: "View", onClick: onView },
                  });
                } else {
                  toast.info(`New order ${ticket}`, {
                    description,
                    duration: 8000,
                    action: { label: "View", onClick: onView },
                  });
                }
              });
          } else {
            toast.info(`New order ${ticket}`, {
              description,
              duration: 8000,
              action: { label: "View", onClick: onView },
            });
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "cafe_reservations", filter: `store_id=eq.${storeId}` },
        (payload) => {
          // Public-RPC reservations land as 'pending'; admin-created ones are
          // 'confirmed' by default, so we only ping for true new requests.
          const row = payload.new as {
            id: string; customer_name: string; party_size: number; reserved_for: string; status: string;
          } | null;
          if (!row || row.status !== "pending") return;
          const dt = new Date(row.reserved_for);
          toast.info(`New reservation request`, {
            description: `${row.customer_name} · party of ${row.party_size} · ${dt.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`,
            duration: 10000,
            action: {
              label: "Review",
              onClick: () => {
                if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin/stores/")) {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "cafe-tables");
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
