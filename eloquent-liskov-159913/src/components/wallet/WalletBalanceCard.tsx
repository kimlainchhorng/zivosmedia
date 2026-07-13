/**
 * WalletBalanceCard — show user's available balance with top-up / withdraw CTAs.
 *
 * Reads from user_wallets, subscribes to realtime updates, and dispatches
 * `zivo:wallet-action` events for top-up/withdraw flows to handle.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToPooledPostgresChanges } from "@/services/chatRealtimePool";
import Plus from "lucide-react/dist/esm/icons/plus";
import ArrowDown from "lucide-react/dist/esm/icons/arrow-down";
import Wallet from "lucide-react/dist/esm/icons/wallet";

export const WALLET_ACTION_EVENT = "zivo:wallet-action";
export type WalletAction = "topup" | "withdraw";

interface WalletData {
  available_cents: number;
  pending_cents: number;
  currency: string;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function WalletBalanceCard() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<WalletData | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await (dbFrom("user_wallets") as { select: (s: string) => { eq: (k: string, v: string) => { maybeSingle: () => Promise<{ data: WalletData | null }> } } })
        .select("available_cents, pending_cents, currency")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setWallet(data ?? { available_cents: 0, pending_cents: 0, currency: "USD" });
    };
    void load();
    const unsubscribe = subscribeToPooledPostgresChanges(
      {
        poolKey: `wallet:${user.id}`,
        event: "*",
        schema: "public",
        table: "user_wallets",
        filter: `user_id=eq.${user.id}`,
      },
      () => void load(),
    );
    return () => { cancelled = true; unsubscribe(); };
  }, [user?.id]);

  const trigger = (action: WalletAction) => {
    window.dispatchEvent(new CustomEvent<WalletAction>(WALLET_ACTION_EVENT, { detail: action }));
  };

  if (!wallet) return null;

  const fmt = (cents: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: wallet.currency }).format(cents / 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden p-5 text-white shadow-xl bg-foreground"
    >
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_80%_20%,white,transparent_50%)]" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest opacity-80">
            <Wallet className="w-3.5 h-3.5" /> ZIVO Wallet
          </span>
          {wallet.pending_cents > 0 && (
            <span className="text-[10px] font-semibold bg-white/15 px-2 py-0.5 rounded-full">
              {fmt(wallet.pending_cents)} pending
            </span>
          )}
        </div>
        <p className="text-[13px] opacity-80 mb-1">Available balance</p>
        <p className="text-3xl font-bold tabular-nums tracking-tight mb-4">{fmt(wallet.available_cents)}</p>

        <div className="flex gap-2">
          <button type="button"
            onClick={() => trigger("topup")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white text-foreground font-bold text-sm active:scale-95 transition"
          >
            <Plus className="w-4 h-4" /> Top up
          </button>
          <button type="button"
            onClick={() => trigger("withdraw")}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 text-white font-bold text-sm active:scale-95 transition"
          >
            <ArrowDown className="w-4 h-4" /> Withdraw
          </button>
        </div>
      </div>
    </motion.div>
  );
}
