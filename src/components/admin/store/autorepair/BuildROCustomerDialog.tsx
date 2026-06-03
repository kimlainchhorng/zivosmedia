/**
 * Build R.O. — "Create New Customer" dialog (VSM-styled).
 * Collects the customer record (name, address, contacts, rating, memo).
 * There's no separate customers table — this draft is carried on the R.O. and
 * written onto the ar_customer_vehicles row when the vehicle is saved.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { UserPlus, Search, Star, X } from "lucide-react";

export type CustomerDraft = {
  name: string; street: string; city: string; state: string; zip: string;
  cell: string; work: string; email: string; rating: number; memo: string;
};

export const blankCustomer: CustomerDraft = {
  name: "", street: "", city: "", state: "", zip: "",
  cell: "", work: "", email: "", rating: 0, memo: "",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<CustomerDraft>;
  /** addVehicle=true when the user chose "Save & Add Vehicle". */
  onSave: (c: CustomerDraft, addVehicle: boolean) => void;
}

const row = "flex items-center gap-3";
const label = "w-20 shrink-0 text-right text-sm font-semibold text-slate-300";
const field = "flex-1 bg-slate-800/60 border-slate-600 text-slate-100 placeholder:text-slate-500 h-9";

export default function BuildROCustomerDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [f, setF] = useState<CustomerDraft>(blankCustomer);
  const [showMemo, setShowMemo] = useState(false);

  useEffect(() => {
    if (open) { setF({ ...blankCustomer, ...initial }); setShowMemo(Boolean(initial?.memo)); }
  }, [open, initial]);

  const set = (p: Partial<CustomerDraft>) => setF((s) => ({ ...s, ...p }));

  const submit = (addVehicle: boolean) => {
    if (!f.name.trim()) { toast.error("Customer name is required"); return; }
    onSave({ ...f, name: f.name.trim() }, addVehicle);
  };

  // Print a #10 envelope with the customer's mailing address in the standard spot.
  const printEnvelope = () => {
    if (!f.name.trim()) { toast.error("Enter the customer name first"); return; }
    const lines = [f.name.trim(), f.street.trim(), [f.city.trim(), f.state.trim(), f.zip.trim()].filter(Boolean).join(", ")].filter(Boolean);
    const html = `<html><head><title>Envelope — ${f.name.trim()}</title>
      <style>@page{size:9.5in 4.125in;margin:0}body{margin:0;font-family:system-ui,Arial,sans-serif}
      .env{width:9.5in;height:4.125in;position:relative}
      .to{position:absolute;left:4.3in;top:1.9in;font-size:13pt;line-height:1.5}</style></head>
      <body><div class="env"><div class="to">${lines.join("<br/>")}</div></div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked"); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden border-slate-700 bg-[#0b1220] p-0 text-slate-100">
        <DialogTitle className="sr-only">Create New Customer</DialogTitle>
        {/* Title bar */}
        <div className="flex items-center gap-3 bg-slate-800/80 px-5 py-3">
          <span className="font-serif text-lg italic tracking-wide text-slate-300">VIP</span>
          <span className="text-base font-bold">Customer Information:</span>
        </div>
        <div className="bg-gradient-to-b from-[#1e90ff] to-[#1577e0] py-2 text-center">
          <span className="font-serif text-lg italic text-white">Create New Customer</span>
        </div>

        <div className="space-y-5 px-6 py-6">
          {/* Scan driver license */}
          <div className="mx-auto flex max-w-md items-center rounded-md border border-slate-300 bg-white">
            <Search className="ml-3 h-4 w-4 text-slate-400" />
            <Input className="flex-1 border-0 bg-transparent text-slate-800 focus-visible:ring-0" placeholder="Scan Driver License" disabled />
            <button className="m-1 rounded bg-slate-100 px-3 py-1.5 text-slate-600"><Search className="h-4 w-4" /></button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {/* Left — address */}
            <div className="space-y-2.5">
              <div className={row}><span className={label}>Name:</span><Input className={field} value={f.name} onChange={(e) => set({ name: e.target.value })} /></div>
              <div className={row}><span className={label}>Street:</span><Input className={field} value={f.street} onChange={(e) => set({ street: e.target.value })} /></div>
              <div className={row}><span className={label}>City:</span><Input className={field} value={f.city} onChange={(e) => set({ city: e.target.value })} /></div>
              <div className={row}><span className={label}>State:</span><Input className={field} value={f.state} onChange={(e) => set({ state: e.target.value })} /></div>
              <div className={row}><span className={label}>Zip Code:</span><Input className={field} value={f.zip} onChange={(e) => set({ zip: e.target.value })} /></div>
            </div>
            {/* Right — contacts */}
            <div className="space-y-2.5">
              <div className={row}><span className="w-16 shrink-0 rounded bg-slate-700 px-2 py-1.5 text-sm font-semibold text-amber-300">Cell</span><Input className={field} placeholder="(___) ___-____" value={f.cell} onChange={(e) => set({ cell: e.target.value })} /></div>
              <div className={row}><span className="w-16 shrink-0 rounded bg-slate-700 px-2 py-1.5 text-sm font-semibold text-amber-300">Work</span><Input className={field} placeholder="(___) ___-____" value={f.work} onChange={(e) => set({ work: e.target.value })} /></div>
              <div className={row}><span className="w-16 shrink-0 rounded bg-slate-700 px-2 py-1.5 text-sm font-semibold text-amber-300">Email</span><Input className={field} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></div>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button className="text-xs text-sky-400 underline" onClick={() => setShowMemo((v) => !v)}>Add Memo</button>
              </div>
              {showMemo && (
                <textarea className="w-full rounded border border-slate-600 bg-slate-800/60 p-2 text-sm text-slate-100" rows={2}
                  placeholder="Memo" value={f.memo} onChange={(e) => set({ memo: e.target.value })} />
              )}
            </div>
          </div>

          <p className="text-center text-[11px] font-semibold uppercase tracking-wide text-red-400">
            Note: Each customer has a unique ID. Do not replace with a different customer.
          </p>

          {/* Rating */}
          <div className="flex justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => set({ rating: n === f.rating ? 0 : n })}>
                <Star className={`h-8 w-8 ${n <= f.rating ? "fill-amber-400 text-amber-400" : "text-amber-500/60"}`} />
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center gap-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
            <button onClick={() => submit(false)} className="rounded bg-[#1e90ff] px-8 py-2.5 font-semibold text-white hover:bg-[#1577e0]">Save</button>
            <button onClick={() => submit(true)} className="rounded border border-slate-600 bg-slate-800 px-6 py-2.5 font-serif italic text-slate-200 hover:bg-slate-700">Save &amp; Add Vehicle →</button>
            <button onClick={() => onOpenChange(false)} className="flex items-center gap-1.5 rounded border border-red-500/60 bg-slate-800 px-6 py-2.5 font-semibold text-red-400 hover:bg-slate-700"><X className="h-4 w-4" /> Cancel</button>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={printEnvelope} className="text-xs text-sky-400 underline hover:text-sky-300">Print Envelopes</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
