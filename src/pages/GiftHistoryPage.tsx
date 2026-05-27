/**
 * GiftHistoryPage — Coin gifts you've sent + received in chat.
 * Backed by `gift_transactions` (orphan). RLS allows sender or receiver to view.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Gift, Sparkles, ArrowDownLeft, ArrowUpRight, Coins, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface GiftTxRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_id: string | null;
  gift_key: string;
  gift_name: string | null;
  coins: number;
  combo: number;
  note: string | null;
  created_at: string;
}

type Tab = "all" | "sent" | "received";

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function giftEmoji(key: string): string {
  const k = key.toLowerCase();
  if (k.includes("rose") || k.includes("flower")) return "🌹";
  if (k.includes("heart") || k.includes("love")) return "❤️";
  if (k.includes("crown") || k.includes("king") || k.includes("queen")) return "👑";
  if (k.includes("diamond") || k.includes("gem")) return "💎";
  if (k.includes("star")) return "⭐";
  if (k.includes("fire") || k.includes("flame")) return "🔥";
  if (k.includes("cake")) return "🎂";
  if (k.includes("car")) return "🚗";
  if (k.includes("rocket")) return "🚀";
  if (k.includes("lion")) return "🦁";
  return "🎁";
}

export default function GiftHistoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: gifts = [], isLoading } = useQuery({
    queryKey: ["gift-transactions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as GiftTxRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: GiftTxRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("gift_transactions")
        .select("id, sender_id, receiver_id, message_id, gift_key, gift_name, coins, combo, note, created_at")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const totals = useMemo(() => {
    if (!user?.id) return { sentCoins: 0, receivedCoins: 0, sentCount: 0, receivedCount: 0 };
    return gifts.reduce(
      (acc, g) => {
        const cost = g.coins * g.combo;
        if (g.sender_id === user.id) {
          acc.sentCoins += cost;
          acc.sentCount += 1;
        }
        if (g.receiver_id === user.id) {
          acc.receivedCoins += cost;
          acc.receivedCount += 1;
        }
        return acc;
      },
      { sentCoins: 0, receivedCoins: 0, sentCount: 0, receivedCount: 0 },
    );
  }, [gifts, user?.id]);

  const filtered = useMemo(() => {
    if (!user?.id) return gifts;
    if (tab === "sent") return gifts.filter((g) => g.sender_id === user.id);
    if (tab === "received") return gifts.filter((g) => g.receiver_id === user.id);
    return gifts;
  }, [gifts, tab, user?.id]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all", label: "All", count: gifts.length },
    { id: "received", label: "Received", count: totals.receivedCount },
    { id: "sent", label: "Sent", count: totals.sentCount },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Gift History · ZIVO" description="Your coin gifts sent and received." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Gift className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Gift History</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Net banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Lifetime gifts</p>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 inline-flex items-center gap-0.5">
                <ArrowDownLeft className="h-3 w-3" /> Received
              </p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">{formatCount(totals.receivedCoins)}</p>
              <p className="text-[11px] text-white/70">{totals.receivedCount} {totals.receivedCount === 1 ? "gift" : "gifts"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 inline-flex items-center gap-0.5">
                <ArrowUpRight className="h-3 w-3" /> Sent
              </p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">{formatCount(totals.sentCoins)}</p>
              <p className="text-[11px] text-white/70">{totals.sentCount} {totals.sentCount === 1 ? "gift" : "gifts"}</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && gifts.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Gift className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No gifts yet</p>
            <p className="text-xs text-muted-foreground">Send coins as gifts in chat — both sides will show up here with a running total.</p>
          </div>
        )}

        {!isLoading && gifts.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Nothing in this tab yet.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((g, idx) => {
              const isReceived = g.receiver_id === user?.id;
              const cost = g.coins * g.combo;
              return (
                <motion.button
                  key={g.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => g.message_id && navigate(`/chat`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
                >
                  <div className="shrink-0 h-12 w-12 rounded-2xl bg-ig-gradient/10 border border-ig-gradient/20 flex items-center justify-center text-2xl">
                    {giftEmoji(g.gift_key)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full",
                          isReceived ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400",
                        )}
                      >
                        {isReceived ? <ArrowDownLeft className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                        {isReceived ? "Received" : "Sent"}
                      </span>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{g.gift_name ?? g.gift_key}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span>{formatRelative(g.created_at)}</span>
                      {g.combo > 1 && (
                        <>
                          <span>·</span>
                          <span className="font-bold text-ig-gradient">×{g.combo} combo</span>
                        </>
                      )}
                      {g.message_id && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <MessageSquare className="h-2.5 w-2.5" /> in chat
                          </span>
                        </>
                      )}
                    </div>
                    {g.note && (
                      <p className="text-xs text-foreground/85 line-clamp-2 mt-1 italic">"{g.note}"</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-extrabold inline-flex items-center gap-0.5", isReceived ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      <Coins className="h-3 w-3" />
                      {isReceived ? "+" : "-"}{formatCount(cost)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">coins</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
