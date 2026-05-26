/**
 * MyUnlocksPage — Paid content you've unlocked.
 * Backed by `paid_content_access` joined with `paid_content` (both orphan).
 */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Unlock, Sparkles, Clock, DollarSign, ChevronRight, Image as ImageIcon, FileText, Film, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface AccessRow {
  id: string;
  content_id: string;
  amount_paid_cents: number | null;
  granted_at: string | null;
}

interface ContentRow {
  id: string;
  title: string;
  preview_text: string | null;
  description: string | null;
  thumbnail_url: string | null;
  content_url: string | null;
  content_type: string | null;
  price_cents: number;
  currency: string | null;
  creator_id: string;
  is_active: boolean | null;
}

function formatCents(cents: number | null, currency = "USD"): string {
  if (cents == null) return "—";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 86_400_000) return "today";
  const days = Math.floor(ms / 86_400_000);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function contentIcon(type: string | null): typeof Unlock {
  const t = (type ?? "").toLowerCase();
  if (t.includes("video") || t.includes("reel")) return Film;
  if (t.includes("audio") || t.includes("podcast")) return Music;
  if (t.includes("photo") || t.includes("image")) return ImageIcon;
  if (t.includes("article") || t.includes("doc")) return FileText;
  return Unlock;
}

export default function MyUnlocksPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: accesses = [], isLoading } = useQuery({
    queryKey: ["paid-content-access", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as AccessRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: AccessRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("paid_content_access")
        .select("id, content_id, amount_paid_cents, granted_at")
        .eq("user_id", user.id)
        .order("granted_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  const contentIds = useMemo(() => Array.from(new Set(accesses.map((a) => a.content_id))), [accesses]);

  const { data: contents = [] } = useQuery({
    queryKey: ["paid-content", contentIds.join(",")],
    queryFn: async () => {
      if (contentIds.length === 0) return [] as ContentRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            in: (k: string, v: string[]) => Promise<{ data: ContentRow[] | null }>;
          };
        };
      };
      const { data } = await sb
        .from("paid_content")
        .select("id, title, preview_text, description, thumbnail_url, content_url, content_type, price_cents, currency, creator_id, is_active")
        .in("id", contentIds);
      return data ?? [];
    },
    enabled: contentIds.length > 0,
    staleTime: 60_000,
  });

  const contentMap = useMemo(() => {
    const m = new Map<string, ContentRow>();
    contents.forEach((c) => m.set(c.id, c));
    return m;
  }, [contents]);

  const totalSpent = accesses.reduce((s, a) => s + (a.amount_paid_cents ?? 0), 0);
  const displayCurrency = contents[0]?.currency ?? "USD";

  return (
    <SwipeBackContainer className="min-h-screen bg-background pb-12">
      <SEOHead title="My Unlocks · ZIVO" description="Paid content you've unlocked." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Unlock className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">My Unlocks</h1>
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
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Unlocked</p>
          <p className="text-3xl font-bold mt-1">{accesses.length} {accesses.length === 1 ? "item" : "items"}</p>
          <p className="text-sm text-white/80 mt-1 inline-flex items-center gap-1">
            <DollarSign className="h-4 w-4" /> {formatCents(totalSpent, displayCurrency)} spent supporting creators
          </p>
        </motion.div>

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && accesses.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Unlock className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No unlocks yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              When you buy access to a creator's paywalled content, it lands here for easy access anytime.
            </p>
            <Button
              onClick={() => navigate("/feed")}
              className="bg-ig-gradient text-white font-bold rounded-full h-10 px-5 hover:opacity-90 border-0"
            >
              Discover creators
            </Button>
          </div>
        )}

        {!isLoading && accesses.length > 0 && (
          <div className="space-y-2">
            {accesses.map((a, idx) => {
              const c = contentMap.get(a.content_id);
              const Icon = contentIcon(c?.content_type ?? null);
              const isActive = c?.is_active !== false;
              return (
                <motion.button
                  key={a.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => c?.content_url && window.open(c.content_url, "_blank", "noopener,noreferrer")}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left",
                    !isActive && "opacity-60",
                  )}
                  aria-label={c?.title ?? "Open unlocked content"}
                >
                  <div className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-muted relative">
                    {c?.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full bg-ig-gradient flex items-center justify-center">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    )}
                    <div className="absolute top-1 right-1 h-5 w-5 rounded-full bg-ig-gradient flex items-center justify-center shadow-sm">
                      <Unlock className="h-3 w-3 text-white" strokeWidth={2.5} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground line-clamp-1">{c?.title ?? "Content"}</p>
                    {c?.preview_text && (
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{c.preview_text}</p>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {c?.content_type && <span className="capitalize">{c.content_type}</span>}
                      {c?.content_type && a.amount_paid_cents != null && <span>·</span>}
                      {a.amount_paid_cents != null && (
                        <span className="font-bold text-ig-gradient">{formatCents(a.amount_paid_cents, c?.currency ?? "USD")}</span>
                      )}
                      <span>·</span>
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" /> {formatRelative(a.granted_at)}
                      </span>
                    </div>
                    {!isActive && (
                      <p className="text-[10px] text-muted-foreground italic mt-0.5">Creator archived this content</p>
                    )}
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
