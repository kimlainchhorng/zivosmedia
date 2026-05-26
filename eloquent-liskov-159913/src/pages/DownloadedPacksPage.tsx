/**
 * DownloadedPacksPage — Sticker packs you've downloaded.
 * Backed by `user_downloaded_packs` joined w/ `sticker_store_packs`.
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Sticker, Sparkles, Clock, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DownloadRow { id: string; user_id: string; pack_id: string; created_at: string; }
interface PackRow { id: string; name: string; preview_emoji: string; sticker_count: number; gradient_color: string; category: string; }

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  if (ms < 86_400_000 * 7) return `${Math.floor(ms / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function DownloadedPacksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: downloads = [], isLoading } = useQuery({
    queryKey: ["user-downloaded-packs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as DownloadRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: string) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: DownloadRow[] | null }> } } } };
      const { data } = await sb.from("user_downloaded_packs").select("id, user_id, pack_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const packIds = useMemo(() => Array.from(new Set(downloads.map((d) => d.pack_id))), [downloads]);

  const { data: packs = [] } = useQuery({
    queryKey: ["user-downloaded-packs-meta", packIds.join(",")],
    queryFn: async () => {
      if (packIds.length === 0) return [] as PackRow[];
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: PackRow[] | null }> } } };
      const { data } = await sb.from("sticker_store_packs").select("id, name, preview_emoji, sticker_count, gradient_color, category").in("id", packIds);
      return data ?? [];
    },
    enabled: packIds.length > 0,
    staleTime: 5 * 60_000,
  });

  const packMap = useMemo(() => new Map(packs.map((p) => [p.id, p])), [packs]);

  const remove = async (id: string) => {
    qc.setQueryData<DownloadRow[]>(["user-downloaded-packs", user?.id], (old) => (old ?? []).filter((d) => d.id !== id));
    const sb = supabase as unknown as { from: (t: string) => { delete: () => { eq: (k: string, v: string) => Promise<{ error: unknown }> } } };
    const { error } = await sb.from("user_downloaded_packs").delete().eq("id", id);
    if (error) { toast.error("Couldn't remove"); qc.invalidateQueries({ queryKey: ["user-downloaded-packs", user?.id] }); } else toast.success("Removed");
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Downloaded Packs · ZIVO" description="Your sticker downloads." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Sticker className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Downloaded Packs</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your packs</p>
          <p className="text-3xl font-bold mt-1">{downloads.length}</p>
          <p className="text-sm text-white/80 mt-1">Sticker packs you've downloaded for chat</p>
        </motion.div>
        {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && downloads.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20"><Download className="h-7 w-7 text-white" /></div>
            <p className="text-base font-bold text-foreground mb-1">No packs downloaded</p>
            <Button onClick={() => navigate("/sticker-store")} className="mt-3 bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0">Browse store</Button>
          </div>
        )}
        {!isLoading && downloads.length > 0 && (
          <div className="space-y-2">
            {downloads.map((d, idx) => {
              const p = packMap.get(d.pack_id);
              return (
                <motion.div key={d.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(idx, 12) * 0.02 }} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
                  <div className="shrink-0 h-12 w-12 rounded-xl bg-ig-gradient/10 flex items-center justify-center text-2xl">{p?.preview_emoji ?? "✨"}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{p?.name ?? "Sticker pack"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {p?.sticker_count && <span>{p.sticker_count} stickers</span>}
                      {p?.category && (<><span>·</span><span className="capitalize">{p.category}</span></>)}
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" /> {formatRelative(d.created_at)}</span>
                    </div>
                  </div>
                  <button type="button" aria-label="Remove" onClick={() => remove(d.id)} className="h-8 w-8 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
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
