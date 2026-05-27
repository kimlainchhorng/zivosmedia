/**
 * ProfileViewsPage — Who viewed your profile recently.
 * Backed by `profile_views` (orphan). RLS: profile owner sees views.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Sparkles, Clock, UserCircle2, ChevronRight, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ViewRow {
  id: string;
  profile_id: string;
  viewer_id: string | null;
  viewed_at: string;
}

interface UserProfile { id: string; user_id: string | null; full_name: string | null; avatar_url: string | null; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function initials(name: string | null): string {
  if (!name) return "?";
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

export default function ProfileViewsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: views = [], isLoading } = useQuery({
    queryKey: ["profile-views-me", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ViewRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ViewRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb.from("profile_views").select("id, profile_id, viewer_id, viewed_at").eq("profile_id", user.id).order("viewed_at", { ascending: false }).limit(200);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const viewerIds = useMemo(() => Array.from(new Set(views.map((v) => v.viewer_id).filter(Boolean) as string[])), [views]);

  const { data: viewers = [] } = useQuery({
    queryKey: ["profile-views-viewers", viewerIds.join(",")],
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

  const viewerMap = useMemo(() => {
    const m = new Map<string, UserProfile>();
    viewers.forEach((p) => { if (p.id) m.set(p.id, p); if (p.user_id) m.set(p.user_id, p); });
    return m;
  }, [viewers]);

  const stats = useMemo(() => ({
    total: views.length,
    unique: viewerIds.length,
    anon: views.filter((v) => !v.viewer_id).length,
    today: views.filter((v) => Date.now() - new Date(v.viewed_at).getTime() < 86_400_000).length,
  }), [views, viewerIds]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Profile Views · ZIVO" description="Who viewed your profile." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Eye className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Profile Views</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Views</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.unique} unique · {stats.today} today</p>
        </motion.div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && views.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Eye className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No views yet</p>
            <p className="text-xs text-muted-foreground">When someone visits your profile, they'll appear here.</p>
          </div>
        )}

        {!isLoading && views.length > 0 && (
          <div className="space-y-1.5">
            {views.map((v, idx) => {
              const viewer = v.viewer_id ? viewerMap.get(v.viewer_id) : null;
              const anon = !v.viewer_id;
              const name = viewer?.full_name?.trim() || (anon ? "Anonymous" : "User");
              return (
                <motion.button
                  key={v.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 20) * 0.015 }}
                  onClick={() => v.viewer_id && navigate(`/user/${v.viewer_id}`)}
                  disabled={anon}
                  className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left disabled:cursor-not-allowed"
                >
                  {anon ? (
                    <div className="shrink-0 h-9 w-9 rounded-full bg-secondary flex items-center justify-center"><EyeOff className="h-4 w-4 text-muted-foreground" /></div>
                  ) : viewer?.avatar_url ? (
                    <img src={viewer.avatar_url} alt="" className="shrink-0 h-9 w-9 rounded-full object-cover" loading="lazy" />
                  ) : (
                    <div className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient flex items-center justify-center text-white text-xs font-extrabold">{initials(name)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{name}</p>
                    <p className="text-[11px] text-muted-foreground inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(v.viewed_at)}</p>
                  </div>
                  {!anon && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
