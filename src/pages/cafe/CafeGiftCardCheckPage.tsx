/**
 * Anonymous gift card balance lookup at /cafe/:slug/gift-card-check.
 * Calls the existing cafe_gift_card_check_balance SECURITY DEFINER RPC,
 * which returns only balance + active state + expiry (no PII).
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  Coffee, Loader2, AlertCircle, CreditCard, CheckCircle2, ArrowRight, ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

interface StoreLite {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

interface BalanceRow {
  balance_cents: number;
  is_active: boolean;
  expires_at: string | null;
}

const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CafeGiftCardCheckPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreLite | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<BalanceRow | "not_found" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      const res = await supabase
        .from("store_profiles")
        .select("id,name,slug,logo_url,is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (res.error || !res.data) {
        setLoadError("This cafe couldn't be found.");
        setLoading(false);
        return;
      }
      const s = res.data as StoreLite;
      if (!s.is_active) {
        setLoadError("This cafe is currently closed.");
        setLoading(false);
        return;
      }
      setStore(s);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const check = async () => {
    if (!store) return;
    if (!code.trim()) return;
    setChecking(true);
    setResult(null);
    const res = await supabase.rpc("cafe_gift_card_check_balance" as never, {
      p_store_id: store.id,
      p_code: code.trim(),
    } as never);
    setChecking(false);
    if (res.error) {
      console.error("[CafeGiftCardCheck]", res.error);
      setResult("not_found");
      return;
    }
    const rows = (res.data ?? []) as unknown as BalanceRow[];
    if (rows.length === 0) {
      setResult("not_found");
      return;
    }
    setResult(rows[0]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (loadError || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError || "Unavailable."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expired = result && result !== "not_found" && result.expires_at && new Date(result.expires_at) < new Date();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-500/5 to-background py-8 px-4">
      <Helmet>
        <title>Gift card balance · {store.name}</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="max-w-md mx-auto">
        <div className="text-center mb-4">
          {store.logo_url ? (
            <img src={store.logo_url} alt="" className="h-14 w-14 mx-auto rounded-lg object-cover" />
          ) : (
            <div className="h-14 w-14 mx-auto rounded-lg bg-amber-500/15 grid place-items-center">
              <Coffee className="h-7 w-7 text-amber-700" />
            </div>
          )}
          <h1 className="mt-2 text-xl font-bold">{store.name}</h1>
          <p className="text-[12px] text-muted-foreground">Gift card balance check</p>
        </div>

        <Card>
          <CardContent className="pt-5 pb-4 space-y-3">
            <div>
              <Label className="text-sm">Card code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") check(); }}
                placeholder="GC-XXXX-XXXX"
                className="font-mono text-base text-center tracking-widest"
                autoFocus
              />
            </div>
            <Button onClick={check} disabled={checking || !code.trim()} className="w-full">
              {checking ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CreditCard className="h-4 w-4 mr-1" />}
              Check balance
            </Button>

            {result === "not_found" && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Card not found. Check the code and try again.
              </div>
            )}

            {result && result !== "not_found" && (
              <div className={`rounded-md border px-3 py-3 ${
                !result.is_active || expired
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-emerald-500/30 bg-emerald-500/5"
              }`}>
                {!result.is_active ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <ShieldOff className="h-4 w-4" />
                    <span className="font-semibold">Card disabled.</span>
                  </div>
                ) : expired ? (
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-semibold">Card expired on {new Date(result.expires_at!).toLocaleDateString()}.</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="font-semibold">Active</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{fmt(result.balance_cents)}</p>
                    {result.expires_at && (
                      <p className="text-[11px] text-muted-foreground">
                        Expires {new Date(result.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-3 flex items-center gap-2">
          <Button asChild variant="outline" className="flex-1">
            <Link to={`/cafe/${store.slug}`}>
              Order online <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Link>
          </Button>
        </div>

        <p className="mt-3 text-center text-[11px] text-muted-foreground">
          Your code is checked against {store.name}'s active cards. No balance change happens here.
        </p>
      </div>
    </div>
  );
}
