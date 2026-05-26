/**
 * Public gift card balance checker at /gift-card. Customer types the code,
 * we hit salon_public_gift_card_lookup, and show the current balance + store
 * + expiry. No auth, no enumeration — only valid codes return data.
 */
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, AlertCircle, CreditCard, Store, CheckCircle2, XCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface LookupRow {
  store_id: string;
  store_name: string;
  initial_cents: number;
  balance_cents: number;
  is_active: boolean;
  expires_at: string | null;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/** Strip junk and re-insert dashes at positions 4 and 9 so users see XXXX-XXXX-XXXX. */
const formatCode = (raw: string): string => {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const parts = [clean.slice(0, 4), clean.slice(4, 8), clean.slice(8, 12)].filter(Boolean);
  return parts.join("-");
};

export default function SalonGiftCardCheckPage() {
  const [params] = useSearchParams();
  const [code, setCode] = useState(() => formatCode(params.get("code") ?? ""));
  const [result, setResult] = useState<LookupRow | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether we've already auto-checked a URL-supplied code so a
  // subsequent state update doesn't re-trigger.
  const autoCheckedRef = useRef(false);

  const handleLookup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    setNotFound(false);
    setResult(null);
    const { data, error: err } = await supabase.rpc("salon_public_gift_card_lookup", { p_code: code });
    setLoading(false);
    if (err) {
      console.error("[SalonGiftCardCheck] lookup failed", err);
      setError("Couldn't check that code right now. Please try again.");
      return;
    }
    const row = (Array.isArray(data) ? data[0] : null) as LookupRow | null;
    if (!row) {
      setNotFound(true);
      return;
    }
    setResult(row);
  };

  // Auto-lookup when arriving with a complete 12-char code in the URL — saves
  // the customer an extra click after following an email/QR link.
  useEffect(() => {
    if (autoCheckedRef.current) return;
    if (code.replace(/-/g, "").length === 12) {
      autoCheckedRef.current = true;
      void handleLookup();
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [code]);

  const expired = result?.expires_at !== null && result?.expires_at !== undefined && new Date(result.expires_at) < new Date();
  const usedUp = result !== null && result.balance_cents === 0;
  const usable = result !== null && result.is_active && !expired && !usedUp;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Check gift card balance</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Check gift card balance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter the 12-character code printed on your gift card.
          </p>
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Your code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLookup} className="space-y-3">
              <div>
                <Label htmlFor="gc-code" className="sr-only">Gift card code</Label>
                <Input
                  id="gc-code"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  placeholder="XXXX-XXXX-XXXX"
                  className="text-center font-mono text-lg tracking-widest"
                  autoFocus
                  inputMode="text"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-1 text-center text-[11px] text-muted-foreground">
                  Letters and numbers only — we'll add the dashes for you.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full gap-1.5"
                disabled={loading || code.replace(/-/g, "").length !== 12}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Check balance
              </Button>
            </form>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {notFound && (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/8 p-3 text-center text-sm">
                <p className="font-semibold text-foreground">No card found for that code.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Double-check the characters or contact the salon that issued it.
                </p>
              </div>
            )}

            {result && (
              <div className="mt-4 space-y-3">
                <div className={cn(
                  "rounded-2xl border p-4",
                  usable
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : "border-border bg-muted/30"
                )}>
                  <div className="flex items-center gap-2">
                    {usable ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-muted-foreground" />}
                    <p className={cn(
                      "text-sm font-bold uppercase tracking-wider",
                      usable ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                    )}>
                      {expired ? "Expired" : usedUp ? "Used up" : !result.is_active ? "Disabled" : "Active"}
                    </p>
                  </div>
                  <p className="mt-3 text-4xl font-bold tabular-nums text-foreground">
                    {formatMoney(result.balance_cents)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Balance remaining of {formatMoney(result.initial_cents)}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 text-sm">
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Store className="h-3.5 w-3.5" />
                    <span>Redeemable at</span>
                  </p>
                  <p className="mt-0.5 font-semibold text-foreground">{result.store_name}</p>
                  {result.expires_at && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {expired ? "Expired on " : "Expires on "}
                      {new Date(result.expires_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>

                {!usable && !expired && !usedUp && !result.is_active && (
                  <p className="text-center text-xs text-muted-foreground">
                    This card has been temporarily disabled. Please contact the salon for help.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Only the salon that issued your card can redeem it.
        </p>
      </div>
    </div>
  );
}
