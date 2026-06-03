/**
 * Build R.O. — "Edit / Add New Vehicle" dialog (VSM-styled).
 * VIN decode auto-fills year/make/model. On save, writes an ar_customer_vehicles
 * row (owner info comes from the customer captured on the R.O.) and returns it
 * so the caller can bind it to the estimate.
 */
import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Car, Search, Camera, X, Loader2 } from "lucide-react";

export type VehicleOwner = { name: string; phone: string; email: string };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  owner: VehicleOwner;
  /** Extra notes to fold into the saved vehicle row (e.g. customer address/memo). */
  ownerMemo?: string;
  onSaved: (vehicle: any) => void;
}

const blank = { year: "", make: "", model: "", engine: "", vin: "", plate: "", plateState: "LA", color: "", mileage: "" };

const label = "w-24 shrink-0 text-right text-base font-semibold text-slate-300";
const field = "flex-1 bg-slate-800/60 border-slate-600 text-slate-100 placeholder:text-slate-500 h-10";

export default function BuildROVehicleDialog({ open, onOpenChange, storeId, owner, ownerMemo, onSaved }: Props) {
  const [f, setF] = useState(blank);
  const [decoding, setDecoding] = useState(false);
  const [reportCarfax, setReportCarfax] = useState(true);

  useEffect(() => { if (open) { setF(blank); setReportCarfax(true); } }, [open]);
  const set = (p: Partial<typeof blank>) => setF((s) => ({ ...s, ...p }));

  const decodeVin = async () => {
    const v = f.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (v.length !== 17) { toast.error("VIN must be exactly 17 characters"); return; }
    setDecoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", { body: { vin: v } });
      if (error || !data?.ok) throw new Error(data?.error || "VIN decode failed");
      setF((s) => ({ ...s, vin: v, make: data.make || s.make, model: data.model || s.model, year: data.year ? String(data.year) : s.year }));
      toast.success("VIN decoded — year, make & model filled in");
    } catch (e: any) {
      toast.error(`VIN decode failed: ${e.message}`);
    } finally {
      setDecoding(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!owner.name.trim()) throw new Error("Add the customer first");
      if (!f.make.trim() || !f.model.trim()) throw new Error("Make and model are required");
      const noteParts = [f.engine.trim() ? `Engine: ${f.engine.trim()}` : "", ownerMemo?.trim() || ""].filter(Boolean);
      const payload = {
        store_id: storeId,
        owner_name: owner.name.trim(),
        owner_phone: owner.phone.trim() || null,
        owner_email: owner.email.trim() || null,
        year: f.year ? parseInt(f.year, 10) : null,
        make: f.make.trim(),
        model: f.model.trim(),
        vin: f.vin.trim() || null,
        plate: f.plate.trim() || null,
        color: f.color.trim().toLowerCase() || null,
        mileage: f.mileage ? parseInt(f.mileage, 10) : 0,
        notes: noteParts.join(" · ") || null,
      };
      const { data, error } = await supabase.from("ar_customer_vehicles").insert(payload).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (v) => { toast.success("Vehicle saved"); onSaved(v); onOpenChange(false); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save vehicle"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden border-slate-700 bg-[#0b1220] p-0 text-slate-100">
        <div className="flex items-center gap-3 bg-slate-800/80 px-5 py-3">
          <span className="font-serif text-lg italic tracking-wide text-slate-300">VIP</span>
          <span className="text-base font-bold">Vehicle Information:</span>
        </div>
        <div className="bg-gradient-to-b from-[#1e90ff] to-[#1577e0] py-2 text-center">
          <span className="font-serif text-lg italic text-white">Edit / Add New Vehicle</span>
        </div>

        <div className="space-y-5 px-6 py-6">
          {/* Plate / VIN lookup */}
          <div className="mx-auto flex max-w-xl items-center rounded-md border border-slate-300 bg-white">
            <Car className="ml-3 h-4 w-4 text-slate-400" />
            <Input className="flex-1 border-0 bg-transparent text-slate-800 focus-visible:ring-0" placeholder="Enter License Plate OR Scan VIN Number"
              value={f.vin} onChange={(e) => set({ vin: e.target.value.toUpperCase() })} />
            <span className="px-2 text-sm font-semibold text-slate-500">{f.plateState}</span>
            <button className="m-1 rounded bg-slate-100 px-3 py-1.5 text-slate-600" onClick={decodeVin} disabled={decoding}>
              {decoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.3fr_1fr_auto]">
            {/* Left column */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3"><span className={label}>YEAR:</span><Input className={field} inputMode="numeric" placeholder="Select Year" value={f.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} /></div>
              <div className="flex items-center gap-3"><span className={label}>MAKE:</span><Input className={field} value={f.make} onChange={(e) => set({ make: e.target.value })} /></div>
              <div className="flex items-center gap-3"><span className={label}>MODEL:</span><Input className={field} value={f.model} onChange={(e) => set({ model: e.target.value })} /></div>
              <div className="flex items-center gap-3"><span className={label}>ENGINE:</span><Input className={field} value={f.engine} onChange={(e) => set({ engine: e.target.value })} /></div>
            </div>
            {/* Middle column */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-3"><span className="w-14 shrink-0 text-right text-base font-semibold text-slate-300">VIN:</span><Input className={field} value={f.vin} onChange={(e) => set({ vin: e.target.value.toUpperCase() })} /></div>
              <div className="flex items-center gap-3"><span className="w-14 shrink-0 text-right text-base font-semibold text-slate-300">Plate:</span><Input className={field} value={f.plate} onChange={(e) => set({ plate: e.target.value.toUpperCase() })} /></div>
              <div className="flex items-center gap-3"><span className="w-14 shrink-0 text-right text-sm font-semibold text-slate-300">Color:</span><Input className={field} placeholder="e.g. white" value={f.color} onChange={(e) => set({ color: e.target.value })} /></div>
              <div className="flex items-center gap-3"><span className="w-14 shrink-0 text-right text-sm font-semibold text-slate-300">Miles:</span><Input className={field} inputMode="numeric" value={f.mileage} onChange={(e) => set({ mileage: e.target.value.replace(/\D/g, "") })} /></div>
            </div>
            {/* Right column — carfax / photo */}
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-slate-700 p-3">
              <span className="text-xs text-red-400 underline">View Carfax History</span>
              <div className="flex h-16 w-20 items-center justify-center rounded bg-slate-200 text-slate-500"><Camera className="h-7 w-7" /></div>
              <label className="flex items-center gap-1.5 text-xs text-slate-300">
                <input type="checkbox" className="h-3.5 w-3.5 accent-sky-500" checked={reportCarfax} onChange={(e) => setReportCarfax(e.target.checked)} />
                Report To Carfax
              </label>
            </div>
          </div>

          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-red-400">
            Note: Each vehicle has a unique ID. Do not replace with a different vehicle.
          </p>

          <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
            <button onClick={() => save.mutate()} disabled={save.isPending} className="rounded bg-[#1e90ff] px-10 py-2.5 font-semibold text-white hover:bg-[#1577e0] disabled:opacity-60">
              {save.isPending ? "Saving…" : "Save"}
            </button>
            <span className="rounded border border-slate-600 bg-slate-800 px-6 py-2.5 font-serif italic text-slate-300">Step 3</span>
            <button onClick={() => onOpenChange(false)} className="flex items-center gap-1.5 rounded border border-red-500/60 bg-slate-800 px-6 py-2.5 font-semibold text-red-400 hover:bg-slate-700"><X className="h-4 w-4" /> Cancel</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
