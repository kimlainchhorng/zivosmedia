/**
 * Build R.O. — "Create New Customer" dialog (light, modern).
 * Collects the customer record (first/last name, address, contacts, rating, memo).
 * There's no separate customers table — this draft is carried on the R.O. and
 * written onto the ar_customer_vehicles row when the vehicle is saved.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { UserPlus, ScanLine, X, Car, FileText, Star } from "lucide-react";

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

const inp =
  "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1e90ff] focus:outline-none focus:ring-2 focus:ring-[#1e90ff]/20";
const lbl = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";

export default function BuildROCustomerDialog({ open, onOpenChange, initial, onSave }: Props) {
  const [f, setF] = useState<CustomerDraft>(blankCustomer);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [showMemo, setShowMemo] = useState(false);

  useEffect(() => {
    if (open) {
      const init = { ...blankCustomer, ...initial };
      setF(init);
      const parts = (init.name || "").trim().split(/\s+/).filter(Boolean);
      if (parts.length > 1) { setFirst(parts.slice(0, -1).join(" ")); setLast(parts[parts.length - 1]); }
      else { setFirst(parts[0] || ""); setLast(""); }
      setShowMemo(Boolean(initial?.memo));
    }
  }, [open, initial]);

  const set = (p: Partial<CustomerDraft>) => setF((s) => ({ ...s, ...p }));
  const fullName = useMemo(() => [first.trim(), last.trim()].filter(Boolean).join(" "), [first, last]);

  const submit = (addVehicle: boolean) => {
    if (!fullName) { toast.error("First name is required"); return; }
    onSave({ ...f, name: fullName }, addVehicle);
  };

  // Print a #10 envelope with the customer's mailing address in the standard spot.
  const printEnvelope = () => {
    if (!fullName) { toast.error("Enter the customer name first"); return; }
    const lines = [fullName, f.street.trim(), [f.city.trim(), f.state.trim(), f.zip.trim()].filter(Boolean).join(", ")].filter(Boolean);
    const html = `<html><head><title>Envelope — ${fullName}</title>
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
      <DialogContent className="flex max-h-[88vh] max-w-2xl flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900">
        <DialogTitle className="sr-only">Create New Customer</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-[#1e90ff] to-[#1577e0] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <UserPlus className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-white">Create New Customer</h2>
            <p className="text-xs text-white/80">Capture contact details — you can add the vehicle next</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-lg bg-black/15 p-1.5 text-white transition hover:bg-black/25" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto bg-white px-6 py-5">
          {/* Scan driver license (optional, future) */}
          <div className="flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5">
            <ScanLine className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              className="flex-1 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
              placeholder="Scan Driver License to auto-fill (scanner not connected)"
              disabled
            />
            <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500">Optional</span>
          </div>

          {/* Name — first + last */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={lbl}>First name <span className="text-rose-500">*</span></label>
              <input autoFocus className={inp} placeholder="John" value={first}
                onChange={(e) => setFirst(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(false); }} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Last name</label>
              <input className={inp} placeholder="Smith" value={last}
                onChange={(e) => setLast(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(false); }} />
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className={lbl}>Cell phone</label>
              <input className={inp} type="tel" placeholder="(555) 123-4567" value={f.cell} onChange={(e) => set({ cell: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Work phone</label>
              <input className={inp} type="tel" placeholder="(555) 123-4567" value={f.work} onChange={(e) => set({ work: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <label className={lbl}>Email</label>
            <input className={inp} type="email" placeholder="name@example.com" value={f.email} onChange={(e) => set({ email: e.target.value })} />
          </div>

          {/* Customer rating */}
          <div className="space-y-1">
            <label className={lbl}>Customer rating</label>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => set({ rating: f.rating === rating ? 0 : rating })}
                  className="rounded-md p-1 text-slate-300 transition hover:bg-white hover:text-amber-400"
                  aria-label={`Set customer rating to ${rating}`}
                  aria-pressed={f.rating === rating}
                  title={`${rating} star${rating === 1 ? "" : "s"}`}
                >
                  <Star className={`h-5 w-5 ${rating <= f.rating ? "fill-amber-400 text-amber-400" : ""}`} />
                </button>
              ))}
              <span className="ml-2 text-xs font-medium text-slate-500">
                {f.rating ? `${f.rating}/5` : "No rating"}
              </span>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-1">
            <label className={lbl}>Street address</label>
            <input className={inp} autoComplete="street-address" placeholder="123 Main St" value={f.street} onChange={(e) => set({ street: e.target.value })} />
          </div>
          <div className="grid grid-cols-[2fr_1fr_1fr] gap-3">
            <div className="space-y-1">
              <label className={lbl}>City</label>
              <input className={inp} autoComplete="address-level2" value={f.city} onChange={(e) => set({ city: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>State</label>
              <input className={inp} autoComplete="address-level1" value={f.state} onChange={(e) => set({ state: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={lbl}>Zip</label>
              <input className={inp} autoComplete="postal-code" value={f.zip} onChange={(e) => set({ zip: e.target.value })} />
            </div>
          </div>

          {/* Memo */}
          <div>
            <button type="button" onClick={() => setShowMemo((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#1e90ff] hover:text-[#1577e0]">
              <FileText className="h-3.5 w-3.5" /> {showMemo ? "Hide memo" : "Add a memo"}
            </button>
            {showMemo && (
              <textarea
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1e90ff] focus:outline-none focus:ring-2 focus:ring-[#1e90ff]/20"
                rows={2} placeholder="Internal note about this customer…" value={f.memo} onChange={(e) => set({ memo: e.target.value })}
              />
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <button onClick={() => submit(false)}
              className="flex-1 rounded-lg bg-[#1e90ff] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1577e0]">
              Save
            </button>
            <button onClick={() => submit(true)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
              <Car className="h-4 w-4" /> Save &amp; Add Vehicle
            </button>
            <button onClick={() => onOpenChange(false)}
              className="flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={printEnvelope} className="text-[11px] text-slate-400 underline transition hover:text-slate-600">
              Print envelope
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
