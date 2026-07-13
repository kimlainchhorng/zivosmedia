/**
 * MentionsPage — Posts where this user is @-mentioned.
 * Backed by the real `post_mentions` table joined with `user_posts`.
 * Schema existed with no UI — this builds the missing surface.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AtSign, MessageCircle, Heart, Film, Image as ImageIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface MentionRow {
  id: string;
  post_id: string;
  created_at: string | null;
}

interface PostInfo {
  id: string;
  user_id: string;
  caption: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  media_type: string | null;
  likes_count: number | null;
  comments_count: number | null;
  created_at: string | null;
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

function formatRelative(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface AssembledMention {
  mentionId: string;
  post: PostInfo;
  author: AuthorInfo | null;
  mentionedAt: string | null;
}

export default function MentionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ["mentions", user?.id],
    queryFn: async (): Promise<AssembledMention[]> => {
      if (!user?.id) return [];

      // 1. mention rows
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: MentionRow[] | null }>;
              };
            };
          };
        };
      };
      const { data: rows } = await sb
        .from("post_mentions")
        .select("id, post_id, created_at")
        .eq("mentioned_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!rows || rows.length === 0) return [];

      const postIds = rows.map((r) => r.post_id);

      // 2. fetch posts
      const sbIn = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: PostInfo[] | null }>;
          };
        };
      };
      const { data: posts } = await sbIn
        .from("user_posts")
        .select("id, user_id, caption, media_url, media_urls, media_type, likes_count, comments_count, created_at")
        .in("id", postIds);

      const postMap = new Map<string, PostInfo>();
      (posts ?? []).forEach((p) => postMap.set(p.id, p));

      // 3. fetch authors
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
          return {
            mentionId: r.id,
            post,
            author: authorMap.get(post.user_id) ?? null,
            mentionedAt: r.created_at,
          };
        })
        .filter((m): m is AssembledMention => m !== null);
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Mentions · ZIVO" description="Posts where you've been tagged." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <AtSign className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Mentions</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <AtSign className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Tagged in</p>
          <p className="text-3xl font-bold mt-1">{mentions.length} {mentions.length === 1 ? "post" : "posts"}</p>
          <p className="text-sm text-white/80 mt-1">
            People who used @you in their captions are listed here.
          </p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && mentions.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <AtSign className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No mentions yet</p>
            <p className="text-xs text-muted-foreground">
              When someone tags you with @yourname, the post lands here.
            </p>
          </div>
        )}

        {!isLoading && mentions.length > 0 && (
          <div className="space-y-2">
            {mentions.map((m, idx) => {
              const url = firstMediaUrl(m.post);
              const isVideo = m.post.media_type?.startsWith("video");
              const initial = (m.author?.full_name?.[0] ?? m.author?.username?.[0] ?? "U").toUpperCase();
              return (
                <motion.button
                  key={m.mentionId}
                  type="button"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => navigate("/feed")}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
                  aria-label={`Open post mentioning you from ${m.author?.full_name ?? "user"}`}
                >
                  {/* Thumbnail */}
                  <div className="shrink-0 relative w-14 h-14 rounded-xl overflow-hidden bg-muted">
                    {url ? (
                      isVideo ? (
                        <video src={url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                      ) : (
                        <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    {isVideo && <Film className="absolute top-1 right-1 h-3 w-3 text-white drop-shadow-md" />}
                  </div>
                  {/* Author + caption */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={m.author?.avatar_url ?? undefined} alt="" />
                        <AvatarFallback className="bg-muted text-foreground text-[10px] font-semibold">{initial}</AvatarFallback>
                      </Avatar>
                      <p className="text-xs font-bold text-foreground truncate">
                        {m.author?.full_name ?? m.author?.username ?? "Someone"}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">· {formatRelative(m.mentionedAt)}</span>
                    </div>
                    <p className={cn(
                      "text-xs text-muted-foreground line-clamp-2 leading-snug",
                      !m.post.caption && "italic",
                    )}>
                      {m.post.caption ?? "Tagged you in a post"}
                    </p>
                    <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-0.5"><Heart className="h-2.5 w-2.5" />{m.post.likes_count ?? 0}</span>
                      <span className="inline-flex items-center gap-0.5"><MessageCircle className="h-2.5 w-2.5" />{m.post.comments_count ?? 0}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
