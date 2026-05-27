/**
 * StripeEmbeddedOnboarding — Stripe Connect Embedded Components.
 * Renders Stripe's onboarding flow INSIDE the app (no redirect).
 */
import { useEffect, useState } from "react";
import { loadConnectAndInitialize } from "@stripe/connect-js";
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from "@stripe/react-connect-js";
import { Loader2, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe";
import { toast } from "sonner";
import { useConnectOnboard } from "@/hooks/useStripeConnect";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  country?: string;
}

export default function StripeEmbeddedOnboarding({ open, onClose, onComplete, country = "US" }: Props) {
  const [instance, setInstance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const onboard = useConnectOnboard();

  // Auto-fall back to hosted redirect when embedded is blocked
  useEffect(() => {
    if (blocked && open) {
      onboard.mutate(country, { onSuccess: () => onClose() });
    }
  }, [blocked, open, country]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setBlocked(false);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("connect-account-session", {
          body: { country },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (cancelled) return;

        // Pre-check: try loading the Stripe Connect.js script directly to detect blockage early
        const scriptOk = await new Promise<boolean>((resolve) => {
          const existing = document.querySelector('script[src*="connect-js.stripe.com"]');
          if (existing) return resolve(true);
          const s = document.createElement("script");
          s.src = "https://connect-js.stripe.com/v1.0/connect.js";
          s.async = true;
          s.onload = () => resolve(true);
          s.onerror = () => resolve(false);
          document.head.appendChild(s);
          // Timeout fallback
          setTimeout(() => resolve(false), 8000);
        });

        if (!scriptOk) {
          if (!cancelled) {
            setBlocked(true);
            setError("Embedded Stripe is blocked in this browser/preview. Use secure redirect instead.");
            setLoading(false);
          }
          return;
        }

        let connect: any;
        try {
          connect = loadConnectAndInitialize({
            publishableKey: STRIPE_PUBLISHABLE_KEY,
            fetchClientSecret: async () => data.client_secret,
            appearance: {
              overlays: "dialog",
              variables: {
                colorPrimary: "#10b981",
                borderRadius: "12px",
              },
            },
          });
          // Swallow internal async load rejections so they don't surface as runtime errors
          if (connect && typeof (connect as any).then === "function") {
            (connect as any).catch?.(() => {
              if (!cancelled) {
                setBlocked(true);
                setError("Embedded Stripe is blocked in this browser/preview. Use secure redirect instead.");
                setLoading(false);
              }
            });
          }
        } catch (loadErr: any) {
          if (!cancelled) {
            setBlocked(true);
            setError("Embedded Stripe is blocked in this browser/preview. Use secure redirect instead.");
            setLoading(false);
          }
          return;
        }

        if (!cancelled) {
          setInstance(connect);
          setLoading(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          const msg = e?.message || "Failed to load Stripe";
          const isBlocked = msg.includes("Connect.js") || msg.includes("connect-js");
          setBlocked(isBlocked);
          setError(isBlocked ? "Embedded Stripe is blocked in this browser/preview. Use secure redirect instead." : msg);
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, country]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-card">
        <div>
          <h2 className="text-base font-bold">Stripe Setup</h2>
          <p className="text-[11px] text-muted-foreground">Secure onboarding by Stripe</p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="rounded-full">
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {(loading || blocked) && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#635bff]" />
            <p className="text-sm text-muted-foreground">{blocked ? "Redirecting to Stripe…" : "Loading Stripe…"}</p>
          </div>
        )}
        {error && (
          <div className="p-6 text-center max-w-md mx-auto flex flex-col items-center justify-center h-full">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
              <ExternalLink className="w-6 h-6 text-amber-600" />
            </div>
            <p className="text-sm font-semibold mb-1">{blocked ? "Open Stripe in secure tab" : "Couldn't load Stripe"}</p>
            <p className="text-xs text-muted-foreground mb-4">{error}</p>
            {blocked && (
              <Button
                onClick={() => {
                  onboard.mutate(country, { onSuccess: () => onClose() });
                }}
                disabled={onboard.isPending}
                className="w-full h-11 rounded-xl bg-[#635bff] hover:bg-[#4b44d9] text-white font-bold gap-2 mb-2"
              >
                {onboard.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                Continue to Stripe
              </Button>
            )}
            <Button onClick={onClose} variant="outline" className="w-full h-11 rounded-xl">Close</Button>
          </div>
        )}
        {instance && !loading && !error && (
          <div className="p-3 max-w-2xl mx-auto">
            <ConnectComponentsProvider connectInstance={instance}>
              <ConnectAccountOnboarding
                onExit={() => {
                  toast.success("Stripe setup complete!");
                  onComplete();
                }}
              />
            </ConnectComponentsProvider>
          </div>
        )}
      </div>
    </div>
  );
}
