/**
 * AutoRepairLaborTimeSection — Full labor management
 * Overview · Live Timer · Time Log · By Vehicle · Labor Guide (flat-rate)
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Timer from "lucide-react/dist/esm/icons/timer";
import Play from "lucide-react/dist/esm/icons/play";
import Square from "lucide-react/dist/esm/icons/square";
import Plus from "lucide-react/dist/esm/icons/plus";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Clock from "lucide-react/dist/esm/icons/clock";
import HardHat from "lucide-react/dist/esm/icons/hard-hat";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Search from "lucide-react/dist/esm/icons/search";
import Car from "lucide-react/dist/esm/icons/car";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Circle from "lucide-react/dist/esm/icons/circle";
import Zap from "lucide-react/dist/esm/icons/zap";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Copy from "lucide-react/dist/esm/icons/copy";

interface Props { storeId: string }

import { LABOR_GUIDE, LABOR_GUIDE_CATEGORIES, DIFF_COLOR } from "@/lib/laborGuide";

const GUIDE_CATEGORIES = LABOR_GUIDE_CATEGORIES.slice(1);
const LABOR_TYPES = ["Diagnosis", "Repair", "Maintenance", "Inspection", "Electrical", "Bodywork", "Other"];

const fmt$ = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtH = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

const fmtClock = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const blankEntry = { tech_id: "", work_order_id: "", vehicle_id: "", labor_type: "Repair", duration_minutes: "", is_billable: true, notes: "", rate_override: "" };

export default function AutoRepairLaborTimeSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [search, setSearch] = useState("");
  const [guideSearch, setGuideSearch] = useState("");
  const [guideCat, setGuideCat] = useState("All");
  const [filterTech, setFilterTech] = useState("all");
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [dlgOpen, setDlgOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankEntry);
  const [runningTimers, setRunningTimers] = useState<Record<string, { startedAt: number; elapsed: number }>>({});
  const [quickTechId, setQuickTechId] = useState("");
  const [quickWoId, setQuickWoId] = useState("none");
  const [quickVehicleId, setQuickVehicleId] = useState("none");
  const [expandedVehicle, setExpandedVehicle] = useState<string | null>(null);

  useEffect(() => { const id = setInterval(() => {}, 1000); return () => clearInterval(id); }, []);
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  // ── Queries ─────────────────────────────────────────────────────────
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ar-labor-entries", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ar_labor_entries").select("*").eq("store_id", storeId).order("created_at", { ascending: false });
      if (error) throw error; return data as any[];
    },
  });

  const { data: techs = [] } = useQuery({
    queryKey: ["ar-technicians", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ar_technicians").select("id,name,hourly_rate_cents").eq("store_id", storeId).eq("active", true);
      if (error) throw error; return data as any[];
    },
  });

  const { data: workOrders = [] } = useQuery({
    queryKey: ["ar-work-orders-active", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ar_work_orders").select("id,number,customer_name,vehicle_label,status,labor_hours,total_cents").eq("store_id", storeId).order("created_at", { ascending: false });
      if (error) throw error; return data as any[];
    },
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ["ar-customer-vehicles", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("ar_customer_vehicles").select("id,owner_name,year,make,model,plate,vin,mileage").eq("store_id", storeId).order("make");
      if (error) throw error; return data as any[];
    },
  });

  // ── Maps ─────────────────────────────────────────────────────────────
  const techMap = useMemo(() => { const m: Record<string, any> = {}; techs.forEach((t: any) => { m[t.id] = t; }); return m; }, [techs]);
  const woMap = useMemo(() => { const m: Record<string, any> = {}; workOrders.forEach((w: any) => { m[w.id] = w; }); return m; }, [workOrders]);
  const vehicleMap = useMemo(() => { const m: Record<string, any> = {}; vehicles.forEach((v: any) => { m[v.id] = v; }); return m; }, [vehicles]);

  // ── KPIs ─────────────────────────────────────────────────────────────
  const kpi = useMemo(() => {
    const totalMins = entries.reduce((s: number, e: any) => s + (e.duration_minutes ?? 0), 0);
    const billableMins = entries.filter((e: any) => e.is_billable).reduce((s: number, e: any) => s + (e.duration_minutes ?? 0), 0);
    const revenue = entries.reduce((s: number, e: any) => {
      if (!e.is_billable) return s;
      const rate = e.rate_override_cents ?? techMap[e.tech_id]?.hourly_rate_cents ?? 0;
      return s + (rate / 60) * (e.duration_minutes ?? 0);
    }, 0);
    const efficiency = totalMins > 0 ? Math.round((billableMins / totalMins) * 100) : 0;
    return { totalMins, billableMins, revenue, efficiency, count: entries.length };
  }, [entries, techMap]);

  // Top services
  const topServices = useMemo(() => {
    const m: Record<string, number> = {};
    entries.forEach((e: any) => { const k = e.labor_type ?? "Other"; m[k] = (m[k] || 0) + (e.duration_minutes ?? 0); });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  // By-vehicle grouping: match via work_order_id → vehicle_label, or vehicle_id field
  const byVehicle = useMemo(() => {
    const m: Record<string, { label: string; entries: any[]; totalMins: number; revenue: number }> = {};
    entries.forEach((e: any) => {
      let key = e.vehicle_id ?? "";
      let label = "";
      if (e.vehicle_id && vehicleMap[e.vehicle_id]) {
        const v = vehicleMap[e.vehicle_id];
        label = `${v.year ?? ""} ${v.make} ${v.model}`.trim();
      } else if (e.work_order_id && woMap[e.work_order_id]?.vehicle_label) {
        label = woMap[e.work_order_id].vehicle_label;
        key = `wo-${e.work_order_id}`;
      } else {
        label = "Unassigned"; key = "__none__";
      }
      if (!m[key]) m[key] = { label, entries: [], totalMins: 0, revenue: 0 };
      m[key].entries.push(e);
      m[key].totalMins += e.duration_minutes ?? 0;
      if (e.is_billable) {
        const rate = e.rate_override_cents ?? techMap[e.tech_id]?.hourly_rate_cents ?? 0;
        m[key].revenue += (rate / 60) * (e.duration_minutes ?? 0);
      }
    });
    return Object.entries(m).sort((a, b) => b[1].totalMins - a[1].totalMins);
  }, [entries, vehicleMap, woMap, techMap]);

  // Tech summary
  const techSummary = useMemo(() => {
    const m: Record<string, { name: string; mins: number; billableMins: number; revenue: number; count: number }> = {};
    entries.forEach((e: any) => {
      const tech = techMap[e.tech_id]; if (!tech) return;
      if (!m[e.tech_id]) m[e.tech_id] = { name: tech.name, mins: 0, billableMins: 0, revenue: 0, count: 0 };
      m[e.tech_id].mins += e.duration_minutes ?? 0; m[e.tech_id].count++;
      if (e.is_billable) {
        m[e.tech_id].billableMins += e.duration_minutes ?? 0;
        const rate = e.rate_override_cents ?? tech.hourly_rate_cents ?? 0;
        m[e.tech_id].revenue += (rate / 60) * (e.duration_minutes ?? 0);
      }
    });
    return Object.entries(m).sort((a, b) => b[1].mins - a[1].mins);
  }, [entries, techMap]);

  // Filtered entries
  const filtered = useMemo(() => entries.filter((e: any) => {
    if (filterTech !== "all" && e.tech_id !== filterTech) return false;
    if (filterVehicle !== "all") {
      const vehicleKey = e.vehicle_id ?? (e.work_order_id ? `wo-${e.work_order_id}` : "__none__");
      if (vehicleKey !== filterVehicle) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const techName = techMap[e.tech_id]?.name ?? "";
      const wo = e.work_order_id ? woMap[e.work_order_id] : null;
      const vLabel = e.vehicle_id && vehicleMap[e.vehicle_id] ? `${vehicleMap[e.vehicle_id].year ?? ""} ${vehicleMap[e.vehicle_id].make} ${vehicleMap[e.vehicle_id].model}` : wo?.vehicle_label ?? "";
      if (![techName, wo?.number ?? "", wo?.customer_name ?? "", vLabel, e.labor_type ?? ""].join(" ").toLowerCase().includes(q)) return false;
    }
    return true;
  }), [entries, filterTech, filterVehicle, search, techMap, woMap, vehicleMap]);

  // Filtered guide
  const filteredGuide = useMemo(() => LABOR_GUIDE.filter(g => {
    if (guideCat !== "All" && g.category !== guideCat) return false;
    if (guideSearch) {
      const q = guideSearch.toLowerCase();
      return g.service.toLowerCase().includes(q) || g.category.toLowerCase().includes(q) || g.notes.toLowerCase().includes(q);
    }
    return true;
  }), [guideCat, guideSearch]);

  // ── Timers ───────────────────────────────────────────────────────────
  const getLiveSecs = (id: string) => { const t = runningTimers[id]; return t ? t.elapsed + Math.floor((Date.now() - t.startedAt) / 1000) : null; };
  const startTimer = (id: string, existingMins = 0) => setRunningTimers(p => ({ ...p, [id]: { startedAt: Date.now(), elapsed: existingMins * 60 } }));
  const stopTimer = useCallback(async (id: string) => {
    const t = runningTimers[id]; if (!t) return;
    const mins = Math.max(1, Math.round((t.elapsed + Math.floor((Date.now() - t.startedAt) / 1000)) / 60));
    setRunningTimers(p => { const n = { ...p }; delete n[id]; return n; });
    const { error } = await (supabase as any).from("ar_labor_entries").update({ duration_minutes: mins }).eq("id", id);
    if (error) { toast.error("Failed to save"); return; }
    qc.invalidateQueries({ queryKey: ["ar-labor-entries", storeId] });
    toast.success(`Saved ${fmtH(mins)}`);
  }, [runningTimers, storeId, qc]);

  // ── Quick-start ──────────────────────────────────────────────────────
  const quickStart = useMutation({
    mutationFn: async () => {
      if (!quickTechId) throw new Error("Select a technician");
      const tech = techMap[quickTechId];
      const payload: any = { store_id: storeId, tech_id: quickTechId, labor_type: "Repair", duration_minutes: 0, is_billable: true, rate_override_cents: tech?.hourly_rate_cents ?? null };
      if (quickWoId !== "none") payload.work_order_id = quickWoId;
      if (quickVehicleId !== "none") payload.vehicle_id = quickVehicleId;
      const { data, error } = await (supabase as any).from("ar_labor_entries").insert(payload).select("id").single();
      if (error) throw error; return data.id as string;
    },
    onSuccess: (id: string) => { qc.invalidateQueries({ queryKey: ["ar-labor-entries", storeId] }); startTimer(id, 0); toast.success("Timer started"); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  // ── CRUD ─────────────────────────────────────────────────────────────
  const saveEntry = useMutation({
    mutationFn: async () => {
      if (!form.tech_id) throw new Error("Select a technician");
      if (!form.duration_minutes) throw new Error("Enter duration");
      const tech = techMap[form.tech_id];
      const payload: any = { store_id: storeId, tech_id: form.tech_id, labor_type: form.labor_type, duration_minutes: parseInt(form.duration_minutes) || 0, is_billable: form.is_billable, notes: form.notes || null, rate_override_cents: form.rate_override ? Math.round(parseFloat(form.rate_override) * 100) : (tech?.hourly_rate_cents ?? null) };
      if (form.work_order_id) payload.work_order_id = form.work_order_id;
      if (form.vehicle_id) payload.vehicle_id = form.vehicle_id;
      if (editId) { const { error } = await (supabase as any).from("ar_labor_entries").update(payload).eq("id", editId); if (error) throw error; }
      else { const { error } = await (supabase as any).from("ar_labor_entries").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success(editId ? "Updated" : "Entry added"); qc.invalidateQueries({ queryKey: ["ar-labor-entries", storeId] }); setDlgOpen(false); setEditId(null); setForm(blankEntry); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("ar_labor_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["ar-labor-entries", storeId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({ tech_id: e.tech_id ?? "", work_order_id: e.work_order_id ?? "", vehicle_id: e.vehicle_id ?? "", labor_type: e.labor_type ?? "Repair", duration_minutes: e.duration_minutes != null ? String(e.duration_minutes) : "", is_billable: e.is_billable ?? true, notes: e.notes ?? "", rate_override: e.rate_override_cents != null ? String(e.rate_override_cents / 100) : "" });
    setDlgOpen(true);
  };

  const applyGuideEntry = (g: typeof LABOR_GUIDE[0]) => {
    setForm(f => ({ ...f, labor_type: g.category, duration_minutes: String(Math.round(g.baseHours * 60)), notes: g.service + (g.notes ? `. Note: ${g.notes}` : "") }));
    setDlgOpen(true);
    toast.info(`Loaded "${g.service}" — ${g.baseHours}h standard`);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-1">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Hours", value: fmtH(kpi.totalMins), icon: Clock, color: "text-blue-500" },
          { label: "Billable Hours", value: fmtH(kpi.billableMins), icon: CheckCircle, color: "text-emerald-500" },
          { label: "Labor Revenue", value: fmt$(Math.round(kpi.revenue)), icon: DollarSign, color: "text-amber-500" },
          { label: "Efficiency", value: `${kpi.efficiency}%`, icon: TrendingUp, color: "text-violet-500" },
        ].map(k => (
          <Card key={k.label} className="border-border/40">
            <CardContent className="p-3 flex items-center gap-3">
              <k.icon className={cn("h-5 w-5 shrink-0", k.color)} />
              <div><p className="text-xs text-muted-foreground">{k.label}</p><p className="text-base font-bold text-foreground">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto">
          <TabsList className="mb-4 min-w-max">
            <TabsTrigger value="overview"><BarChart3 className="h-3.5 w-3.5 mr-1.5" />Overview</TabsTrigger>
            <TabsTrigger value="timer"><Timer className="h-3.5 w-3.5 mr-1.5" />Live Timer</TabsTrigger>
            <TabsTrigger value="log"><Clock className="h-3.5 w-3.5 mr-1.5" />Time Log</TabsTrigger>
            <TabsTrigger value="vehicle"><Car className="h-3.5 w-3.5 mr-1.5" />By Vehicle</TabsTrigger>
            <TabsTrigger value="techs"><HardHat className="h-3.5 w-3.5 mr-1.5" />By Tech</TabsTrigger>
            <TabsTrigger value="guide"><BookOpen className="h-3.5 w-3.5 mr-1.5" />Labor Guide</TabsTrigger>
          </TabsList>
        </div>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 m-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Top services */}
            <Card className="border-border/40">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" />Top Service Types</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {topServices.length === 0 ? <p className="text-xs text-muted-foreground">No data yet.</p> : (() => {
                  const maxMins = topServices[0]?.[1] ?? 1;
                  return topServices.map(([svc, mins]) => (
                    <div key={svc} className="space-y-1">
                      <div className="flex justify-between text-xs"><span className="font-medium text-foreground truncate">{svc}</span><span className="text-muted-foreground shrink-0 ml-2">{fmtH(mins)}</span></div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <div className="h-full rounded-full bg-primary/70" style={{ width: `${(mins / maxMins) * 100}%` }} />
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>

            {/* Work orders labor summary */}
            <Card className="border-border/40">
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-blue-500" />Active WO Labor</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {workOrders.filter((w: any) => w.status !== "done").slice(0, 5).length === 0
                  ? <p className="text-xs text-muted-foreground">No active work orders.</p>
                  : workOrders.filter((w: any) => w.status !== "done").slice(0, 5).map((wo: any) => {
                    const loggedMins = entries.filter((e: any) => e.work_order_id === wo.id).reduce((s: number, e: any) => s + (e.duration_minutes ?? 0), 0);
                    const estimatedMins = (wo.labor_hours ?? 0) * 60;
                    const pct = estimatedMins > 0 ? Math.min(100, Math.round((loggedMins / estimatedMins) * 100)) : 0;
                    return (
                      <div key={wo.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-foreground truncate">{wo.number} · {wo.vehicle_label ?? wo.customer_name ?? "—"}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">{fmtH(loggedMins)} {estimatedMins > 0 ? `/ ${fmtH(estimatedMins)}` : ""}</span>
                        </div>
                        {estimatedMins > 0 && (
                          <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                            <div className={cn("h-full rounded-full", pct >= 100 ? "bg-red-500" : pct > 75 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
              </CardContent>
            </Card>
          </div>

          {/* Recent entries */}
          <Card className="border-border/40">
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Recent Entries</CardTitle></CardHeader>
            <CardContent className="px-2 pb-3 space-y-1">
              {entries.slice(0, 5).length === 0
                ? <p className="text-xs text-center text-muted-foreground py-4">No entries yet.</p>
                : entries.slice(0, 5).map((e: any) => {
                  const tech = techMap[e.tech_id]; const wo = e.work_order_id ? woMap[e.work_order_id] : null;
                  const veh = e.vehicle_id ? vehicleMap[e.vehicle_id] : null;
                  const rate = e.rate_override_cents ?? tech?.hourly_rate_cents ?? 0;
                  const cost = e.is_billable ? Math.round((rate / 60) * (e.duration_minutes ?? 0)) : 0;
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Timer className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{tech?.name ?? "—"} · {e.labor_type}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{veh ? `${veh.year ?? ""} ${veh.make} ${veh.model}` : wo?.vehicle_label ?? wo?.customer_name ?? "No vehicle"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground">{fmtH(e.duration_minutes ?? 0)}</p>
                        {cost > 0 && <p className="text-[10px] text-amber-600">{fmt$(cost)}</p>}
                      </div>
                    </div>
                  );
                })}
              <div className="text-center pt-1">
                <button type="button" onClick={() => setTab("log")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mx-auto">View all <ArrowRight className="h-3 w-3" /></button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Live Timer ── */}
        <TabsContent value="timer" className="space-y-4 m-0">
          <Card className="border-border/40">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Play className="h-4 w-4 text-emerald-500" />Quick-Start Timer</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Technician *</Label>
                  <Select value={quickTechId} onValueChange={setQuickTechId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select tech…" /></SelectTrigger>
                    <SelectContent>{techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Vehicle</Label>
                  <Select value={quickVehicleId} onValueChange={setQuickVehicleId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select vehicle…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No vehicle</SelectItem>
                      {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.year ?? ""} {v.make} {v.model} — {v.owner_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Work Order</Label>
                  <Select value={quickWoId} onValueChange={setQuickWoId}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select WO…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {workOrders.filter((w: any) => w.status !== "done").map((w: any) => <SelectItem key={w.id} value={w.id}>{w.number} — {w.customer_name} {w.vehicle_label ? `(${w.vehicle_label})` : ""}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button size="sm" disabled={!quickTechId || quickStart.isPending} onClick={() => quickStart.mutate()} className="gap-1.5">
                <Play className="h-3.5 w-3.5" /> Start Timer
              </Button>
            </CardContent>
          </Card>

          {Object.entries(runningTimers).map(([entryId]) => {
            const entry = entries.find((e: any) => e.id === entryId);
            const tech = entry ? techMap[entry.tech_id] : null;
            const wo = entry?.work_order_id ? woMap[entry.work_order_id] : null;
            const veh = entry?.vehicle_id ? vehicleMap[entry.vehicle_id] : null;
            const secs = getLiveSecs(entryId) ?? 0;
            return (
              <motion.div key={entryId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-emerald-500/30 bg-emerald-500/5">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold">{tech?.name ?? "?"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {veh ? `${veh.year ?? ""} ${veh.make} ${veh.model}` : wo?.vehicle_label ?? wo?.customer_name ?? "No vehicle"}
                        {wo ? ` · ${wo.number}` : ""}
                      </p>
                    </div>
                    <span className="font-mono text-xl font-bold text-emerald-600 tabular-nums">{fmtClock(secs)}</span>
                    <Button size="sm" variant="outline" className="gap-1.5 border-emerald-500/30" onClick={() => stopTimer(entryId)}>
                      <Square className="h-3.5 w-3.5 text-emerald-600" /> Stop
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {Object.keys(runningTimers).length === 0 && (
            <div className="text-center py-10"><Timer className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No timers running.</p></div>
          )}
        </TabsContent>

        {/* ── Time Log ── */}
        <TabsContent value="log" className="space-y-3 m-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tech, vehicle, WO…" className="pl-8 h-9 text-sm" /></div>
            <Select value={filterTech} onValueChange={setFilterTech}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[160px]"><SelectValue placeholder="All techs" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All techs</SelectItem>{techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="gap-1.5 shrink-0" onClick={() => { setEditId(null); setForm(blankEntry); setDlgOpen(true); }}><Plus className="h-3.5 w-3.5" /> Manual Entry</Button>
          </div>

          {isLoading ? <div className="space-y-2">{[0,1,2].map(i => <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" />)}</div>
            : filtered.length === 0 ? <div className="text-center py-12"><Clock className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No entries found.</p></div>
            : (
              <AnimatePresence>
                {filtered.map((e: any) => {
                  const tech = techMap[e.tech_id]; const wo = e.work_order_id ? woMap[e.work_order_id] : null;
                  const veh = e.vehicle_id ? vehicleMap[e.vehicle_id] : null;
                  const rate = e.rate_override_cents ?? tech?.hourly_rate_cents ?? 0;
                  const cost = e.is_billable ? Math.round((rate / 60) * (e.duration_minutes ?? 0)) : 0;
                  const isRunning = !!runningTimers[e.id];
                  return (
                    <motion.div key={e.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}>
                      <Card className={cn("border-border/40", isRunning && "border-emerald-500/30")}>
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center shrink-0"><Timer className="h-4 w-4 text-primary" /></div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold">{tech?.name ?? "—"}</span>
                              <Badge variant="outline" className="text-[10px] h-4">{e.labor_type}</Badge>
                              {e.is_billable ? <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" /> Billable</span>
                                : <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Circle className="h-3 w-3" /> Non-billable</span>}
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                              {veh ? `${veh.year ?? ""} ${veh.make} ${veh.model} · ${veh.owner_name}` : wo?.vehicle_label ? `${wo.vehicle_label} · ${wo.customer_name}` : wo?.customer_name ?? "No vehicle"}
                              {wo && ` · ${wo.number}`}
                            </p>
                            {e.notes && <p className="text-[10px] text-muted-foreground/70 mt-0.5 truncate">{e.notes}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="text-sm font-bold tabular-nums">
                              {isRunning ? <span className="text-emerald-600 font-mono">{fmtClock(getLiveSecs(e.id) ?? 0)}</span> : fmtH(e.duration_minutes ?? 0)}
                            </span>
                            {cost > 0 && <span className="text-[11px] text-amber-600 font-semibold">{fmt$(cost)}</span>}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {!isRunning && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startTimer(e.id, e.duration_minutes ?? 0)}><Play className="h-3.5 w-3.5 text-emerald-500" /></Button>}
                            {isRunning && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => stopTimer(e.id)}><Square className="h-3.5 w-3.5 text-emerald-600" /></Button>}
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(e)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => { if (confirm("Delete?")) deleteEntry.mutate(e.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
        </TabsContent>

        {/* ── By Vehicle ── */}
        <TabsContent value="vehicle" className="space-y-3 m-0">
          {byVehicle.length === 0 ? (
            <div className="text-center py-12"><Car className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No vehicle data yet. Start logging labor time.</p></div>
          ) : byVehicle.map(([key, group], i) => {
            const isExpanded = expandedVehicle === key;
            const serviceBreakdown: Record<string, number> = {};
            group.entries.forEach((e: any) => { const k = e.labor_type ?? "Other"; serviceBreakdown[k] = (serviceBreakdown[k] || 0) + (e.duration_minutes ?? 0); });
            return (
              <motion.div key={key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Card className="border-border/40">
                  <CardContent className="p-0">
                    <button type="button" className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/20 transition-colors rounded-xl" onClick={() => setExpandedVehicle(isExpanded ? null : key)}>
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Car className="h-5 w-5 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{group.label}</p>
                        <p className="text-[11px] text-muted-foreground">{group.entries.length} {group.entries.length === 1 ? "entry" : "entries"} · {fmtH(group.totalMins)}</p>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        <p className="text-sm font-bold text-foreground">{fmtH(group.totalMins)}</p>
                        {group.revenue > 0 && <p className="text-[11px] text-amber-600 font-semibold">{fmt$(Math.round(group.revenue))}</p>}
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="border-t border-border/40 px-4 pb-4 pt-3 space-y-3">
                            {/* Service breakdown */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Service Breakdown</p>
                              <div className="space-y-1.5">
                                {Object.entries(serviceBreakdown).sort((a, b) => b[1] - a[1]).map(([svc, mins]) => (
                                  <div key={svc} className="flex items-center gap-2">
                                    <span className="text-xs text-foreground flex-1 truncate">{svc}</span>
                                    <span className="text-xs font-semibold text-foreground shrink-0">{fmtH(mins)}</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">({((mins / group.totalMins) * 100).toFixed(0)}%)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            {/* Entry list */}
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Time Entries</p>
                              <div className="space-y-1">
                                {group.entries.map((e: any) => {
                                  const tech = techMap[e.tech_id];
                                  const rate = e.rate_override_cents ?? tech?.hourly_rate_cents ?? 0;
                                  const cost = e.is_billable ? Math.round((rate / 60) * (e.duration_minutes ?? 0)) : 0;
                                  return (
                                    <div key={e.id} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-muted/30">
                                      <span className="text-[11px] text-muted-foreground w-28 shrink-0">{tech?.name ?? "—"}</span>
                                      <Badge variant="outline" className="text-[9px] h-4 shrink-0">{e.labor_type}</Badge>
                                      <span className="flex-1" />
                                      <span className="text-xs font-semibold text-foreground tabular-nums">{fmtH(e.duration_minutes ?? 0)}</span>
                                      {cost > 0 && <span className="text-[10px] text-amber-600 tabular-nums">{fmt$(cost)}</span>}
                                      {e.is_billable ? <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" /> : <Circle className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* ── By Tech ── */}
        <TabsContent value="techs" className="space-y-3 m-0">
          {techSummary.length === 0 ? (
            <div className="text-center py-12"><HardHat className="h-10 w-10 text-muted-foreground/20 mx-auto mb-2" /><p className="text-sm text-muted-foreground">No data yet.</p></div>
          ) : techSummary.map(([techId, s], i) => {
            const utilPct = s.mins > 0 ? Math.round((s.billableMins / s.mins) * 100) : 0;
            return (
              <motion.div key={techId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"><HardHat className="h-4 w-4 text-primary" /></div>
                        <div><p className="text-sm font-bold">{s.name}</p><p className="text-[11px] text-muted-foreground">{s.count} {s.count === 1 ? "entry" : "entries"}</p></div>
                      </div>
                      <div className="text-right"><p className="text-sm font-bold">{fmtH(s.mins)}</p><p className="text-[11px] text-amber-600 font-semibold">{fmt$(Math.round(s.revenue))}</p></div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-muted-foreground"><span>Billable utilization</span><span>{utilPct}%</span></div>
                      <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${utilPct}%` }} transition={{ duration: 0.6, delay: i * 0.05 }} className="h-full rounded-full bg-emerald-500" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>Billable: {fmtH(s.billableMins)}</span><span>Non-billable: {fmtH(s.mins - s.billableMins)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* ── Labor Guide ── */}
        <TabsContent value="guide" className="space-y-3 m-0">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={guideSearch} onChange={e => setGuideSearch(e.target.value)} placeholder="Search service, e.g. brake pads…" className="pl-8 h-9 text-sm" /></div>
            <Select value={guideCat} onValueChange={setGuideCat}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Categories</SelectItem>{GUIDE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <p className="text-[10px] text-muted-foreground">Standard flat-rate hours. Click <strong>Use</strong> to pre-fill a manual entry. Hours may vary by vehicle make, engine, and condition.</p>

          <div className="space-y-1">
            {filteredGuide.length === 0
              ? <p className="text-center text-sm text-muted-foreground py-8">No services match your search.</p>
              : (() => {
                let lastCat = "";
                return filteredGuide.map((g, i) => {
                  const showHeader = g.category !== lastCat; lastCat = g.category;
                  return (
                    <div key={i}>
                      {showHeader && <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pt-3 pb-1 px-1">{g.category}</p>}
                      <div className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-foreground">{g.service}</span>
                            <span className={cn("text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full", DIFF_COLOR[g.diff])}>{g.diff}</span>
                          </div>
                          {g.notes && <p className="text-[10px] text-muted-foreground mt-0.5">{g.notes}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-foreground tabular-nums">{g.baseHours}h</span>
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => applyGuideEntry(g)}>
                            <Copy className="h-3 w-3" /> Use
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Manual Entry Dialog ── */}
      <Dialog open={dlgOpen} onOpenChange={v => { if (!v) { setDlgOpen(false); setEditId(null); setForm(blankEntry); } else setDlgOpen(true); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">{editId ? "Edit Labor Entry" : "Manual Labor Entry"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs">Technician *</Label>
              <Select value={form.tech_id} onValueChange={v => setForm(f => ({ ...f, tech_id: v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
                <SelectContent>{techs.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Vehicle</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm(f => ({ ...f, vehicle_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No vehicle</SelectItem>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{v.year ?? ""} {v.make} {v.model} — {v.owner_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Work Order</Label>
              <Select value={form.work_order_id || "none"} onValueChange={v => setForm(f => ({ ...f, work_order_id: v === "none" ? "" : v }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem>{workOrders.map((w: any) => <SelectItem key={w.id} value={w.id}>{w.number} — {w.customer_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Labor Type</Label>
                <Select value={form.labor_type} onValueChange={v => setForm(f => ({ ...f, labor_type: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{LABOR_TYPES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Duration (minutes) *</Label>
                <Input type="number" min="1" placeholder="e.g. 90" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} className="h-9 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Rate Override ($/hr) — blank = tech default</Label>
              <Input type="number" min="0" step="0.01" placeholder="e.g. 120.00" value={form.rate_override} onChange={e => setForm(f => ({ ...f, rate_override: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/50 p-2.5">
              <div><p className="text-xs font-semibold">Billable</p><p className="text-[10px] text-muted-foreground">Include in customer invoice</p></div>
              <Switch checked={form.is_billable} onCheckedChange={v => setForm(f => ({ ...f, is_billable: v }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setDlgOpen(false); setEditId(null); setForm(blankEntry); }}>Cancel</Button>
            <Button size="sm" onClick={() => saveEntry.mutate()} disabled={saveEntry.isPending}>{saveEntry.isPending ? "Saving…" : editId ? "Update" : "Add Entry"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
