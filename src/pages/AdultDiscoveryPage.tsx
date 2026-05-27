/**
 * AdultDiscoveryPage — the missing discovery surface for OF creators.
 *
 * OF creators are filtered out of Explore / Feed / Search / Reels by
 * `is_of_creator = false`. Without a dedicated discovery surface they're
 * unreachable. This page lists them behind a persistent age gate.
 *
 * Tapping a creator routes to PublicProfilePage which has its own per-profile
 * confirmation step (still useful as a "consent again for this specific
 * creator" check).
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Flame, Lock, ShieldCheck, ChevronRight, Crown, CheckCircle2,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdultGate } from "@/hooks/useAdultGate";
import SEOHead from "@/components/SEOHead";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import { cn } from "@/lib/utils";

type OFCreator = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  share_code: string | null;
  ppv_count: number;
  tier_starting_cents: number | null;
};

export default function AdultDiscoveryPage() {
  const navigate = useNavigate();
  const { isConfirmed, isLoading, confirm } = useAdultGate();
  const [search, setSearch] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ["adult-discovery", search],
    queryFn: async (): Promise<OFCreator[]> => {
      // 1. Fetch OF profiles
      let q = (supabase as any)
        .from("profiles")
        .select("user_id, full_name, username, avatar_url, bio, share_code, is_of_creator")
        .eq("is_of_creator", true)
        .limit(60);
      if (search.trim()) {
        const s = `%${search.trim()}%`;
        q = q.or(`full_name.ilike.${s},username.ilike.${s}`);
      }
      const { data: profs, error } = await q;
      if (error) return [];
      const rows = (profs as any[]) ?? [];
      if (rows.length === 0) return [];
      const userIds = rows.map((r) => r.user_id).filter(Boolean);

      // 2. PPV counts per creator (one round-trip)
      const { data: ppv } = await (supabase as any)
        .from("ppv_posts")
        .select("creator_id")
        .in("creator_id", userIds)
        .eq("is_published", true);
      const ppvCount = new Map<string, number>();
      ((ppv as any[]) ?? []).forEach((r) => {
        ppvCount.set(r.creator_id, (ppvCount.get(r.creator_id) ?? 0) + 1);
      });

      // 3. Cheapest non-free tier per creator
      const { data: tiers } = await (supabase as any)
        .from("subscription_tiers")
        .select("creator_id, price_cents, is_free")
        .in("creator_id", userIds)
        .eq("is_free", false);
      const tierMin = new Map<string, number>();
      ((tiers as any[]) ?? []).forEach((t) => {
        const cur = tierMin.get(t.creator_id);
        if (cur == null || t.price_cents < cur) tierMin.set(t.creator_id, t.price_cents);
      });

      return rows.map((r) => ({
        user_id: r.user_id,
        full_name: r.full_name,
        username: r.username,
        avatar_url: r.avatar_url,
        bio: r.bio,
        share_code: r.share_code,
        ppv_count: ppvCount.get(r.user_id) ?? 0,
        tier_starting_cents: tierMin.get(r.user_id) ?? null,
      }));
    },
    enabled: isConfirmed,
    staleTime: 60 * 1000,
  });

  // ── Age gate (full screen, blocks the list until confirmed) ───────────────
  if (!isLoading && !isConfirmed) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-6 py-10">
        <SEOHead title="18+ Discovery — ZIVO" description="Adult creators on ZIVO." noIndex />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm space-y-5"
        >
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-3xl bg-rose-500/15 flex items-center justify-center mx-auto">
              <Flame className="h-8 w-8 text-rose-500" />
            </div>
            <h1 className="text-[24px] font-extrabold tracking-tight">Adult content</h1>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
              The creators on this page may post explicit 18+ content. Confirm your age to continue.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setPendingConfirm((v) => !v)}
            className={cn(
              "w-full flex items-start gap-3 p-4 rounded-2xl border-2 transition-colors text-left",
              pendingConfirm
                ? "border-rose-500 bg-rose-500/8"
                : "border-border bg-card hover:border-rose-500/40",
            )}
          >
            <div
              className={cn(
                "mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                pendingConfirm ? "bg-rose-500 border-rose-500" : "border-border",
              )}
            >
              {pendingConfirm && <CheckCircle2 className="h-3 w-3 text-white" />}
            </div>
            <span className="text-[13px] leading-relaxed">
              I confirm I am 18 years of age or older and consent to viewing adult content on ZIVO.
            </span>
          </button>

          <button
            type="button"
            disabled={!pendingConfirm || confirming}
            onClick={async () => {
              setConfirming(true);
              try {
                await confirm();
              } finally {
                setConfirming(false);
              }
            }}
            className={cn(
              "w-full h-13 rounded-2xl font-extrabold text-[14px] py-3.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2",
              pendingConfirm && !confirming
                ? "bg-rose-500 text-white hover:bg-rose-600"
                : "bg-muted/50 text-muted-foreground cursor-not-allowed",
            )}
          >
            <ShieldCheck className="h-4 w-4" />
            {confirming ? "Saving…" : "Enter 18+ Discovery"}
          </button>

          <p className="text-[10px] text-muted-foreground text-center">
            Your confirmation is remembered so you won't be asked again. You can clear it from your account settings.
          </p>
        </motion.div>
      </div>
    );
  }

  // ── Discovery list (post-confirmation) ────────────────────────────────────
  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="18+ Discovery — ZIVO" description="Adult creators on ZIVO." noIndex />

      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight flex items-center gap-2">
            <Flame className="h-4 w-4 text-rose-500" />
            18+ Discovery
          </h1>
        </div>
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search OF creators"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-border bg-card text-[13px] outline-none focus:border-rose-500/60"
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        {creatorsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="text-center py-16">
            <Flame className="h-10 w-10 text-rose-500/40 mx-auto mb-3" />
            <p className="text-[14px] font-bold">No OF creators yet</p>
            <p className="text-[12px] text-muted-foreground mt-1">
              {search ? "Try a different search." : "Check back soon."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground mb-3">
              {creators.length} creator{creators.length === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {creators.map((c) => {
                const profileHref = c.share_code
                  ? `/u/${c.share_code}`
                  : c.username
                    ? `/@${c.username}`
                    : `#`;
                return (
                  <Link
                    key={c.user_id}
                    to={profileHref}
                    className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-rose-500/40 transition-colors"
                  >
                    <div className="relative aspect-[4/5] bg-muted overflow-hidden">
                      {c.avatar_url ? (
                        <img
                          src={c.avatar_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/30 to-pink-500/15 flex items-center justify-center">
                          <Flame className="h-10 w-10 text-rose-500/60" />
                        </div>
                      )}
                      <span className="absolute top-2 left-2 text-[9px] font-extrabold bg-rose-500 text-white rounded-full px-2 py-0.5 uppercase tracking-wide">
                        18+
                      </span>
                      {c.ppv_count > 0 && (
                        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold bg-black/55 text-white rounded-full px-2 py-0.5 backdrop-blur">
                          <Lock className="h-2.5 w-2.5" />
                          {c.ppv_count}
                        </span>
                      )}
                      {c.tier_starting_cents != null && (
                        <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold bg-black/55 text-white rounded-full px-2 py-0.5 backdrop-blur">
                          <Crown className="h-2.5 w-2.5" />
                          ${(c.tier_starting_cents / 100).toFixed(0)}/mo
                        </span>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-extrabold text-[13px] truncate">
                        {c.full_name || c.username || "Creator"}
                      </p>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                        {c.bio || "Tap to view profile"}
                      </p>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] font-bold text-rose-500">
                        View profile <ChevronRight className="h-3 w-3" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <ZivoMobileNav />
    </div>
  );
}
