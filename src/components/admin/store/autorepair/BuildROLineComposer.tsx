/**
 * Build R.O. — VSM-style line-entry composer (pictures 3 & 4).
 *
 * A single horizontal entry row whose fields swap by line type:
 *   • Part / Tire → Cost · Sell · Qty · Disc · Tax · Part# · Vendor
 *   • Labor / Diag → Labor (rate) · Hours · Disc · Tech
 *   • Fee / Sublet → Amount · Qty · Disc
 * "Add" composes a line and hands it to the parent; "Parts Catalog" opens the picker.
 * Styled dark to match the VSM reference (the rest of the rebuild is light).
 */
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Package, Wrench, CircleDot, Receipt, Truck, Search } from "lucide-react";
import { listConnectedVendors, AR_SUPPLIER_NAMES } from "./AutoRepairPartSuppliersSection";

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
  storeId: string;
  onAdd: (draft: ComposedLineDraft) => void;
  onOpenCatalog: () => void;
}

const KIND_OPTIONS: { value: ComposerKind; label: string; icon: typeof Wrench }[] = [
  { value: "part", label: "Part", icon: Package },
  { value: "labor", label: "Labor", icon: Wrench },
  { value: "tire", label: "Tire", icon: CircleDot },
  { value: "fee", label: "Fee", icon: Receipt },
  { value: "sublet", label: "Sublet", icon: Truck },
  { value: "diagnosis", label: "Diag", icon: Search },
];

const dollarsToCents = (v: string | number) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Dark VSM field styling (native inputs — avoids the wrapped Input component's tall/full-width shell).
const inp =
  "h-9 rounded-lg border border-slate-600/80 bg-slate-800/60 px-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition focus:border-[#1e90ff] focus:outline-none focus:ring-1 focus:ring-[#1e90ff]/40";

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex shrink-0 flex-col gap-1 ${className}`}>
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export default function BuildROLineComposer({ job, laborRateCents, storeId, onAdd, onOpenCatalog }: Props) {
  const [kind, setKind] = useState<ComposerKind>("part");
  const [description, setDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [vendor, setVendor] = useState("");
  const [technician, setTechnician] = useState("");
  const [cost, setCost] = useState("");
  const [sell, setSell] = useState("");
  const [qty, setQty] = useState("1");
  const [disc, setDisc] = useState("");
  const [discType, setDiscType] = useState<"%" | "$">("%");
  const [taxable, setTaxable] = useState(true);

  const isLabor = kind === "labor" || kind === "diagnosis";
  const isPartLike = kind === "part" || kind === "tire";

  const vendors = useMemo(() => {
    const connected = listConnectedVendors(storeId).map((v) => v.name);
    return Array.from(new Set([...connected, ...AR_SUPPLIER_NAMES]));
  }, [storeId]);

  // Labor "sell" defaults to the shop's labor rate when left blank.
  const sellCents = isLabor ? (sell ? dollarsToCents(sell) : laborRateCents) : dollarsToCents(sell);
  const qtyNum = Number(qty) || 1;
  const discNum = Number(disc) || 0;
  const baseCents = qtyNum * sellCents;
  const discCents = discType === "%" ? Math.round((baseCents * discNum) / 100) : dollarsToCents(disc);
  const totalCents = Math.max(0, baseCents - discCents);

  const label =
    isLabor ? "Description of Labor / Service"
    : kind === "tire" ? "Description of Tire"
    : kind === "fee" ? "Description of Fee"
    : kind === "sublet" ? "Description of Sublet"
    : "Description of Parts";

  const reset = () => {
    setDescription(""); setPartNumber(""); setVendor(""); setTechnician("");
    setCost(""); setSell(""); setQty("1"); setDisc(""); setDiscType("%");
  };

  const add = () => {
    if (!description.trim()) return;
    onAdd({
      kind,
      description: description.trim(),
      misc: isLabor ? (technician.trim() ? `Tech: ${technician.trim()}` : "") : partNumber.trim(),
      part_number: isPartLike ? partNumber.trim() : "",
      vendor: isPartLike ? vendor.trim() : "",
      cost_cents: isPartLike ? dollarsToCents(cost) : 0,
      unit_cents: sellCents,
      qty: qtyNum,
      disc: discNum,
      disc_type: discType,
      taxable: isPartLike ? taxable : false,
    });
    reset();
  };

  return (
    <div className="rounded-xl border border-slate-700/70 bg-[#0b1220] p-3 text-slate-100 shadow-sm">
      {/* Entry row — wraps onto multiple lines instead of scrolling on one line. */}
      <div className="flex flex-wrap items-end gap-2">
        <span className="flex h-9 shrink-0 items-center rounded-md bg-sky-500/15 px-2.5 text-xs font-bold text-sky-300">Job {job}</span>

        <Field label="Type">
          <Select value={kind} onValueChange={(v: ComposerKind) => setKind(v)}>
            <SelectTrigger className="h-9 w-[104px] rounded-lg border-slate-600/80 bg-slate-800/60 text-xs font-semibold text-sky-300">
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

        <Field label="Description" className="min-w-[150px] flex-1">
          <input className={`${inp} w-full`} placeholder={label} value={description}
            onChange={(e) => setDescription(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
        </Field>

        {isPartLike && (
          <Field label="Cost">
            <input className={`${inp} w-[68px] text-right`} type="number" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        )}
        <Field label={isLabor ? "$/hr" : "Sell"}>
          <input className={`${inp} w-[68px] text-right`} type="number" placeholder={isLabor ? String(laborRateCents / 100) : "0.00"} value={sell} onChange={(e) => setSell(e.target.value)} />
        </Field>
        <Field label={isLabor ? "Hrs" : "Qty"}>
          <input className={`${inp} w-[52px] text-right`} type="number" placeholder="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Disc">
          <div className="flex items-center gap-1">
            <input className={`${inp} w-[52px] text-right`} type="number" placeholder="0" value={disc} onChange={(e) => setDisc(e.target.value)} />
            <button type="button" className="h-9 w-7 shrink-0 rounded-lg border border-slate-600/80 bg-slate-800/60 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
              onClick={() => setDiscType(discType === "%" ? "$" : "%")}>{discType}</button>
          </div>
        </Field>
        <Field label="Tax">
          <button type="button"
            disabled={isLabor}
            onClick={() => setTaxable((t) => !t)}
            title={isLabor ? "Labor is tax-exempt" : taxable ? "Taxable (R1) — click to exempt" : "Tax-exempt — click to tax"}
            className={`h-9 w-9 rounded-lg border text-[11px] font-bold transition ${
              isLabor ? "cursor-not-allowed border-slate-700 text-slate-600"
              : taxable ? "border-sky-500/40 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
              : "border-slate-600/80 bg-slate-800/60 text-slate-400 hover:bg-slate-700"
            }`}>
            {isLabor ? "N" : taxable ? "R1" : "N"}
          </button>
        </Field>

        {isPartLike ? (
          <>
            <Field label="Part #">
              <input className={`${inp} w-[92px]`} placeholder="Part #" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            </Field>
            <Field label="Vendor">
              <input className={`${inp} w-[128px]`} list="ar-composer-vendors" placeholder="Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              <datalist id="ar-composer-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
            </Field>
          </>
        ) : isLabor ? (
          <Field label="Technician">
            <input className={`${inp} w-[128px]`} placeholder="Technician" value={technician} onChange={(e) => setTechnician(e.target.value)} />
          </Field>
        ) : null}

        <Field label="Total" className="items-end">
          <span className="flex h-9 items-center whitespace-nowrap rounded-lg bg-sky-500/10 px-2.5 text-sm font-bold tabular-nums text-sky-300">{money(totalCents)}</span>
        </Field>

        <button
          type="button"
          disabled={!description.trim()}
          onClick={add}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#1e90ff] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1577e0] disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
        <button
          type="button"
          onClick={onOpenCatalog}
          title="Parts Catalog"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/80 bg-slate-800/60 text-slate-200 transition hover:bg-slate-700 hover:text-white"
        >
          <Package className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
