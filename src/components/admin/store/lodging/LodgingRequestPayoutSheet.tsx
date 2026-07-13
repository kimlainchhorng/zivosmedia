/**
 * LodgingRequestPayoutSheet
 * -------------------------
 * Host-initiated payout request. Picks an eligible saved payout method,
 * validates the requested amount against available net, and inserts a row
 * into `lodge_payout_requests` (server validates again).
 */
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet, ShieldCheck, Banknote, Landmark, AlertCircle, Square, Building } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { money } from "./LodgingOperationsShared";
import { normalizeCountry, RAIL_LABELS, type PayoutRail } from "@/lib/payouts/payoutRails";

interface Props {
  storeId: string;
  storeCountry?: string | null;
  availableCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MethodRow {
  id: string;
  rail: string | null;
  method_type: string;
  label: string | null;
  bank_name: string | null;
  account_number: string | null;
  aba_account_id: string | null;
  verification_status?: string;
}

const RAIL_ICON: Record<PayoutRail, typeof Banknote> = {
  stripe: ShieldCheck, aba: Banknote, bank_wire: Landmark, paypal: Wallet, square: Square, mercury: Building,
};

export default function LodgingRequestPayoutSheet({ storeId, storeCountry, availableCents, open, onOpenChange }: Props) {
  const country = normalizeCountry(storeCountry);
  const queryClient = useQueryClient();
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState<string>(((availableCents || 0) / 100).toFixed(2));
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const { data: methods = [], isLoading: methodsLoading } = useQuery({
    queryKey: ["lodge-payout-methods", storeId],
    queryFn: async (): Promise<MethodRow[]> => {
      const { data, error } = await supabase
        .from("customer_payout_methods")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MethodRow[];
    },
    enabled: !!storeId && open,
  });

  const eligible = useMemo(() => methods, [methods]);

  const submit = async () => {
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (!methodId) return toast.error("Pick a payout method");
    if (!amountCents || amountCents <= 0) return toast.error("Enter a valid amount");
    if (amountCents > availableCents) return toast.error(`Max available is ${money(availableCents)}`);

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("lodge-payout-request", {
        body: { store_id: storeId, payout_method_id: methodId, amount_cents: amountCents, note: note || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Payout requested", { description: country === "KH" ? "Admin will process via ABA within 1 business day." : "Admin will process within 1–2 business days." });
      queryClient.invalidateQueries({ queryKey: ["lodge-payout-history", storeId] });
      onOpenChange(false);
      setNote("");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit payout request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Request payout</SheetTitle>
          <SheetDescription>
            Available: <span className="font-semibold text-foreground">{money(availableCents)}</span> · Country: {country}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {country === "KH" && (
            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex gap-2">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Cambodia payouts are processed manually via ABA Bank within 1 business day.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Payout method</Label>
            {methodsLoading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Loading…</p>
            ) : eligible.length === 0 ? (
              <p className="text-xs text-muted-foreground">No payout methods saved yet. Add one in the Payout account section above.</p>
            ) : (
              <div className="space-y-1.5">
                {eligible.map((m) => {
                  const rail = (m.rail || "bank_wire") as PayoutRail;
                  const Icon = RAIL_ICON[rail] || Banknote;
                  const summary = m.method_type === "aba" ? `ABA ${m.aba_account_id || ""}`
                    : m.method_type === "paypal" ? (m.account_number || "PayPal")
                    : `${m.bank_name || "Bank"} ···${(m.account_number || "").slice(-4)}`;
                  const isSelected = methodId === m.id;
                  return (
                    <button type="button"
                      key={m.id}
                      onClick={() => setMethodId(m.id)}
                      className={`w-full text-left rounded-md border p-2.5 transition ${isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate">{m.label || RAIL_LABELS[rail]}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{summary}</p>
                        </div>
                        {m.verification_status === "verified" ? (
                          <span className="text-[10px] rounded bg-emerald-500/15 text-emerald-700 px-1.5 py-0.5">Verified</span>
                        ) : (
                          <span className="text-[10px] rounded bg-amber-500/15 text-amber-700 px-1.5 py-0.5">Pending</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Amount (USD)</Label>
            <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">Max: {money(availableCents)}</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Note for admin (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. preferred transfer time" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submit} disabled={submitting || !methodId}>
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Request payout
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
