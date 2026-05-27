/**
 * ClubsPage — Browse and join interest-based clubs.
 * Backed by `clubs` + `club_members` (both orphan schemas — no UI before this).
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UsersRound, Lock, Globe, Search, Users, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ClubRow {
  id: string;
  name: string;
  category: string | null;
  interest: string | null;
  description: string | null;
  avatar_url: string | null;
  member_count: number | null;
  max_members: number | null;
  privacy: string | null;
  created_by: string;
}

interface MemberRow {
  club_id: string;
  role: string | null;
}

export default function ClubsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ["clubs-catalog"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ClubRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("clubs")
        .select("id, name, category, interest, description, avatar_url, member_count, max_members, privacy, created_by")
        .order("member_count", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: memberships = [] } = useQuery({
    queryKey: ["my-club-memberships", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as MemberRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => Promise<{ data: MemberRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("club_members")
        .select("club_id, role")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const joinedIds = useMemo(() => new Set(memberships.map((m) => m.club_id)), [memberships]);

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    clubs.forEach((c) => { if (c.category) set.add(c.category); });
    return Array.from(set);
  }, [clubs]);

  const filtered = useMemo(() => {
    let out = clubs;
    if (activeCategory !== "All") out = out.filter((c) => c.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      out = out.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false) ||
        (c.interest?.toLowerCase().includes(q) ?? false),
      );
    }
    return out;
  }, [clubs, query, activeCategory]);

  const joinMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!user?.id) throw new Error("Sign in first");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("club_members").insert({ user_id: user.id, club_id: clubId, role: "member" });
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["my-club-memberships", user?.id] });
      qc.invalidateQueries({ queryKey: ["clubs-catalog"] });
    },
    onSuccess: () => toast.success("Joined club"),
    onError: (e: Error) => toast.error(e.message || "Could not join"),
  });

  const leaveMutation = useMutation({
    mutationFn: async (clubId: string) => {
      if (!user?.id) throw new Error("Sign in first");
      const sb = supabase as unknown as {
        from: (t: string) => {
          delete: () => {
            eq: (k: string, v: string) => {
              eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
            };
          };
        };
      };
      const { error } = await sb.from("club_members").delete().eq("user_id", user.id).eq("club_id", clubId);
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["my-club-memberships", user?.id] });
      qc.invalidateQueries({ queryKey: ["clubs-catalog"] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not leave"),
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Clubs · ZIVO" description="Join interest-based clubs and find your people." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <UsersRound className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Clubs</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your circles</p>
          <p className="text-3xl font-bold mt-1">{joinedIds.size} joined</p>
          <p className="text-sm text-white/80 mt-1">{clubs.length} clubs in the directory.</p>
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search clubs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {/* Categories */}
        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActiveCategory(c)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                  activeCategory === c ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && clubs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <UsersRound className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No clubs yet</p>
            <p className="text-xs text-muted-foreground">Clubs will appear here as the community builds them.</p>
          </div>
        )}

        {!isLoading && clubs.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No clubs match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((c, idx) => {
              const joined = joinedIds.has(c.id);
              const busy = busyId === c.id;
              const isPrivate = (c.privacy ?? "").toLowerCase() === "private";
              const initial = (c.name?.[0] ?? "C").toUpperCase();
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 h-12 w-12 rounded-2xl bg-ig-gradient p-[2px]">
                    <div className="w-full h-full rounded-2xl bg-card flex items-center justify-center overflow-hidden">
                      {c.avatar_url ? (
	                        <img src={c.avatar_url} alt={c.name} className="w-full h-full object-cover rounded-2xl" loading="lazy" decoding="async" />
                      ) : (
                        <span className="text-base font-extrabold text-foreground">{initial}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-foreground line-clamp-1">{c.name}</p>
                      {isPrivate ? (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5">
                      {c.category && <span className="capitalize">{c.category}</span>}
                      {c.category && (c.member_count != null) && <span>·</span>}
                      <span className="inline-flex items-center gap-0.5">
                        <Users className="h-2.5 w-2.5" />
                        {(c.member_count ?? 0).toLocaleString()}
                        {c.max_members != null && <> / {c.max_members.toLocaleString()}</>}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{c.description}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => (joined ? leaveMutation.mutate(c.id) : joinMutation.mutate(c.id))}
                    className={cn(
                      "shrink-0 h-9 px-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all",
                      joined
                        ? "bg-secondary text-foreground hover:bg-muted"
                        : "bg-ig-gradient text-white shadow-sm shadow-rose-500/25 hover:opacity-90",
                    )}
                  >
                    {joined ? <><Check className="h-3 w-3" strokeWidth={3} /> Joined</> : "Join"}
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
