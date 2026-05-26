/**
 * StoryViewersPage — Who viewed each of your stories.
 * Backed by `story_views` joined w/ `user_stories`. RLS: owner sees views.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ViewRow { id: string; story_id: string; viewer_id: string; viewed_at: string; }
interface StoryRow { id: string; media_url: string | null; media_type: string | null; caption: string | null; created_at: string; }
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

export default function StoryViewersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step 1: my stories (active or expired within last 7 days)
  const { data: stories = [] } = useQuery({
    queryKey: ["my-stories-7d", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as StoryRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: StoryRow[] | null }> } } } } };
      const { data } = await sb.from("user_stories").select("id, media_url, media_type, caption, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const storyIds = useMemo(() => stories.map((s) => s.id), [stories]);

  // Step 2: views on those stories
  const { data: views = [], isLoading } = useQuery({
    queryKey: ["story-views-on-mine", storyIds.join(",")],
    queryFn: async () => {
      if (storyIds.length === 0) return [] as ViewRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: ViewRow[] | null }> } } } } };
      const { data } = await sb.from("story_views").select("id, story_id, viewer_id, viewed_at").in("story_id", storyIds).order("viewed_at", { ascending: false }).limit(300);
      return data ?? [];
    },
    enabled: storyIds.length > 0,
    staleTime: 30_000,
  });

  const viewerIds = useMemo(() => Array.from(new Set(views.map((v) => v.viewer_id))), [views]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["story-viewers-profiles", viewerIds.join(",")],
    queryFn: async () => {
      if (viewerIds.length === 0) return [] as UserProfile[];
      const csv = viewerIds.join(",");
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => Promise<{ data: UserProfile[] | null }> } } };
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: viewerIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  // Group views by story
  const byStory = useMemo(() => {
    const m = new Map<string, ViewRow[]>();
    views.forEach((v) => {
      const list = m.get(v.story_id) ?? [];
      list.push(v);
      m.set(v.story_id, list);
    });
    return m;
  }, [views]);

  const stats = useMemo(() => ({
    totalViews: views.length,
    uniqueViewers: viewerIds.length,
  }), [views, viewerIds]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Story Viewers · ZIVO" description="Who viewed your stories." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Eye className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Story Viewers</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Total views</p>
          <p className="text-3xl font-bold mt-1">{stats.totalViews}</p>
          <p className="text-sm text-white/80 mt-1">{stats.uniqueViewers} unique viewers across {stories.length} stories</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && stories.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Eye className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No stories yet</p>
            <p className="text-xs text-muted-foreground">Post a story — viewers will show up here.</p>
          </div>
        )}
        {!isLoading && stories.length > 0 && (
          <div className="space-y-3">
            {stories.map((s) => {
              const sViews = byStory.get(s.id) ?? [];
              return (
                <div key={s.id} className="rounded-2xl bg-card border border-border p-3.5">
                  <div className="flex items-start gap-3 mb-2">
                    {s.media_url ? <img src={s.media_url} alt="" className="shrink-0 h-14 w-14 rounded-xl object-cover" loading="lazy" /> : <div className="shrink-0 h-14 w-14 rounded-xl bg-ig-gradient/10" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{s.caption ?? "Story"}</p>
                      <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(s.created_at)} · {sViews.length} views</p>
                    </div>
                  </div>
                  {sViews.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {sViews.slice(0, 12).map((v) => {
                        const p = profileMap.get(v.viewer_id);
                        const name = p?.full_name?.trim() || "Viewer";
                        return p?.avatar_url ? <img key={v.id} src={p.avatar_url} alt={name} title={name} className="h-8 w-8 rounded-full object-cover ring-1 ring-border" loading="lazy" /> : (
                          <div key={v.id} title={name} className="h-8 w-8 rounded-full bg-ig-gradient flex items-center justify-center text-white text-[10px] font-extrabold">{initials(name)}</div>
                        );
                      })}
                      {sViews.length > 12 && <span className="h-8 px-2 rounded-full bg-secondary text-foreground text-[11px] font-bold inline-flex items-center">+{sViews.length - 12}</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
