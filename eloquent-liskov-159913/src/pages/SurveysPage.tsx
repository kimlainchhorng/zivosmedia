/**
 * SurveysPage — Browse open user surveys.
 * Backed by the real `user_surveys` table.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ClipboardList, Clock, Users, Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface SurveyRow {
  id: string;
  description: string | null;
  questions: unknown;
  starts_at: string | null;
  ends_at: string | null;
  response_count: number | null;
  status: string | null;
  target_audience: string | null;
  created_at: string | null;
}

function questionCount(q: unknown): number {
  if (Array.isArray(q)) return q.length;
  if (q && typeof q === "object" && "items" in (q as Record<string, unknown>)) {
    const items = (q as Record<string, unknown>).items;
    if (Array.isArray(items)) return items.length;
  }
  return 0;
}

function expiryLabel(iso: string | null): { label: string; expired: boolean; soon: boolean } {
  if (!iso) return { label: "Open", expired: false, soon: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "Closed", expired: true, soon: false };
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return { label: "Closes today", expired: false, soon: true };
  if (days < 7) return { label: `${days}d left`, expired: false, soon: true };
  return { label: `Closes ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, expired: false, soon: false };
}

export default function SurveysPage() {
  const navigate = useNavigate();

  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["user-surveys"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: SurveyRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("user_surveys")
        .select("id, description, questions, starts_at, ends_at, response_count, status, target_audience, created_at")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const open = useMemo(() => surveys.filter((s) => !expiryLabel(s.ends_at).expired), [surveys]);
  const closed = useMemo(() => surveys.filter((s) => expiryLabel(s.ends_at).expired), [surveys]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Surveys · ZIVO" description="Share your feedback in active surveys." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Surveys</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Open</p>
          <p className="text-3xl font-bold mt-1">{open.length} {open.length === 1 ? "survey" : "surveys"}</p>
          <p className="text-sm text-white/80 mt-1">{surveys.reduce((s, x) => s + (x.response_count ?? 0), 0).toLocaleString()} responses collected</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && surveys.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ClipboardList className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No surveys yet</p>
            <p className="text-xs text-muted-foreground">Active surveys will appear here when they launch.</p>
          </div>
        )}

        {!isLoading && open.length > 0 && (
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Open</p>
            <div className="space-y-2">
              {open.map((s, idx) => {
                const exp = expiryLabel(s.ends_at);
                const qc = questionCount(s.questions);
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => navigate(`/surveys/${s.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
                  >
                    <div className="shrink-0 h-11 w-11 rounded-xl bg-ig-gradient flex items-center justify-center text-white">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{s.description ?? "Survey"}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        <span>{qc} question{qc === 1 ? "" : "s"}</span>
                        {s.response_count != null && (
                          <span className="inline-flex items-center gap-0.5">
                            <Users className="h-2.5 w-2.5" /> {(s.response_count ?? 0).toLocaleString()} responses
                          </span>
                        )}
                        <span className={cn(
                          "inline-flex items-center gap-0.5 ml-auto",
                          exp.soon ? "text-ig-gradient font-bold" : "",
                        )}>
                          <Clock className="h-2.5 w-2.5" /> {exp.label}
                        </span>
                      </div>
                      {s.target_audience && (
                        <p className="text-[10px] text-muted-foreground capitalize mt-0.5">Audience: {s.target_audience}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </motion.button>
                );
              })}
            </div>
          </section>
        )}

        {!isLoading && closed.length > 0 && (
          <section className="pt-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1 mb-2">Closed</p>
            <div className="space-y-2">
              {closed.map((s) => {
                const qc = questionCount(s.questions);
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border opacity-60"
                  >
                    <div className="shrink-0 h-11 w-11 rounded-xl bg-secondary text-muted-foreground flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{s.description ?? "Survey"}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {qc} question{qc === 1 ? "" : "s"} · {(s.response_count ?? 0).toLocaleString()} responses · closed
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </SwipeBackContainer>
  );
}
