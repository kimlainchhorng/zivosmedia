/**
 * ChatWallpapersPage — Manage chat backgrounds (default + per-conversation).
 * Backed by `chat_wallpapers` (orphan). RLS: user manages own.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Palette, Sparkles, Star, MessageSquare, Trash2, Check, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WallpaperRow {
  id: string;
  user_id: string;
  conversation_id: string | null;
  wallpaper_url: string;
  is_default: boolean | null;
  created_at: string;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h`;
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function ChatWallpapersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: wallpapers = [], isLoading } = useQuery({
    queryKey: ["chat-wallpapers", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as WallpaperRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: WallpaperRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("chat_wallpapers")
        .select("id, user_id, conversation_id, wallpaper_url, is_default, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const stats = useMemo(() => ({
    total: wallpapers.length,
    defaults: wallpapers.filter((w) => w.is_default).length,
    perChat: wallpapers.filter((w) => w.conversation_id).length,
  }), [wallpapers]);

  const sb = supabase as unknown as {
    from: (t: string) => {
      update: (v: Record<string, unknown>) => {
        eq: (k: string, v: string) => Promise<{ error: unknown }> & {
          eq: (k: string, v: string) => Promise<{ error: unknown }>;
        };
      };
      delete: () => {
        eq: (k: string, v: string) => Promise<{ error: unknown }>;
      };
    };
  };

  const setAsDefault = async (id: string) => {
    // Clear other defaults first, then set this one.
    if (!user?.id) return;
    qc.setQueryData<WallpaperRow[]>(["chat-wallpapers", user.id], (old) =>
      (old ?? []).map((w) => ({ ...w, is_default: w.id === id })),
    );
    await sb.from("chat_wallpapers").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await sb.from("chat_wallpapers").update({ is_default: true }).eq("id", id);
    if (error) {
      toast.error("Couldn't set default");
      qc.invalidateQueries({ queryKey: ["chat-wallpapers", user.id] });
    } else toast.success("Default updated");
  };

  const remove = async (id: string) => {
    qc.setQueryData<WallpaperRow[]>(["chat-wallpapers", user?.id], (old) => (old ?? []).filter((w) => w.id !== id));
    const { error } = await sb.from("chat_wallpapers").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't remove");
      qc.invalidateQueries({ queryKey: ["chat-wallpapers", user?.id] });
    } else toast.success("Removed");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Chat Wallpapers · ZIVO" description="Manage chat backgrounds." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Palette className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Chat Wallpapers</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Wallpapers</p>
          <p className="text-3xl font-bold mt-1">{stats.total} saved</p>
          <p className="text-sm text-white/80 mt-1">{stats.perChat} per-chat · {stats.defaults} default</p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl" />)}</div>
        )}

        {!isLoading && wallpapers.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <ImageIcon className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No wallpapers saved</p>
            <p className="text-xs text-muted-foreground">Pick a wallpaper from any chat's options menu to start collecting.</p>
          </div>
        )}

        {!isLoading && wallpapers.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {wallpapers.map((w, idx) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(idx, 12) * 0.02 }}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted group"
              >
	                <img src={w.wallpaper_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                {w.is_default && (
                  <div className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ig-gradient text-white text-[10px] font-extrabold uppercase tracking-wider">
                    <Star className="h-2.5 w-2.5 fill-current" /> Default
                  </div>
                )}
                {w.conversation_id && (
                  <div className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold">
                    <MessageSquare className="h-2.5 w-2.5" /> Chat
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-[10px] text-white/85 mb-1.5">{formatRelative(w.created_at)}</p>
                  <div className="flex gap-1">
                    {!w.is_default && (
                      <button
                        type="button"
                        onClick={() => setAsDefault(w.id)}
                        className="flex-1 h-7 rounded-full bg-white text-black text-[10px] font-bold inline-flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                      >
                        <Check className="h-2.5 w-2.5" /> Default
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Remove"
                      onClick={() => remove(w.id)}
                      className="h-7 w-7 rounded-full bg-rose-500/80 hover:bg-rose-500 text-white inline-flex items-center justify-center active:scale-95 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
