/**
 * SpamDetectionsPage — Content the system flagged on your account, with
 * confidence + action taken. Transparency feature.
 * Backed by `spam_detections` (orphan). RLS: user SELECT own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ShieldOff, Sparkles, Clock, Flag, Slash, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface DetectionRow {
  id: string;
  user_id: string | null;
  content_type: string | null;
  content_id: string | null;
  detection_method: string | null;
  confidence: number | null;
  pattern: string | null;
  action_taken: string | null;
  is_false_positive: boolean | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function actionMeta(action: string | null): { tone: string; bg: string } {
  const a = (action ?? "").toLowerCase();
  if (a.includes("remov") || a.includes("delet") || a.includes("block")) return { tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/15" };
  if (a.includes("hide") || a.includes("limit")) return { tone: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/15" };
  if (a.includes("flag") || a.includes("review")) return { tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/15" };
  return { tone: "text-muted-foreground", bg: "bg-secondary" };
}

export default function SpamDetectionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: detections = [], isLoading } = useQuery({
    queryKey: ["spam-detections-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as DetectionRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: DetectionRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("spam_detections")
        .select("id, user_id, content_type, content_id, detection_method, confidence, pattern, action_taken, is_false_positive, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: detections.length,
    fp: detections.filter((d) => d.is_false_positive).length,
    highConf: detections.filter((d) => (d.confidence ?? 0) >= 0.85).length,
  }), [detections]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Spam Detections · ZIVO" description="Content flagged on your account." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ShieldOff className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Spam Detections</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Detections</p>
          <p className="text-3xl font-bold mt-1">{stats.total === 0 ? "Clean" : stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.highConf} high-confidence · {stats.fp} false positive</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && detections.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ShieldCheck className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No detections on file</p>
            <p className="text-xs text-muted-foreground">Our automated systems haven't flagged anything from your account.</p>
          </div>
        )}

        {!isLoading && detections.length > 0 && (
          <div className="space-y-2">
            {detections.map((d, idx) => {
              const a = actionMeta(d.action_taken);
              const conf = Math.round((d.confidence ?? 0) * 100);
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className={cn("flex items-start gap-3 p-3 rounded-2xl bg-card border border-border", d.is_false_positive && "opacity-70")}
                >
                  <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", a.bg)}>
                    {d.is_false_positive ? <ShieldCheck className={cn("h-4 w-4", a.tone)} /> : <AlertTriangle className={cn("h-4 w-4", a.tone)} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-sm font-bold text-foreground capitalize">{d.content_type ?? "content"}</p>
                      {d.action_taken && (
                        <span className={cn("text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-full capitalize", a.bg, a.tone)}>
                          {d.action_taken.replace(/_/g, " ")}
                        </span>
                      )}
                      {d.is_false_positive && (
                        <span className="text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">False positive</span>
                      )}
                    </div>
                    {d.pattern && <p className="text-xs text-foreground/85 mt-0.5 italic line-clamp-1">"{d.pattern}"</p>}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(d.created_at)}</span>
                      {d.detection_method && (<><span>·</span><span className="capitalize">{d.detection_method.replace(/_/g, " ")}</span></>)}
                      {typeof d.confidence === "number" && (<><span>·</span><span className="font-mono">{conf}% confident</span></>)}
                    </div>
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
