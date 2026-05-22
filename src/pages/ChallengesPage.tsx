/**
 * ChallengesPage — Browse and join social challenges.
 * Backed by the real `challenges` + `challenge_participants` tables.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Flag, Hash, Users, Clock, Sparkles, Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChallengeRow {
  id: string;
  challenge_type: string | null;
  description: string | null;
  cover_url: string | null;
  hashtag: string | null;
  ends_at: string | null;
  is_featured: boolean | null;
  max_participants: number | null;
  participant_count: number | null;
  creator_id: string;
}

interface ParticipantRow {
  challenge_id: string;
}

function relativeEndsIn(iso: string | null): { label: string; expired: boolean; soon: boolean } {
  if (!iso) return { label: "Ongoing", expired: false, soon: false };
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "Ended", expired: true, soon: false };
  const days = Math.floor(ms / 86_400_000);
  if (days < 1) return { label: "Ends today", expired: false, soon: true };
  if (days < 3) return { label: `Ends in ${days}d`, expired: false, soon: true };
  return { label: `${days}d left`, expired: false, soon: false };
}

export default function ChallengesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "featured" | "active">("active");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ["challenges-catalog"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ChallengeRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("challenges")
        .select("id, challenge_type, description, cover_url, hashtag, ends_at, is_featured, max_participants, participant_count, creator_id")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: myParticipations = [] } = useQuery({
    queryKey: ["my-challenge-participations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ParticipantRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => Promise<{ data: ParticipantRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("challenge_participants")
        .select("challenge_id")
        .eq("user_id", user.id);
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const joinedIds = useMemo(() => new Set(myParticipations.map((p) => p.challenge_id)), [myParticipations]);

  const filtered = useMemo(() => {
    return challenges.filter((c) => {
      const exp = relativeEndsIn(c.ends_at);
      if (filter === "featured") return c.is_featured;
      if (filter === "active") return !exp.expired;
      return true;
    });
  }, [challenges, filter]);

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      if (!user?.id) throw new Error("Sign in first");
      const sb = supabase as unknown as {
        from: (t: string) => {
          insert: (payload: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      };
      const { error } = await sb.from("challenge_participants").insert({ user_id: user.id, challenge_id: challengeId });
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["my-challenge-participations", user?.id] });
    },
    onSuccess: () => toast.success("Joined challenge"),
    onError: (e: Error) => toast.error(e.message || "Could not join"),
  });

  const leaveMutation = useMutation({
    mutationFn: async (challengeId: string) => {
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
      const { error } = await sb.from("challenge_participants").delete().eq("user_id", user.id).eq("challenge_id", challengeId);
      if (error) throw new Error(error.message);
    },
    onMutate: (id) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["my-challenge-participations", user?.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Could not leave"),
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Challenges · ZIVO" description="Join social challenges and grow with the community." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Flag className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Challenges</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">You're in</p>
          <p className="text-3xl font-bold mt-1">{joinedIds.size} {joinedIds.size === 1 ? "challenge" : "challenges"}</p>
          <p className="text-sm text-white/80 mt-1">{challenges.filter((c) => !relativeEndsIn(c.ends_at).expired).length} active worldwide.</p>
        </motion.div>

        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {(["active", "featured", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all capitalize",
                filter === f ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && challenges.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Trophy className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No challenges yet</p>
            <p className="text-xs text-muted-foreground">Challenges will appear here as creators launch them.</p>
          </div>
        )}

        {!isLoading && challenges.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No challenges in this filter.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((c, idx) => {
              const exp = relativeEndsIn(c.ends_at);
              const joined = joinedIds.has(c.id);
              const busy = busyId === c.id;
              const pct = c.max_participants && c.participant_count
                ? Math.min(100, Math.round((c.participant_count / c.max_participants) * 100))
                : null;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="rounded-2xl bg-card border border-border overflow-hidden"
                >
                  {/* Cover */}
                  <div className="relative h-32 bg-muted">
                    {c.cover_url ? (
	                      <img src={c.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    {c.is_featured && (
                      <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-white/95 text-foreground text-[10px] font-bold rounded-full px-2 py-0.5">
                        <Sparkles className="h-2.5 w-2.5" /> Featured
                      </span>
                    )}
                    <span className={cn(
                      "absolute top-2 right-2 inline-flex items-center gap-1 backdrop-blur-sm text-[10px] font-bold rounded-full px-2 py-0.5",
                      exp.expired ? "bg-destructive/80 text-white" : exp.soon ? "bg-ig-gradient text-white" : "bg-black/55 text-white",
                    )}>
                      <Clock className="h-2.5 w-2.5" /> {exp.label}
                    </span>
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      {c.hashtag && (
                        <p className="text-xs font-bold inline-flex items-center gap-0.5 drop-shadow-md mb-1">
                          <Hash className="h-3 w-3" />
                          {c.hashtag.replace(/^#/, "")}
                        </p>
                      )}
                      <p className="text-sm font-bold line-clamp-2 drop-shadow-md leading-tight">{c.description ?? c.challenge_type ?? "Challenge"}</p>
                    </div>
                  </div>
                  {/* Footer */}
                  <div className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground inline-flex items-center gap-0.5">
                        <Users className="h-3 w-3" />
                        {(c.participant_count ?? 0).toLocaleString()}
                        {c.max_participants && <> / {c.max_participants.toLocaleString()}</>} joined
                      </p>
                      {pct !== null && (
                        <div className="mt-1 h-1 w-full bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5 }}
                            className="h-full bg-ig-gradient rounded-full"
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={busy || exp.expired}
                      onClick={() => (joined ? leaveMutation.mutate(c.id) : joinMutation.mutate(c.id))}
                      className={cn(
                        "shrink-0 h-9 px-3 rounded-full text-xs font-bold inline-flex items-center justify-center gap-1 active:scale-95 transition-all",
                        joined
                          ? "bg-secondary text-foreground hover:bg-muted"
                          : exp.expired
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-ig-gradient text-white shadow-sm shadow-rose-500/25 hover:opacity-90",
                      )}
                    >
                      {joined ? <><Check className="h-3 w-3" strokeWidth={3} /> Joined</> : exp.expired ? "Ended" : "Join"}
                    </button>
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
