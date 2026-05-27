/**
 * TravelJournalsPage — Trip-by-trip travel diary.
 * Backed by `travel_journals` (parent) + `journal_entries` (orphan schemas).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, NotebookPen, Plus, MapPin, Calendar, Trash2, Lock, Globe, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface JournalRow {
  id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_url: string | null;
  is_public: boolean | null;
  entry_count: number | null;
  created_at: string | null;
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Open trip";
  const d = (s: string | null) => s ? new Date(s).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
  if (start && end) return `${d(start)} → ${d(end)}`;
  return d(start || end || "");
}

export default function TravelJournalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const { data: journals = [], isLoading } = useQuery({
    queryKey: ["travel-journals", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as JournalRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: JournalRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("travel_journals")
        .select("id, title, description, destination, start_date, end_date, cover_url, is_public, entry_count, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !title.trim()) throw new Error("Add a title");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("travel_journals").insert({
        user_id: user.id,
        title: title.trim().slice(0, 100),
        destination: destination.trim().slice(0, 80) || null,
        is_public: isPublic,
        entry_count: 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Journal started");
      qc.invalidateQueries({ queryKey: ["travel-journals", user?.id] });
      setCreating(false);
      setTitle("");
      setDestination("");
      setIsPublic(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not create"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      // Best-effort: clean entries first.
      const entriesClient = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => Promise<{ error: unknown }>;
          };
        };
      };
      await entriesClient.from("journal_entries").delete().eq("journal_id", id);
      const { error } = await sb.from("travel_journals").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Journal removed");
      qc.invalidateQueries({ queryKey: ["travel-journals", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete"),
  });

  const totalEntries = journals.reduce((s, j) => s + (j.entry_count ?? 0), 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Travel Journals · ZIVO" description="Your trip-by-trip travel diary." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <NotebookPen className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Travel Journals</h1>
          </div>
          {!creating && (
            <Button
              size="sm"
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
              New
            </Button>
          )}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Memories</p>
          <p className="text-3xl font-bold mt-1">{journals.length} {journals.length === 1 ? "journal" : "journals"}</p>
          <p className="text-sm text-white/80 mt-1">{totalEntries} entr{totalEntries === 1 ? "y" : "ies"} across all journals</p>
        </motion.div>

        <AnimatePresence>
          {creating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-border p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">New journal</p>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => setCreating(false)}
                  className="h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Title (e.g. Tokyo 2026, Iceland honeymoon)"
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <input
                type="text"
                placeholder="Destination (optional)"
                maxLength={80}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-xs text-foreground inline-flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Make public — anyone can read
                </span>
              </label>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!title.trim() || createMutation.isPending}
                className="w-full bg-ig-gradient text-white font-bold rounded-xl h-10 hover:opacity-90 border-0 disabled:opacity-40"
              >
                {createMutation.isPending ? "Saving…" : "Start journal"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && journals.length === 0 && !creating && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <NotebookPen className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No journals yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start a journal for your next trip — track places, moods, weather, photos.</p>
            <Button
              onClick={() => setCreating(true)}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} /> Start your first journal
            </Button>
          </div>
        )}

        {!isLoading && journals.length > 0 && (
          <div className="space-y-3">
            {journals.map((j, idx) => (
              <motion.div
                key={j.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="relative rounded-2xl bg-card border border-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => navigate(`/journals/${j.id}`)}
                  className="w-full text-left active:opacity-90 transition-opacity"
                  aria-label={`Open journal ${j.title}`}
                >
                  <div className="relative h-24 bg-muted">
                    {j.cover_url ? (
                      <img src={j.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                    <span className={cn(
                      "absolute top-2 right-2 inline-flex items-center gap-0.5 backdrop-blur-sm text-[10px] font-bold rounded-full px-2 py-0.5",
                      j.is_public ? "bg-black/40 text-white" : "bg-black/55 text-white",
                    )}>
                      {j.is_public ? <><Globe className="h-2.5 w-2.5" /> Public</> : <><Lock className="h-2.5 w-2.5" /> Private</>}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-base font-bold text-foreground line-clamp-1">{j.title}</p>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground flex-wrap">
                      {j.destination && (
                        <span className="inline-flex items-center gap-0.5">
                          <MapPin className="h-2.5 w-2.5" /> {j.destination}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-0.5">
                        <Calendar className="h-2.5 w-2.5" /> {formatDateRange(j.start_date, j.end_date)}
                      </span>
                      <span>· {j.entry_count ?? 0} entr{j.entry_count === 1 ? "y" : "ies"}</span>
                    </div>
                    {j.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{j.description}</p>
                    )}
                  </div>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${j.title}`}
                  onClick={() => { if (confirm(`Delete journal "${j.title}"?`)) deleteMutation.mutate(j.id); }}
                  className="absolute top-2 left-2 h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-destructive/80 active:scale-90 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
