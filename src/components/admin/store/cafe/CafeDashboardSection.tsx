/**
 * CafeDashboardSection — at-a-glance overview for a cafe. Today's revenue,
 * open tickets, top items, and quick jumps into the other tabs.
 */
import { useMemo } from "react";
import {
  Coffee, Clock, DollarSign, ClipboardList, ChefHat, ArrowRight, TrendingUp,
  AlertTriangle, Star, Calendar, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCafeOrders } from "@/hooks/cafe/useCafeOrders";
import { useCafeMenu } from "@/hooks/cafe/useCafeMenu";
import { useCafeTables } from "@/hooks/cafe/useCafeTables";
import { useCafeInventory } from "@/hooks/cafe/useCafeInventory";
import { useCafeLoyalty } from "@/hooks/cafe/useCafeLoyalty";
import { useCafeShifts } from "@/hooks/cafe/useCafeShifts";
import { useCafePurchasing } from "@/hooks/cafe/useCafePurchasing";
import CafeOnboardingChecklist from "./CafeOnboardingChecklist";
import CafeActivityFeed from "./CafeActivityFeed";
import CafeHoursCard from "./CafeHoursCard";
import CafeSettingsCard from "./CafeSettingsCard";
import CafePrepForecastCard from "./CafePrepForecastCard";

interface Props {
  storeId: string;
  storeSlug?: string;
  onJumpToTab?: (tab: string) => void;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function CafeDashboardSection({ storeId, storeSlug, onJumpToTab }: Props) {
  const { orders, itemsByOrder, loading } = useCafeOrders(storeId);
  const { items: menuItems, categories } = useCafeMenu(storeId);
  const { tables } = useCafeTables(storeId);
  const { lowStockItems } = useCafeInventory(storeId);
  const { balances: loyaltyBalances, program: loyaltyProgram } = useCafeLoyalty(storeId);
  const { shifts: upcomingShifts } = useCafeShifts(storeId, {
    from: new Date().toISOString(),
    to: new Date(Date.now() + 7 * 86_400_000).toISOString(),
  });
  const { orders: purchaseOrders } = useCafePurchasing(storeId);

  const stats = useMemo(() => {
    const now = new Date();
    let revenue = 0, ticketsCompleted = 0;
    let openTickets = 0, kdsActive = 0;
    const itemCounts = new Map<string, { name: string; qty: number; revenue: number }>();

    for (const o of orders) {
      const placed = new Date(o.placed_at);
      const isToday = isSameDay(placed, now);
      if (o.status === "completed" && isToday) {
        revenue += o.total_cents;
        ticketsCompleted++;
        for (const it of itemsByOrder[o.id] ?? []) {
          const key = it.menu_item_id ?? it.item_name;
          const prev = itemCounts.get(key) ?? { name: it.item_name, qty: 0, revenue: 0 };
          prev.qty += it.quantity;
          prev.revenue += it.line_total_cents;
          itemCounts.set(key, prev);
        }
      }
      if (["pending", "accepted", "preparing", "ready"].includes(o.status)) openTickets++;
      if (["preparing", "ready"].includes(o.status)) kdsActive++;
    }
    const top = Array.from(itemCounts.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
    const avgTicket = ticketsCompleted > 0 ? revenue / ticketsCompleted : 0;
    return { revenue, ticketsCompleted, openTickets, kdsActive, top, avgTicket };
  }, [orders, itemsByOrder]);

  const activeMenuCount = menuItems.filter((m) => m.is_active).length;
  const activeTables = tables.filter((t) => t.is_active).length;

  const StatCard = ({ icon: Icon, label, value, accent, sub, onClick }: { icon: typeof Coffee; label: string; value: string; accent?: string; sub?: string; onClick?: () => void }) => (
    <Card className={cn("transition-all", onClick && "cursor-pointer hover:shadow-md hover:border-primary/30")} onClick={onClick}>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start gap-3">
          <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", accent ?? "bg-primary/10 text-primary")}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
            <p className="text-2xl font-bold tabular-nums leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/8 via-card to-card p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">
            <Coffee className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">Cafe Dashboard</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading today's activity…" : "Today's revenue, open tickets, and what's selling right now."}
            </p>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <a href={`/admin/cafe-summary/${storeId}/${new Date().toISOString().slice(0, 10)}`} target="_blank" rel="noopener noreferrer">
              Daily summary
            </a>
          </Button>
        </div>
      </div>

      <CafeOnboardingChecklist storeId={storeId} storeSlug={storeSlug} onJumpToTab={onJumpToTab} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Revenue today" value={fmt(stats.revenue)} accent="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" sub={`${stats.ticketsCompleted} completed`} />
        <StatCard icon={ClipboardList} label="Open tickets" value={String(stats.openTickets)} accent="bg-blue-500/10 text-blue-700 dark:text-blue-300" sub="pending → ready" onClick={() => onJumpToTab?.("cafe-orders")} />
        <StatCard icon={ChefHat} label="In kitchen" value={String(stats.kdsActive)} accent="bg-orange-500/10 text-orange-700 dark:text-orange-300" sub="active on KDS" onClick={() => onJumpToTab?.("cafe-kds")} />
        <StatCard icon={TrendingUp} label="Avg ticket" value={fmt(stats.avgTicket)} accent="bg-violet-500/10 text-violet-700 dark:text-violet-300" sub={`${stats.ticketsCompleted} tickets`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Top items today</span>
              <Button size="sm" variant="ghost" onClick={() => onJumpToTab?.("cafe-menu")} className="text-xs gap-1">
                Menu <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {stats.top.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                No completed orders today yet.
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {stats.top.map((row) => (
                  <li key={row.name} className="flex items-center justify-between py-2.5">
                    <span className="font-medium text-sm truncate pr-3">{row.name}</span>
                    <span className="flex items-center gap-3 text-sm tabular-nums">
                      <Badge variant="secondary" className="text-[11px]">{row.qty}×</Badge>
                      <span className="text-muted-foreground">{fmt(row.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Cafe setup</CardTitle></CardHeader>
          <CardContent className="pt-0 space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Menu items</span>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onJumpToTab?.("cafe-menu")}>
                {activeMenuCount} active <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Categories</span>
              <span className="font-medium tabular-nums">{categories.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tables</span>
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => onJumpToTab?.("cafe-tables")}>
                {activeTables} active <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <CafePrepForecastCard storeId={storeId} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CafeHoursCard storeId={storeId} />
        <CafeSettingsCard storeId={storeId} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onJumpToTab?.("cafe-inventory")}
          className={cn(
            "text-left rounded-xl border bg-card p-3 transition-colors hover:shadow-sm",
            lowStockItems.length > 0 ? "border-destructive/40 bg-destructive/5" : "border-border",
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={cn("h-4 w-4", lowStockItems.length > 0 ? "text-destructive" : "text-muted-foreground")} />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Low stock</span>
          </div>
          <p className={cn("text-xl font-bold tabular-nums", lowStockItems.length > 0 && "text-destructive")}>
            {lowStockItems.length}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {lowStockItems.length === 0 ? "All items in range" : lowStockItems.slice(0, 2).map((i) => i.name).join(", ") + (lowStockItems.length > 2 ? "…" : "")}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onJumpToTab?.("cafe-loyalty")}
          className="text-left rounded-xl border border-border bg-card p-3 transition-colors hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Star className="h-4 w-4 text-amber-600" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Loyalty</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{loyaltyBalances.length}</p>
          <p className="text-[11px] text-muted-foreground">
            {!loyaltyProgram ? "Not set up" : loyaltyProgram.is_active ? "members" : "paused"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onJumpToTab?.("cafe-shifts")}
          className="text-left rounded-xl border border-border bg-card p-3 transition-colors hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Shifts (7d)</span>
          </div>
          <p className="text-xl font-bold tabular-nums">{upcomingShifts.length}</p>
          <p className="text-[11px] text-muted-foreground">
            {upcomingShifts.length === 0 ? "Nothing scheduled" : "upcoming"}
          </p>
        </button>

        <button
          type="button"
          onClick={() => onJumpToTab?.("cafe-purchasing")}
          className="text-left rounded-xl border border-border bg-card p-3 transition-colors hover:shadow-sm"
        >
          <div className="flex items-center gap-2 mb-1">
            <Truck className="h-4 w-4 text-violet-600" />
            <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Open POs</span>
          </div>
          <p className="text-xl font-bold tabular-nums">
            {purchaseOrders.filter((o) => ["draft", "sent", "partial"].includes(o.status)).length}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {purchaseOrders.length === 0 ? "None yet" : "awaiting receipt"}
          </p>
        </button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Recent tickets</span>
            <Button size="sm" variant="ghost" onClick={() => onJumpToTab?.("cafe-orders")} className="text-xs gap-1">
              All orders <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {orders.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No tickets yet — open the QR or take a counter order to get started.</div>
          ) : (
            <ul className="divide-y divide-border/60">
              {orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs text-muted-foreground shrink-0">#{o.ticket_number}</span>
                    <span className="truncate">{o.customer_name || `${o.channel.replace("_", " ")} order`}</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Badge variant={o.status === "completed" ? "secondary" : "default"} className="text-[10px] uppercase">
                      {o.status}
                    </Badge>
                    <span className="tabular-nums text-muted-foreground">{fmt(o.total_cents)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CafeActivityFeed storeId={storeId} onJumpToTab={onJumpToTab} />
    </div>
  );
}
