/**
 * P2PMoneyPage — Venmo-style money sends + receives.
 * Backed by `p2p_transfers` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, DollarSign, Sparkles, ArrowDownLeft, ArrowUpRight, Clock, Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "pending" | "completed" | "declined" | "cancelled";
type Tab = "all" | "in" | "out" | "pending";

interface TransferRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount_cents: number;
  currency: string;
  note: string | null;
  status: Status;
  message_id: string | null;
  created_at: string;
  completed_at: string | null;
}

interface UserProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function P2PMoneyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("all");

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ["p2p-transfers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as TransferRow[];
      const sb = supabase as unknown as {
        from: (t: string) => { select: (s: string) => { or: (f: string) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: TransferRow[] | null }> } } } };
      };
      const { data } = await sb.from("p2p_transfers").select("id, sender_id, receiver_id, amount_cents, currency, note, status, message_id, created_at, completed_at").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`).order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const otherIds = useMemo(() => {
    if (!user?.id) return [];
    const ids = new Set<string>();
    transfers.forEach((t) => ids.add(t.sender_id === user.id ? t.receiver_id : t.sender_id));
    return Array.from(ids);
  }, [transfers, user?.id]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["p2p-profiles", otherIds.join(",")],
    queryFn: async () => {
      if (otherIds.length === 0) return [] as UserProfile[];
      const csv = otherIds.join(",");
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => Promise<{ data: UserProfile[] | null }> } } };
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: otherIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  const totals = useMemo(() => {
    if (!user?.id) return { sent: 0, received: 0, pending: 0 };
    return transfers.reduce((acc, t) => {
      const amt = t.amount_cents;
      const isSent = t.sender_id === user.id;
      if (t.status === "completed") {
        if (isSent) acc.sent += amt; else acc.received += amt;
      } else if (t.status === "pending") {
        acc.pending += amt;
      }
      return acc;
    }, { sent: 0, received: 0, pending: 0 });
  }, [transfers, user?.id]);

  const filtered = useMemo(() => {
    if (!user?.id) return transfers;
    if (tab === "in") return transfers.filter((t) => t.receiver_id === user.id);
    if (tab === "out") return transfers.filter((t) => t.sender_id === user.id);
    if (tab === "pending") return transfers.filter((t) => t.status === "pending");
    return transfers;
  }, [transfers, tab, user?.id]);

  const respond = async (id: string, accept: boolean) => {
    qc.setQueryData<TransferRow[]>(["p2p-transfers", user?.id], (old) =>
      (old ?? []).map((t) => t.id === id ? { ...t, status: (accept ? "completed" : "declined") as Status, completed_at: accept ? new Date().toISOString() : null } : t),
    );
    const sb = supabase as unknown as { from: (t: string) => { update: (v: Record<string, unknown>) => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("p2p_transfers").update({ status: accept ? "completed" : "declined", completed_at: accept ? new Date().toISOString() : null }).eq("id", id);
    if (error) { toast.error("Couldn't update"); qc.invalidateQueries({ queryKey: ["p2p-transfers", user?.id] }); }
    else toast.success(accept ? "Accepted" : "Declined");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="P2P Money · ZIVO" description="Money sends + receives." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><DollarSign className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">P2P Money</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <div className="grid grid-cols-3 gap-2">
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Received</p><p className="text-xl font-extrabold mt-0.5">${(totals.received / 100).toFixed(2)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Sent</p><p className="text-xl font-extrabold mt-0.5">${(totals.sent / 100).toFixed(2)}</p></div>
            <div><p className="text-[10px] font-bold uppercase tracking-wider text-white/70">Pending</p><p className="text-xl font-extrabold mt-0.5">${(totals.pending / 100).toFixed(2)}</p></div>
          </div>
        </motion.div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {(["all", "in", "out", "pending"] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={cn("shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize", tab === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>{t}</button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><DollarSign className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No transfers</p>
            <p className="text-xs text-muted-foreground">Send or request money in any chat to start.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((t, idx) => {
              const isReceived = t.receiver_id === user?.id;
              const otherId = isReceived ? t.sender_id : t.receiver_id;
              const p = profileMap.get(otherId);
              const name = p?.full_name?.trim() || "Someone";
              const isPending = t.status === "pending";
              const canRespond = isPending && isReceived;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  {p?.avatar_url ? <img src={p.avatar_url} alt="" className="shrink-0 h-10 w-10 rounded-full object-cover" loading="lazy" /> : <div className="shrink-0 h-10 w-10 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", isReceived ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/15 text-rose-600 dark:text-rose-400")}>{isReceived ? <ArrowDownLeft className="h-2.5 w-2.5 inline" /> : <ArrowUpRight className="h-2.5 w-2.5 inline" />} {isReceived ? "From" : "To"}</span>
                      <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                      {t.status !== "completed" && <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full", isPending ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-secondary text-muted-foreground")}>{t.status}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(t.created_at)}{t.message_id && <><span>·</span><MessageSquare className="h-2.5 w-2.5" /> chat</>}</p>
                    {t.note && <p className="text-xs text-foreground/85 line-clamp-1 mt-0.5 italic">"{t.note}"</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={cn("text-sm font-extrabold", isReceived ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>{isReceived ? "+" : "-"}${(t.amount_cents / 100).toFixed(2)}</p>
                    {canRespond && (
                      <div className="flex gap-1 mt-1">
                        <button type="button" onClick={() => respond(t.id, true)} aria-label="Accept" className="h-7 w-7 rounded-full bg-emerald-500 text-white inline-flex items-center justify-center active:scale-95"><Check className="h-3 w-3" /></button>
                        <button type="button" onClick={() => respond(t.id, false)} aria-label="Decline" className="h-7 w-7 rounded-full bg-rose-500 text-white inline-flex items-center justify-center active:scale-95"><X className="h-3 w-3" /></button>
                      </div>
                    )}
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
