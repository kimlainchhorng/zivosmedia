/**
 * BugReportsPage — Submit + view your bug reports.
 * Backed by `bug_reports` (orphan). Users insert, screenshot URL optional.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bug, Sparkles, Send, Clock, Image as ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface BugRow {
  id: string;
  user_id: string | null;
  description: string;
  screenshot_url: string | null;
  page_url: string | null;
  user_agent: string | null;
  app_version: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function BugReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [screenshotUrl, setScreenshotUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: bugs = [], isLoading } = useQuery({
    queryKey: ["bug-reports", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as BugRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: BugRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("bug_reports")
        .select("id, user_id, description, screenshot_url, page_url, user_agent, app_version, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const submit = async () => {
    if (!user?.id) return;
    const d = description.trim();
    if (d.length < 20) { toast.error("Add a bit more detail — at least 20 characters"); return; }
    setSubmitting(true);
    const sb = supabase as unknown as {
      from: (t: string) => {
        insert: (v: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };
    const { error } = await sb.from("bug_reports").insert({
      user_id: user.id,
      description: d,
      screenshot_url: screenshotUrl.trim() || null,
      page_url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    setSubmitting(false);
    if (error) { toast.error("Couldn't submit"); return; }
    toast.success("Thanks — bug reported");
    setDescription("");
    setScreenshotUrl("");
    qc.invalidateQueries({ queryKey: ["bug-reports", user.id] });
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Bug Reports · ZIVO" description="Report bugs + view past reports." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Bug className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Bug Reports</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Reports filed</p>
          <p className="text-3xl font-bold mt-1">{bugs.length}</p>
          <p className="text-sm text-white/80 mt-1">Help us squash bugs faster — describe what you saw.</p>
        </motion.div>

        {/* New report form */}
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-bold text-foreground">Report a bug</p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What went wrong? What did you expect? Steps to reproduce…"
            rows={5}
            maxLength={3000}
            className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none"
          />
          <input
            type="url"
            value={screenshotUrl}
            onChange={(e) => setScreenshotUrl(e.target.value)}
            placeholder="Screenshot URL (optional)"
            className="w-full h-10 px-3 rounded-xl bg-secondary border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">Page URL + device info captured automatically</p>
            <button
              type="button"
              disabled={submitting || description.trim().length < 20}
              onClick={submit}
              className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {submitting ? "Sending…" : "Submit"}
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-2">{Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>
        )}

        {!isLoading && bugs.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-1 mb-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Past reports</h2>
            </div>
            <div className="space-y-2">
              {bugs.map((b, idx) => (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="flex gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center">
                    <Bug className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground/85 line-clamp-3 whitespace-pre-wrap">{b.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      <span>{formatRelative(b.created_at)}</span>
                      {b.page_url && (
                        <>
                          <span>·</span>
                          <a href={b.page_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
                            <ExternalLink className="h-2.5 w-2.5" /> page
                          </a>
                        </>
                      )}
                      {b.screenshot_url && (
                        <>
                          <span>·</span>
                          <a href={b.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
                            <ImageIcon className="h-2.5 w-2.5" /> screenshot
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
