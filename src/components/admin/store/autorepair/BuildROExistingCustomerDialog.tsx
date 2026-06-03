/**
 * Build R.O. — "Existing Customer" picker (light, modern).
 * Searchable list of the shop's garage (ar_customer_vehicles). Picking a row
 * binds that customer + vehicle to the R.O. Receives the already-loaded garage
 * from AutoRepairBuildROSection to avoid a duplicate query, and pulls a light
 * service-history summary (visits / last visit / lifetime spend) per vehicle.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, User, Car, Phone, History, X, ChevronRight, Users } from "lucide-react";

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

// Deterministic avatar gradient from the owner name, so each customer reads as distinct.
const AVATAR_GRADIENTS = [
  "from-emerald-500 to-teal-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];
const initialsOf = (name: string) =>
  (name || "").trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
const gradientOf = (name: string) => {
  let h = 0;
  for (let i = 0; i < (name || "").length; i++) h = (h + name.charCodeAt(i)) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[h];
};

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
      <DialogContent className="flex max-h-[82vh] max-w-xl flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900">
        <DialogTitle className="sr-only">Existing Customer</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-[#3aa76d] to-[#2c8a59] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-white">Existing Customer</h2>
            <p className="text-xs text-white/85">Pick a customer &amp; vehicle to start the repair order</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg bg-black/15 p-1.5 text-white transition hover:bg-black/25"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              className="h-10 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Search by name, phone, plate, VIN, or vehicle…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button onClick={() => setQ("")} className="shrink-0 text-slate-400 hover:text-slate-600" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-white p-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                {garage.length === 0 ? "No customers yet" : "No matches"}
              </p>
              <p className="max-w-xs text-xs text-slate-500">
                {garage.length === 0
                  ? "Use New Customer to add your first customer and vehicle."
                  : "Try a different name, phone, plate, or VIN."}
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filtered.map((v) => {
                const stats = statsByLabel.get(labelOf(v));
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { onPick(v); onOpenChange(false); }}
                    className="group flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50/40 hover:shadow-sm"
                  >
                    {/* Avatar */}
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradientOf(v.owner_name)} text-sm font-bold text-white shadow-sm`}>
                      {initialsOf(v.owner_name)}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-semibold text-slate-900">{v.owner_name}</span>
                        {v.owner_phone && (
                          <span className="hidden shrink-0 items-center gap-1 text-[11px] text-slate-500 sm:flex">
                            <Phone className="h-3 w-3" /> {v.owner_phone}
                          </span>
                        )}
                      </div>
                      <span className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                        <Car className="h-3 w-3 shrink-0" /> {labelOf(v)}
                        {v.plate && <span className="rounded bg-slate-100 px-1.5 py-px font-mono text-[10px] uppercase text-slate-600">{v.plate}</span>}
                      </span>
                      {/* Stat pills */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {stats ? (
                          <>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                              <History className="h-2.5 w-2.5" /> {stats.count} visit{stats.count === 1 ? "" : "s"}
                            </span>
                            {stats.lastDate && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                                last {new Date(stats.lastDate).toLocaleDateString()}
                              </span>
                            )}
                            {stats.paid > 0 && (
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                {money(stats.paid)} lifetime
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">New customer · no prior visits</span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-emerald-500" />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
          <span>{filtered.length} of {garage.length} {garage.length === 1 ? "vehicle" : "vehicles"}</span>
          <span className="flex items-center gap-1 text-slate-400"><User className="h-3 w-3" /> Tap a row to load</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
