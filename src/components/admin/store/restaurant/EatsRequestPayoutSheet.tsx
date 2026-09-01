/**
 * EatsRequestPayoutSheet
 * ----------------------
 * Restaurant-initiated payout request. Picks a saved payout method and inserts
 * a row into `eats_payout_requests` via the eats-payout-request edge function
 * (which validates again server-side).
 */
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Loader2,
  Wallet,
  ShieldCheck,
  Banknote,
  Landmark,
  AlertCircle,
  Square,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import {
  loadOwnPayoutMethods,
  type OwnerSafePayoutMethod,
} from "@/lib/payoutMethods";
import { invokeSensitive } from "@/lib/security/sensitiveInvoke";
import { useStepUpMfa } from "@/hooks/useStepUpMfa";
import {
  normalizeCountry,
  RAIL_LABELS,
  type PayoutRail,
} from "@/lib/payouts/payoutRails";

interface Props {
  restaurantId: string;
  restaurantCountry?: string | null;
  availableCents: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type MethodRow = OwnerSafePayoutMethod;

const RAIL_ICON: Record<PayoutRail, typeof Banknote> = {
  stripe: ShieldCheck,
  aba: Banknote,
  bank_wire: Landmark,
  paypal: Wallet,
  square: Square,
  mercury: Building,
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function payoutRail(method: MethodRow): PayoutRail {
  const stored = String(method.rail || method.method_type).toLowerCase();
  return (stored === "bank_transfer" ? "bank_wire" : stored) as PayoutRail;
}

export default function EatsRequestPayoutSheet({
  restaurantId,
  restaurantCountry,
  availableCents,
  open,
  onOpenChange,
}: Props) {
  const country = normalizeCountry(restaurantCountry);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [methodId, setMethodId] = useState<string>("");
  const [amount, setAmount] = useState<string>(
    ((availableCents || 0) / 100).toFixed(2),
  );
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const pendingRequestRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );

  const {
    data: methods = [],
    isLoading: methodsLoading,
    isError: methodsError,
    isFetching: methodsFetching,
    refetch: refetchMethods,
  } = useQuery({
    queryKey: ["eats-payout-methods", user?.id, restaurantId],
    queryFn: () => loadOwnPayoutMethods("store_or_account", restaurantId),
    enabled: !!user?.id && !!restaurantId && open,
  });

  const eligible = useMemo(
    () =>
      methodsError
        ? []
        : methods.filter(
            (method) =>
              payoutRail(method) !== "stripe" &&
              method.is_verified === true &&
              String(method.verification_status || "").toLowerCase() ===
                "verified",
          ),
    [methods, methodsError],
  );

  // eats-payout-request is enforceAal2-gated: it answers
  // 403 {"code":"mfa_required"} to any session below AAL2. Nothing here asked
  // for a step-up, so the 403 arrived as supabase-js's generic "Edge Function
  // returned a non-2xx status code" and the restaurant saw "Could not submit
  // payout request" with no way forward. invokeSensitive catches that code,
  // runs the challenge, and retries; with no factor enrolled the hook says so
  // and points at Account Security.
  const { ensureAal2, dialog: mfaDialog } = useStepUpMfa();

  const submit = async () => {
    const amountCents = Math.round(parseFloat(amount || "0") * 100);
    if (!methodId) return toast.error("Pick a payout method");
    if (!amountCents || amountCents <= 0)
      return toast.error("Enter a valid amount");
    if (amountCents > availableCents)
      return toast.error(`Max available is ${money(availableCents)}`);

    const cleanNote = note.trim() || null;
    const fingerprint = JSON.stringify({
      restaurantId,
      methodId,
      amountCents,
      note: cleanNote,
    });
    if (pendingRequestRef.current?.fingerprint !== fingerprint) {
      pendingRequestRef.current = { fingerprint, key: crypto.randomUUID() };
    }
    const idempotencyKey = pendingRequestRef.current.key;

    setSubmitting(true);
    try {
      const { data, error } = await invokeSensitive<{
        error?: string;
        available_cents?: number;
        available_cents_after?: number;
      }>(
        "eats-payout-request",
        {
          body: {
            restaurant_id: restaurantId,
            payout_method_id: methodId,
            amount_cents: amountCents,
            note: cleanNote,
          },
          headers: { "Idempotency-Key": idempotencyKey },
        },
        ensureAal2,
        "Authorize payout request",
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      pendingRequestRef.current = null;
      toast.success("Payout requested", {
        description:
          country === "KH"
            ? "Admin will process via ABA within 1 business day."
            : "Admin will process within 1–2 business days.",
      });
      queryClient.invalidateQueries({
        queryKey: ["eats-payout-history"],
      });
      queryClient.invalidateQueries({
        queryKey: ["eats-payouts-summary", restaurantId],
      });
      onOpenChange(false);
      setNote("");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit payout request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {mfaDialog}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Request payout</SheetTitle>
            <SheetDescription>
              Available:{" "}
              <span className="font-semibold text-foreground">
                {money(availableCents)}
              </span>{" "}
              · Country: {country}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-4">
            {country === "KH" && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 flex gap-2">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Cambodia payouts are processed manually via ABA Bank within 1
                  business day.
                </span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Payout method</Label>
              {methodsError ? (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-950 dark:text-amber-100"
                >
                  <span>Payout methods are unavailable.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={methodsFetching}
                    onClick={() => void refetchMethods()}
                  >
                    {methodsFetching ? (
                      <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                    ) : null}
                    Retry
                  </Button>
                </div>
              ) : methodsLoading ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading…
                </p>
              ) : eligible.length === 0 ? (
                <div className="space-y-2 rounded-md border border-dashed border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    No verified manual payout method is available. Add or review
                    an ABA or bank-transfer destination in Wallet. Stripe-paid
                    Eats orders transfer automatically.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/wallet?tab=cashout")}
                  >
                    Review payout accounts in Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {eligible.map((m) => {
                    const rail = payoutRail(m);
                    const Icon = RAIL_ICON[rail] || Banknote;
                    const sel = methodId === m.id;
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setMethodId(m.id)}
                        className={`w-full text-left rounded-lg border p-2.5 text-xs transition-colors ${sel ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate">
                              {m.label || RAIL_LABELS[rail]}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {RAIL_LABELS[rail]}
                              {m.destination_last4
                                ? ` · •••• ${m.destination_last4}`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs">
                Amount (USD)
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">
                Max {money(availableCents)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="note" className="text-xs">
                Note (optional)
              </Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Anything admin should know"
                className="text-sm h-20"
                maxLength={500}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={submit}
                disabled={
                  submitting ||
                  methodsError ||
                  methodsFetching ||
                  !methodId ||
                  availableCents <= 0
                }
              >
                {submitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Request
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
