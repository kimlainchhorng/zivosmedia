/**
 * Build R.O. — "Vehicle Service History" popup (light, modern).
 *
 * NOTE: a real Carfax data feed requires a paid Carfax subscription that isn't
 * connected to this project. Until one is, this report is compiled from the
 * shop's OWN records (ar_invoices + ar_work_orders) for the given VIN / vehicle
 * — so it shows the work *this shop* has done, grouped into service visits.
 * Swap the queries below for a real feed when available.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";
import { toast } from "sonner";
import { X, Printer, Loader2, History, Receipt, Wrench, DollarSign, Calendar, Gauge, FileSearch } from "lucide-react";
import { escapeHtml } from "@/lib/escapeHtml";

export type CarfaxVehicle = {
  vin?: string | null;
  year?: number | string | null;
  make?: string | null;
  model?: string | null;
  vehicle_label?: string | null;
  body_type?: string | null;
  drive?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  vehicle: CarfaxVehicle | null;
}

type Visit = {
  kind: "invoice" | "workorder";
  number: string | null;
  date: string | null;
  mileage: number | null;
  totalCents: number | null;
  status: string | null;
  services: string[];
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const money = (cents?: number | null) => `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const labelOf = (v: CarfaxVehicle | null) =>
  v ? (v.vehicle_label?.trim() || [v.year, v.make, v.model].filter(Boolean).join(" ")) : "";

const statusClass = (s?: string | null) => {
  const x = (s || "").toLowerCase();
  if (["paid", "completed", "done", "closed"].includes(x)) return "bg-emerald-100 text-emerald-700";
  if (["draft", "awaiting"].includes(x)) return "bg-slate-100 text-slate-600";
  if (["void", "cancelled", "canceled"].includes(x)) return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
};

export default function BuildROCarfaxDialog({ open, onOpenChange, storeId, vehicle }: Props) {
  const vin = vehicle?.vin?.trim() || "";
  const vehicleLabel = labelOf(vehicle);
  const enabled = open && (!!vin || !!vehicleLabel);
  const isAutoRepairSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
  const compiledRecordsTitle = isAutoRepairSoftwareDomain
    ? "Compiled from this business's service records"
    : "Compiled from this shop's records";
  const emptyPrintedRecordsText = isAutoRepairSoftwareDomain
    ? "No service records found for this vehicle in your business."
    : "No service records found for this vehicle in your shop.";
  const emptyHistoryHelpText = isAutoRepairSoftwareDomain
    ? "Once this business invoices or completes a work order for this vehicle, the visits will appear here."
    : "Once this shop invoices or completes a work order for this vehicle, the visits will appear here.";
  const footerRecordsText = isAutoRepairSoftwareDomain
    ? "Compiled from this business's service records · recall lookup not connected"
    : "Compiled from this shop's records · recall lookup not connected";

  const { data: invoices = [], isLoading: loadingInv } = useQuery({
    queryKey: ["carfax-invoices", storeId, vin, vehicleLabel],
    enabled,
    queryFn: async () => {
      let q = supabase.from("ar_invoices" as any)
        .select("number, items, mileage_in, mileage_out, created_at, vin, vehicle_label, total_cents, status")
        .eq("store_id", storeId).is("deleted_at", null);
      if (vin && vehicleLabel) q = q.or(`vin.eq.${vin},vehicle_label.eq.${vehicleLabel}`);
      else if (vin) q = q.eq("vin", vin);
      else q = q.eq("vehicle_label", vehicleLabel);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: workOrders = [], isLoading: loadingWo } = useQuery({
    queryKey: ["carfax-wos", storeId, vehicleLabel],
    enabled: enabled && !!vehicleLabel,
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_work_orders" as any)
        .select("number, notes, parts_used, created_at, vehicle_label, total_cents, status")
        .eq("store_id", storeId).eq("vehicle_label", vehicleLabel)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Group each document into a single service "visit" with its services listed.
  const visits = useMemo<Visit[]>(() => {
    const out: Visit[] = [];
    for (const inv of invoices) {
      const items = Array.isArray(inv.items) ? inv.items : [];
      const services = items
        .map((it: any) => (it?.description || it?.name || it?.category || "").toString().trim())
        .filter(Boolean);
      out.push({
        kind: "invoice",
        number: inv.number ?? null,
        date: inv.created_at ?? null,
        mileage: inv.mileage_out ?? inv.mileage_in ?? null,
        totalCents: inv.total_cents ?? null,
        status: inv.status ?? null,
        services: services.length ? services : ["Service performed"],
      });
    }
    for (const wo of workOrders) {
      const parts = Array.isArray(wo.parts_used) ? wo.parts_used : [];
      const services = parts
        .map((p: any) => (p?.name || p?.description || "").toString().trim())
        .filter(Boolean);
      const note = (wo.notes || "").toString().trim();
      if (note) services.unshift(note.slice(0, 100));
      out.push({
        kind: "workorder",
        number: wo.number ?? null,
        date: wo.created_at ?? null,
        mileage: null,
        totalCents: wo.total_cents ?? null,
        status: wo.status ?? null,
        services: services.length ? services : ["Work order"],
      });
    }
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [invoices, workOrders]);

  const summary = useMemo(() => {
    const totalSpent = visits.reduce((s, v) => s + (v.totalCents ?? 0), 0);
    const lastDate = visits.find((v) => v.date)?.date ?? null;
    const lastMileage = visits.find((v) => v.mileage != null)?.mileage ?? null;
    return { visits: visits.length, totalSpent, lastDate, lastMileage };
  }, [visits]);

  const loading = loadingInv || loadingWo;

  const print = () => {
    const rows = visits
      .map((v) => `<div style="margin:0 0 16px;padding-bottom:12px;border-bottom:1px solid #e5e7eb">
        <div><b>${v.kind === "invoice" ? "Invoice" : "Work Order"}${v.number ? ` #${escapeHtml(v.number)}` : ""}</b> — ${fmtDate(v.date)}${v.mileage != null ? ` · ${Number(v.mileage).toLocaleString()} mi` : ""}${v.totalCents != null ? ` · ${money(v.totalCents)}` : ""}</div>
        <div style="color:#374151;margin-top:4px">${escapeHtml(v.services.join(", "))}</div></div>`)
      .join("");
    const html = `<html><head><title>Service History — ${escapeHtml(vehicleLabel)}</title>
      <style>body{font-family:system-ui,Arial,sans-serif;padding:28px;color:#111;font-size:13px}
      h1{font-size:18px;margin:0 0 4px}.muted{color:#6b7280}hr{border:0;border-top:1px solid #e5e7eb;margin:14px 0}</style></head>
      <body><h1>Vehicle Service History</h1>
      <div class="muted">${escapeHtml(vehicleLabel || "—")}${vin ? ` &middot; VIN ${escapeHtml(vin)}` : ""}</div><hr/>
      <div>Visits: <b>${summary.visits}</b> &nbsp;&nbsp; Total: <b>${money(summary.totalSpent)}</b> &nbsp;&nbsp; Last service: <b>${fmtDate(summary.lastDate)}</b></div><hr/>
      ${rows || `<p>${emptyPrintedRecordsText}</p>`}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked"); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  const stats = [
    { label: "Visits", value: loading ? "…" : String(summary.visits), icon: Wrench },
    { label: "Total Spent", value: loading ? "…" : `$${(summary.totalSpent / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: DollarSign },
    { label: "Last Service", value: summary.lastDate ? fmtDate(summary.lastDate) : "—", icon: Calendar },
    { label: "Last Mileage", value: summary.lastMileage != null ? Number(summary.lastMileage).toLocaleString() : "—", icon: Gauge },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900">
        <DialogTitle className="sr-only">Vehicle Service History</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-[#0b3a6f] to-[#1577e0] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <History className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-white">Vehicle Service History</h2>
            <p className="truncate text-xs text-white/80">{vehicleLabel || "—"}{vin ? ` · VIN ${vin}` : ""}</p>
          </div>
          <span className="hidden shrink-0 rounded-md bg-white px-2 py-1 leading-none sm:block" title={compiledRecordsTitle}>
            <span className="text-sm font-black tracking-tight text-[#0b3a6f]">CARFA<span className="text-[#1577e0]">X</span></span>
          </span>
          <button onClick={() => onOpenChange(false)} className="rounded-lg bg-black/15 p-1.5 text-white transition hover:bg-black/25" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-5 py-4">
          {/* Vehicle + summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
              <div><span className="text-slate-500">Vehicle:</span> <b className="text-slate-800">{vehicleLabel || "—"}</b></div>
              <div><span className="text-slate-500">VIN:</span> <span className="font-mono text-slate-700">{vin || "—"}</span></div>
              {vehicle?.body_type && <div><span className="text-slate-500">Body:</span> <span className="text-slate-700">{vehicle.body_type}</span></div>}
              {vehicle?.drive && <div><span className="text-slate-500">Drive:</span> <span className="text-slate-700">{vehicle.drive}</span></div>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    <s.icon className="h-3 w-3" /> {s.label}
                  </div>
                  <p className="mt-0.5 truncate text-base font-bold text-slate-800">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading service history…</div>
          ) : visits.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                <FileSearch className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-700">No service history yet</p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                {emptyHistoryHelpText}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {visits.map((v, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-slate-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${v.kind === "invoice" ? "bg-emerald-100 text-emerald-600" : "bg-sky-100 text-sky-600"}`}>
                        {v.kind === "invoice" ? <Receipt className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800">
                          {v.kind === "invoice" ? "Invoice" : "Work Order"}{v.number ? ` #${v.number}` : ""}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {fmtDate(v.date)}{v.mileage != null ? ` · ${Number(v.mileage).toLocaleString()} mi` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {v.totalCents != null && <p className="text-sm font-bold tabular-nums text-slate-800">{money(v.totalCents)}</p>}
                      {v.status && <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusClass(v.status)}`}>{v.status}</span>}
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {v.services.slice(0, 10).map((s, j) => (
                      <span key={j} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{s}</span>
                    ))}
                    {v.services.length > 10 && <span className="rounded-full px-2 py-0.5 text-[11px] text-slate-400">+{v.services.length - 10} more</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <p className="hidden text-[11px] text-slate-400 sm:block">{footerRecordsText}</p>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            <button
              onClick={print}
              disabled={visits.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" /> Print
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg bg-[#1577e0] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[#1366c4]"
            >
              Done
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
