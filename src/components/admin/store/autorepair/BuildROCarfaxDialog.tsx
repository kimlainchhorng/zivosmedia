/**
 * Build R.O. — "Carfax Vehicle Service History" popup (VSM-styled, picture 5).
 *
 * NOTE: a real Carfax data feed requires a paid Carfax subscription that isn't
 * connected to this project. Until one is, this report is compiled from the
 * shop's OWN records (ar_invoices line items + ar_work_orders) for the given
 * VIN / vehicle — so it shows the work *this shop* has done, in the Carfax
 * report layout. Swap the queries below for a real feed when available.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { X, Printer, Loader2 } from "lucide-react";

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

type ServiceRecord = { name: string; date: string | null; mileage: number | null };

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US");
};
const labelOf = (v: CarfaxVehicle | null) =>
  v ? (v.vehicle_label?.trim() || [v.year, v.make, v.model].filter(Boolean).join(" ")) : "";

export default function BuildROCarfaxDialog({ open, onOpenChange, storeId, vehicle }: Props) {
  const vin = vehicle?.vin?.trim() || "";
  const vehicleLabel = labelOf(vehicle);
  const enabled = open && (!!vin || !!vehicleLabel);

  const { data: invoices = [], isLoading: loadingInv } = useQuery({
    queryKey: ["carfax-invoices", storeId, vin, vehicleLabel],
    enabled,
    queryFn: async () => {
      let q = supabase.from("ar_invoices" as any)
        .select("number, items, mileage_in, mileage_out, created_at, vin, vehicle_label")
        .eq("store_id", storeId).is("deleted_at", null);
      q = vin
        ? q.or(`vin.eq.${vin},vehicle_label.eq.${vehicleLabel}`)
        : q.eq("vehicle_label", vehicleLabel);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: workOrders = [], isLoading: loadingWo } = useQuery({
    queryKey: ["carfax-wos", storeId, vehicleLabel],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("ar_work_orders" as any)
        .select("number, notes, parts_used, mileage_in, mileage_out, created_at, vehicle_label, estimate_id")
        .eq("store_id", storeId).eq("vehicle_label", vehicleLabel)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const records = useMemo<ServiceRecord[]>(() => {
    const recs: ServiceRecord[] = [];
    for (const inv of invoices) {
      const date = inv.created_at ?? null;
      const mileage = inv.mileage_out ?? inv.mileage_in ?? null;
      const items = Array.isArray(inv.items) ? inv.items : [];
      if (items.length === 0) {
        recs.push({ name: inv.number ? `Service (Invoice ${inv.number})` : "Service", date, mileage });
      } else {
        for (const it of items) {
          const name = (it?.description || it?.name || it?.category || "Service").toString().trim();
          if (name) recs.push({ name, date, mileage });
        }
      }
    }
    // Work orders not already represented by an invoice (no estimate link collision logic — just label them).
    for (const wo of workOrders) {
      const date = wo.created_at ?? null;
      const mileage = wo.mileage_out ?? wo.mileage_in ?? null;
      const note = (wo.notes || "").toString().trim();
      recs.push({ name: note ? note.slice(0, 80) : `Work Order ${wo.number ?? ""}`.trim(), date, mileage });
    }
    return recs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [invoices, workOrders]);

  const loading = loadingInv || loadingWo;

  const print = () => {
    const rows = records
      .map((r) => `<div style="margin:0 0 14px"><div><b>Service Name:</b> ${r.name}</div>
        <div>dateOfLastService: ${fmtDate(r.date)}</div>
        ${r.mileage != null ? `<div>MileageOfLastService: ${Number(r.mileage).toLocaleString()}</div>` : ""}</div>`)
      .join("");
    const html = `<html><head><title>Carfax Service History — ${vehicleLabel}</title>
      <style>body{font-family:system-ui,monospace;padding:28px;color:#1f2937;font-size:13px}
      h2{text-align:center;letter-spacing:2px}hr{border:0;border-top:1px dashed #9ca3af;margin:14px 0}</style></head>
      <body><h2>SERVICE HISTORY</h2><hr/>
      <div><b>Vehicle:</b> ${vehicleLabel || "—"}<br/><b>VIN:</b> ${vin || "—"}</div><hr/>
      <div>Number Of Service Records: ${records.length}<br/>Number Of Recall Records: 0</div><hr/>
      <h3>Service History:</h3>${rows || "<p>No records.</p>"}</body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked"); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-slate-700 bg-[#0b1220] p-0 text-slate-100">
        <DialogTitle className="sr-only">Carfax Vehicle Service History</DialogTitle>
        {/* Header bar */}
        <div className="flex items-center justify-between gap-3 bg-slate-800/80 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-serif text-lg italic tracking-wide text-slate-300">VIP</span>
            <span className="text-base font-bold">Carfax Vehicle Service History:</span>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded border border-red-500/60 px-2.5 py-0.5 text-red-400 hover:bg-red-500/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-2 bg-gradient-to-r from-[#1e90ff] to-[#1577e0]" />

        {/* White report body */}
        <div className="max-h-[65vh] overflow-y-auto bg-white px-6 py-5 text-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex-1 text-center text-amber-700">
              <p className="tracking-widest">{"*".repeat(40)}</p>
              <p className="font-semibold text-slate-700">Service History:</p>
              <p className="tracking-widest">{"*".repeat(40)}</p>
            </div>
            <div className="ml-4 shrink-0 rounded border border-slate-800 px-2 py-1 text-center">
              <span className="font-black tracking-tight text-slate-900">CARFA<span className="text-sky-600">X</span></span>
              <span className="block text-[8px] font-semibold tracking-wide text-slate-500">VEHICLE HISTORY REPORTS</span>
            </div>
          </div>

          <div className="mt-2 space-y-0.5 text-sm">
            <p><span className="inline-block w-24 text-slate-500">Vehicle:</span><b>{vehicleLabel || "—"}</b></p>
            <p><span className="inline-block w-24 text-slate-500">VIN:</span>{vin || "—"}</p>
            {vehicle?.body_type && <p><span className="inline-block w-24 text-slate-500">Body Type:</span>{vehicle.body_type}</p>}
            {vehicle?.drive && <p><span className="inline-block w-24 text-slate-500">Drive:</span>{vehicle.drive}</p>}
          </div>

          <p className="mt-4 text-center tracking-widest text-amber-700">{"*".repeat(40)}</p>
          <div className="text-center text-sm">
            <p>Number Of Service Records: <b>{loading ? "…" : records.length}</b></p>
            <p>Number Of Recall Records: <b>0</b></p>
            <p className="mt-0.5 text-[11px] italic text-slate-400">(recall lookup not connected — shows this shop's own service history)</p>
          </div>
          <p className="text-center tracking-widest text-amber-700">{"*".repeat(40)}</p>

          <p className="mt-4 font-semibold text-slate-700">Service History:</p>
          <p className="tracking-widest text-amber-700">{"*".repeat(16)}</p>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No service records found for this vehicle in your shop.
            </p>
          ) : (
            <div className="mt-3 space-y-4 text-sm">
              {records.map((r, i) => (
                <div key={i}>
                  <p><span className="text-slate-500">Service Name: </span><b>{r.name}</b></p>
                  <p className="text-slate-600">dateOfLastService: {fmtDate(r.date)}</p>
                  {r.mileage != null && <p className="text-slate-600">MileageOfLastService: {Number(r.mileage).toLocaleString()}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 bg-slate-900/60 px-6 py-4">
          <button onClick={print} className="flex items-center gap-2 rounded bg-[#1e90ff] px-10 py-2.5 font-semibold text-white hover:bg-[#1577e0]">
            <Printer className="h-4 w-4" /> Print
          </button>
          <button onClick={() => onOpenChange(false)} className="rounded bg-rose-400/90 px-10 py-2.5 font-semibold text-white hover:bg-rose-400">
            Exit
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
