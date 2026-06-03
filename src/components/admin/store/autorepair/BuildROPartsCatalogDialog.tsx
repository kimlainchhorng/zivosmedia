/**
 * Build R.O. — "Parts Catalog" supplier picker (VSM-styled).
 * Grid of parts-supplier brand logos; clicking one opens the embedded
 * SupplierBrowserModal (portal proxy / credential launcher). A row of
 * repair-info reference links sits underneath.
 */
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PARTS_SUPPLIERS, type PartsSupplier } from "@/config/partsSuppliers";
import PartsSupplierLogo from "./PartsSupplierLogo";
import SupplierBrowserModal from "./SupplierBrowserModal";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
}

const REFERENCE_LINKS: { label: string; url: string }[] = [
  { label: "ALLDATA", url: "https://www.alldata.com" },
  { label: "ProDemand", url: "https://www.prodemand.com" },
  { label: "Identifix", url: "https://www.identifix.com" },
  { label: "Motor", url: "https://www.motor.com" },
  { label: "Gmail", url: "https://mail.google.com" },
];

export default function BuildROPartsCatalogDialog({ open, onOpenChange, storeId }: Props) {
  const [supplier, setSupplier] = useState<PartsSupplier | null>(null);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl gap-0 overflow-hidden border-slate-700 bg-[#1b1f27] p-0 text-slate-100">
          <DialogTitle className="sr-only">Parts Catalog — Suppliers</DialogTitle>
          <div className="flex items-center justify-between bg-slate-800/80 px-5 py-2.5">
            <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">Parts Catalog — Suppliers</span>
            <button onClick={() => onOpenChange(false)} className="rounded bg-red-600 p-1 text-white hover:bg-red-700"><X className="h-4 w-4" /></button>
          </div>

          <div className="space-y-4 px-6 py-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {PARTS_SUPPLIERS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSupplier(s)}
                  className="flex items-center gap-2.5 rounded-lg border border-slate-600 bg-white px-3 py-2.5 text-left transition hover:border-sky-400 hover:shadow-md"
                >
                  <PartsSupplierLogo supplier={s} size="md" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">{s.shortName ?? s.name}</span>
                    {s.description && <span className="block truncate text-[10px] text-slate-500">{s.description}</span>}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-slate-700 pt-4 text-sm">
              {REFERENCE_LINKS.map((r, i) => (
                <span key={r.label} className="flex items-center gap-4">
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sky-400 underline hover:text-sky-300">{r.label}</a>
                  {i < REFERENCE_LINKS.length - 1 && <span className="text-slate-600">|</span>}
                </span>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SupplierBrowserModal
        storeId={storeId}
        supplier={supplier}
        open={!!supplier}
        onOpenChange={(o) => { if (!o) setSupplier(null); }}
      />
    </>
  );
}
