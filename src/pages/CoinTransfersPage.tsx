/**
 * CoinTransfersPage — P2P coin transfers sent + received.
 * Backed by `coin_transfers` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowLeftRight, Sparkles, ArrowDownLeft, ArrowUpRight, Clock, Coins, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface TransferRow {
  id: string;
  from_user: string;
  to_user: string;
  amount: number;
  note: string | null;
  message_id: string | null;
  status: string;
  created_at: string;
}

interface UserProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

type Tab = "all" | "sent" | "received";

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function CoinTransfersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["coin-transfers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as TransferRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: TransferRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("coin_transfers")
        .select("id, from_user, to_user, amount, note, message_id, status, created_at")
        .or(`from_user.eq.${user.id},to_user.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const counterpartyIds = useMemo(() => {
    if (!user?.id) return [];
    const ids = new Set<string>();
    transfers.forEach((t) => { ids.add(t.from_user === user.id ? t.to_user : t.from_user); });
    return Array.from(ids);
  }, [transfers, user?.id]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["coin-transfers-profiles", counterpartyIds.join(",")],
    queryFn: async () => {
      if (counterpartyIds.length === 0) return [] as UserProfile[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => Promise<{ data: UserProfile[] | null }>;
          };
        };
      };
      const csv = counterpartyIds.join(",");
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: counterpartyIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  const totals = useMemo(() => {
    if (!user?.id) return { sent: 0, received: 0, sentCount: 0, receivedCount: 0 };
    return transfers.reduce(
      (acc, t) => {
        if (t.from_user === user.id) { acc.sent += t.amount; acc.sentCount += 1; }
        if (t.to_user === user.id)   { acc.received += t.amount; acc.receivedCount += 1; }
        return acc;
      },
      { sent: 0, received: 0, sentCount: 0, receivedCount: 0 },
    );
  }, [transfers, user?.id]);

  const filtered = useMemo(() => {
    if (!user?.id) return transfers;
    if (tab === "sent") return transfers.filter((t) => t.from_user === user.id);
    if (tab === "received") return transfers.filter((t) => t.to_user === user.id);
    return transfers;
  }, [transfers, tab, user?.id]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",      label: "All",      count: transfers.length },
    { id: "received", label: "Received", count: totals.receivedCount },
    { id: "sent",     label: "Sent",     count: totals.sentCount },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Coin Transfers · ZIVO" description="P2P coin transfers." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Coin Transfers</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 inline-flex items-center gap-0.5"><ArrowDownLeft className="h-3 w-3" /> Received</p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">{totals.received.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/70 inline-flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" /> Sent</p>
              <p className="text-2xl font-extrabold leading-tight mt-0.5">{totals.sent.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>

        <div className="flex gap-2">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5", tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
              <span>{t.label}</span>
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Coins className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No transfers</p>
            <p className="text-xs text-muted-foreground">Send coins to friends from any chat to start.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((t, idx) => {
              const isReceived = t.to_user === user?.id;
              const otherId = isReceived ? t.from_user : t.to_user;
              const profile = profileMap.get(otherId);
              const name = profile?.full_name?.trim() || "Someone";
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  {profile?.avatar_url ? (
	                    <img src={profile.avatar_url} alt="" className="shrink-0 h-10 w-10 rounded-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="shrink-0 h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("inline-flex items-center gap-0.5 text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", isReceived ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>
                        {isReceived ? <ArrowDownLeft className="h-2.5 w-2.5" /> : <ArrowUpRight className="h-2.5 w-2.5" />}
                        {isReceived ? "From" : "To"}
                      </span>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(t.created_at)}</span>
                      {t.message_id && (<><span>·</span><span className="inline-flex items-center gap-0.5"><MessageSquare className="h-2.5 w-2.5" /> chat</span></>)}
                      {t.status !== "completed" && (<><span>·</span><span className="capitalize">{t.status}</span></>)}
                    </div>
                    {t.note && <p className="text-xs text-foreground/85 line-clamp-1 mt-1 italic">"{t.note}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-extrabold inline-flex items-center gap-0.5", isReceived ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                      <Coins className="h-3 w-3" />
                      {isReceived ? "+" : "-"}{t.amount.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
