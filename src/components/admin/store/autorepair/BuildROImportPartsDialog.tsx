/**
 * Build R.O. — "Import / Paste Parts".
 * A practical stand-in for AutoZone Pro's "Transfer" (no punchout API available):
 * paste the cart or a spreadsheet (one part per line) and it parses into R.O.
 * part lines. Costs are matrix-priced by the caller; lines land as Pending Order.
 *
 * Accepted per line (tab / comma / multi-space separated, in any order):
 *   part#   description   cost   [qty]
 * Free-text lines work too — a trailing $cost is detected, the rest is the name.
 */
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardPaste, Package } from "lucide-react";
import { DEFAULT_PARTS_MATRIX, sellFromCostCents, type MatrixTier } from "@/lib/admin/partsMatrix";

export type ImportedPart = { sku: string; description: string; cost: number; qty: number };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onImport: (parts: ImportedPart[], vendor: string) => void;
  /** Shop Parts Matrix; preview sell prices are derived from it (defaults to the standard matrix). */
  matrix?: MatrixTier[];
}

const numTok = (s: string) => s.replace(/[^0-9.]/g, "");
// A cost token: $-prefixed, or has a decimal. Plain integers are treated as SKU/qty, not cost.
const isMoney = (s: string) => /^\$\s*\d+(?:\.\d{1,2})?$/.test(s.trim()) || /^\d+\.\d{1,2}$/.test(s.trim());

export function parseParts(text: string): ImportedPart[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line): ImportedPart | null => {
      const cols = line.includes("\t") ? line.split("\t") : line.includes(",") ? line.split(",") : null;
      if (cols && cols.length >= 2) {
        const c = cols.map((x) => x.trim()).filter(Boolean);
        const costIdx = c.findIndex(isMoney);
        const cost = costIdx >= 0 ? parseFloat(numTok(c[costIdx])) || 0 : 0;
        const qtyIdx = c.findIndex((x, i) => i !== costIdx && /^\d{1,3}$/.test(x));
        const qty = qtyIdx >= 0 && qtyIdx !== costIdx ? parseInt(c[qtyIdx], 10) || 1 : 1;
        const sku = c[0];
        const desc = c.filter((_, i) => i !== 0 && i !== costIdx && i !== qtyIdx).join(" ").trim() || c[0];
        return { sku: sku === desc ? "" : sku, description: desc, cost, qty };
      }
      const m = line.match(/\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
      const cost = m ? parseFloat(m[1]) || 0 : 0;
      const description = (m ? line.slice(0, m.index).trim() : line) || line;
      return { sku: "", description, cost, qty: 1 };
    })
    .filter((p): p is ImportedPart => !!p && !!p.description);
}

const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BuildROImportPartsDialog({ open, onOpenChange, onImport, matrix = DEFAULT_PARTS_MATRIX }: Props) {
  const [text, setText] = useState("");
  const [vendor, setVendor] = useState("AutoZone");
  const parsed = useMemo(() => parseParts(text), [text]);
  const rows = useMemo(
    () =>
      parsed.map((p) => {
        const sell = sellFromCostCents(Math.round((p.cost || 0) * 100), matrix) / 100;
        return { ...p, sell, ext: sell * (p.qty || 1) };
      }),
    [parsed, matrix],
  );
  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({ cost: a.cost + (r.cost || 0) * (r.qty || 1), sell: a.sell + r.ext }),
        { cost: 0, sell: 0 },
      ),
    [rows],
  );
  const margin = totals.sell > 0 ? Math.round(((totals.sell - totals.cost) / totals.sell) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setText(""); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ClipboardPaste className="h-4 w-4" /> Import / Paste Parts</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Vendor:</span>
            <Input className="h-7 w-40 text-xs" value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <textarea
            className="h-40 w-full resize-none rounded-md border bg-background p-2 font-mono text-xs"
            autoFocus
            placeholder={"Paste your cart — one part per line, e.g.\n17468\tBosch Air/Fuel Ratio Sensor\t119.33\t1\nDL20085, DUR Fuel Injector, 44.24, 3"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />

          {parsed.length > 0 && (
            <div className="max-h-44 overflow-y-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <th className="px-2 py-1 text-left">Part #</th>
                    <th className="px-2 py-1 text-left">Description</th>
                    <th className="px-2 py-1 text-right">Qty</th>
                    <th className="px-2 py-1 text-right">Cost</th>
                    <th className="px-2 py-1 text-right">Sell</th>
                    <th className="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="px-2 py-1 font-mono">{p.sku || "—"}</td>
                      <td className="max-w-[14rem] truncate px-2 py-1" title={p.description}>{p.description}</td>
                      <td className="px-2 py-1 text-right">{p.qty}</td>
                      <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{money(p.cost)}</td>
                      <td className="px-2 py-1 text-right tabular-nums">{money(p.sell)}</td>
                      <td className="px-2 py-1 text-right font-medium tabular-nums">{money(p.ext)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/30 font-medium">
                    <td className="px-2 py-1" colSpan={3}>{rows.length} line{rows.length === 1 ? "" : "s"}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-muted-foreground">{money(totals.cost)}</td>
                    <td className="px-2 py-1 text-right text-[10px] uppercase text-muted-foreground">{margin}% GP</td>
                    <td className="px-2 py-1 text-right tabular-nums">{money(totals.sell)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Package className="h-3 w-3" /> Parts are priced from your Parts Matrix (cost → sell) and added as Pending Order.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={parsed.length === 0} onClick={() => { onImport(parsed, vendor.trim() || "AutoZone"); onOpenChange(false); }}>
            Add {parsed.length || ""} Part{parsed.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
