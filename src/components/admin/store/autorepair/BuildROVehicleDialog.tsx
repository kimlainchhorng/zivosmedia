/**
 * Build R.O. — "Edit / Add New Vehicle" dialog (light, modern).
 * VIN decode auto-fills year/make/model. On save, writes an ar_customer_vehicles
 * row (owner info comes from the customer captured on the R.O.) and returns it
 * so the caller can bind it to the estimate.
 */
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Car, Search, Camera, X, Loader2, History } from "lucide-react";
import BuildROCarfaxDialog from "./BuildROCarfaxDialog";

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

const blank = { year: "", make: "", model: "", engine: "", transmission: "", vin: "", plate: "", plateState: "LA", mileage: "", oil_capacity: "", oil_viscosity: "", oil_filter: "" };

const inp =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1e90ff] focus:outline-none focus:ring-2 focus:ring-[#1e90ff]/20";
const lbl = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";

export default function BuildROVehicleDialog({ open, onOpenChange, storeId, owner, ownerMemo, onSaved }: Props) {
  const [f, setF] = useState(blank);
  const [decoding, setDecoding] = useState(false);
  const [reportCarfax, setReportCarfax] = useState(true);
  const [carfaxOpen, setCarfaxOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const resetVehicleDialogState = () => {
    setF(blank);
    setDecoding(false);
    setReportCarfax(true);
    setCarfaxOpen(false);
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  useEffect(() => {
    if (open) resetVehicleDialogState();
  }, [open]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetVehicleDialogState();
    onOpenChange(v);
  };

  const set = (p: Partial<typeof blank>) => setF((s) => ({ ...s, ...p }));

  const decodeVin = async () => {
    const v = f.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (v.length !== 17) { toast.error("VIN must be exactly 17 characters"); return; }
    setDecoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", { body: { vin: v } });
      if (error || !data?.ok) throw new Error(data?.error || "VIN decode failed");
      setF((s) => ({ ...s, vin: v, make: data.make || s.make, model: data.model || s.model, year: data.year ? String(data.year) : s.year, engine: data.engine || s.engine, transmission: data.transmission || s.transmission }));
      toast.success("VIN decoded — details filled in");
    } catch (e: any) {
      toast.error(`VIN decode failed: ${e.message}`);
    } finally {
      setDecoding(false);
    }
  };

  const uploadVehiclePhoto = async (vehicleId: string, file: File) => {
    const rawExt = file.name.split(".").pop() ?? "jpg";
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${storeId}/vehicles/${vehicleId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("ar-job-photos")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (storageError) throw storageError;

    const { data: { publicUrl } } = supabase.storage
      .from("ar-job-photos")
      .getPublicUrl(path);

    const { error: dbError } = await (supabase as any)
      .from("ar_job_photos")
      .insert({
        store_id: storeId,
        work_order_id: null,
        photo_url: publicUrl,
        photo_type: "vehicle",
        caption: "Vehicle photo captured from Build R.O.",
        uploaded_at: new Date().toISOString(),
      });
    if (dbError) throw dbError;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!f.make.trim() || !f.model.trim()) throw new Error("Make and model are required");
      const noteParts = [
        f.engine.trim() ? `Engine: ${f.engine.trim()}` : "",
        f.transmission.trim() ? `Trans: ${f.transmission.trim()}` : "",
        reportCarfax ? "Carfax reporting requested" : "",
        ownerMemo?.trim() || "",
      ].filter(Boolean);
      const payload = {
        store_id: storeId,
        owner_name: owner.name.trim() || "Unknown",
        owner_phone: owner.phone.trim() || null,
        owner_email: owner.email.trim() || null,
        year: f.year ? parseInt(f.year, 10) : null,
        make: f.make.trim(),
        model: f.model.trim(),
        vin: f.vin.trim() || null,
        plate: f.plate.trim() || null,
        mileage: f.mileage ? parseInt(f.mileage, 10) : 0,
        oil_capacity: f.oil_capacity.trim() || null,
        oil_viscosity: f.oil_viscosity.trim() || null,
        oil_filter: f.oil_filter.trim() || null,
        notes: noteParts.join(" · ") || null,
      };
      const { data, error } = await supabase.from("ar_customer_vehicles").insert(payload as any).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (v) => {
      if (photoFile) {
        try {
          await uploadVehiclePhoto(v.id, photoFile);
          toast.success("Vehicle and photo saved");
        } catch (e: any) {
          toast.error(e?.message ? `Vehicle saved, photo upload failed: ${e.message}` : "Vehicle saved, photo upload failed");
        }
      } else {
        toast.success("Vehicle saved");
      }
      onSaved(v);
      handleOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save vehicle"),
  });

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900">
          <DialogTitle className="sr-only">Add Vehicle</DialogTitle>

          {/* Header */}
          <div className="flex items-center gap-3 bg-gradient-to-br from-[#1e90ff] to-[#1577e0] px-5 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <Car className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold leading-tight text-white">Add Vehicle</h2>
              <p className="text-xs text-white/80">Decode a VIN or enter the details, then save to the customer</p>
            </div>
            <button onClick={() => handleOpenChange(false)} className="rounded-lg bg-black/15 p-1.5 text-white transition hover:bg-black/25" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto bg-white px-6 py-5">
            {/* VIN / Plate decode */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className={lbl}>VIN or License Plate</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 focus-within:border-[#1e90ff] focus-within:ring-2 focus-within:ring-[#1e90ff]/20">
                <Car className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  className="h-10 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  placeholder="Enter VIN (17 chars) or scan license plate"
                  value={f.vin}
                  onChange={(e) => set({ vin: e.target.value.toUpperCase() })}
                  onKeyDown={(e) => { if (e.key === "Enter") decodeVin(); }}
                />
                <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs font-semibold text-slate-600">{f.plateState}</span>
                <button
                  onClick={decodeVin}
                  disabled={decoding}
                  className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#1e90ff] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1577e0] disabled:opacity-60"
                >
                  {decoding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />} Decode
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">A valid 17-character VIN auto-fills year, make &amp; model.</p>
            </div>

            {/* Vehicle fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={lbl}>Year</label>
                <input className={inp} inputMode="numeric" placeholder="2020" value={f.year} onChange={(e) => set({ year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Make <span className="text-rose-500">*</span></label>
                <input className={inp} placeholder="Ford" value={f.make} onChange={(e) => set({ make: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Model <span className="text-rose-500">*</span></label>
                <input className={inp} placeholder="F-150" value={f.model} onChange={(e) => set({ model: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Engine</label>
                <input className={inp} placeholder="3.5L V6" value={f.engine} onChange={(e) => set({ engine: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Transmission</label>
                <input className={inp} placeholder="e.g. 6-speed Automatic" value={f.transmission} onChange={(e) => set({ transmission: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>VIN</label>
                <input className={`${inp} font-mono`} value={f.vin} onChange={(e) => set({ vin: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Plate</label>
                <input className={`${inp} font-mono uppercase`} value={f.plate} onChange={(e) => set({ plate: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <label className={lbl}>Mileage</label>
                <input className={inp} inputMode="numeric" placeholder="e.g. 84,000" value={f.mileage} onChange={(e) => set({ mileage: e.target.value.replace(/\D/g, "") })} />
              </div>
            </div>

            {/* Carfax + report */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <button
                type="button"
                onClick={() => setCarfaxOpen(true)}
                className="flex items-center gap-2 text-sm font-medium text-[#1e90ff] transition hover:text-[#1577e0]"
              >
                <History className="h-4 w-4" /> View Carfax History
              </button>
              <div className="flex items-center gap-3">
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-400 transition hover:text-slate-600"
                  title={photoFile ? photoFile.name : "Add photo"}
                  aria-label={photoFile ? `Selected vehicle photo: ${photoFile.name}` : "Add vehicle photo"}
                >
                  <Camera className="h-4 w-4" />
                </button>
                <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                  <input type="checkbox" className="h-4 w-4 accent-[#1e90ff]" checked={reportCarfax} onChange={(e) => setReportCarfax(e.target.checked)} />
                  Report to Carfax
                </label>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center gap-2.5 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#1e90ff] px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1577e0] disabled:opacity-60"
            >
              {save.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save Vehicle"}
            </button>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-medium text-slate-500">Step 3 of 3</span>
            <button
              onClick={() => handleOpenChange(false)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </DialogContent>
      </Dialog>
      <BuildROCarfaxDialog
        open={carfaxOpen}
        onOpenChange={setCarfaxOpen}
        storeId={storeId}
        vehicle={{ vin: f.vin, year: f.year, make: f.make, model: f.model }}
      />
    </>
  );
}
