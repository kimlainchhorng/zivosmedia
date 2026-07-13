/**
 * FanBadgesPage — Badges you've earned by supporting creators.
 * Backed by `fan_badges` (orphan). IG-style "Top Fan" collection.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Award, Sparkles, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface BadgeRow {
  id: string;
  badge_type: string;
  badge_name: string | null;
  badge_icon: string | null;
  creator_id: string;
  earned_at: string | null;
}

interface CreatorInfo {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function FanBadgesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeType, setActiveType] = useState<string>("All");

  const { data: badges = [], isLoading } = useQuery({
    queryKey: ["fan-badges", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as BadgeRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: BadgeRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("fan_badges")
        .select("id, badge_type, badge_name, badge_icon, creator_id, earned_at")
        .eq("fan_id", user.id)
        .order("earned_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const creatorIds = useMemo(() => Array.from(new Set(badges.map((b) => b.creator_id))), [badges]);

  const { data: creators = [] } = useQuery({
    queryKey: ["fan-badges-creators", creatorIds.join(",")],
    queryFn: async () => {
      if (creatorIds.length === 0) return [] as CreatorInfo[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: CreatorInfo[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("profiles")
        .select("user_id, full_name, username, avatar_url")
        .in("user_id", creatorIds);
      return data ?? [];
    },
    enabled: creatorIds.length > 0,
    staleTime: 60_000,
  });

  const creatorMap = useMemo(() => {
    const m = new Map<string, CreatorInfo>();
    creators.forEach((c) => m.set(c.user_id, c));
    return m;
  }, [creators]);

  const types = useMemo(() => {
    const set = new Set<string>(["All"]);
    badges.forEach((b) => { if (b.badge_type) set.add(b.badge_type); });
    return Array.from(set);
  }, [badges]);

  const filtered = useMemo(() => {
    if (activeType === "All") return badges;
    return badges.filter((b) => b.badge_type === activeType);
  }, [badges, activeType]);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Fan Badges · ZIVO" description="Badges you've earned by supporting creators." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Award className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Fan Badges</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Earned</p>
          <p className="text-3xl font-bold mt-1">{badges.length} {badges.length === 1 ? "badge" : "badges"}</p>
          <p className="text-sm text-white/80 mt-1">
            from {creatorIds.length} {creatorIds.length === 1 ? "creator" : "creators"}
          </p>
        </motion.div>

        {types.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeType === t ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && badges.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Award className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No fan badges yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Subscribe to a creator, send tips, or join their close-friends list to earn badges.
            </p>
            <Button
              onClick={() => navigate("/feed")}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              Discover creators
            </Button>
          </div>
        )}

        {!isLoading && badges.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No badges in this category.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((b, idx) => {
              const creator = creatorMap.get(b.creator_id);
              const initial = (creator?.full_name?.[0] ?? creator?.username?.[0] ?? "C").toUpperCase();
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => creator && navigate(`/user/${creator.user_id}`)}
                  className="relative aspect-square rounded-2xl bg-card border border-border overflow-hidden text-left active:opacity-90"
                  aria-label={`${b.badge_name ?? b.badge_type} badge from ${creator?.full_name ?? "creator"}`}
                >
                  {/* Big badge emoji centered */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-20 w-20 rounded-full bg-ig-gradient flex items-center justify-center shadow-lg shadow-rose-500/30">
                      <span className="text-4xl select-none">{b.badge_icon || "🏅"}</span>
                    </div>
                  </div>

                  {/* Creator avatar top-left */}
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 bg-card/95 backdrop-blur-sm rounded-full pl-0.5 pr-2 py-0.5 shadow-sm">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={creator?.avatar_url ?? undefined} alt="" />
                      <AvatarFallback className="bg-muted text-foreground text-[9px] font-bold">{initial}</AvatarFallback>
                    </Avatar>
                    <span className="text-[10px] font-bold text-foreground line-clamp-1 max-w-[80px]">
                      {creator?.full_name ?? creator?.username ?? "Creator"}
                    </span>
                  </div>

                  {/* Bottom strip with label */}
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-card via-card/95 to-card/0 p-2.5">
                    <p className="text-xs font-bold text-foreground line-clamp-1 capitalize">{b.badge_name ?? b.badge_type.replace(/_/g, " ")}</p>
                    <p className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> earned {formatRelative(b.earned_at)}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        {!isLoading && badges.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1">
            <ChevronRight className="h-3 w-3" /> Tap any badge to open the creator's profile
          </p>
        )}
      </div>
    </SwipeBackContainer>
  );
}
