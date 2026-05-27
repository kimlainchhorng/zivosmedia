/**
 * ChatThemesPage — Browse chat color themes (IG signature feature).
 * Backed by the real `chat_themes` table (admin catalog, no per-user binding yet).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Palette, Check, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ThemeRow {
  id: string;
  name: string;
  background_color: string | null;
  bubble_color: string | null;
  primary_color: string | null;
  preview_url: string | null;
  is_premium: boolean | null;
  is_active: boolean | null;
}

const STORAGE_KEY = "zivo:chat-theme:v1";

export default function ChatThemesPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

  const { data: themes = [], isLoading } = useQuery({
    queryKey: ["chat-themes"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: boolean) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ThemeRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("chat_themes")
        .select("id, name, background_color, bubble_color, primary_color, preview_url, is_premium, is_active")
        .eq("is_active", true)
        .order("name", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  const apply = (t: ThemeRow) => {
    if (t.is_premium) {
      toast.info("Premium theme — unlock with ZIVO+ at /zivo-plus");
      return;
    }
    setSelectedId(t.id);
    try { localStorage.setItem(STORAGE_KEY, t.id); } catch { /* private mode */ }
    toast.success(`${t.name} applied to chats`);
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Chat Themes · ZIVO" description="Customize your chat colors." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Palette className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Chat Themes</h1>
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
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Personalize</p>
          <p className="text-3xl font-bold mt-1">{themes.length} themes</p>
          <p className="text-sm text-white/80 mt-1">Tap any theme to apply it to all your chats.</p>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && themes.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Palette className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No themes available</p>
            <p className="text-xs text-muted-foreground">Themes will appear here once they publish.</p>
          </div>
        )}

        {!isLoading && themes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {themes.map((t, idx) => {
              const isSelected = t.id === selectedId;
              const bg = t.background_color ?? "#1a1a2e";
              const bubble = t.bubble_color ?? "#3a3a5e";
              const primary = t.primary_color ?? "#f09433";
              return (
                <motion.button
                  key={t.id}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => apply(t)}
                  className={cn(
                    "relative rounded-2xl overflow-hidden text-left transition-all",
                    isSelected ? "ring-2 ring-transparent ring-offset-2 ring-offset-background bg-ig-gradient p-[2px]" : "",
                  )}
                  aria-pressed={isSelected}
                  aria-label={`Apply theme ${t.name}`}
                >
                  <div className="rounded-2xl overflow-hidden">
                    {/* Chat preview */}
                    <div className="aspect-[4/3] p-3 relative" style={{ backgroundColor: bg }}>
                      {t.preview_url && (
                        <div
                          className="absolute inset-0 bg-center bg-cover opacity-40"
                          style={{ backgroundImage: `url(${t.preview_url})` }}
                          aria-hidden
                        />
                      )}
                      <div className="relative z-10 flex flex-col gap-1.5 h-full justify-end">
                        <div
                          className="self-start max-w-[70%] rounded-2xl rounded-bl-md px-3 py-1.5 text-[10px] text-white"
                          style={{ backgroundColor: bubble }}
                        >
                          Hey 👋
                        </div>
                        <div
                          className="self-end max-w-[70%] rounded-2xl rounded-br-md px-3 py-1.5 text-[10px] text-white"
                          style={{ backgroundColor: primary }}
                        >
                          Looks good
                        </div>
                      </div>
                    </div>
                    {/* Caption */}
                    <div className="bg-card border-t border-border px-3 py-2 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{t.name}</p>
                        {t.is_premium && (
                          <p className="text-[9px] font-bold text-ig-gradient inline-flex items-center gap-0.5">
                            <Lock className="h-2 w-2" /> Premium
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-ig-gradient flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-white" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-muted-foreground text-center pt-2">
          Themes apply on this device. Sync across devices rolls out with chat settings.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
