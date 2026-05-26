/**
 * ForumsPage — Discussion forums directory.
 * Backed by `forums` + `forum_threads` (both orphan — no UI before this).
 * Click a forum to see its threads sheet (recent + pinned), backed by real data.
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MessageSquare, Lock, Pin, MessageCircle, Clock, X, ChevronRight, Sparkles, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ForumRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string | null;
  is_locked: boolean | null;
  thread_count: number | null;
  last_post_at: string | null;
  sort_order: number | null;
}

interface ThreadRow {
  id: string;
  forum_id: string;
  title: string;
  content: string;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  replies_count: number | null;
  last_reply_at: string | null;
  created_at: string | null;
  user_id: string;
}

function relative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ForumsPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openForumId, setOpenForumId] = useState<string | null>(null);

  const { data: forums = [], isLoading } = useQuery({
    queryKey: ["forums-list"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ForumRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("forums")
        .select("id, name, description, category, icon, is_locked, thread_count, last_post_at, sort_order")
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["forum-threads", openForumId],
    queryFn: async () => {
      if (!openForumId) return [] as ThreadRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: ThreadRow[] | null }>;
              };
            };
          };
        };
      };
      const { data } = await sb
        .from("forum_threads")
        .select("id, forum_id, title, content, is_pinned, is_locked, replies_count, last_reply_at, created_at, user_id")
        .eq("forum_id", openForumId)
        .order("last_reply_at", { ascending: false })
        .limit(25);
      return data ?? [];
    },
    enabled: !!openForumId,
    staleTime: 30_000,
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return forums;
    return forums.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      (f.description?.toLowerCase().includes(q) ?? false) ||
      (f.category?.toLowerCase().includes(q) ?? false),
    );
  }, [forums, query]);

  const openForum = forums.find((f) => f.id === openForumId);
  const pinned = threads.filter((t) => t.is_pinned);
  const rest = threads.filter((t) => !t.is_pinned);

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Forums · ZIVO" description="Browse community discussion forums." />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Forums</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Community</p>
          <p className="text-3xl font-bold mt-1">{forums.length} {forums.length === 1 ? "forum" : "forums"}</p>
          <p className="text-sm text-white/80 mt-1">
            {forums.reduce((s, f) => s + (f.thread_count ?? 0), 0).toLocaleString()} threads total
          </p>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search forums"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && forums.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No forums yet</p>
            <p className="text-xs text-muted-foreground">Discussion boards will appear here as they open.</p>
          </div>
        )}

        {!isLoading && forums.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No forums match your search.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((f, idx) => (
              <motion.button
                key={f.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setOpenForumId(f.id)}
                className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
              >
                <div className="shrink-0 h-11 w-11 rounded-xl bg-ig-gradient flex items-center justify-center text-white text-xl">
                  {f.icon || <MessageSquare className="h-5 w-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{f.name}</p>
                    {f.is_locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                  </div>
                  {f.description && (
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{f.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    {f.category && <span className="capitalize">{f.category}</span>}
                    {f.category && f.thread_count != null && <span>·</span>}
                    {f.thread_count != null && (
                      <span className="inline-flex items-center gap-0.5">
                        <MessageCircle className="h-2.5 w-2.5" />
                        {f.thread_count.toLocaleString()} thread{f.thread_count === 1 ? "" : "s"}
                      </span>
                    )}
                    {f.last_post_at && (
                      <span className="inline-flex items-center gap-0.5">
                        <span>·</span>
                        <Clock className="h-2.5 w-2.5" /> {relative(f.last_post_at)}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Threads sheet */}
      <AnimatePresence>
        {openForum && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpenForumId(null)}
            className="fixed inset-0 z-[1600] bg-background/95 backdrop-blur-xl flex items-end sm:items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            >
              <div className="bg-ig-gradient text-white p-5 relative">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">
                    {openForum.icon || <MessageSquare className="h-5 w-5 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold drop-shadow-sm line-clamp-1">{openForum.name}</p>
                    <p className="text-[11px] text-white/80 line-clamp-1">{openForum.description ?? `${openForum.thread_count ?? 0} threads`}</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setOpenForumId(null)}
                    className="h-9 w-9 rounded-full bg-black/25 backdrop-blur-sm flex items-center justify-center"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto p-4 space-y-2">
                {pinned.length > 0 && (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">Pinned</p>
                    {pinned.map((t) => (
                      <ThreadRowCard key={t.id} thread={t} />
                    ))}
                  </>
                )}
                {rest.length > 0 && (
                  <>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2">Recent</p>
                    {rest.map((t) => (
                      <ThreadRowCard key={t.id} thread={t} />
                    ))}
                  </>
                )}
                {threads.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-10">No threads yet in this forum.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SwipeBackContainer>
  );
}

function ThreadRowCard({ thread }: { thread: ThreadRow }) {
  return (
    <div className={cn(
      "p-3 rounded-2xl border bg-card",
      thread.is_pinned ? "border-rose-500/30 bg-rose-500/[0.02]" : "border-border",
    )}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {thread.is_pinned && <Pin className="h-3 w-3 text-ig-gradient shrink-0" />}
            {thread.is_locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
            <p className="text-sm font-bold text-foreground line-clamp-1">{thread.title}</p>
          </div>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{thread.content}</p>
          <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <MessageCircle className="h-2.5 w-2.5" /> {thread.replies_count ?? 0}
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" /> {relative(thread.last_reply_at ?? thread.created_at)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
