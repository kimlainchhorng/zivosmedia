/**
 * Build R.O. — Status & Technician popup (light, modern).
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";
import { toast } from "sonner";
import { X, Printer, ChevronDown, Clock, Wrench, PauseCircle, CheckCircle2, PackageCheck, User, Activity, Timer } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roNumber?: string;
  status: string;
  onSetStatus: (value: string) => void;
  technician: string;
  onSetTechnician: (name: string) => void;
  onCommitTechnician?: (name: string) => void;
  soldHours: number;
  technicians?: string[];
}

type Accent = "sky" | "amber" | "orange" | "emerald";

const STATUSES: { value: string; label: string; icon: typeof Clock; accent: Accent }[] = [
  { value: "awaiting", label: "Awaiting Start", icon: Clock, accent: "sky" },
  { value: "in_progress", label: "In Progress", icon: Wrench, accent: "amber" },
  { value: "on_hold", label: "On Hold", icon: PauseCircle, accent: "orange" },
  { value: "ready", label: "Ready for Checkout", icon: CheckCircle2, accent: "emerald" },
];

const MORE: { value: string; label: string; icon: typeof Clock }[] = [
  { value: "picked_up", label: "Picked Up", icon: PackageCheck },
];

// Static class strings (kept literal so Tailwind keeps them in the build).
const ACCENT: Record<Accent, { card: string; badge: string; text: string; sub: string; check: string }> = {
  sky: { card: "border-sky-300 bg-sky-50", badge: "bg-sky-500 text-white", text: "text-sky-900", sub: "text-sky-600", check: "text-sky-500" },
  amber: { card: "border-amber-300 bg-amber-50", badge: "bg-amber-500 text-white", text: "text-amber-900", sub: "text-amber-600", check: "text-amber-500" },
  orange: { card: "border-orange-300 bg-orange-50", badge: "bg-orange-500 text-white", text: "text-orange-900", sub: "text-orange-600", check: "text-orange-500" },
  emerald: { card: "border-emerald-300 bg-emerald-50", badge: "bg-emerald-500 text-white", text: "text-emerald-900", sub: "text-emerald-600", check: "text-emerald-500" },
};

export default function BuildROStatusDialog({
  open, onOpenChange, roNumber, status, onSetStatus, technician, onSetTechnician, onCommitTechnician, soldHours, technicians = [],
}: Props) {
  const [techMode, setTechMode] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const isAutoRepairSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
  const statusHelpText = isAutoRepairSoftwareDomain
    ? "Set service-floor status & assign your technician"
    : "Set shop-floor status & assign your technician";
  const statusLabel = isAutoRepairSoftwareDomain ? "Service-Floor Status" : "Shop-Floor Status";

  const eta = useMemo(() => {
    if (!soldHours) return "—";
    const d = new Date(Date.now() + soldHours * 3600 * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [soldHours]);

  const pick = (value: string) => { onSetStatus(value); setMoreOpen(false); };

  const moreLabel = MORE.find((m) => m.value === status)?.label;

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
      <DialogContent className="flex max-h-[92vh] max-w-xl flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900">
        <DialogTitle className="sr-only">Repair Order Status &amp; Technician</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 bg-gradient-to-br from-[#1e90ff] to-[#1577e0] px-5 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight text-white">Repair Order Status</h2>
            <p className="text-xs text-white/80">{roNumber ? `RO ${roNumber} · ` : ""}{statusHelpText}</p>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-lg bg-black/15 p-1.5 text-white transition hover:bg-black/25" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-white px-6 py-5">
          {/* Status selector */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{statusLabel}</p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {STATUSES.map((s) => {
                const active = status === s.value;
                const a = ACCENT[s.accent];
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => pick(s.value)}
                    className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition ${active ? `${a.card} shadow-sm` : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? a.badge : "bg-slate-100"}`}>
                      <s.icon className={`h-5 w-5 ${active ? "" : "text-slate-400"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold leading-tight ${active ? a.text : "text-slate-700"}`}>{s.label}</p>
                      <p className={`mt-0.5 text-[11px] ${active ? a.sub : "text-slate-400"}`}>{active ? "Current status" : "Tap to set"}</p>
                    </div>
                    {active && <CheckCircle2 className={`h-4 w-4 shrink-0 ${a.check}`} />}
                  </button>
                );
              })}
            </div>

            {/* More statuses */}
            <div className="relative mt-2.5 flex justify-center">
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={`flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-xs font-medium transition ${moreLabel ? "border-slate-300 bg-slate-100 text-slate-700" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}
              >
                {moreLabel ? `Status: ${moreLabel}` : "More statuses"}
                <ChevronDown className={`h-3.5 w-3.5 transition ${moreOpen ? "rotate-180" : ""}`} />
              </button>
              {moreOpen && (
                <div className="absolute top-full z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                  {MORE.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => pick(o.value)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50 ${status === o.value ? "font-semibold text-slate-900" : "text-slate-600"}`}
                    >
                      <o.icon className="h-4 w-4 text-slate-400" /> {o.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technician assignment */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Main Technician</label>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-600">
                <input type="checkbox" className="h-4 w-4 accent-[#1e90ff]" checked={techMode} onChange={(e) => setTechMode(e.target.checked)} />
                Tech Mode
              </label>
            </div>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  list="ar-status-techs"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-[#1e90ff] focus:outline-none focus:ring-2 focus:ring-[#1e90ff]/20"
                  placeholder="Select or type technician name"
                  value={technician}
                  onChange={(e) => onSetTechnician(e.target.value)}
                  onBlur={(e) => onCommitTechnician?.(e.target.value)}
                />
                <datalist id="ar-status-techs">{technicians.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <Select onValueChange={(v) => toast.info(`Technician action: ${v} (coming soon)`)}>
                <SelectTrigger className="h-10 w-full border-slate-300 bg-white text-sm font-medium text-slate-600 sm:w-48">
                  <SelectValue placeholder="Technician Actions" />
                </SelectTrigger>
                <SelectContent>
                  {["Clock In", "Clock Out", "Reassign", "Split Labor"].map((a) => <SelectItem key={a} value={a} className="text-sm">{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Footer: sold hours / ETA / print */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-3.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Sold Hours</p>
                <p className="text-base font-bold leading-tight tabular-nums text-slate-800">{soldHours.toFixed(1)}</p>
              </div>
            </div>
            <div className="h-9 w-px bg-slate-200" />
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Est. Completion</p>
                <p className="text-base font-bold leading-tight tabular-nums text-slate-800">{eta}</p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={print}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            <Printer className="h-4 w-4" /> Print Assignment
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
