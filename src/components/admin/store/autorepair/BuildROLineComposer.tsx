/**
 * Build R.O. line composer.
 *
 * Creates one repair-order line and hands it to the parent Build R.O. state.
 * The parent owns persistence, totals, ordering, and conversion workflows.
 */
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Wrench, CircleDot, Receipt, Truck, Search } from "lucide-react";
import { listConnectedVendors, AR_SUPPLIER_NAMES } from "./AutoRepairPartSuppliersSection";
import { isAutoRepairSoftwareHost } from "@/config/autoRepairDomain";
import { sellFromCostCents, type MatrixTier } from "@/lib/admin/partsMatrix";

export type ComposerKind = "part" | "labor" | "tire" | "fee" | "sublet" | "diagnosis";

export interface ComposedLineDraft {
  kind: ComposerKind;
  description: string;
  misc: string;
  part_number: string;
  vendor: string;
  cost_cents: number;
  unit_cents: number;
  qty: number;
  disc: number;
  disc_type: "%" | "$";
  taxable: boolean;
}

interface Props {
  job: number;
  laborRateCents: number;
  partsMatrix: MatrixTier[];
  storeId: string;
  onAdd: (draft: ComposedLineDraft) => void;
  onOpenCatalog: () => void;
}

const KIND_OPTIONS: { value: ComposerKind; label: string; icon: typeof Wrench; tone: string; active: string; hint: string }[] = [
  { value: "part", label: "Part", icon: Package, tone: "text-sky-700 bg-sky-50 border-sky-200", active: "bg-sky-600 text-white border-sky-600 shadow-sm", hint: "Cost, sell and order" },
  { value: "labor", label: "Labor", icon: Wrench, tone: "text-emerald-700 bg-emerald-50 border-emerald-200", active: "bg-emerald-600 text-white border-emerald-600 shadow-sm", hint: "Rate and hours" },
  { value: "tire", label: "Tire", icon: CircleDot, tone: "text-violet-700 bg-violet-50 border-violet-200", active: "bg-violet-600 text-white border-violet-600 shadow-sm", hint: "Tire line item" },
  { value: "fee", label: "Fee", icon: Receipt, tone: "text-amber-700 bg-amber-50 border-amber-200", active: "bg-amber-600 text-white border-amber-600 shadow-sm", hint: "Shop charge" },
  { value: "sublet", label: "Sublet", icon: Truck, tone: "text-rose-700 bg-rose-50 border-rose-200", active: "bg-rose-600 text-white border-rose-600 shadow-sm", hint: "Outside service" },
  { value: "diagnosis", label: "Diag", icon: Search, tone: "text-cyan-700 bg-cyan-50 border-cyan-200", active: "bg-cyan-600 text-white border-cyan-600 shadow-sm", hint: "Inspection labor" },
];

const dollarsToCents = (v: string | number) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inp =
  "h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-950 shadow-sm placeholder:text-slate-400 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100";

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export default function BuildROLineComposer({ laborRateCents, partsMatrix, storeId, onAdd }: Props) {
  const [kind, setKind] = useState<ComposerKind>("part");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [vendor, setVendor] = useState("");
  const [technician, setTechnician] = useState("");
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");
  const [sellTouched, setSellTouched] = useState(false);
  const [qty, setQty] = useState("1");
  const [disc, setDisc] = useState("");
  const [discType, setDiscType] = useState<"%" | "$">("%");
  const [taxable, setTaxable] = useState(true);

  const isLabor = kind === "labor" || kind === "diagnosis";
  const isPartLike = kind === "part" || kind === "tire";
  const isAutoRepairSoftwareDomain =
    typeof window !== "undefined" && isAutoRepairSoftwareHost(window.location.hostname);
  const selectedKindBase = KIND_OPTIONS.find((o) => o.value === kind) ?? KIND_OPTIONS[0];
  const selectedKind = selectedKindBase.value === "fee" && isAutoRepairSoftwareDomain
    ? { ...selectedKindBase, hint: "Business charge" }
    : selectedKindBase;
  const SelectedIcon = selectedKind.icon;

  const vendors = useMemo(() => {
    const connected = listConnectedVendors(storeId).map((v) => v.name);
    return Array.from(new Set([...connected, ...AR_SUPPLIER_NAMES]));
  }, [storeId]);

  const costCents = dollarsToCents(cost);
  const matrixSellCents = isPartLike && costCents > 0 ? sellFromCostCents(costCents, partsMatrix) : 0;
  const sellCents = isLabor
    ? (sell ? dollarsToCents(sell) : laborRateCents)
    : (sell ? dollarsToCents(sell) : matrixSellCents);
  const qtyNum = Number(qty) || 1;
  const discNum = Number(disc) || 0;
  const baseCents = qtyNum * sellCents;
  const discCents = discType === "%" ? Math.round((baseCents * discNum) / 100) : dollarsToCents(disc);
  const totalCents = Math.max(0, baseCents - discCents);

  const label =
    isLabor ? "Description of labor / service"
    : kind === "tire" ? "Description of tire"
    : kind === "fee" ? "Description of fee"
    : kind === "sublet" ? "Description of sublet"
    : "Description of parts";

  const reset = () => {
    setDescription("");
    setPartNumber("");
    setVendor("");
    setTechnician("");
    setCost("");
    setSell("");
    setSellTouched(false);
    setQty("1");
    setDisc("");
    setDiscType("%");
  };

  const add = () => {
    if (!description.trim()) return;
    onAdd({
      kind,
      description: description.trim(),
      misc: isLabor ? (technician.trim() ? `Tech: ${technician.trim()}` : "") : partNumber.trim(),
      part_number: isPartLike ? partNumber.trim() : "",
      vendor: isPartLike ? vendor.trim() : "",
      cost_cents: isPartLike ? costCents : 0,
      unit_cents: sellCents,
      qty: qtyNum,
      disc: discNum,
      disc_type: discType,
      taxable: isPartLike ? taxable : false,
    });
    reset();
  };

  return (
    <form
      className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      onSubmit={(e) => { e.preventDefault(); add(); }}
    >
      <div className="grid gap-2 p-3 xl:grid-cols-[104px_minmax(0,1fr)]">
        <div className={`flex h-10 items-center gap-2 self-start rounded-md border px-2 ${selectedKind.tone}`}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-white/80">
            <SelectedIcon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-bold">{selectedKind.label}</p>
            <p className="truncate text-[9px] font-medium leading-none opacity-80">{selectedKind.hint}</p>
          </div>
        </div>

        <div className="grid min-w-0 gap-2 md:grid-cols-12">
          <Field label="Type" className="md:col-span-2">
            <Select value={kind} onValueChange={(v: ComposerKind) => setKind(v)}>
              <SelectTrigger className="h-10 rounded-md border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    <span className="flex items-center gap-1.5"><o.icon className="h-3.5 w-3.5" /> {o.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Description" className={isPartLike || isLabor ? "md:col-span-4" : "md:col-span-6"}>
            <input className={`${inp} w-full`} placeholder={label} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {isPartLike && (
            <Field label="Cost" className="md:col-span-1">
              <input
                className={`${inp} w-full text-right tabular-nums`}
                type="number"
                placeholder="0.00"
                value={cost}
                onChange={(e) => {
                  const next = e.target.value;
                  setCost(next);
                  if (!sellTouched) {
                    const nextCost = dollarsToCents(next);
                    setSell(nextCost > 0 ? (sellFromCostCents(nextCost, partsMatrix) / 100).toFixed(2) : "");
                  }
                }}
              />
            </Field>
          )}
          <Field label={isLabor ? "$/hr" : "Sell"} className="md:col-span-1">
            <input
              className={`${inp} w-full text-right tabular-nums`}
              type="number"
              placeholder={isLabor ? String(laborRateCents / 100) : matrixSellCents > 0 ? (matrixSellCents / 100).toFixed(2) : "0.00"}
              value={sell}
              onChange={(e) => { setSell(e.target.value); setSellTouched(true); }}
            />
          </Field>
          <Field label={isLabor ? "Hrs" : "Qty"} className="md:col-span-1">
            <input className={`${inp} w-full text-right tabular-nums`} type="number" placeholder="1" value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          <Field label="Disc" className="md:col-span-2">
            <div className="flex items-center gap-1">
              <input className={`${inp} min-w-0 flex-1 text-right tabular-nums`} type="number" placeholder="0" value={disc} onChange={(e) => setDisc(e.target.value)} />
              <button type="button" className="h-10 w-9 shrink-0 rounded-md border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-sm transition hover:border-sky-300 hover:text-sky-700" onClick={() => setDiscType(discType === "%" ? "$" : "%")}>
                {discType}
              </button>
            </div>
          </Field>
          <Field label="Tax" className="md:col-span-1">
            <button
              type="button"
              disabled={isLabor}
              onClick={() => setTaxable((t) => !t)}
              title={isLabor ? "Labor is tax-exempt" : taxable ? "Taxable (R1) - click to exempt" : "Tax-exempt - click to tax"}
              className={`h-10 w-full rounded-md border text-[11px] font-bold shadow-sm transition ${
                isLabor ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                : taxable ? "border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
              }`}
            >
              {isLabor ? "N" : taxable ? "R1" : "N"}
            </button>
          </Field>

          {isPartLike ? (
            <>
              <Field label="Part #" className="md:col-span-3">
                <input className={`${inp} w-full`} placeholder="Part #" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
              </Field>
              <Field label="Vendor" className="md:col-span-4">
                <input className={`${inp} w-full`} list="ar-composer-vendors" placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
                <datalist id="ar-composer-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
              </Field>
            </>
          ) : isLabor ? (
            <Field label="Technician" className="md:col-span-4">
              <input className={`${inp} w-full`} placeholder="Technician" value={technician} onChange={(e) => setTechnician(e.target.value)} />
            </Field>
          ) : null}

          <div className="flex min-w-0 items-end gap-2 md:col-span-4">
            <div className="flex h-10 min-w-[92px] items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-2 text-sm font-bold tabular-nums text-slate-900">
              {money(totalCents)}
            </div>
            <button
              type="submit"
              disabled={!description.trim()}
              className="flex h-10 min-w-[104px] items-center justify-center gap-1.5 rounded-md bg-slate-950 px-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="h-4 w-4" /> Add Line
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
