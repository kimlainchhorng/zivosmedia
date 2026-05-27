/**
 * AutoMessagesLogPage — Log of automated messages ZIVO has sent you (push/email/sms).
 * Backed by `automated_message_log` (orphan). RLS: user views own.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Send, Sparkles, Clock, Mail, Smartphone, MessageSquare, Cake, ShoppingCart, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface LogRow {
  id: string;
  user_id: string;
  trigger_type: string;
  trigger_ref: string | null;
  channel: string;
  sent_at: string;
  message_preview: string | null;
}

type Tab = "all" | "push" | "email" | "sms";

const TRIGGER_META: Record<string, { icon: typeof Cake; tone: string; bg: string }> = {
  abandoned_cart: { icon: ShoppingCart, tone: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-500/15"   },
  reengagement:   { icon: RotateCw,     tone: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-500/15"    },
  birthday:       { icon: Cake,         tone: "text-rose-600 dark:text-rose-400",     bg: "bg-rose-500/15"    },
};

const CHANNEL_META: Record<string, { icon: typeof Mail; label: string }> = {
  push:  { icon: Smartphone,    label: "Push"  },
  email: { icon: Mail,          label: "Email" },
  sms:   { icon: MessageSquare, label: "SMS"   },
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AutoMessagesLogPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["automated-message-log", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as LogRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: LogRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("automated_message_log")
        .select("id, user_id, trigger_type, trigger_ref, channel, sent_at, message_preview")
        .eq("user_id", user.id)
        .order("sent_at", { ascending: false })
        .limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: logs.length,
    push: logs.filter((l) => l.channel === "push").length,
    email: logs.filter((l) => l.channel === "email").length,
    sms: logs.filter((l) => l.channel === "sms").length,
  }), [logs]);

  const filtered = useMemo(() => tab === "all" ? logs : logs.filter((l) => l.channel === tab), [logs, tab]);

  const tabs: Array<{ id: Tab; label: string; count: number }> = [
    { id: "all",   label: "All",   count: stats.total },
    { id: "push",  label: "Push",  count: stats.push  },
    { id: "email", label: "Email", count: stats.email },
    { id: "sms",   label: "SMS",   count: stats.sms   },
  ];

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Auto Messages · ZIVO" description="Log of automated messages we sent." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Send className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Auto Messages</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Messages sent to you</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.push} push · {stats.email} email · {stats.sms} SMS</p>
        </motion.div>

        <button
          type="button"
          onClick={() => navigate("/notifications/preferences")}
          className="w-full h-10 rounded-xl bg-secondary hover:bg-muted text-foreground text-xs font-bold inline-flex items-center justify-center gap-2 transition-colors"
        >
          Manage notification preferences →
        </button>

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
              <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>{t.count}</span>
            </button>
          ))}
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Send className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No automated messages</p>
            <p className="text-xs text-muted-foreground">Cart reminders, birthday wishes, and re-engagement pings will show here.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((l, idx) => {
              const trig = TRIGGER_META[l.trigger_type] ?? { icon: Send, tone: "text-muted-foreground", bg: "bg-secondary" };
              const TrigIcon = trig.icon;
              const chan = CHANNEL_META[l.channel] ?? { icon: Send, label: l.channel };
              const ChanIcon = chan.icon;
              return (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", trig.bg)}>
                    <TrigIcon className={cn("h-4 w-4", trig.tone)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-foreground capitalize">{l.trigger_type.replace(/_/g, " ")}</p>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-secondary text-foreground">
                        <ChanIcon className="h-2.5 w-2.5" /> {chan.label}
                      </span>
                    </div>
                    {l.message_preview && <p className="text-xs text-foreground/85 line-clamp-2 mt-0.5">{l.message_preview}</p>}
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-1">
                      <Clock className="h-2.5 w-2.5" /> {formatRelative(l.sent_at)}
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
