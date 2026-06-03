/**
 * Build R.O. — VSM-style line-entry composer (pictures 3 & 4).
 *
 * One entry row whose fields swap by line type:
 *   • Part / Tire → Cost · Sell · Qty · Disc · Tax  + Part Number · Vendor
 *   • Labor / Diag → Labor (rate) · Qty · Disc · Tax + Technician
 *   • Fee / Sublet → Amount · Qty · Disc · Tax
 * "Add" composes a line and hands it to the parent; "Parts Catalog" opens the picker.
 * Styled light to match the Build R.O. rebuild (the reference screens are the dark VSM).
 */
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Package } from "lucide-react";
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

const KIND_OPTIONS: { value: ComposerKind; label: string }[] = [
  { value: "part", label: "Part" },
  { value: "labor", label: "Labor" },
  { value: "tire", label: "Tire" },
  { value: "fee", label: "Fee" },
  { value: "sublet", label: "Sublet" },
  { value: "diagnosis", label: "Diag" },
];

const dollarsToCents = (v: string | number) => Math.round((Number(v) || 0) * 100);
const money = (c: number) => `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-0.5 ${className}`}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
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

  const numCls = "h-8 text-right text-xs";

  return (
    <div className="rounded-xl border bg-card p-2.5 space-y-2">
      {/* Type + description */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-bold text-primary">Job {job}</span>
        <Select value={kind} onValueChange={(v: ComposerKind) => setKind(v)}>
          <SelectTrigger className="h-8 w-[96px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KIND_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input className="h-8 flex-1 text-xs" placeholder={label} value={description}
          onChange={(e) => setDescription(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
      </div>

      {/* Numeric fields — swap by type */}
      <div className="flex flex-wrap items-end gap-2">
        {isPartLike && (
          <Field label="Cost">
            <Input className={`${numCls} w-20`} type="number" placeholder="0.00" value={cost} onChange={(e) => setCost(e.target.value)} />
          </Field>
        )}
        <Field label={isLabor ? "Labor $" : "Sell"}>
          <Input className={`${numCls} w-20`} type="number" placeholder={isLabor ? String(laborRateCents / 100) : "0.00"} value={sell} onChange={(e) => setSell(e.target.value)} />
        </Field>
        <Field label="Qty">
          <Input className={`${numCls} w-14`} type="number" placeholder="1" value={qty} onChange={(e) => setQty(e.target.value)} />
        </Field>
        <Field label="Disc">
          <div className="flex items-center gap-0.5">
            <Input className={`${numCls} w-14`} type="number" placeholder="0" value={disc} onChange={(e) => setDisc(e.target.value)} />
            <button type="button" className="h-8 w-7 rounded border text-[11px] text-muted-foreground hover:bg-muted" onClick={() => setDiscType(discType === "%" ? "$" : "%")}>{discType}</button>
          </div>
        </Field>
        <Field label="Tax">
          <div className="flex h-8 items-center">
            <input type="checkbox" className="h-4 w-4 accent-primary" checked={isLabor ? false : taxable} disabled={isLabor} onChange={(e) => setTaxable(e.target.checked)} />
          </div>
        </Field>
        <Field label="Total" className="ml-auto items-end">
          <span className="flex h-8 items-center text-sm font-bold tabular-nums text-primary">{money(totalCents)}</span>
        </Field>
      </div>

      {/* Type-specific row + actions */}
      <div className="flex flex-wrap items-end gap-2 border-t pt-2">
        {isPartLike ? (
          <>
            <Field label="Part Number">
              <Input className="h-8 w-32 text-xs" placeholder="Part #" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            </Field>
            <Field label="Vendor">
              <Input className="h-8 w-40 text-xs" list="ar-composer-vendors" placeholder="Select Vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} />
              <datalist id="ar-composer-vendors">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
            </Field>
          </>
        ) : isLabor ? (
          <Field label="Technician">
            <Input className="h-8 w-44 text-xs" placeholder="Select Technician" value={technician} onChange={(e) => setTechnician(e.target.value)} />
          </Field>
        ) : null}
        <Button size="sm" className="ml-auto h-8 gap-1.5 px-6 text-xs" disabled={!description.trim()} onClick={add}>
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onOpenCatalog}>
          <Package className="h-3.5 w-3.5" /> Parts Catalog
        </Button>
      </div>
    </div>
  );
}
