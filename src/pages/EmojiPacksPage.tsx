/**
 * EmojiPacksPage — Browse public + your own custom emoji packs.
 * Backed by `custom_emoji_packs` (orphan).
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Smile, Sparkles, Lock, Globe, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type EmojiItem = { name?: string; url?: string; key?: string };

interface PackRow {
  id: string;
  owner_id: string;
  group_id: string | null;
  name: string;
  emojis: EmojiItem[];
  is_public: boolean;
  created_at: string;
}

type Tab = "all" | "mine" | "public";

export default function EmojiPacksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data: packs = [], isLoading } = useQuery({
    queryKey: ["custom-emoji-packs", user?.id],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            or: (f: string) => {
              order: (k: string, opts: { ascending: boolean }) => {
                limit: (n: number) => Promise<{ data: PackRow[] | null }>;
              };
            };
          };
        };
      };
      const filter = user?.id ? `is_public.eq.true,owner_id.eq.${user.id}` : `is_public.eq.true`;
      const { data } = await sb.from("custom_emoji_packs").select("id, owner_id, group_id, name, emojis, is_public, created_at").or(filter).order("created_at", { ascending: false }).limit(60);
      return (data ?? []).map((p) => ({ ...p, emojis: Array.isArray(p.emojis) ? p.emojis : [] }));
    },
    staleTime: 60_000,
  });

  const stats = useMemo(() => ({
    total: packs.length,
    mine: packs.filter((p) => p.owner_id === user?.id).length,
    publicCount: packs.filter((p) => p.is_public).length,
  }), [packs, user?.id]);

  const filtered = useMemo(() => {
    if (tab === "mine") return packs.filter((p) => p.owner_id === user?.id);
    if (tab === "public") return packs.filter((p) => p.is_public && p.owner_id !== user?.id);
    return packs;
  }, [packs, tab, user?.id]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Emoji Packs · ZIVO" description="Custom emoji collections." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Smile className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Emoji Packs</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Packs</p>
          <p className="text-3xl font-bold mt-1">{stats.total}</p>
          <p className="text-sm text-white/80 mt-1">{stats.mine} yours · {stats.publicCount} public</p>
        </motion.div>

        <div className="flex gap-2">
          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
          <button type="button" onClick={() => setTab("mine")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "mine" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Mine ({stats.mine})</button>
          <button type="button" onClick={() => setTab("public")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "public" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Public</button>
        </div>

        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)}</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Smile className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No emoji packs yet</p>
            <p className="text-xs text-muted-foreground">Create or import a pack to use custom emojis in your messages.</p>
          </div>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((p, idx) => {
              const isMine = p.owner_id === user?.id;
              const isOpen = expanded.has(p.id);
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.03 }}
                  className="rounded-2xl bg-card border border-border overflow-hidden"
                >
                  <button type="button" onClick={() => toggleExpand(p.id)} className="w-full text-left p-3.5 hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 h-10 w-10 rounded-xl bg-ig-gradient/10 flex items-center justify-center"><Smile className="h-4 w-4 text-ig-gradient" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-foreground line-clamp-1">{p.name}</p>
                          {isMine && <span className="text-[9px] font-extrabold uppercase tracking-wider bg-ig-gradient/15 text-ig-gradient px-1.5 py-0.5 rounded-full">Yours</span>}
                          {p.is_public ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full"><Globe className="h-2.5 w-2.5" />Public</span>
                          ) : p.group_id ? (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full"><Users className="h-2.5 w-2.5" />Group</span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold uppercase tracking-wider bg-secondary text-muted-foreground px-1.5 py-0.5 rounded-full"><Lock className="h-2.5 w-2.5" />Private</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.emojis.length} emoji{p.emojis.length === 1 ? "" : "s"}</p>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                    </div>
                  </button>
                  {isOpen && p.emojis.length > 0 && (
                    <div className="border-t border-border/60 p-3 grid grid-cols-8 gap-2">
                      {p.emojis.slice(0, 64).map((e, i) => (
                        <div key={i} className="aspect-square rounded-lg bg-secondary flex items-center justify-center overflow-hidden" title={e.name || e.key}>
	                          {e.url ? <img src={e.url} alt={e.name || ""} className="w-full h-full object-cover" loading="lazy" decoding="async" /> : <span className="text-lg">{e.name?.[0] ?? "?"}</span>}
                        </div>
                      ))}
                    </div>
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
