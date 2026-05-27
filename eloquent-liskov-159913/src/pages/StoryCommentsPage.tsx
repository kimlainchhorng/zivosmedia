/**
 * StoryCommentsPage — Comments on stories (you've left + on your stories).
 * Backed by `story_comments` (orphan, authenticated can read).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Sparkles, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Tab = "mine" | "on-my-stories";

interface CommentRow { id: string; story_id: string; user_id: string; content: string; created_at: string; }
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

export default function StoryCommentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("mine");

  const { data: mine = [], isLoading: minelLoading } = useQuery({
    queryKey: ["story-comments-mine", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as CommentRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: CommentRow[] | null }> } } } } };
      const { data } = await sb.from("story_comments").select("id, story_id, user_id, content, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: !!user?.id && tab === "mine",
    staleTime: 30_000,
  });

  // For "on my stories", we'd need a join: stories where user_id=me, then comments with story_id in that set.
  const { data: storyIds = [] } = useQuery({
    queryKey: ["my-story-ids", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as string[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: { id: string }[] | null }> } } } } };
      const { data } = await sb.from("user_stories").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
      return (data ?? []).map((r) => r.id);
    },
    enabled: !!user?.id && tab === "on-my-stories",
    staleTime: 60_000,
  });

  const { data: onMine = [], isLoading: onMineLoading } = useQuery({
    queryKey: ["comments-on-my-stories", storyIds.join(",")],
    queryFn: async () => {
      if (storyIds.length === 0) return [] as CommentRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => { order: (k: string, o: { ascending: boolean }) => { limit: (n: number) => Promise<{ data: CommentRow[] | null }> } } } } };
      const { data } = await sb.from("story_comments").select("id, story_id, user_id, content, created_at").in("story_id", storyIds).order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
    enabled: storyIds.length > 0 && tab === "on-my-stories",
    staleTime: 30_000,
  });

  const comments = tab === "mine" ? mine : onMine;
  const isLoading = tab === "mine" ? minelLoading : onMineLoading;

  const userIds = useMemo(() => Array.from(new Set(comments.map((c) => c.user_id))), [comments]);
  const { data: profiles = [] } = useQuery({
    queryKey: ["story-comments-profiles", userIds.join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [] as UserProfile[];
      const csv = userIds.join(",");
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { or: (f: string) => Promise<{ data: UserProfile[] | null }> } } };
      const { data } = await sb.from("public_profiles").select("id, user_id, full_name, avatar_url").or(`id.in.(${csv}),user_id.in.(${csv})`);
      return data ?? [];
    },
    enabled: userIds.length > 0,
    staleTime: 60_000,
  });

  const profileMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    profiles.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [profiles]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Story Comments · ZIVO" description="Comments on stories." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><MessageSquare className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Story Comments</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Comments</p>
          <p className="text-3xl font-bold mt-1">{comments.length}</p>
          <p className="text-sm text-white/80 mt-1">{tab === "mine" ? "By you" : "On your stories"}</p>
        </motion.div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("mine")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "mine" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>By me</button>
          <button type="button" onClick={() => setTab("on-my-stories")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "on-my-stories" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>On my stories</button>
        </div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && comments.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><MessageSquare className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No comments yet</p>
          </div>
        )}
        {!isLoading && comments.length > 0 && (
          <div className="space-y-2">
            {comments.map((c, idx) => {
              const p = profileMap.get(c.user_id);
              const name = p?.full_name?.trim() || (c.user_id === user?.id ? "You" : "User");
              return (
                <motion.div key={c.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-start gap-3 p-3 rounded-2xl bg-card border border-border">
                  {p?.avatar_url ? <img src={p.avatar_url} alt="" className="shrink-0 h-9 w-9 rounded-full object-cover" loading="lazy" /> : <div className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                    <p className="text-xs text-foreground/85 whitespace-pre-wrap line-clamp-3 mt-0.5">{c.content}</p>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5 mt-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(c.created_at)}</p>
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
