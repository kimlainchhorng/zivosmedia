/**
 * Build R.O. — "Existing Customer" picker.
 * Searchable list of the shop's garage (ar_customer_vehicles). Picking a row
 * binds that customer + vehicle to the R.O. Receives the already-loaded garage
 * from AutoRepairBuildROSection to avoid a duplicate query, and pulls a light
 * service-history summary (visits / last visit / lifetime spend) per vehicle.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, User, Car, Phone, History, X } from "lucide-react";

type Vehicle = {
  id: string;
  owner_name: string;
  owner_phone?: string | null;
  year?: number | null;
  make: string;
  model: string;
  plate?: string | null;
  vin?: string | null;
  mileage?: number | null;
  color?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  garage: Vehicle[];
  onPick: (v: Vehicle) => void;
}

const money = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const labelOf = (v: Vehicle) => [v.year, v.make, v.model].filter(Boolean).join(" ");

export default function BuildROExistingCustomerDialog({ open, onOpenChange, storeId, garage, onPick }: Props) {
  const [q, setQ] = useState("");

  // Light service-history summary — invoices keyed by vehicle_label.
  const { data: invoices = [] } = useQuery({
    queryKey: ["ar-existing-cust-history", storeId],
    enabled: open && !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_invoices" as any)
        .select("vehicle_label, created_at, total_cents, amount_paid_cents, status")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const statsByLabel = useMemo(() => {
    const m = new Map<string, { count: number; lastDate: string | null; paid: number }>();
    for (const inv of invoices) {
      const label = (inv.vehicle_label || "").trim();
      if (!label) continue;
      const cur = m.get(label) || { count: 0, lastDate: null as string | null, paid: 0 };
      cur.count += 1;
      if (!cur.lastDate || inv.created_at > cur.lastDate) cur.lastDate = inv.created_at;
      cur.paid += inv.status === "paid" ? (inv.total_cents ?? 0) : (inv.amount_paid_cents ?? 0);
      m.set(label, cur);
    }
    return m;
  }, [invoices]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return garage;
    return garage.filter((v) =>
      `${v.owner_name} ${v.owner_phone ?? ""} ${v.plate ?? ""} ${v.vin ?? ""} ${v.year ?? ""} ${v.make} ${v.model}`
        .toLowerCase().includes(s),
    );
  }, [garage, q]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] max-w-xl flex-col gap-0 overflow-hidden border-slate-700 bg-[#0b1220] p-0 text-slate-100">
        <DialogTitle className="sr-only">Existing Customer</DialogTitle>
        <div className="flex items-center justify-between bg-gradient-to-b from-[#3aa76d] to-[#329662] px-5 py-3">
          <span className="flex items-center gap-2 font-serif text-lg italic text-white"><User className="h-5 w-5" /> Existing Customer</span>
          <button onClick={() => onOpenChange(false)} className="rounded bg-black/20 p-1 text-white hover:bg-black/30"><X className="h-4 w-4" /></button>
        </div>

        <div className="border-b border-slate-700 p-3">
          <div className="flex items-center rounded-md border border-slate-600 bg-slate-800/60">
            <Search className="ml-3 h-4 w-4 text-slate-400" />
            <Input autoFocus className="flex-1 border-0 bg-transparent text-slate-100 placeholder:text-slate-500 focus-visible:ring-0"
              placeholder="Search by name, phone, plate, VIN, or vehicle…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-slate-400">
              {garage.length === 0 ? "No customers in the garage yet — use New Customer to add one." : "No matches."}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((v) => {
                const stats = statsByLabel.get(labelOf(v));
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { onPick(v); onOpenChange(false); }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-left transition hover:border-emerald-500 hover:bg-slate-800"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-100">{v.owner_name}</span>
                      <span className="flex items-center gap-1.5 truncate text-xs text-slate-400">
                        <Car className="h-3 w-3" /> {labelOf(v)}{v.plate ? ` · ${v.plate}` : ""}
                      </span>
                      {stats ? (
                        <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-emerald-400/90">
                          <History className="h-2.5 w-2.5" />
                          {stats.count} visit{stats.count === 1 ? "" : "s"}
                          {stats.lastDate ? ` · last ${new Date(stats.lastDate).toLocaleDateString()}` : ""}
                          {stats.paid > 0 ? ` · ${money(stats.paid)} lifetime` : ""}
                        </span>
                      ) : (
                        <span className="mt-0.5 block text-[10px] text-slate-500">No prior visits</span>
                      )}
                    </span>
                    {v.owner_phone && (
                      <span className="flex shrink-0 items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" /> {v.owner_phone}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 px-4 py-2 text-center text-[11px] text-slate-500">
          {filtered.length} of {garage.length} {garage.length === 1 ? "vehicle" : "vehicles"}
        </div>
      </DialogContent>
    </Dialog>
  );
}
