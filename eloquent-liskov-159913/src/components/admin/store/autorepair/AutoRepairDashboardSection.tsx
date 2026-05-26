/**
 * Auto Repair — Shop Operations Dashboard
 * Real-time command center: today's appointments, job board, tech workload, revenue.
 */
import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard, CalendarClock, Wrench, Receipt, DollarSign,
  User, Car, Clock, CheckCircle2, AlertTriangle, RefreshCw,
  Hammer, ClipboardList, ShieldCheck, Star, Timer,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props { storeId: string }

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const STATUS_META: Record<string, { label: string; color: string; icon: any; ring: string }> = {
  awaiting:    { label: "Awaiting",    color: "text-muted-foreground", icon: Clock,       ring: "border-border" },
  in_progress: { label: "In Progress", color: "text-blue-600",         icon: Wrench,      ring: "border-blue-400" },
  on_hold:     { label: "On Hold",     color: "text-amber-600",        icon: AlertTriangle, ring: "border-amber-400" },
  qc:          { label: "QC",          color: "text-violet-600",       icon: ShieldCheck, ring: "border-violet-400" },
  done:        { label: "Done",        color: "text-emerald-600",      icon: Star,        ring: "border-emerald-400" },
};

const BOOKING_STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AutoRepairDashboardSection({ storeId }: Props) {
  const qc = useQueryClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const { data: wos = [], isFetching: fetchingWOs } = useQuery({
    queryKey: ["ar-dash-wos", storeId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_work_orders" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: techs = [] } = useQuery({
    queryKey: ["ar-dash-techs", storeId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("ar_technicians" as any)
        .select("id, name, avatar_url")
        .eq("store_id", storeId)
        .eq("active", true);
      return data as any[] ?? [];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["ar-dash-bookings", storeId, today],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("service_bookings")
        .select("*")
        .eq("store_id", storeId)
        .eq("preferred_date", today)
        .order("preferred_time");
      return data ?? [];
    },
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ["ar-dash-invoices", storeId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("ar_invoices" as any)
        .select("id, number, status, total_cents, amount_paid_cents, customer_name, vehicle_label, paid_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(100);
      return data as any[] ?? [];
    },
  });

  const techMap = useMemo(() => Object.fromEntries(techs.map((t: any) => [t.id, t.name])), [techs]);

  const stats = useMemo(() => {
    const openWOs = wos.filter((w: any) => !["done"].includes(w.status));
    const todayPaid = invoices.filter((i: any) =>
      i.status === "paid" && i.paid_at && i.paid_at.startsWith(today)
    );
    const unpaidInvoices = invoices.filter((i: any) => i.status !== "paid" && i.status !== "draft");
    const unpaidTotal = unpaidInvoices.reduce((s: number, i: any) =>
      s + Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0)), 0
    );
    const todayRevenue = todayPaid.reduce((s: number, i: any) => s + (i.total_cents ?? 0), 0);
    return { openWOs: openWOs.length, unpaidCount: unpaidInvoices.length, unpaidTotal, todayRevenue };
  }, [wos, invoices, today]);

  const activeWOs = useMemo(() =>
    wos.filter((w: any) => w.status !== "done").slice(0, 20),
  [wos]);

  const recentDone = useMemo(() =>
    wos.filter((w: any) => w.status === "done").slice(0, 5),
  [wos]);

  const techWorkload = useMemo(() => {
    const map: Record<string, any[]> = {};
    techs.forEach((t: any) => { map[t.id] = []; });
    wos.filter((w: any) => w.technician_id && w.status !== "done")
       .forEach((w: any) => {
         if (map[w.technician_id]) map[w.technician_id].push(w);
       });
    return map;
  }, [wos, techs]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ar-dash-wos", storeId] });
    qc.invalidateQueries({ queryKey: ["ar-dash-bookings", storeId, today] });
    qc.invalidateQueries({ queryKey: ["ar-dash-invoices", storeId] });
    toast.success("Dashboard refreshed");
  };

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-base font-semibold">Shop Dashboard</h2>
            <p className="text-xs text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={refresh} disabled={fetchingWOs}>
          <RefreshCw className={`w-3.5 h-3.5 ${fetchingWOs ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Hammer,       label: "Open Jobs",        value: stats.openWOs,          color: "text-blue-600",    sub: "work orders" },
          { icon: CalendarClock,label: "Today's Appts",    value: bookings.length,         color: "text-violet-600",  sub: "scheduled today" },
          { icon: Receipt,      label: "Unpaid Invoices",  value: stats.unpaidCount,       color: "text-amber-600",   sub: fmt(stats.unpaidTotal) + " owed" },
          { icon: DollarSign,   label: "Today's Revenue",  value: fmt(stats.todayRevenue), color: "text-emerald-600", sub: "paid invoices" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-2">
                <k.icon className={`w-4 h-4 mt-0.5 shrink-0 ${k.color}`} />
                <div>
                  <p className={`text-xl font-bold leading-none ${k.color}`}>{k.value}</p>
                  <p className="text-[11px] font-medium mt-0.5">{k.label}</p>
                  <p className="text-[10px] text-muted-foreground">{k.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Today's appointments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-foreground" />
              Today's Appointments
              <Badge variant="secondary" className="text-[10px] ml-auto">{bookings.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No appointments today</p>
            ) : (
              bookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{b.service_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {b.customer_name}
                      {b.vehicle_make ? ` · ${[b.vehicle_year, b.vehicle_make, b.vehicle_model].filter(Boolean).join(" ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">{b.preferred_time}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${BOOKING_STATUS_COLOR[b.status] ?? "bg-muted"}`}>
                      {b.status}
                    </span>
                    {b.workorder_id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" title="Work Order created" />
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Technician workload */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-blue-500" />
              Technician Workload
              <Badge variant="secondary" className="text-[10px] ml-auto">{techs.length} techs</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {techs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No technicians configured</p>
            ) : (
              techs.map((t: any) => {
                const jobs = techWorkload[t.id] ?? [];
                return (
                  <div key={t.id} className="p-2.5 rounded-xl bg-muted/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{t.name}</p>
                      <Badge variant={jobs.length > 0 ? "default" : "outline"} className="text-[10px]">
                        {jobs.length === 0 ? "Available" : `${jobs.length} job${jobs.length > 1 ? "s" : ""}`}
                      </Badge>
                    </div>
                    {jobs.length > 0 && (
                      <div className="space-y-1">
                        {jobs.map((w: any) => {
                          const meta = STATUS_META[w.status] ?? STATUS_META.awaiting;
                          const Icon = meta.icon;
                          return (
                            <div key={w.id} className={`flex items-center gap-2 text-xs pl-2 border-l-2 ${meta.ring}`}>
                              <Icon className={`w-3 h-3 ${meta.color} shrink-0`} />
                              <span className="truncate">{w.number} · {w.vehicle_label || w.customer_name || "—"}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Job Board */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            Active Job Board
            <Badge variant="secondary" className="text-[10px] ml-auto">{activeWOs.length} open</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeWOs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
              <p className="text-sm">All caught up — no open jobs!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {activeWOs.map((w: any) => {
                const meta = STATUS_META[w.status] ?? STATUS_META.awaiting;
                const Icon = meta.icon;
                return (
                  <div key={w.id} className={`p-3 rounded-xl border ${meta.ring} bg-background space-y-1.5`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{w.number}</span>
                      <div className={`flex items-center gap-1 text-[10px] font-medium ${meta.color}`}>
                        <Icon className="w-3 h-3" />
                        {meta.label}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Car className="w-3 h-3 shrink-0" />
                      <span className="truncate">{w.vehicle_label || "No vehicle"}</span>
                    </div>
                    {w.customer_name && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{w.customer_name}</span>
                      </div>
                    )}
                    {w.technician_id && techMap[w.technician_id] && (
                      <div className="flex items-center gap-1.5 text-xs text-blue-600">
                        <Wrench className="w-3 h-3 shrink-0" />
                        <span className="truncate">{techMap[w.technician_id]}</span>
                      </div>
                    )}
                    {w.labor_hours > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Timer className="w-3 h-3 shrink-0" />
                        <span>{w.labor_hours}h logged</span>
                      </div>
                    )}
                    {w.is_comeback && (
                      <Badge variant="destructive" className="text-[9px] h-4">Comeback</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent completions + unpaid invoices */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recently completed */}
        {recentDone.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4 text-emerald-500" />
                Recently Completed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentDone.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{w.number}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {w.customer_name}{w.vehicle_label ? ` · ${w.vehicle_label}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {w.converted_invoice
                      ? <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">Invoiced</Badge>
                      : <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">Needs Invoice</Badge>
                    }
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Unpaid invoices */}
        {invoices.filter((i: any) => i.status !== "paid" && i.status !== "draft").length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Awaiting Payment
                <span className="text-xs text-muted-foreground font-normal ml-auto">
                  {fmt(stats.unpaidTotal)} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {invoices
                .filter((i: any) => i.status !== "paid" && i.status !== "draft")
                .slice(0, 6)
                .map((i: any) => {
                  const balance = Math.max(0, (i.total_cents ?? 0) - (i.amount_paid_cents ?? 0));
                  return (
                    <div key={i.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/40 gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{i.number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {i.customer_name}{i.vehicle_label ? ` · ${i.vehicle_label}` : ""}
                        </p>
                      </div>
                      <p className="font-bold text-sm text-amber-600 tabular-nums shrink-0">{fmt(balance)}</p>
                    </div>
                  );
                })}
            </CardContent>
          </Card>
        )}
      </div>

      <Separator />
      <p className="text-[11px] text-muted-foreground text-center pb-2">
        Data refreshes every 30 seconds · {format(new Date(), "h:mm a")}
      </p>
    </div>
  );
}
