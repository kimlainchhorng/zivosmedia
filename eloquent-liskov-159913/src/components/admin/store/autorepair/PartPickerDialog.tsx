/**
 * PartPickerDialog — Search the shop's ar_parts catalog and add parts
 * directly to an invoice/estimate line item.
 * Also surfaces supplier search links for parts not in inventory.
 */
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PARTS_SUPPLIERS } from "@/config/partsSuppliers";
import Search from "lucide-react/dist/esm/icons/search";
import Package from "lucide-react/dist/esm/icons/package";
import Plus from "lucide-react/dist/esm/icons/plus";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import ShoppingCart from "lucide-react/dist/esm/icons/shopping-cart";
import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import X from "lucide-react/dist/esm/icons/x";

export type PickedPart = {
  description: string;
  sku: string;
  brand: string;
  price: number;        // unit price in dollars
  qty: number;
  partId?: string;      // ar_parts.id — used to decrement stock after save
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  onPick: (part: PickedPart) => void;
}

const CATS = ["All","Brakes","Engine","Fluids","Electrical","Tires","HVAC","Suspension","Exhaust","Fuel System","Transmission","Steering","Cooling","Lighting","Exterior","Interior","Other"];

// Top external suppliers with search URL templates (for "not in catalog" fallback)
const QUICK_SUPPLIERS = PARTS_SUPPLIERS.filter(s => s.searchUrlTemplate).slice(0, 6);

export default function PartPickerDialog({ open, onOpenChange, storeId, onPick }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const { data: parts = [], isLoading } = useQuery({
    queryKey: ["ar-parts", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_parts")
        .select("id,sku,name,brand,category,price_cents,stock,oem_number,condition,fitment_notes")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as any[];
    },
    enabled: open,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return parts.filter((p: any) =>
      (cat === "All" || p.category === cat) &&
      (!lq || p.name.toLowerCase().includes(lq) || p.sku.toLowerCase().includes(lq)
        || (p.brand ?? "").toLowerCase().includes(lq)
        || (p.oem_number ?? "").toLowerCase().includes(lq))
    );
  }, [parts, q, cat]);

  const handlePick = (p: any) => {
    const price = p.price_cents / 100;
    onPick({
      description: `${p.name}${p.brand ? ` (${p.brand})` : ""}${p.sku ? ` — SKU: ${p.sku}` : ""}`,
      sku: p.sku,
      brand: p.brand ?? "",
      price,
      qty: 1,
      partId: p.id,
    });
    setAddedIds(prev => new Set([...prev, p.id]));
    toast.success(`${p.name} added to invoice`);
  };

  const stockLabel = (stock: number) => {
    if (stock === 0) return { text: "Out of stock", cls: "text-destructive" };
    if (stock <= 5) return { text: `${stock} left (low)`, cls: "text-amber-600" };
    return { text: `${stock} in stock`, cls: "text-emerald-600" };
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setQ(""); setCat("All"); setAddedIds(new Set()); } onOpenChange(v); }}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[88vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" /> Pick Parts from Catalog
          </DialogTitle>
        </DialogHeader>

        {/* Search + filter */}
        <div className="px-4 pt-3 pb-2 space-y-2 shrink-0 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-9"
              placeholder="Search by name, SKU, brand, OEM number…"
              value={q}
              onChange={e => setQ(e.target.value)}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {CATS.map(c => (
              <button type="button"
                key={c}
                onClick={() => setCat(c)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all border ${
                  cat === c ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Parts grid */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[0,1,2,3,4,5].map(i => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 && parts.length > 0 ? (
            /* No catalog match — show supplier search fallback */
            <div className="space-y-4">
              <div className="text-center py-6">
                <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm font-semibold text-foreground mb-1">No catalog match for "{q}"</p>
                <p className="text-xs text-muted-foreground mb-4">Search on a supplier site to find and order the part, then add it manually.</p>
              </div>
              {q && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Search on supplier sites</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {QUICK_SUPPLIERS.map(s => (
                      <button type="button"
                        key={s.id}
                        onClick={() => {
                          const url = s.searchUrlTemplate!.replace("{q}", encodeURIComponent(q));
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="flex items-center gap-2 text-left px-3 py-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate">{s.shortName ?? s.name}</p>
                          <p className="text-[10px] text-muted-foreground">Search "{q}"</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : parts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold">No parts in your catalog yet</p>
              <p className="text-xs text-muted-foreground mt-1">Go to the Parts tab to add your inventory first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {filtered.map((p: any) => {
                const { text: sText, cls: sCls } = stockLabel(p.stock);
                const added = addedIds.has(p.id);
                const outOfStock = p.stock === 0;
                return (
                  <div
                    key={p.id}
                    className={`relative flex gap-3 p-3 rounded-xl border transition-colors ${
                      added ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/30 hover:bg-muted/30"
                    }`}
                  >
                    {/* Icon */}
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground/50" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {p.brand || "—"} · <span className="font-mono">{p.sku}</span>
                      </p>
                      {p.oem_number && (
                        <p className="text-[10px] text-muted-foreground">OEM: <span className="font-mono">{p.oem_number}</span></p>
                      )}
                      <div className="flex items-center justify-between mt-1.5 gap-2">
                        <span className="text-sm font-bold">${(p.price_cents / 100).toFixed(2)}</span>
                        <span className={`text-[10px] font-medium ${sCls} flex items-center gap-1`}>
                          {p.stock <= 5 && p.stock > 0 && <AlertTriangle className="w-3 h-3" />}
                          {sText}
                        </span>
                      </div>
                    </div>

                    {/* Add button */}
                    <div className="shrink-0 flex flex-col justify-center">
                      {added ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                          <button type="button"
                            onClick={() => handlePick(p)}
                            className="text-[9px] text-primary hover:underline"
                          >+1 more</button>
                        </div>
                      ) : (
                        <button type="button"
                          onClick={() => handlePick(p)}
                          disabled={outOfStock}
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                            outOfStock
                              ? "bg-muted text-muted-foreground cursor-not-allowed"
                              : "bg-primary text-primary-foreground hover:bg-primary/90"
                          }`}
                          title={outOfStock ? "Out of stock" : "Add to invoice"}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t bg-muted/30 flex items-center justify-between gap-3 shrink-0">
          <p className="text-xs text-muted-foreground">
            {addedIds.size > 0
              ? <span className="text-primary font-semibold">{addedIds.size} part{addedIds.size > 1 ? "s" : ""} added to invoice</span>
              : `${filtered.length} part${filtered.length !== 1 ? "s" : ""} in catalog`}
          </p>
          <Button size="sm" onClick={() => onOpenChange(false)}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
