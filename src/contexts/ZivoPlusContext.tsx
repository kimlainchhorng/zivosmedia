/**
 * ZIVO+ Subscription Context
 * Checks Stripe for active ZIVO+ membership and provides status across the app.
 */
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ZivoPlusPlan = "monthly" | "chat" | "pro" | "annual" | null;

interface ZivoPlusState {
  isPlus: boolean;
  plan: ZivoPlusPlan;
  subscriptionEnd: string | null;
  subscriptionId: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ZivoPlusContext = createContext<ZivoPlusState>({
  isPlus: false,
  plan: null,
  subscriptionEnd: null,
  subscriptionId: null,
  isLoading: true,
  refresh: async () => {},
});

export const useZivoPlus = () => useContext(ZivoPlusContext);

export function ZivoPlusProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [isPlus, setIsPlus] = useState(false);
  const [plan, setPlan] = useState<ZivoPlusPlan>(null);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!user || !session) {
      setIsPlus(false);
      setPlan(null);
      setSubscriptionEnd(null);
      setSubscriptionId(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-zivo-plus");
      if (error) throw error;

      setIsPlus(data?.subscribed ?? false);
      setPlan(data?.plan ?? null);
      setSubscriptionEnd(data?.subscription_end ?? null);
      setSubscriptionId(data?.subscription_id ?? null);
    } catch (err) {
      console.error("[ZivoPlus] Check failed:", err);
      setIsPlus(false);
      setPlan(null);
    } finally {
      setIsLoading(false);
    }
  }, [user, session]);

  // Check on login, then only when tab is visible (every 5 min)
  useEffect(() => {
    checkSubscription();
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (interval) return;
      interval = setInterval(checkSubscription, 5 * 60_000);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        checkSubscription();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [checkSubscription]);

  return (
    <ZivoPlusContext.Provider
      value={{ isPlus, plan, subscriptionEnd, subscriptionId, isLoading, refresh: checkSubscription }}
    >
      {children}
    </ZivoPlusContext.Provider>
  );
}
