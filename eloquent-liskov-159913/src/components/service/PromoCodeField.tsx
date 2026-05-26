// PromoCodeField — calls zivo_validate_service_promo RPC

import { useCallback, useState } from "react";
import { Tag, Loader2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  kind: "ride" | "delivery";
  subtotalCents: number;
  deliveryFeeCents?: number;
  onApplied: (info: { code: string; discount_cents: number } | null) => void;
}

const fmt = (cents: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);

const ERROR_MAP: Record<string, string> = {
  promo_not_found:           "We don't recognize that code.",
  promo_expired:             "This promo has expired.",
  promo_not_started:         "This promo isn't active yet.",
  promo_wrong_kind:          "This promo doesn't apply to this order type.",
  promo_min_subtotal_not_met:"Your order is below this promo's minimum.",
  promo_already_used:        "You've already used this code.",
  promo_first_order_only:    "This promo is for first-time customers only.",
  promo_exhausted:           "This promo has reached its limit.",
};
function translateError(raw: string): string {
  for (const k of Object.keys(ERROR_MAP)) if (raw.includes(k)) return ERROR_MAP[k];
  return "Couldn't apply promo.";
}

export default function PromoCodeField({ kind, subtotalCents, deliveryFeeCents = 0, onApplied }: Props) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [applied, setApplied] = useState<{ code: string; discount_cents: number; description?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true); setError(null);
    const rpc = supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{
      data: Array<{ promo_id: string; discount_cents: number; applies_to_fee: boolean; description: string | null }> | null;
      error: { message: string } | null;
    }>;
    const { data, error: rErr } = await rpc("zivo_validate_service_promo", {
      p_code: trimmed, p_kind: kind,
      p_subtotal_cents: subtotalCents,
      p_delivery_fee_cents: deliveryFeeCents,
    });
    setBusy(false);
    if (rErr) { setError(translateError(rErr.message)); onApplied(null); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row || row.discount_cents <= 0) {
      setError("Promo doesn't apply to this order");
      onApplied(null); return;
    }
    setApplied({ code: trimmed.toUpperCase(), discount_cents: row.discount_cents, description: row.description ?? undefined });
    onApplied({ code: trimmed.toUpperCase(), discount_cents: row.discount_cents });
  }, [code, kind, subtotalCents, deliveryFeeCents, onApplied]);

  const remove = () => { setApplied(null); setCode(""); setError(null); onApplied(null); };

  if (applied) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium">
              <code className="bg-emerald-500/15 text-emerald-700 px-1 rounded text-xs">{applied.code}</code>
              <span className="ml-2">−{fmt(applied.discount_cents)}</span>
            </p>
            {applied.description && <p className="text-xs text-muted-foreground truncate">{applied.description}</p>}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={remove} className="h-7"><X className="h-3 w-3" /></Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 32))}
            placeholder="Promo code"
            className="pl-7 h-9 text-sm"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } }}
          />
        </div>
        <Button size="sm" variant="outline" onClick={apply} disabled={busy || !code.trim()}>
          {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Apply
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
