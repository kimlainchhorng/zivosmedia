/** AddOnsSheet — purchase extra lodging services after booking. */
import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Minus, Plus, ShoppingBag, CreditCard, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type LodgingAddon = {
  id?: string;
  name?: string;
  label?: string;
  description?: string;
  price_cents?: number;
  amount_cents?: number;
  unit?: "per_stay" | "per_night" | "per_guest" | "per_person_night" | string;
  pricing_unit?: string;
};

type Eligibility = { id: string; eligible: boolean; reason?: string; max_quantity?: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservationId: string;
  addons: LodgingAddon[];
  nights: number;
  guests: number;
  onPurchased?: (result?: "success" | "failed") => void;
}

const unitLabel: Record<string, string> = {
  per_stay: "per stay",
  per_night: "per night",
  per_guest: "per guest",
  per_person_night: "per guest/night",
};

function addonKey(addon: LodgingAddon) {
  return String(addon.id || addon.name || addon.label || "addon");
}
function addonPrice(addon: LodgingAddon) {
  return Number(addon.price_cents ?? addon.amount_cents ?? 0);
}
function lineTotal(addon: LodgingAddon, qty: number, nights: number, guests: number) {
  const price = addonPrice(addon);
  const unit = String(addon.unit || addon.pricing_unit || "per_stay");
  if (unit === "per_night") return price * nights * qty;
  if (unit === "per_guest") return price * guests * qty;
  if (unit === "per_person_night") return price * guests * nights * qty;
  return price * qty;
}

const highlightTarget = (selector: string) => {
  const target = document.querySelector(selector) as HTMLElement | null;
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
  target.classList.add("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
  window.setTimeout(() => target.classList.remove("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 1600);
};

export default function AddOnsSheet({ open, onOpenChange, reservationId, addons, nights, guests, onPurchased }: Props) {
  const [qty, setQty] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [eligibility, setEligibility] = useState<Record<string, Eligibility>>({});

  useEffect(() => {
    if (!open || !reservationId) return;
    let cancelled = false;
    setChecking(true);
    supabase.functions.invoke("lodging-addon-eligibility", { body: { reservation_id: reservationId } }).then(({ data, error }) => {
      if (cancelled) return;
      setChecking(false);
      if (error || data?.error) {
        toast.error(data?.error || error?.message || "Could not check add-on availability");
        return;
      }
      const next: Record<string, Eligibility> = {};
      for (const item of (data?.eligibility || []) as Eligibility[]) next[item.id] = item;
      setEligibility(next);
      setQty((current) => Object.fromEntries(Object.entries(current).filter(([id]) => next[id]?.eligible !== false)));
    });
    return () => {
      cancelled = true;
    };
  }, [open, reservationId]);

  const selected = useMemo(() => Object.entries(qty).filter(([id, count]) => count > 0 && eligibility[id]?.eligible !== false), [qty, eligibility]);
  const total = useMemo(
    () => selected.reduce((sum, [id, count]) => sum + lineTotal(addons.find((a) => addonKey(a) === id)!, count, nights, guests), 0),
    [addons, guests, nights, selected],
  );
  const hasUnavailableSelection = Object.entries(qty).some(([id, count]) => count > 0 && eligibility[id]?.eligible === false);

  const purchase = async () => {
    if (!selected.length || hasUnavailableSelection) return;
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("purchase-lodging-addons", {
      body: { reservation_id: reservationId, selections: selected.map(([id, quantity]) => ({ id, quantity })) },
    });
    setLoading(false);
    if (error || data?.error) {
      toast.error(data?.reason || data?.message || (data?.error === "no_saved_payment_method" ? "No saved payment method found. Add a card in Wallet first." : data?.error || error?.message || "Could not charge add-ons"));
      onPurchased?.("failed");
      onOpenChange(false);
      window.setTimeout(() => highlightTarget("#addon-status"), 180);
      return;
    }
    toast.success("Add-on charge successful", { description: `Charged $${((data?.charged_cents || total) / 100).toFixed(2)} to your saved card.` });
    setQty({});
    onPurchased?.("success");
    onOpenChange(false);
    window.setTimeout(() => highlightTarget("#addon-status"), 180);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2"><ShoppingBag className="h-5 w-5" /> Add services</SheetTitle>
          <SheetDescription>Select extras for this stay and charge your saved card.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {checking && <Alert><Loader2 className="w-4 h-4 animate-spin" /><AlertDescription>Checking add-on availability for your room, dates, and guest count…</AlertDescription></Alert>}
          {!addons.length ? (
            <Alert><AlertDescription>This room does not have add-ons available right now.</AlertDescription></Alert>
          ) : (
            addons.map((addon) => {
              const id = addonKey(addon);
              const count = qty[id] || 0;
              const unit = String(addon.unit || addon.pricing_unit || "per_stay");
              const rule = eligibility[id];
              const disabled = checking || rule?.eligible === false;
              const max = Math.max(0, Number(rule?.max_quantity || 20));
              return (
                <div key={id} className={`rounded-lg border bg-card p-4 space-y-3 ${disabled ? "opacity-70" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">{addon.name || addon.label || "Add-on"}</p>
                      {addon.description && <p className="text-xs text-muted-foreground mt-1">{addon.description}</p>}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">${(addonPrice(addon) / 100).toFixed(2)}</Badge>
                        <span className="text-xs text-muted-foreground">{unitLabel[unit] || unit.replace(/_/g, " ")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={disabled || count <= 0} onClick={() => setQty((q) => ({ ...q, [id]: Math.max(0, count - 1) }))}><Minus className="h-3.5 w-3.5" /></Button>
                      <span className="w-6 text-center text-sm font-semibold">{count}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8" disabled={disabled || count >= max} onClick={() => setQty((q) => ({ ...q, [id]: count + 1 }))}><Plus className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  {rule?.eligible === false && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {rule.reason || "Unavailable for this reservation."}</p>}
                  {count > 0 && <p className="text-xs text-muted-foreground">Line total: ${(lineTotal(addon, count, nights, guests) / 100).toFixed(2)}</p>}
                </div>
              );
            })
          )}

          <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><CreditCard className="h-4 w-4" /> Saved payment method</div>
            <p className="text-xs text-muted-foreground">Your default saved Stripe card will be charged off-session. If no saved card exists, you’ll be asked to add one in Wallet.</p>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-semibold">Total</span>
              <span className="font-bold">${(total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 sticky bottom-0 bg-background pt-3">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Close</Button>
            <Button className="flex-1" disabled={!selected.length || loading || checking || hasUnavailableSelection} onClick={purchase}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Charge saved card"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
