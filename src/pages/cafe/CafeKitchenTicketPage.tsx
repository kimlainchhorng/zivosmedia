/**
 * Kitchen ticket at /cafe/kitchen-ticket/:orderId. Anonymous-readable view
 * (the page is opened from the admin so the auth context already lets the
 * caller see the order; the SELECTs run under their own RLS). Sized for an
 * 80mm thermal printer and auto-fires window.print() on mount so the user
 * can keep flow.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Order {
  id: string;
  ticket_number: number;
  channel: string;
  status: string;
  placed_at: string;
  scheduled_for: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_notes: string | null;
  table_id: string | null;
}
interface Item {
  id: string;
  item_name: string;
  quantity: number;
  notes: string | null;
}
interface Mod {
  id: string;
  order_item_id: string;
  group_name: string | null;
  modifier_name: string;
}

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function CafeKitchenTicketPage() {
  const { orderId = "" } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [mods, setMods] = useState<Mod[]>([]);
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [storeName, setStoreName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const oRes = await supabase
        .from("cafe_orders" as never)
        .select("id, ticket_number, channel, status, placed_at, scheduled_for, customer_name, customer_phone, customer_notes, table_id, store_id")
        .eq("id", orderId)
        .maybeSingle();
      if (cancelled) return;
      if (oRes.error || !oRes.data) { setError("Order not found."); setLoading(false); return; }
      const o = oRes.data as unknown as Order & { store_id: string };
      setOrder(o);

      const [itemsRes, storeRes, tableRes] = await Promise.all([
        supabase.from("cafe_order_items" as never)
          .select("id, item_name, quantity, notes")
          .eq("order_id", orderId).order("created_at"),
        supabase.from("store_profiles").select("name").eq("id", o.store_id).maybeSingle(),
        o.table_id
          ? supabase.from("cafe_tables" as never).select("label").eq("id", o.table_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const itemRows = (itemsRes.data ?? []) as unknown as Item[];
      setItems(itemRows);
      setStoreName((storeRes.data?.name as string | undefined) ?? "");
      setTableLabel(((tableRes as { data: { label: string } | null }).data?.label) ?? null);

      if (itemRows.length > 0) {
        const modRes = await supabase
          .from("cafe_order_item_modifiers" as never)
          .select("id, order_item_id, group_name, modifier_name")
          .in("order_item_id", itemRows.map((i) => i.id));
        if (cancelled) return;
        setMods((modRes.data ?? []) as unknown as Mod[]);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orderId]);

  // Fire the print dialog once we've drawn content (next tick).
  useEffect(() => {
    if (!loading && !error && order) {
      const t = setTimeout(() => { try { window.print(); } catch { /* noop */ } }, 250);
      return () => clearTimeout(t);
    }
  }, [loading, error, order]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }
  if (error || !order) {
    return <div className="min-h-screen grid place-items-center text-destructive">{error ?? "Order not found."}</div>;
  }

  return (
    <div className="bg-white text-black min-h-screen flex justify-center p-4 print:p-0 print:bg-white">
      <Helmet><title>Ticket #{order.ticket_number}</title></Helmet>
      <style>{`
        @page { size: 80mm auto; margin: 4mm; }
        @media print {
          .no-print { display: none !important; }
          html, body { background: white !important; }
        }
      `}</style>
      <div className="w-[80mm] font-mono text-[12px] leading-tight print:w-full">
        <div className="text-center mb-2">
          <div className="font-bold text-[14px]">{storeName || "Kitchen ticket"}</div>
          <div>—</div>
          <div className="font-bold text-[22px]">#{order.ticket_number}</div>
          <div className="text-[11px]">
            {order.channel.replace(/_/g, " ").toUpperCase()}
            {tableLabel ? ` · ${tableLabel}` : ""}
          </div>
          <div className="text-[11px]">Placed {fmtTime(order.placed_at)}</div>
          {order.scheduled_for && (
            <div className="text-[11px] font-bold">
              📅 PICKUP {new Date(order.scheduled_for).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </div>
          )}
          {order.customer_name && <div className="text-[11px] mt-1">For: {order.customer_name}</div>}
        </div>

        <div className="border-t border-dashed border-black my-1" />

        <ul className="space-y-2">
          {items.map((it) => {
            const itsMods = mods.filter((m) => m.order_item_id === it.id);
            return (
              <li key={it.id}>
                <div className="font-bold">{it.quantity}× {it.item_name}</div>
                {itsMods.length > 0 && (
                  <div className="pl-3 text-[11px]">
                    {itsMods.map((m) => m.modifier_name).join(" · ")}
                  </div>
                )}
                {it.notes && (
                  <div className="pl-3 text-[11px] italic">&ldquo;{it.notes}&rdquo;</div>
                )}
              </li>
            );
          })}
        </ul>

        {order.customer_notes && (
          <>
            <div className="border-t border-dashed border-black my-1" />
            <div className="text-[11px]">
              <span className="font-bold">Note: </span>{order.customer_notes}
            </div>
          </>
        )}

        <div className="border-t border-dashed border-black my-1" />
        <div className="text-center text-[10px]">
          {new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
        </div>

        <div className="text-center mt-4 no-print">
          <button onClick={() => window.print()} className="text-xs underline">Print again</button>
        </div>
      </div>
    </div>
  );
}
