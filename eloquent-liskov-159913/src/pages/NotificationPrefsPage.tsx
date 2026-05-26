/**
 * NotificationPrefsPage — Per-category notification toggles.
 * Backed by `notification_templates` (read-only catalog) + localStorage
 * for the user's per-category opt-out state until a per-user prefs table is wired.
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Bell, BellOff, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  can_be_disabled: boolean | null;
  body_text: string | null;
  is_active: boolean | null;
}

const STORAGE_KEY = "zivo:notif-prefs:v1";

function loadDisabled(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr: unknown = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.filter((v): v is string => typeof v === "string"));
  } catch { /* ignore */ }
  return new Set();
}

function saveDisabled(s: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(s))); } catch { /* private mode */ }
}

export default function NotificationPrefsPage() {
  const navigate = useNavigate();
  const [disabled, setDisabled] = useState<Set<string>>(new Set());

  useEffect(() => { setDisabled(loadDisabled()); }, []);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["notification-templates"],
    queryFn: async () => {
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: boolean) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: TemplateRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("notification_templates")
        .select("id, name, category, can_be_disabled, body_text, is_active")
        .eq("is_active", true)
        .order("category", { ascending: true });
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, TemplateRow[]>();
    templates.forEach((t) => {
      const key = t.category || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries());
  }, [templates]);

  const toggleCategory = (cat: string, enable: boolean) => {
    const ids = templates.filter((t) => t.category === cat && t.can_be_disabled).map((t) => t.id);
    if (ids.length === 0) return;
    const next = new Set(disabled);
    ids.forEach((id) => {
      if (enable) next.delete(id);
      else next.add(id);
    });
    setDisabled(next);
    saveDisabled(next);
    toast.success(enable ? `${cat} enabled` : `${cat} muted`);
  };

  const toggleTemplate = (id: string, locked: boolean) => {
    if (locked) {
      toast.info("This notification type can't be disabled.");
      return;
    }
    const next = new Set(disabled);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setDisabled(next);
    saveDisabled(next);
  };

  const enabledCount = templates.filter((t) => !disabled.has(t.id)).length;

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="Notification preferences · ZIVO" description="Choose which notifications you receive." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Notifications</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Active</p>
          <p className="text-3xl font-bold mt-1">{enabledCount} of {templates.length}</p>
          <p className="text-sm text-white/80 mt-1">notification types enabled</p>
        </motion.div>

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && grouped.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Bell className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No notification types yet</p>
            <p className="text-xs text-muted-foreground">The catalog will appear here as templates publish.</p>
          </div>
        )}

        {!isLoading && grouped.length > 0 && grouped.map(([category, list], idx) => {
          const allEnabled = list.every((t) => !disabled.has(t.id));
          return (
            <motion.section
              key={category}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className="rounded-2xl bg-card border border-border overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <p className="text-sm font-bold text-foreground capitalize">{category}</p>
                <button
                  type="button"
                  onClick={() => toggleCategory(category, !allEnabled)}
                  className={cn(
                    "text-[11px] font-bold rounded-full px-3 py-1 transition-all",
                    allEnabled ? "bg-secondary text-muted-foreground hover:bg-muted" : "bg-ig-gradient text-white shadow-sm",
                  )}
                  aria-label={allEnabled ? "Mute all" : "Enable all"}
                >
                  {allEnabled ? "Mute all" : "Enable all"}
                </button>
              </div>
              <div className="divide-y divide-border/40">
                {list.map((t) => {
                  const isOff = disabled.has(t.id);
                  const locked = !t.can_be_disabled;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleTemplate(t.id, locked)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/40 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground line-clamp-1">{t.name}</p>
                        {t.body_text && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{t.body_text}</p>
                        )}
                      </div>
                      {locked ? (
                        <span className="shrink-0 inline-flex items-center gap-0.5 text-[10px] font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                          <Lock className="h-2.5 w-2.5" /> Required
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "shrink-0 w-10 h-6 rounded-full p-0.5 transition-colors",
                            isOff ? "bg-secondary" : "bg-ig-gradient",
                          )}
                          aria-pressed={!isOff}
                        >
                          <span
                            className={cn(
                              "block h-5 w-5 rounded-full bg-white shadow transition-transform",
                              isOff ? "translate-x-0" : "translate-x-4",
                            )}
                          />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.section>
          );
        })}

        <p className="text-[11px] text-muted-foreground text-center pt-2 flex items-center justify-center gap-1.5">
          <BellOff className="h-3 w-3" />
          Preferences save on this device. Account-wide sync rolls out in beta.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
