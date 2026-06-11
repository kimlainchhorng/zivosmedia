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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import ScanSearch from "lucide-react/dist/esm/icons/scan-search";
import Save from "lucide-react/dist/esm/icons/save";

interface Props { storeId: string }

import { LABOR_GUIDE, LABOR_GUIDE_CATEGORIES, DIFF_COLOR, VEHICLE_CLASSES, estimateLabor, type VehicleClass, type VehicleSpec } from "@/lib/laborGuide";

const GUIDE_CATEGORIES = LABOR_GUIDE_CATEGORIES.slice(1);
const LABOR_TYPES = ["Diagnosis", "Repair", "Maintenance", "Inspection", "Electrical", "Bodywork", "Other"];
const LABOR_TIME_TABS = new Set(["overview", "timer", "log", "vehicle", "techs", "guide"]);
const LABOR_TIME_TAB_STORAGE_KEY = "zivo:auto-repair:labor-time-tab";
const VEHICLE_YEAR_OPTIONS = Array.from({ length: new Date().getFullYear() + 2 - 1980 }, (_, index) => String(new Date().getFullYear() + 1 - index));
const US_STATES = [
  ["AL", "Alabama"], ["AK", "Alaska"], ["AZ", "Arizona"], ["AR", "Arkansas"], ["CA", "California"],
  ["CO", "Colorado"], ["CT", "Connecticut"], ["DE", "Delaware"], ["FL", "Florida"], ["GA", "Georgia"],
  ["HI", "Hawaii"], ["ID", "Idaho"], ["IL", "Illinois"], ["IN", "Indiana"], ["IA", "Iowa"],
  ["KS", "Kansas"], ["KY", "Kentucky"], ["LA", "Louisiana"], ["ME", "Maine"], ["MD", "Maryland"],
  ["MA", "Massachusetts"], ["MI", "Michigan"], ["MN", "Minnesota"], ["MS", "Mississippi"], ["MO", "Missouri"],
  ["MT", "Montana"], ["NE", "Nebraska"], ["NV", "Nevada"], ["NH", "New Hampshire"], ["NJ", "New Jersey"],
  ["NM", "New Mexico"], ["NY", "New York"], ["NC", "North Carolina"], ["ND", "North Dakota"], ["OH", "Ohio"],
  ["OK", "Oklahoma"], ["OR", "Oregon"], ["PA", "Pennsylvania"], ["RI", "Rhode Island"], ["SC", "South Carolina"],
  ["SD", "South Dakota"], ["TN", "Tennessee"], ["TX", "Texas"], ["UT", "Utah"], ["VT", "Vermont"],
  ["VA", "Virginia"], ["WA", "Washington"], ["WV", "West Virginia"], ["WI", "Wisconsin"], ["WY", "Wyoming"],
] as const;

const fmt$ = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtH = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
};

const fmtClock = (s: number) =>
  `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const blankEntry = {
  tech_id: "",
  work_order_id: "",
  vehicle_id: "",
  labor_type: "Repair",
  duration_minutes: "",
  is_billable: true,
  notes: "",
  rate_override: "",
  vehicle_label: "",
  vehicle_vin: "",
  vehicle_plate: "",
  vehicle_engine: "",
};
const blankVehicleDraft = {
  id: "",
  owner_name: "",
  owner_phone: "",
  year: "",
  make: "",
  model: "",
  trim: "",
  engine_size: "",
  drivetrain: "",
  body_style: "",
  vin: "",
  plate: "",
  plate_state: "",
  mileage: "",
  notes: "",
};

const vehicleLabel = (v: any) =>
  [v.year, v.make, v.model, v.trim].filter(Boolean).join(" ").trim() || "Vehicle";

const vehicleMeta = (v: any) =>
  [v.engine_size, v.drivetrain, v.body_style].filter(Boolean).join(" · ");

const vehicleVinPlate = (v: any) =>
  [v.vin ? `VIN ${v.vin}` : "", v.plate ? `Plate ${v.plate}` : ""].filter(Boolean).join(" · ");

const vehicleSnapshot = (v: any) => ({
  vehicle_label: vehicleLabel(v),
  vehicle_vin: v.vin ?? "",
  vehicle_plate: v.plate ?? "",
  vehicle_engine: v.engine_size ?? "",
});

const laborVehicleLabel = (entry: any, vehicle: any, workOrder?: any) =>
  vehicle ? vehicleLabel(vehicle) : entry.vehicle_label || workOrder?.vehicle_label || workOrder?.customer_name || "No vehicle";

const laborVehicleVinPlate = (entry: any, vehicle: any) =>
  vehicle ? vehicleVinPlate(vehicle) : [entry.vehicle_vin ? `VIN ${entry.vehicle_vin}` : "", entry.vehicle_plate ? `Plate ${entry.vehicle_plate}` : ""].filter(Boolean).join(" · ");

const withoutLaborVehicleSnapshot = (payload: any) => {
  const { vehicle_label, vehicle_vin, vehicle_plate, vehicle_engine, ...rest } = payload;
  const fallbackLine = [
    vehicle_label ? `Vehicle: ${vehicle_label}` : "",
    vehicle_engine ? `Engine: ${vehicle_engine}` : "",
    vehicle_vin ? `VIN: ${vehicle_vin}` : "",
    vehicle_plate ? `Plate: ${vehicle_plate}` : "",
  ].filter(Boolean).join(" · ");
  return {
    ...rest,
    notes: [rest.notes, fallbackLine].filter(Boolean).join("\n") || null,
  };
};

const classFromVehicle = (v: any): VehicleClass => {
  const haystack = [v.body_style, v.model, v.notes].filter(Boolean).join(" ").toLowerCase();
  if (/truck|pickup|f-150|silverado|ram |tacoma|tundra/.test(haystack)) return "truck";
  if (/suv|crossover|cr-v|rav4|highlander|pilot|explorer|suburban|tahoe/.test(haystack)) return "suv";
  if (/van|minivan|sienna|odyssey|pacifica|transit/.test(haystack)) return "truck";
  if (/luxury|bmw|mercedes|audi|lexus|porsche|tesla|cadillac/.test(haystack)) return "luxury";
  return "car";
};

const getInitialLaborTimeTab = () => {
  if (typeof window === "undefined") return "overview";
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("laborTab");
  if (fromUrl && LABOR_TIME_TABS.has(fromUrl)) return fromUrl;
  const fromStorage = window.localStorage.getItem(LABOR_TIME_TAB_STORAGE_KEY);
  if (fromStorage && LABOR_TIME_TABS.has(fromStorage)) return fromStorage;
  return "overview";
};

export default function AutoRepairLaborTimeSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState(getInitialLaborTimeTab);
  const [search, setSearch] = useState("");
  const [guideSearch, setGuideSearch] = useState("");
  const [guideCat, setGuideCat] = useState("All");
  const [guideClass, setGuideClass] = useState<VehicleClass>("car");
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
  const [guideVehicleId, setGuideVehicleId] = useState("new");
  const [vehicleDraft, setVehicleDraft] = useState(blankVehicleDraft);
  const [vinLoading, setVinLoading] = useState(false);

  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(id); }, []);

  const setLaborTab = useCallback((nextTab: string) => {
    setTab(nextTab);
    if (typeof window === "undefined" || !LABOR_TIME_TABS.has(nextTab)) return;
    window.localStorage.setItem(LABOR_TIME_TAB_STORAGE_KEY, nextTab);
    const url = new URL(window.location.href);
    url.searchParams.set("laborTab", nextTab);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

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
      const { data, error } = await (supabase as any).from("ar_customer_vehicles").select("*").eq("store_id", storeId).order("make");
      if (error) throw error; return data as any[];
    },
  });

  // ── Maps ─────────────────────────────────────────────────────────────
  const techMap = useMemo(() => { const m: Record<string, any> = {}; techs.forEach((t: any) => { m[t.id] = t; }); return m; }, [techs]);
  const woMap = useMemo(() => { const m: Record<string, any> = {}; workOrders.forEach((w: any) => { m[w.id] = w; }); return m; }, [workOrders]);
  const vehicleMap = useMemo(() => { const m: Record<string, any> = {}; vehicles.forEach((v: any) => { m[v.id] = v; }); return m; }, [vehicles]);
  const selectedGuideVehicle = guideVehicleId !== "new" ? vehicleMap[guideVehicleId] : null;

  // The vehicle the guide hours are estimated for — a saved selection wins,
  // otherwise the in-progress draft. Feeds estimateLabor() so times reflect the
  // exact engine / drivetrain / age, not just the broad vehicle class.
  const guideVehicleSpec = useMemo<VehicleSpec>(() => {
    const v: any = selectedGuideVehicle || vehicleDraft || {};
    return {
      year: v.year,
      make: v.make,
      model: v.model,
      engine: v.engine_size,
      drivetrain: v.drivetrain,
      bodyStyle: v.body_style,
      notes: v.notes,
      vClass: guideClass,
    };
  }, [selectedGuideVehicle, vehicleDraft, guideClass]);

  const selectGuideVehicle = useCallback((id: string) => {
    setGuideVehicleId(id);
    if (id === "new") {
      setVehicleDraft(blankVehicleDraft);
      return;
    }
    const v = vehicleMap[id];
    if (!v) return;
    setVehicleDraft({
      id: v.id ?? "",
      owner_name: v.owner_name ?? "",
      owner_phone: v.owner_phone ?? "",
      year: v.year != null ? String(v.year) : "",
      make: v.make ?? "",
      model: v.model ?? "",
      trim: v.trim ?? "",
      engine_size: v.engine_size ?? "",
      drivetrain: v.drivetrain ?? "",
      body_style: v.body_style ?? "",
      vin: v.vin ?? "",
      plate: v.plate ?? "",
      plate_state: v.plate_state ?? "",
      mileage: v.mileage != null ? String(v.mileage) : "",
      notes: v.notes ?? "",
    });
    setGuideClass(classFromVehicle(v));
  }, [vehicleMap]);

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
        label = vehicleLabel(v);
      } else if (e.vehicle_label) {
        label = e.vehicle_label;
        key = `snap-${e.vehicle_label}-${e.vehicle_vin ?? e.vehicle_plate ?? ""}`;
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
      const vehicle = e.vehicle_id && vehicleMap[e.vehicle_id] ? vehicleMap[e.vehicle_id] : null;
      const vLabel = laborVehicleLabel(e, vehicle, wo);
      if ([
        techName,
        wo?.number ?? "",
        wo?.customer_name ?? "",
        vLabel,
        vehicle?.vin ?? e.vehicle_vin ?? "",
        vehicle?.plate ?? e.vehicle_plate ?? "",
        vehicle?.engine_size ?? e.vehicle_engine ?? "",
        e.labor_type ?? "",
        e.notes ?? "",
      ].join(" ").toLowerCase().includes(q) === false) return false;
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
      const quickVehicle = quickVehicleId !== "none" ? vehicleMap[quickVehicleId] : null;
      const payload: any = { store_id: storeId, tech_id: quickTechId, labor_type: "Repair", duration_minutes: 0, is_billable: true, rate_override_cents: tech?.hourly_rate_cents ?? null };
      if (quickWoId !== "none") payload.work_order_id = quickWoId;
      if (quickVehicleId !== "none") payload.vehicle_id = quickVehicleId;
      if (quickVehicle) Object.assign(payload, vehicleSnapshot(quickVehicle));
      const { data, error } = await (supabase as any).from("ar_labor_entries").insert(payload).select("id").single();
      if (!error) return data.id as string;
      if (!String(error?.message ?? "").toLowerCase().includes("column")) throw error;
      const { data: fallbackData, error: fallbackError } = await (supabase as any)
        .from("ar_labor_entries")
        .insert(withoutLaborVehicleSnapshot(payload))
        .select("id")
        .single();
      if (fallbackError) throw fallbackError;
      return fallbackData.id as string;
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
      const selectedVehicle = form.vehicle_id ? vehicleMap[form.vehicle_id] : null;
      const snapshot = selectedVehicle ? vehicleSnapshot(selectedVehicle) : {
        vehicle_label: form.vehicle_label,
        vehicle_vin: form.vehicle_vin,
        vehicle_plate: form.vehicle_plate,
        vehicle_engine: form.vehicle_engine,
      };
      const payload: any = {
        store_id: storeId,
        tech_id: form.tech_id,
        labor_type: form.labor_type,
        duration_minutes: parseInt(form.duration_minutes) || 0,
        is_billable: form.is_billable,
        notes: form.notes || null,
        rate_override_cents: form.rate_override ? Math.round(parseFloat(form.rate_override) * 100) : (tech?.hourly_rate_cents ?? null),
        vehicle_label: snapshot.vehicle_label || null,
        vehicle_vin: snapshot.vehicle_vin || null,
        vehicle_plate: snapshot.vehicle_plate || null,
        vehicle_engine: snapshot.vehicle_engine || null,
      };
      if (form.work_order_id) payload.work_order_id = form.work_order_id;
      if (form.vehicle_id) payload.vehicle_id = form.vehicle_id;
      const run = async (nextPayload: any) => {
        if (editId) {
          const { error } = await (supabase as any).from("ar_labor_entries").update(nextPayload).eq("id", editId);
          if (error) throw error;
          return;
        }
        const { error } = await (supabase as any).from("ar_labor_entries").insert(nextPayload);
        if (error) throw error;
      };
      try {
        await run(payload);
      } catch (error: any) {
        if (!String(error?.message ?? "").toLowerCase().includes("column")) throw error;
        await run(withoutLaborVehicleSnapshot(payload));
      }
    },
    onSuccess: () => { toast.success(editId ? "Updated" : "Entry added"); qc.invalidateQueries({ queryKey: ["ar-labor-entries", storeId] }); setDlgOpen(false); setEditId(null); setForm(blankEntry); },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => { const { error } = await (supabase as any).from("ar_labor_entries").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["ar-labor-entries", storeId] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const saveGuideVehicle = useMutation({
    mutationFn: async () => {
      const year = vehicleDraft.year ? parseInt(vehicleDraft.year, 10) : null;
      const mileage = vehicleDraft.mileage ? parseInt(vehicleDraft.mileage, 10) : null;
      if (!vehicleDraft.make.trim()) throw new Error("Enter vehicle make");
      if (!vehicleDraft.model.trim()) throw new Error("Enter vehicle model");
      if (vehicleDraft.vin && vehicleDraft.vin.length !== 17) throw new Error("VIN must be 17 characters");
      const ownerName = vehicleDraft.owner_name.trim() || "Labor guide vehicle";

      const basePayload = {
        store_id: storeId,
        owner_name: ownerName,
        owner_phone: vehicleDraft.owner_phone.trim() || null,
        year: Number.isFinite(year) ? year : null,
        make: vehicleDraft.make.trim(),
        model: vehicleDraft.model.trim(),
        vin: vehicleDraft.vin.trim().toUpperCase() || null,
        plate: vehicleDraft.plate.trim().toUpperCase() || null,
        plate_state: vehicleDraft.plate_state || null,
        mileage: Number.isFinite(mileage) ? mileage : null,
        notes: vehicleDraft.notes.trim() || null,
      };
      const specPayload = {
        ...basePayload,
        trim: vehicleDraft.trim.trim() || null,
        engine_size: vehicleDraft.engine_size.trim() || null,
        drivetrain: vehicleDraft.drivetrain.trim() || null,
        body_style: vehicleDraft.body_style.trim() || null,
      };

      const run = async (payload: any) => {
        if (vehicleDraft.id) {
          const { data, error } = await (supabase as any)
            .from("ar_customer_vehicles")
            .update(payload)
            .eq("id", vehicleDraft.id)
            .select("*")
            .single();
          if (error) throw error;
          return data;
        }
        const { data, error } = await (supabase as any)
          .from("ar_customer_vehicles")
          .insert(payload)
          .select("*")
          .single();
        if (error) throw error;
        return data;
      };

      try {
        return await run(specPayload);
      } catch (error: any) {
        if (!String(error?.message ?? "").toLowerCase().includes("column")) throw error;
        const specNotes = [
          basePayload.notes,
          vehicleDraft.trim ? `Trim: ${vehicleDraft.trim}` : "",
          vehicleDraft.engine_size ? `Engine: ${vehicleDraft.engine_size}` : "",
          vehicleDraft.drivetrain ? `Drivetrain: ${vehicleDraft.drivetrain}` : "",
          vehicleDraft.body_style ? `Body: ${vehicleDraft.body_style}` : "",
        ].filter(Boolean).join("\n");
        return await run({ ...basePayload, notes: specNotes || null });
      }
    },
    onSuccess: (saved: any) => {
      qc.invalidateQueries({ queryKey: ["ar-customer-vehicles", storeId] });
      setGuideVehicleId(saved?.id ?? "new");
      setVehicleDraft((prev) => ({ ...prev, id: saved?.id ?? prev.id }));
      setGuideClass(classFromVehicle({ ...saved, ...vehicleDraft }));
      toast.success(vehicleDraft.id ? "Vehicle updated" : "Vehicle saved");
    },
    onError: (e: any) => toast.error(e.message ?? "Could not save vehicle"),
  });

  const lookupGuideVin = async () => {
    const clean = vehicleDraft.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (clean.length !== 17) { toast.error("VIN must be 17 characters (no I, O, Q)"); return; }
    setVinLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", { body: { vin: clean } });
      if (error) throw new Error(error.message || "Function call failed");
      if (!data?.ok) throw new Error(data?.error || "No vehicle data found");
      setVehicleDraft((d) => ({
        ...d,
        vin: data.vin || clean,
        year: data.year ? String(data.year) : d.year,
        make: data.make || d.make,
        model: data.model || d.model,
        trim: data.trim || d.trim,
        engine_size: data.engine || d.engine_size,
        drivetrain: data.driveType || d.drivetrain,
        body_style: data.bodyClass || d.body_style,
      }));
      setGuideClass(classFromVehicle({ body_style: data.bodyClass, model: data.model, make: data.make }));
      toast.success(data.partial ? "VIN decoded with partial data" : "VIN decoded");
    } catch (e: any) {
      toast.error(`VIN lookup failed: ${e?.message || "network error"}`);
    } finally {
      setVinLoading(false);
    }
  };

  const lookupGuidePlate = () => {
    const cleanPlate = vehicleDraft.plate.trim().toUpperCase();
    if (!cleanPlate) {
      toast.error("Enter a license plate");
      return;
    }
    if (!vehicleDraft.plate_state) {
      toast.error("Choose a USA state");
      return;
    }

    const normalize = (value: string) => value.replace(/[^A-Z0-9]/g, "");
    const match = vehicles.find((v: any) => (
      normalize(String(v.plate ?? "").toUpperCase()) === normalize(cleanPlate) &&
      (!v.plate_state || v.plate_state === vehicleDraft.plate_state)
    ));

    if (!match) {
      toast.info("No saved vehicle found for that state and plate yet. Enter VIN to decode it.");
      return;
    }

    setGuideVehicleId(match.id ?? "new");
    setVehicleDraft({
      id: match.id ?? "",
      owner_name: match.owner_name ?? "",
      owner_phone: match.owner_phone ?? "",
      year: match.year != null ? String(match.year) : "",
      make: match.make ?? "",
      model: match.model ?? "",
      trim: match.trim ?? "",
      engine_size: match.engine_size ?? "",
      drivetrain: match.drivetrain ?? "",
      body_style: match.body_style ?? "",
      vin: match.vin ?? "",
      plate: match.plate ?? cleanPlate,
      plate_state: match.plate_state ?? vehicleDraft.plate_state,
      mileage: match.mileage != null ? String(match.mileage) : "",
      notes: match.notes ?? "",
    });
    setGuideClass(classFromVehicle(match));
    if (match.vin) {
      toast.success("Plate matched a saved vehicle and filled the VIN");
    } else {
      toast.info("Plate matched a saved vehicle, but no VIN is saved yet");
    }
  };

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({
      ...blankEntry,
      tech_id: e.tech_id ?? "",
      work_order_id: e.work_order_id ?? "",
      vehicle_id: e.vehicle_id ?? "",
      labor_type: e.labor_type ?? "Repair",
      duration_minutes: e.duration_minutes != null ? String(e.duration_minutes) : "",
      is_billable: e.is_billable ?? true,
      notes: e.notes ?? "",
      rate_override: e.rate_override_cents != null ? String(e.rate_override_cents / 100) : "",
      vehicle_label: e.vehicle_label ?? "",
      vehicle_vin: e.vehicle_vin ?? "",
      vehicle_plate: e.vehicle_plate ?? "",
      vehicle_engine: e.vehicle_engine ?? "",
    });
    setDlgOpen(true);
  };

  const applyGuideEntry = (g: typeof LABOR_GUIDE[0]) => {
    const est = estimateLabor(g, guideVehicleSpec);
    const hrs = est.hours;
    const classLabel = est.summary;
    const vehicle = selectedGuideVehicle || (vehicleDraft.make && vehicleDraft.model ? vehicleDraft : null);
    const vehicleNotes = vehicle
      ? [
          `Vehicle: ${vehicleLabel(vehicle)}`,
          vehicle.engine_size ? `Engine: ${vehicle.engine_size}` : "",
          vehicle.vin ? `VIN: ${vehicle.vin}` : "",
          vehicle.plate ? `Plate: ${vehicle.plate}` : "",
        ].filter(Boolean).join(" · ")
      : "";
    setForm(f => ({
      ...f,
      vehicle_id: selectedGuideVehicle?.id ?? f.vehicle_id,
      labor_type: g.category,
      duration_minutes: String(Math.round(hrs * 60)),
      notes: [g.service + (g.notes ? `. Note: ${g.notes}` : ""), vehicleNotes].filter(Boolean).join("\n"),
      ...(vehicle ? vehicleSnapshot(vehicle) : {}),
    }));
    setDlgOpen(true);
    toast.info(`Loaded "${g.service}" — ${hrs}h (${classLabel})`);
  };

  const guideVehicleReady = Boolean(vehicleDraft.make && vehicleDraft.model && (vehicleDraft.year || vehicleDraft.vin || vehicleDraft.plate));

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-1">
      {/* KPI strip */}
      {tab !== "guide" && (
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
      )}

      <Tabs value={tab} onValueChange={setLaborTab}>
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
                  const vinPlate = laborVehicleVinPlate(e, veh);
                  const label = laborVehicleLabel(e, veh, wo);
                  return (
                    <div key={e.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/30">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Timer className="h-4 w-4 text-primary" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{tech?.name ?? "—"} · {e.labor_type}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {label}{vinPlate ? ` · ${vinPlate}` : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-foreground">{fmtH(e.duration_minutes ?? 0)}</p>
                        {cost > 0 && <p className="text-[10px] text-amber-600">{fmt$(cost)}</p>}
                      </div>
                    </div>
                  );
                })}
              <div className="text-center pt-1">
                <button type="button" onClick={() => setLaborTab("log")} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mx-auto">View all <ArrowRight className="h-3 w-3" /></button>
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
                      {vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)} — {v.owner_name}{v.vin ? ` · VIN ${v.vin}` : ""}{v.plate ? ` · Plate ${v.plate}` : ""}</SelectItem>)}
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
                  const vinPlate = laborVehicleVinPlate(e, veh);
                  const vehicleLine = laborVehicleLabel(e, veh, wo);
                  const engineLine = veh?.engine_size ?? e.vehicle_engine ?? "";
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
                              {vehicleLine}{veh?.owner_name ? ` · ${veh.owner_name}` : ""}{engineLine ? ` · ${engineLine}` : ""}{vinPlate ? ` · ${vinPlate}` : ""}
                              {wo && ` · ${wo.number}`}
                            </p>
                            {e.notes && <p className="mt-1 max-w-3xl whitespace-pre-line break-words rounded-md bg-muted/30 px-2 py-1 text-[10px] leading-4 text-muted-foreground/80">{e.notes}</p>}
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
            const groupedVehicle = vehicleMap[key];
            const groupedEntry = group.entries[0];
            const groupedVinPlate = groupedVehicle ? vehicleVinPlate(groupedVehicle) : laborVehicleVinPlate(groupedEntry, null);
            const groupedEngine = groupedVehicle?.engine_size ?? groupedEntry?.vehicle_engine ?? "";
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
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[groupedEngine, groupedVinPlate, `${group.entries.length} ${group.entries.length === 1 ? "entry" : "entries"}`, fmtH(group.totalMins)].filter(Boolean).join(" · ")}
                        </p>
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
                            {(groupedVehicle || groupedVinPlate || groupedEngine) && (
                              <div className="grid gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-xs sm:grid-cols-3">
                                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Owner</p><p className="font-semibold">{groupedVehicle?.owner_name || "Snapshot entry"}</p></div>
                                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">VIN</p><p className="font-mono font-semibold">{groupedVehicle?.vin || groupedEntry?.vehicle_vin || "—"}</p></div>
                                <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">License plate</p><p className="font-mono font-semibold">{groupedVehicle?.plate || groupedEntry?.vehicle_plate || "—"}</p></div>
                              </div>
                            )}
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
          <Card className="overflow-hidden border-border/50">
            <CardHeader className="border-b border-border/40 bg-muted/20 px-3 py-2.5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Car className="h-4 w-4 text-primary" />
                    Vehicle workflow
                  </CardTitle>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Select or add the exact vehicle before using guide hours.
                  </p>
                </div>
                {selectedGuideVehicle && (
                  <Badge variant="outline" className="w-fit gap-1 font-mono text-[10px]">
                    {selectedGuideVehicle.vin ? `VIN ${selectedGuideVehicle.vin}` : selectedGuideVehicle.plate ? `Plate ${selectedGuideVehicle.plate}` : "Vehicle selected"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 p-3">
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.6fr)]">
                <div className="space-y-1.5">
                  <Label className="text-xs">Workflow vehicle</Label>
                  <Select value={guideVehicleId} onValueChange={selectGuideVehicle}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Choose vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Add new vehicle</SelectItem>
                      {vehicles.map((v: any) => (
                        <SelectItem key={v.id} value={v.id}>
                          {vehicleLabel(v)}{v.plate ? ` · ${v.plate}` : ""}{v.vin ? ` · VIN ${v.vin}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] leading-4 text-muted-foreground">
                    Existing vehicles show VIN and license plate so the guide is tied to the right car.
                  </p>
                </div>

                <div className="grid gap-2 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">VIN</Label>
                    <div className="flex gap-1.5">
                      <Input
                        value={vehicleDraft.vin}
                        maxLength={17}
                        onChange={e => setVehicleDraft(f => ({ ...f, vin: e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "") }))}
                        placeholder="17-character VIN"
                        className="h-10 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        disabled={vinLoading || vehicleDraft.vin.length !== 17}
                        onClick={lookupGuideVin}
                        title="Decode VIN"
                      >
                        {vinLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">License plate</Label>
                    <div className="flex gap-1.5">
                      <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
                        <Select value={vehicleDraft.plate_state || "none"} onValueChange={v => setVehicleDraft(f => ({ ...f, plate_state: v === "none" ? "" : v }))}>
                          <SelectTrigger className="h-10 w-24 shrink-0 rounded-none border-0 border-r bg-muted/30 px-3 text-sm shadow-none focus:ring-0">
                            <SelectValue placeholder="State" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">State</SelectItem>
                            {US_STATES.map(([code, name]) => (
                              <SelectItem key={code} value={code}>{code} - {name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={vehicleDraft.plate}
                          onChange={e => setVehicleDraft(f => ({ ...f, plate: e.target.value.toUpperCase() }))}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); lookupGuidePlate(); } }}
                          placeholder="ABC-1234"
                          className="h-10 min-w-0 rounded-none border-0 font-mono text-sm shadow-none focus-visible:ring-0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        disabled={!vehicleDraft.plate.trim() || !vehicleDraft.plate_state}
                        onClick={lookupGuidePlate}
                        title="Find saved VIN by state and plate"
                      >
                        <ScanSearch className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Year *</Label>
                  <Select value={vehicleDraft.year || "none"} onValueChange={v => setVehicleDraft(f => ({ ...f, year: v === "none" ? "" : v }))}>
                    <SelectTrigger className="h-10 text-sm">
                      <SelectValue placeholder="Choose year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Choose year</SelectItem>
                      {VEHICLE_YEAR_OPTIONS.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Make *</Label>
                  <Input value={vehicleDraft.make} onChange={e => setVehicleDraft(f => ({ ...f, make: e.target.value }))} placeholder="Toyota" className="h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Model *</Label>
                  <Input value={vehicleDraft.model} onChange={e => setVehicleDraft(f => ({ ...f, model: e.target.value }))} placeholder="Camry" className="h-10 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Engine size</Label>
                  <Input value={vehicleDraft.engine_size} onChange={e => setVehicleDraft(f => ({ ...f, engine_size: e.target.value }))} placeholder="2.5L 4-cyl" className="h-10 text-sm" />
                </div>
              </div>

              <details className="rounded-xl border border-border/50 bg-muted/10 px-3 py-2">
                <summary className="cursor-pointer text-xs font-semibold text-foreground">More vehicle details</summary>
                <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Trim</Label>
                    <Input value={vehicleDraft.trim} onChange={e => setVehicleDraft(f => ({ ...f, trim: e.target.value }))} placeholder="LE, XLE, Sport" className="h-10 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Drivetrain</Label>
                    <Select value={vehicleDraft.drivetrain || "none"} onValueChange={v => setVehicleDraft(f => ({ ...f, drivetrain: v === "none" ? "" : v }))}>
                      <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Select drivetrain</SelectItem>
                        <SelectItem value="FWD">FWD</SelectItem>
                        <SelectItem value="RWD">RWD</SelectItem>
                        <SelectItem value="AWD">AWD</SelectItem>
                        <SelectItem value="4WD">4WD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Body / class</Label>
                    <Select
                      value={guideClass}
                      onValueChange={(v) => {
                        setGuideClass(v as VehicleClass);
                        const label = VEHICLE_CLASSES.find(c => c.id === v)?.label ?? "";
                        setVehicleDraft(f => ({ ...f, body_style: f.body_style || label }));
                      }}
                    >
                      <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{VEHICLE_CLASSES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mileage</Label>
                    <Input value={vehicleDraft.mileage} onChange={e => setVehicleDraft(f => ({ ...f, mileage: e.target.value.replace(/\D/g, "") }))} placeholder="85000" className="h-10 text-sm" />
                  </div>
                </div>
              </details>

              <div className="flex flex-col gap-2 rounded-2xl border border-border/50 bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{vehicleLabel(vehicleDraft)}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {[vehicleMeta(vehicleDraft), vehicleVinPlate(vehicleDraft)].filter(Boolean).join(" · ") || "Add VIN, plate, and engine details before selecting labor."}
                  </p>
                </div>
                <Button
                  type="button"
                  className="h-10 shrink-0 gap-2"
                  onClick={() => saveGuideVehicle.mutate()}
                  disabled={saveGuideVehicle.isPending}
                >
                  {saveGuideVehicle.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {vehicleDraft.id ? "Update vehicle" : "Save vehicle"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input value={guideSearch} onChange={e => setGuideSearch(e.target.value)} placeholder="Search service, e.g. brake pads…" className="pl-8 h-9 text-sm" /></div>
            <Select value={guideCat} onValueChange={setGuideCat}>
              <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="All">All Categories</SelectItem>{GUIDE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <p className="text-[10px] text-muted-foreground">
            {guideVehicleSpec.make && guideVehicleSpec.model ? (
              <>Estimated for <strong>{[guideVehicleSpec.year, guideVehicleSpec.make, guideVehicleSpec.model].filter(Boolean).join(" ")}</strong>{guideVehicleSpec.engine ? ` · ${guideVehicleSpec.engine}` : ""}{guideVehicleSpec.drivetrain ? ` · ${guideVehicleSpec.drivetrain}` : ""} — hours factor in engine, drivetrain, and age. Tap a time to see why.</>
            ) : (
              <>Add the vehicle above for engine-, drivetrain-, and age-specific hours. Click <strong>Use</strong> to pre-fill a manual entry.</>
            )}
          </p>

          <div className="space-y-1">
            {filteredGuide.length === 0
              ? <p className="text-center text-sm text-muted-foreground py-8">No services match your search.</p>
              : (() => {
                let lastCat = "";
                return filteredGuide.map((g, i) => {
                  const showHeader = g.category !== lastCat; lastCat = g.category;
                  const est = estimateLabor(g, guideVehicleSpec);
                  const estTitle = [`base ${est.baseHours}h`, ...est.factors.map(f => `${f.label} ×${f.mult}`)].join(" · ");
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
                          <div className="text-right leading-tight max-w-[130px]">
                            <span className="text-sm font-bold text-foreground tabular-nums" title={estTitle}>{est.hours}h</span>
                            {est.vehicleSpecific && (
                              <p className="text-[9px] text-muted-foreground">
                                <span className="tabular-nums">base {est.baseHours}h</span> · {est.summary}
                              </p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            title={guideVehicleReady ? "Use this labor guide item" : "Use now and add vehicle details in the entry"}
                            onClick={() => applyGuideEntry(g)}
                          >
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
          <DialogHeader>
            <DialogTitle className="text-base">{editId ? "Edit Labor Entry" : "Manual Labor Entry"}</DialogTitle>
            <DialogDescription>
              Confirm the technician, vehicle, work order, billable time, and any VIN or plate notes before saving labor.
            </DialogDescription>
          </DialogHeader>
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
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm(f => {
                if (v === "none") return { ...f, vehicle_id: "" };
                const nextVehicle = vehicleMap[v];
                return { ...f, vehicle_id: v, ...(nextVehicle ? vehicleSnapshot(nextVehicle) : {}) };
              })}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent><SelectItem value="none">No vehicle</SelectItem>{vehicles.map((v: any) => <SelectItem key={v.id} value={v.id}>{vehicleLabel(v)} — {v.owner_name}{v.vin ? ` · VIN ${v.vin}` : ""}{v.plate ? ` · Plate ${v.plate}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {(form.vehicle_label || form.vehicle_vin || form.vehicle_plate || form.vehicle_engine) && (
              <div className="rounded-xl border border-border/50 bg-muted/20 p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vehicle snapshot saved on this labor entry</p>
                  <Badge variant="outline" className="h-5 shrink-0 text-[10px]">{form.vehicle_id ? "Linked" : "Snapshot"}</Badge>
                </div>
                <p className="mt-1 text-xs font-semibold text-foreground">{form.vehicle_label || "Vehicle"}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {[form.vehicle_engine, form.vehicle_vin ? `VIN ${form.vehicle_vin}` : "", form.vehicle_plate ? `Plate ${form.vehicle_plate}` : ""].filter(Boolean).join(" · ")}
                </p>
              </div>
            )}
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
              <Textarea rows={4} placeholder="Optional notes…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="text-sm resize-none" />
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
