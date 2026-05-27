/**
 * MyPodcastsPage — Podcasts you've subscribed to.
 * Backed by `podcast_subscriptions` joined w/ `podcasts`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Mic, Sparkles, Clock, Trash2, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SubRow { id: string; podcast_id: string; user_id: string; created_at: string; }
interface PodcastRow { id: string; title: string; description: string | null; cover_url: string | null; category: string | null; subscriber_count: number | null; episode_count: number | null; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function MyPodcastsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["my-podcast-subs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as SubRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: SubRow[] | null }> } } } };
      const { data } = await sb.from("podcast_subscriptions").select("id, podcast_id, user_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const podcastIds = useMemo(() => Array.from(new Set(subs.map((s) => s.podcast_id))), [subs]);

  const { data: podcasts = [] } = useQuery({
    queryKey: ["my-podcast-meta", podcastIds.join(",")],
    queryFn: async () => {
      if (podcastIds.length === 0) return [] as PodcastRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: PodcastRow[] | null }> } } };
      const { data } = await sb.from("podcasts").select("id, title, description, cover_url, category, subscriber_count, episode_count").in("id", podcastIds);
      return data ?? [];
    },
    enabled: podcastIds.length > 0,
    staleTime: 60_000,
  });

  const podcastMap = useMemo(() => new Map(podcasts.map((p) => [p.id, p])), [podcasts]);

  const unsubscribe = async (id: string) => {
    qc.setQueryData<SubRow[]>(["my-podcast-subs", user?.id], (old) => (old ?? []).filter((s) => s.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("podcast_subscriptions").delete().eq("id", id);
    if (error) { toast.error("Couldn't unsubscribe"); qc.invalidateQueries({ queryKey: ["my-podcast-subs", user?.id] }); } else toast.success("Unsubscribed");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="My Podcasts · ZIVO" description="Your podcast subscriptions." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Headphones className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">My Podcasts</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Subscribed</p>
          <p className="text-3xl font-bold mt-1">{subs.length} {subs.length === 1 ? "podcast" : "podcasts"}</p>
          <p className="text-sm text-white/80 mt-1">New episodes ping you when they drop</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && subs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Mic className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No subscriptions yet</p>
            <Button onClick={() => navigate("/podcasts")} className="mt-3 bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">Browse podcasts</Button>
          </div>
        )}
        {!isLoading && subs.length > 0 && (
          <div className="space-y-2">
            {subs.map((s, idx) => {
              const p = podcastMap.get(s.podcast_id);
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border">
                  {p?.cover_url ? <img src={p.cover_url} alt="" className="shrink-0 h-14 w-14 rounded-xl object-cover" loading="lazy" /> : <div className="shrink-0 h-14 w-14 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Mic className="h-5 w-5 text-ig-gradient" /></div>}
                  <button type="button" onClick={() => navigate(`/podcasts/${s.podcast_id}`)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{p?.title ?? "Podcast"}</p>
                    {p?.description && <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{p.description}</p>}
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                      {p?.episode_count != null && <span>{p.episode_count} eps</span>}
                      {p?.category && (<><span>·</span><span className="capitalize">{p.category}</span></>)}
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> Subscribed {formatRelative(s.created_at)}</span>
                    </div>
                  </button>
                  <button type="button" aria-label="Unsubscribe" onClick={() => unsubscribe(s.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
