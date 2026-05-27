/**
 * CollabsPage — Co-author posts you've been tagged on.
 * Backed by `post_collaborators` — schema present, no UI before this.
 * Tab UX mirrors IG: Pending invites → accept/decline; Accepted → live posts.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Handshake, Check, X, Film, Image as ImageIcon, ChevronRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Status = "pending" | "accepted" | "declined";

interface CollabRow {
  id: string;
  post_id: string;
  status: string | null;
  created_at: string;
}

interface PostInfo {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  media_type: string | null;
}

interface AuthorInfo {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

function firstMediaUrl(p: PostInfo): string | null {
  if (p.media_url) return p.media_url;
  if (p.media_urls && p.media_urls.length > 0) return p.media_urls[0];
  return null;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface AssembledCollab {
  collabId: string;
  status: Status;
  post: PostInfo;
  author: AuthorInfo | null;
  createdAt: string;
}

const TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
];

export default function CollabsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Status>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: collabs = [], isLoading } = useQuery({
    queryKey: ["post-collabs", user?.id],
    queryFn: async (): Promise<AssembledCollab[]> => {
      if (!user?.id) return [];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: CollabRow[] | null }>;
            };
          };
        };
      };
      const { data: rows } = await sb
        .from("post_collaborators")
        .select("id, post_id, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (!rows || rows.length === 0) return [];

      const postIds = rows.map((r) => r.post_id);
      const sbIn = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: PostInfo[] | null }>;
          };
        };
      };
      const { data: posts } = await sbIn
        .from("user_posts")
        .select("id, user_id, caption, media_url, media_urls, media_type")
        .in("id", postIds);
      const postMap = new Map<string, PostInfo>();
      (posts ?? []).forEach((p) => postMap.set(p.id, p));

      const authorIds = Array.from(new Set((posts ?? []).map((p) => p.user_id)));
      let authors: AuthorInfo[] = [];
      if (authorIds.length > 0) {
        const sbAuthors = supabase as unknown as {
          from: (t: string) => {
            select: (s: string) => {
              in: (k: string, v: string[]) => Promise<{ data: AuthorInfo[] | null }>;
            };
          };
        };
        const { data } = await sbAuthors
          .from("profiles")
          .select("user_id, full_name, username, avatar_url")
          .in("user_id", authorIds);
        authors = data ?? [];
      }
      const authorMap = new Map<string, AuthorInfo>();
      authors.forEach((a) => authorMap.set(a.user_id, a));

      return rows
        .map((r) => {
          const post = postMap.get(r.post_id);
          if (!post) return null;
          const status = ((r.status ?? "pending").toLowerCase() as Status);
          return {
            collabId: r.id,
            status: (["pending", "accepted", "declined"] as const).includes(status) ? status : "pending",
            post,
            author: authorMap.get(post.user_id) ?? null,
            createdAt: r.created_at,
          };
        })
        .filter((m): m is AssembledCollab => m !== null);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          update: (payload: Record<string, unknown>) => {
            eq: (k: string, v: string) => Promise<{ error: { message: string } | null }>;
          };
        };
      };
      const { error } = await sb.from("post_collaborators").update({ status }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onMutate: ({ id }) => setBusyId(id),
    onSettled: () => {
      setBusyId(null);
      qc.invalidateQueries({ queryKey: ["post-collabs", user?.id] });
    },
    onSuccess: (_data, { status }) => {
      toast.success(status === "accepted" ? "Accepted" : status === "declined" ? "Declined" : "Updated");
    },
    onError: (e: Error) => toast.error(e.message || "Could not update"),
  });

  const counts = useMemo(() => {
    const map: Record<Status, number> = { pending: 0, accepted: 0, declined: 0 };
    collabs.forEach((c) => { map[c.status]++; });
    return map;
  }, [collabs]);

  const filtered = collabs.filter((c) => c.status === tab);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Collaborations · ZIVO" description="Posts you've been invited to co-author." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Handshake className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Collabs</h1>
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
          <Handshake className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Collaboration invites</p>
          <p className="text-3xl font-bold mt-1">
            {counts.pending} {counts.pending === 1 ? "invite" : "invites"} waiting
          </p>
          <p className="text-sm text-white/80 mt-1">
            {counts.accepted} accepted · {counts.declined} declined
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                tab === t.key
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {t.label}
              <span className={cn("text-[10px] font-bold", tab === t.key ? "text-white/80" : "text-muted-foreground")}>
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && collabs.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Inbox className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No collab invites yet</p>
            <p className="text-xs text-muted-foreground">
              When someone tags you as co-author on their post, the invite lands here.
            </p>
          </div>
        )}

        {!isLoading && collabs.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-10">Nothing here in "{tab}".</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((c, idx) => {
              const url = firstMediaUrl(c.post);
              const isVideo = c.post.media_type?.startsWith("video");
              const initial = (c.author?.full_name?.[0] ?? c.author?.username?.[0] ?? "U").toUpperCase();
              const pending = c.status === "pending";
              const busy = busyId === c.collabId;
              return (
                <motion.div
                  key={c.collabId}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border"
                >
                  {/* Thumbnail */}
                  <button
                    type="button"
                    onClick={() => navigate("/feed")}
                    className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted active:opacity-80"
                    aria-label="View post"
                  >
                    {url ? (
                      isVideo ? (
                        <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : (
	                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    {isVideo && <Film className="absolute top-1 right-1 h-3 w-3 text-white drop-shadow-md" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={c.author?.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">{initial}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-bold text-foreground truncate">
                        {c.author?.full_name ?? c.author?.username ?? "Someone"}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">· {formatRelative(c.createdAt)}</span>
                    </div>
                    <p className={cn(
                      "text-xs text-muted-foreground line-clamp-2 leading-snug",
                      !c.post.caption && "italic",
                    )}>
                      {c.post.caption ?? "Invited you to co-author this post"}
                    </p>
                  </div>

                  {pending ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        disabled={busy}
                        onClick={() => updateMutation.mutate({ id: c.collabId, status: "accepted" })}
                        aria-label="Accept invite"
                        className="h-9 w-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-sm shadow-rose-500/25 disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" strokeWidth={3} />
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        disabled={busy}
                        onClick={() => updateMutation.mutate({ id: c.collabId, status: "declined" })}
                        aria-label="Decline invite"
                        className="h-9 w-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </motion.button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => navigate("/feed")}
                      aria-label="View post"
                      className="shrink-0 h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center text-muted-foreground"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
