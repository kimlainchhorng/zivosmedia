/**
 * AvatarMoodsPage — Mood-emoji catalog for avatar/status.
 * Backed by `avatar_sticker_moods` (orphan public catalog).
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Smile, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";

interface MoodRow {
  id: string;
  emoji: string;
  label: string;
  gradient_from: string;
  gradient_to: string;
  sort_order: number;
  is_active: boolean;
}

export default function AvatarMoodsPage() {
  const navigate = useNavigate();
  const { data: moods = [], isLoading } = useQuery({
    queryKey: ["avatar-sticker-moods"],
    queryFn: async () => {
      const sb = supabase as unknown as { from: (t: string) => { select: (s: string) => { eq: (k: string, v: boolean) => { order: (k: string, o: { ascending: boolean }) => Promise<{ data: MoodRow[] | null }> } } } };
      const { data } = await sb.from("avatar_sticker_moods").select("id, emoji, label, gradient_from, gradient_to, sort_order, is_active").eq("is_active", true).order("sort_order", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Mood Stickers · ZIVO" description="Avatar mood stickers." noIndex />
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center"><Smile className="h-4 w-4 text-white" /></div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Mood Stickers</h1>
          </div>
        </div>
      </div>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Pick a mood</p>
          <p className="text-3xl font-bold mt-1">{moods.length} moods</p>
          <p className="text-sm text-white/80 mt-1">Tap to set as your avatar's mood</p>
        </motion.div>
        {isLoading && <div className="grid grid-cols-3 gap-2">{Array.from({ length: 9 }).map((_, i) => <div key={i} className="aspect-square bg-muted animate-pulse rounded-2xl" />)}</div>}
        {!isLoading && moods.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {moods.map((m, idx) => (
              <motion.button key={m.id} type="button" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: Math.min(idx, 20) * 0.02 }} whileTap={{ scale: 0.95 }} className="aspect-square rounded-2xl bg-ig-gradient/5 border border-border hover:bg-ig-gradient/10 transition-all flex flex-col items-center justify-center gap-1">
                <span className="text-4xl">{m.emoji}</span>
                <span className="text-[11px] font-bold text-foreground capitalize">{m.label}</span>
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
