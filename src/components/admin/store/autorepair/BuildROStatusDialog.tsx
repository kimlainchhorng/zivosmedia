/**
 * Build R.O. — Status & Technician popup (VSM-styled, picture 3).
 *
 * Opened from the "Tech:" button in the status strip. Sets the shop-floor status
 * (reusing the parent's setWorkStatus), assigns the main technician, shows total
 * sold hours + estimated completion time, and prints a tech-assignment sheet.
 *
 * NOTE: "Tech Mode" and "Technician Actions" are present to match VSM but are
 * lightweight stubs for now (no clock-in backend wired) — flagged for follow-up.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { X, Printer, ChevronDown } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roNumber?: string;
  status: string;
  onSetStatus: (value: string) => void;
  technician: string;
  onSetTechnician: (name: string) => void;
  soldHours: number;
  technicians?: string[];
}

const PRIMARY = [
  { value: "awaiting", label: "Awaiting Start", bg: "#2563eb" },
  { value: "in_progress", label: "In Progress", bg: "#f87171" },
  { value: "on_hold", label: "On Hold", bg: "#64748b" },
] as const;

export default function BuildROStatusDialog({
  open, onOpenChange, roNumber, status, onSetStatus, technician, onSetTechnician, soldHours, technicians = [],
}: Props) {
  const [techMode, setTechMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const eta = useMemo(() => {
    if (!soldHours) return "—";
    const d = new Date(Date.now() + soldHours * 3600 * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [soldHours]);

  const pick = (value: string) => { onSetStatus(value); setMoreOpen(false); };

  const print = () => {
    const html = `<html><head><title>Tech Assignment ${roNumber || ""}</title>
      <style>body{font-family:system-ui,sans-serif;padding:28px;color:#111}h1{font-size:18px}
      .row{margin:8px 0}.k{color:#666;display:inline-block;width:200px}</style></head><body>
      <h1>Technician Assignment${roNumber ? ` — RO ${roNumber}` : ""}</h1>
      <div class="row"><span class="k">Main Technician:</span><b>${technician || "Unassigned"}</b></div>
      <div class="row"><span class="k">Status:</span>${status}</div>
      <div class="row"><span class="k">Total Sold Hours:</span>${soldHours.toFixed(1)}</div>
      <div class="row"><span class="k">Estimated Completion Time:</span>${eta}</div>
      </body></html>`;
    const w = window.open("", "_blank");
    if (!w) { toast.error("Pop-up blocked"); return; }
    w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-slate-700 bg-[#0b1220] p-0 text-slate-100">
        <DialogTitle className="sr-only">Repair Order Status &amp; Technician</DialogTitle>
        <div className="flex items-center justify-between bg-slate-800/80 px-5 py-2.5">
          <span className="text-sm font-bold">Repair Order Status &amp; Technician</span>
          <button onClick={() => onOpenChange(false)} className="rounded border border-red-500/60 px-2.5 py-0.5 text-red-400 hover:bg-red-500/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* Primary status buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {PRIMARY.map((s) => (
              <button key={s.value} type="button" onClick={() => pick(s.value)}
                className={`min-w-[150px] rounded-md px-6 py-3 text-sm font-semibold text-white transition ${status === s.value ? "ring-2 ring-white/70" : "opacity-90 hover:opacity-100"}`}
                style={{ backgroundColor: s.bg }}>
                {s.label}
              </button>
            ))}
          </div>

          {/* More options + Ready for checkout */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="relative">
              <button type="button" onClick={() => setMoreOpen((v) => !v)}
                className="flex min-w-[150px] items-center justify-center gap-2 rounded-md bg-pink-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-pink-600">
                More Options <ChevronDown className="h-4 w-4" />
              </button>
              {moreOpen && (
                <div className="absolute left-0 z-20 mt-1 w-full overflow-hidden rounded-md border border-slate-600 bg-slate-800 shadow-lg">
                  {[{ v: "picked_up", l: "Picked Up" }, { v: "ready", l: "Ready" }].map((o) => (
                    <button key={o.v} type="button" onClick={() => pick(o.v)} className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-700">{o.l}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => pick("ready")}
              className={`min-w-[200px] rounded-md bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 ${status === "ready" ? "ring-2 ring-white/70" : ""}`}>
              Ready for Checkout
            </button>
          </div>

          {/* Technician assignment */}
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 px-4 py-3">
            <span className="font-serif text-sm font-semibold italic text-slate-200">Assign Main Technician</span>
            <Input list="ar-status-techs" className="h-9 w-52 border-slate-600 bg-slate-800/60 text-sm text-slate-100" placeholder="Select Technician"
              value={technician} onChange={(e) => onSetTechnician(e.target.value)} />
            <datalist id="ar-status-techs">{technicians.map((t) => <option key={t} value={t} />)}</datalist>
            <label className="flex items-center gap-1.5 text-xs text-slate-300">
              <input type="checkbox" className="h-4 w-4 accent-sky-500" checked={techMode} onChange={(e) => setTechMode(e.target.checked)} />
              Tech Mode
            </label>
            <Select onValueChange={(v) => toast.info(`Technician action: ${v} (coming soon)`)}>
              <SelectTrigger className="ml-auto h-9 w-44 border-0 bg-rose-500 text-sm font-semibold text-white"><SelectValue placeholder="Technician Actions" /></SelectTrigger>
              <SelectContent>
                {["Clock In", "Clock Out", "Reassign", "Split Labor"].map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Footer info */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-sm">
            <span className="font-semibold text-amber-500">Total Sold Hours : <span className="tabular-nums">{soldHours.toFixed(1)}</span></span>
            <span className="text-slate-500">————</span>
            <span className="font-semibold text-amber-500">Estimated Completion Time : <span className="tabular-nums">{eta}</span></span>
            <button type="button" onClick={print} className="flex items-center gap-1.5 text-sky-400 hover:underline">
              <Printer className="h-3.5 w-3.5" /> Print Tech Assignment
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
