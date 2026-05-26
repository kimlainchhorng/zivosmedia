/**
 * PushDevicesPage — Active push-notification subscriptions across devices.
 * Backed by `push_subscriptions` (orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellRing, Sparkles, Smartphone, Monitor, Tablet, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DeviceType = "web" | "ios" | "android";

interface PushRow {
  id: string;
  user_id: string;
  endpoint: string;
  device_type: DeviceType | null;
  created_at: string;
}

const DEVICE_META: Record<DeviceType, { label: string; icon: typeof Smartphone; tone: string; bg: string }> = {
  web:     { label: "Web",     icon: Monitor,    tone: "text-blue-600 dark:text-blue-400",       bg: "bg-blue-500/15"    },
  ios:     { label: "iOS",     icon: Smartphone, tone: "text-foreground",                        bg: "bg-secondary"      },
  android: { label: "Android", icon: Smartphone, tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/15" },
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 30) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function shortenEndpoint(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}…${u.pathname.slice(-12)}`;
  } catch {
    return url.length > 40 ? `${url.slice(0, 20)}…${url.slice(-15)}` : url;
  }
}

export default function PushDevicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["push-subscriptions-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as PushRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: PushRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb.from("push_subscriptions").select("id, user_id, endpoint, device_type, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    const c: Record<string, number> = {};
    subs.forEach((s) => { if (s.device_type) c[s.device_type] = (c[s.device_type] ?? 0) + 1; });
    return { total: subs.length, web: c.web ?? 0, ios: c.ios ?? 0, android: c.android ?? 0 };
  }, [subs]);

  const revoke = async (id: string) => {
    qc.setQueryData<PushRow[]>(["push-subscriptions-me", user?.id], (old) => (old ?? []).filter((s) => s.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("push_subscriptions").delete().eq("id", id);
    if (error) { toast.error("Couldn't revoke"); qc.invalidateQueries({ queryKey: ["push-subscriptions-me", user?.id] }); }
    else toast.success("Revoked");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Push Devices · ZIVO" description="Active push subscriptions." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <BellRing className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Push Devices</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Receiving push on</p>
          <p className="text-3xl font-bold mt-1">{stats.total} device{stats.total === 1 ? "" : "s"}</p>
          <p className="text-sm text-white/80 mt-1">{stats.ios} iOS · {stats.android} Android · {stats.web} web</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && subs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><BellRing className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No push devices</p>
            <p className="text-xs text-muted-foreground">Enable notifications on your phone or browser to start receiving push.</p>
          </div>
        )}

        {!isLoading && subs.length > 0 && (
          <div className="space-y-2">
            {subs.map((s, idx) => {
              const dt = (s.device_type ?? "web") as DeviceType;
              const meta = DEVICE_META[dt] ?? DEVICE_META.web;
              const Icon = meta.icon;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                    <Icon className={cn("h-4 w-4", meta.tone)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground capitalize">{meta.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono line-clamp-1 mt-0.5">{shortenEndpoint(s.endpoint)}</p>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> Registered {formatRelative(s.created_at)}</p>
                  </div>
                  <button type="button" aria-label="Revoke" onClick={() => revoke(s.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
