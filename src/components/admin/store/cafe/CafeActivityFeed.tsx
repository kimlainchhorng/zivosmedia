/**
 * CafeActivityFeed — cross-module recent activity for the Dashboard.
 * Each row is one notable event from a different table; we union them
 * client-side, sort by time, and trim to the latest 30. No DB changes —
 * just SELECTs over the last few hundred records of each source.
 *
 * Sources (last 7 days, capped at 50 each):
 *   • cafe_orders (placed, completed, cancelled)
 *   • cafe_payments (captured, refunded)
 *   • cafe_gift_card_redemptions
 *   • cafe_inventory_movements (received, sold, wastage, adjust)
 *   • cafe_time_entries (clock-in, clock-out)
 *   • cafe_reviews (new)
 *   • cafe_expenses (added)
 *   • cafe_purchase_orders (status changes via updated_at)
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity, Loader2, ClipboardCheck, CheckCircle2, XCircle, CreditCard,
  Boxes, Trash2, ArrowDownToLine, Clock, LogIn, LogOut, Star, Wallet, Truck,
  Gift, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useCafeCurrency } from "@/hooks/cafe/useCafeCurrency";
import { formatCafeMoney } from "@/lib/cafe-currency";
import { cn } from "@/lib/utils";

interface Props { storeId: string; onJumpToTab?: (tab: string) => void }

interface FeedEntry {
  id: string;
  at: string;
  Icon: typeof ClipboardCheck;
  iconClass: string;
  label: string;
  detail?: string;
  tab?: string;
}

const SINCE_DAYS = 7;

function timeAgo(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  if (ms < 0) return "just now";
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function CafeActivityFeed({ storeId, onJumpToTab }: Props) {
  const { code: currencyCode } = useCafeCurrency(storeId);
  const fmt = (c: number) => formatCafeMoney(c, currencyCode);
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    const since = new Date(Date.now() - SINCE_DAYS * 86_400_000).toISOString();
    const [orderRes, payRes, gcRes, invRes, teRes, baristasRes, revRes, expRes, poRes] = await Promise.all([
      supabase.from("cafe_orders" as never)
        .select("id, ticket_number, status, customer_name, total_cents, placed_at, completed_at, cancelled_at, channel")
        .eq("store_id", storeId).gte("placed_at", since).order("placed_at", { ascending: false }).limit(50),
      supabase.from("cafe_payments" as never)
        .select("id, order_id, method, amount_cents, tip_cents, refunded_cents, status, created_at, updated_at")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      supabase.from("cafe_gift_card_redemptions" as never)
        .select("id, gift_card_id, amount_cents, notes, created_at")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(30),
      supabase.from("cafe_inventory_movements" as never)
        .select("id, inventory_item_id, reason, qty_change, unit_cost_cents, created_at")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(50),
      supabase.from("cafe_time_entries" as never)
        .select("id, barista_id, clock_in, clock_out, minutes_worked, hourly_rate_cents_snapshot, created_at")
        .eq("store_id", storeId).gte("clock_in", since).order("clock_in", { ascending: false }).limit(50),
      supabase.from("cafe_baristas" as never)
        .select("id, display_name").eq("store_id", storeId),
      supabase.from("cafe_reviews" as never)
        .select("id, display_name, rating_stars, created_at, owner_response, owner_response_at")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
      supabase.from("cafe_expenses" as never)
        .select("id, category, vendor, amount_cents, expense_date, created_at")
        .eq("store_id", storeId).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
      supabase.from("cafe_purchase_orders" as never)
        .select("id, po_number, status, total_cents, updated_at, sent_at, received_at, supplier_id")
        .eq("store_id", storeId).gte("updated_at", since).order("updated_at", { ascending: false }).limit(20),
    ]);

    const rows: FeedEntry[] = [];

    const orders = (orderRes.data ?? []) as unknown as {
      id: string; ticket_number: number; status: string; customer_name: string | null;
      total_cents: number; placed_at: string; completed_at: string | null;
      cancelled_at: string | null; channel: string;
    }[];
    for (const o of orders) {
      const who = o.customer_name || o.channel.replace("_", " ");
      rows.push({
        id: `order-placed-${o.id}`,
        at: o.placed_at,
        Icon: ClipboardCheck,
        iconClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
        label: `Order #${o.ticket_number} placed`,
        detail: `${who} · ${fmt(o.total_cents)}`,
        tab: "cafe-orders",
      });
      if (o.completed_at) {
        rows.push({
          id: `order-completed-${o.id}`,
          at: o.completed_at,
          Icon: CheckCircle2,
          iconClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
          label: `Order #${o.ticket_number} completed`,
          detail: `${who} · ${fmt(o.total_cents)}`,
          tab: "cafe-orders",
        });
      }
      if (o.cancelled_at) {
        rows.push({
          id: `order-cancelled-${o.id}`,
          at: o.cancelled_at,
          Icon: XCircle,
          iconClass: "bg-destructive/15 text-destructive",
          label: `Order #${o.ticket_number} cancelled`,
          detail: who,
          tab: "cafe-orders",
        });
      }
    }

    const payments = (payRes.data ?? []) as unknown as {
      id: string; order_id: string; method: string; amount_cents: number; tip_cents: number;
      refunded_cents: number; status: string; created_at: string; updated_at: string;
    }[];
    for (const p of payments) {
      if (p.status === "captured" || p.status === "authorized") {
        rows.push({
          id: `pay-${p.id}`,
          at: p.created_at,
          Icon: CreditCard,
          iconClass: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
          label: `${p.method.replace("_", " ")} payment`,
          detail: `${fmt(p.amount_cents - p.refunded_cents)}${p.tip_cents ? ` + ${fmt(p.tip_cents)} tip` : ""}`,
          tab: "cafe-orders",
        });
      }
      if (p.refunded_cents > 0) {
        rows.push({
          id: `refund-${p.id}`,
          at: p.updated_at,
          Icon: RefreshCw,
          iconClass: "bg-orange-500/15 text-orange-700 dark:text-orange-300",
          label: "Refund issued",
          detail: `${fmt(p.refunded_cents)} (${p.method.replace("_", " ")})`,
          tab: "cafe-orders",
        });
      }
    }

    const gcRedemptions = (gcRes.data ?? []) as unknown as { id: string; amount_cents: number; created_at: string; notes: string | null }[];
    for (const r of gcRedemptions) {
      rows.push({
        id: `gc-${r.id}`,
        at: r.created_at,
        Icon: Gift,
        iconClass: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
        label: r.amount_cents > 0 ? "Gift card redeemed" : "Gift card reversed",
        detail: `${fmt(Math.abs(r.amount_cents))}${r.notes ? ` · ${r.notes}` : ""}`,
        tab: "cafe-gift-cards",
      });
    }

    const movements = (invRes.data ?? []) as unknown as {
      id: string; reason: string; qty_change: number; unit_cost_cents: number; created_at: string;
    }[];
    for (const m of movements) {
      const positive = m.qty_change > 0;
      let Icon = Boxes;
      let iconClass = "bg-amber-500/15 text-amber-700 dark:text-amber-300";
      if (m.reason === "received") { Icon = ArrowDownToLine; iconClass = "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"; }
      else if (m.reason === "wastage") { Icon = Trash2; iconClass = "bg-destructive/15 text-destructive"; }
      else if (m.reason === "sold") { Icon = Boxes; iconClass = "bg-violet-500/15 text-violet-700 dark:text-violet-300"; }
      rows.push({
        id: `inv-${m.id}`,
        at: m.created_at,
        Icon,
        iconClass,
        label: m.reason === "received" ? "Stock received" :
               m.reason === "sold" ? "Stock sold" :
               m.reason === "wastage" ? "Stock wastage" :
               m.reason === "adjust" ? "Stock adjusted" :
               m.reason === "transfer" ? "Stock transferred" : "Stock returned",
        detail: `${positive ? "+" : ""}${Number(m.qty_change).toFixed(2)}${m.unit_cost_cents ? ` @ ${fmt(m.unit_cost_cents)}` : ""}`,
        tab: "cafe-inventory",
      });
    }

    const baristas = (baristasRes.data ?? []) as unknown as { id: string; display_name: string }[];
    const baristaName = new Map(baristas.map((b) => [b.id, b.display_name]));
    const entries = (teRes.data ?? []) as unknown as {
      id: string; barista_id: string; clock_in: string; clock_out: string | null;
      minutes_worked: number; hourly_rate_cents_snapshot: number;
    }[];
    for (const e of entries) {
      const name = baristaName.get(e.barista_id) ?? "Staff";
      rows.push({
        id: `clockin-${e.id}`,
        at: e.clock_in,
        Icon: LogIn,
        iconClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
        label: `${name} clocked in`,
        tab: "cafe-timeclock",
      });
      if (e.clock_out) {
        const wage = Math.round((e.minutes_worked / 60) * e.hourly_rate_cents_snapshot);
        rows.push({
          id: `clockout-${e.id}`,
          at: e.clock_out,
          Icon: LogOut,
          iconClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
          label: `${name} clocked out`,
          detail: `${Math.floor(e.minutes_worked / 60)}h ${(e.minutes_worked % 60).toString().padStart(2, "0")}m · ${fmt(wage)}`,
          tab: "cafe-timeclock",
        });
      }
    }

    const reviews = (revRes.data ?? []) as unknown as {
      id: string; display_name: string; rating_stars: number; created_at: string;
      owner_response: string | null; owner_response_at: string | null;
    }[];
    for (const r of reviews) {
      rows.push({
        id: `review-${r.id}`,
        at: r.created_at,
        Icon: Star,
        iconClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
        label: `${r.rating_stars}★ from ${r.display_name}`,
        tab: "cafe-reviews",
      });
      if (r.owner_response && r.owner_response_at) {
        rows.push({
          id: `review-reply-${r.id}`,
          at: r.owner_response_at,
          Icon: Star,
          iconClass: "bg-muted text-muted-foreground",
          label: `Replied to ${r.display_name}`,
          tab: "cafe-reviews",
        });
      }
    }

    const expenses = (expRes.data ?? []) as unknown as {
      id: string; category: string; vendor: string | null; amount_cents: number; created_at: string;
    }[];
    for (const e of expenses) {
      rows.push({
        id: `exp-${e.id}`,
        at: e.created_at,
        Icon: Wallet,
        iconClass: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
        label: `Expense: ${e.category}`,
        detail: `${e.vendor ?? "—"} · ${fmt(e.amount_cents)}`,
        tab: "cafe-expenses",
      });
    }

    const pos = (poRes.data ?? []) as unknown as {
      id: string; po_number: number; status: string; total_cents: number;
      updated_at: string; received_at: string | null;
    }[];
    for (const po of pos) {
      if (po.received_at) {
        rows.push({
          id: `po-recv-${po.id}`,
          at: po.received_at,
          Icon: Truck,
          iconClass: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
          label: `PO #${po.po_number} received`,
          detail: fmt(po.total_cents),
          tab: "cafe-purchasing",
        });
      }
    }

    rows.sort((a, b) => b.at.localeCompare(a.at));
    setEntries(rows.slice(0, 30));
    setLoading(false);
    // currencyCode is closed over via fmt() inside this callback; re-run
    // when it changes so detail strings get reformatted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, currencyCode]);

  useEffect(() => { void load(); }, [load]);

  // Light tick so "Xm ago" labels stay fresh without re-fetching.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const empty = !loading && entries.length === 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2"><Activity className="h-4 w-4" /> Recent activity</span>
          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => { void load(); }} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : empty ? (
          <div className="text-sm text-muted-foreground text-center py-6">
            Nothing yet — orders, payments, stock receipts and reviews will appear here as they happen.
          </div>
        ) : (
          <ul className="space-y-1">
            {entries.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => row.tab && onJumpToTab?.(row.tab)}
                  disabled={!row.tab}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-lg p-2 text-left transition-colors",
                    row.tab && "hover:bg-muted/50 cursor-pointer",
                  )}
                >
                  <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-md", row.iconClass)}>
                    <row.Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.label}</p>
                    {row.detail && <p className="text-[11px] text-muted-foreground truncate">{row.detail}</p>}
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">{timeAgo(row.at, now)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
