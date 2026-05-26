/**
 * /wallet/coins/success — Stripe checkout return page.
 * Calls verify-coin-purchase to credit Z Coins idempotently.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import goldCoinIcon from "@/assets/gifts/gold-coin.png";
import { useQueryClient } from "@tanstack/react-query";

export default function CoinPurchaseSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionId = params.get("session_id");
  const rawReturn = params.get("return_to") || "/wallet";
  // Only allow safe same-origin paths
  const returnTo = rawReturn.startsWith("/") && !rawReturn.startsWith("//") ? rawReturn : "/wallet";
  const isLiveReturn = returnTo.startsWith("/live/") || returnTo.startsWith("/go-live");
  const [status, setStatus] = useState<"loading" | "success" | "pending" | "error">("loading");
  const [coins, setCoins] = useState<number>(0);
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(2);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      setError("Missing session_id");
      return;
    }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-coin-purchase", {
          body: { session_id: sessionId },
        });
        if (error) throw new Error(error.message);
        if (data?.error) throw new Error(data.error);
        if (data?.credited) {
          setCoins(data.coins ?? 0);
          setBalance(data.balance ?? null);
          setStatus("success");
          queryClient.invalidateQueries({ queryKey: ["coin-transactions"] });
          queryClient.invalidateQueries({ queryKey: ["coin-purchases"] });
        } else {
          setStatus("pending");
        }
      } catch (e: any) {
        setStatus("error");
        setError(e?.message ?? "Verification failed");
      }
    })();
  }, [sessionId, queryClient]);

  // Auto-return to the live stream (or origin page) after success.
  useEffect(() => {
    if (status !== "success") return;
    if (countdown <= 0) {
      if (isLiveReturn) {
        window.close();
      }
      navigate(returnTo, { replace: true });
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, navigate, returnTo, isLiveReturn]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-xl border border-border/50 p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary mb-4" />
            <h1 className="text-xl font-bold mb-1">Confirming your purchase…</h1>
            <p className="text-sm text-muted-foreground">Please wait while we credit your coins.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-400/40 flex items-center justify-center mx-auto mb-5">
              <Check className="w-10 h-10 text-emerald-500" />
            </div>
            <h1 className="text-xl font-bold mb-1">Purchase Complete!</h1>
            <div className="flex items-center justify-center gap-2 mt-3 mb-1">
	              <img src={goldCoinIcon} alt="" className="w-6 h-6" loading="lazy" decoding="async" />
              <span className="text-2xl font-black text-amber-500">+{coins.toLocaleString()}</span>
            </div>
            {balance !== null && (
              <p className="text-xs text-muted-foreground mb-5">
                New balance: {balance.toLocaleString()} Z Coins
              </p>
            )}
            <Button className="w-full rounded-xl font-bold" onClick={() => navigate(returnTo, { replace: true })}>
              {isLiveReturn ? `Back to Live (${countdown})` : "Back to Wallet"}
            </Button>
            {isLiveReturn && (
              <button type="button"
                onClick={() => navigate("/wallet")}
                className="mt-3 text-xs text-muted-foreground underline"
              >
                Go to Wallet instead
              </button>
            )}
          </>
        )}

        {status === "pending" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-amber-500 mb-4" />
            <h1 className="text-xl font-bold mb-1">Payment processing</h1>
            <p className="text-sm text-muted-foreground mb-5">
              Your coins will appear once payment clears. You can safely close this page.
            </p>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/wallet")}>
              Back to Wallet
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-20 h-20 rounded-full bg-destructive/15 border-2 border-destructive/40 flex items-center justify-center mx-auto mb-5">
              <AlertCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-xl font-bold mb-1">Couldn't verify purchase</h1>
            <p className="text-sm text-muted-foreground mb-5">{error || "Please contact support if you were charged."}</p>
            <Button className="w-full rounded-xl" onClick={() => navigate("/wallet")}>
              Back to Wallet
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
