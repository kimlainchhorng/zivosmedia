/**
 * PPVPostsPage — two tabs:
 *   1. My Posts   — PPV posts the user has created (revenue, unlocks, preview)
 *   2. Unlocked   — PPV posts the user has paid to view
 *
 * Unlock flow: PPVUnlockButton hits the ppv_unlocks table directly.
 * Real payment integration (Stripe/wallet) is layered on later — for now the
 * "payment" is recorded as `payment_provider = 'wallet'` and counts the user's
 * wallet balance as the source of truth (same pattern as creator_tips).
 */
import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  ArrowLeft, Lock, Plus, Flame, DollarSign, Users, Eye, ChevronRight,
  CheckCircle2, Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import SEOHead from "@/components/SEOHead";
import { cn } from "@/lib/utils";
import { signedUrlFor } from "@/lib/security/signedMedia";
import PPVPostDetail from "@/components/ppv/PPVPostDetail";

type Tab = "mine" | "unlocked" | "paid-dms";

type PPVPost = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  media_paths: string[];
  preview_path: string | null;
  is_published: boolean;
  unlock_count: number;
  revenue_cents: number;
  created_at: string;
};

function PreviewThumb({ path }: { path: string | null }) {
  const { data: url } = useQuery({
    queryKey: ["ppv-preview", path],
    queryFn: () => (path ? signedUrlFor("ppv-media", path, "thumbnail") : ""),
    enabled: !!path,
    staleTime: 5 * 60 * 1000,
  });
  if (!path) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/20 to-pink-500/10 flex items-center justify-center">
        <Lock className="h-8 w-8 text-rose-500/50" />
      </div>
    );
  }
  return (
    <>
      {url ? (
        <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
    </>
  );
}

export default function PPVPostsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const justCreatedId = params.get("just_created");
  const detailPostId = params.get("post");
  const [tab, setTab] = useState<Tab>("mine");

  const { data: myPosts = [] } = useQuery({
    queryKey: ["ppv-posts", "mine", user?.id],
    queryFn: async (): Promise<PPVPost[]> => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("ppv_posts")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as PPVPost[]) ?? [];
    },
    enabled: !!user,
  });

  const { data: unlocks = [] } = useQuery({
    queryKey: ["ppv-posts", "unlocked", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("ppv_unlocks")
        .select("id, unlocked_at, amount_cents_paid, ppv_id, ppv_posts:ppv_id(*)")
        .eq("unlocker_id", user.id)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  // Fan's paid DM unlocks — locked text/media messages the user has paid to
  // read. Joined with direct_messages for the snippet + sender info.
  const { data: dmUnlocks = [] } = useQuery({
    queryKey: ["dm-unlocks", "fan-inbox", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from("direct_message_unlocks")
        .select(
          "id, unlocked_at, amount_cents_paid, creator_id, message_id, direct_messages:message_id(id, message, message_type, sender_id, created_at)"
        )
        .eq("unlocker_id", user.id)
        .order("unlocked_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
    enabled: !!user,
  });

  // Resolve creator display names in one round-trip for the paid DM list.
  const creatorIds = useMemo(
    () => Array.from(new Set(dmUnlocks.map((u: any) => u.creator_id))),
    [dmUnlocks]
  );
  const { data: dmCreatorProfiles = {} as Record<string, { full_name: string | null; avatar_url: string | null }> } = useQuery({
    queryKey: ["dm-unlock-creators", creatorIds.sort().join(",")],
    queryFn: async () => {
      if (creatorIds.length === 0) return {};
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", creatorIds);
      const map: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      ((data as any[]) ?? []).forEach((p) => {
        map[p.user_id] = { full_name: p.full_name, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: creatorIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const totals = useMemo(() => {
    const revenue = myPosts.reduce((s, p) => s + p.revenue_cents, 0);
    const unlockCount = myPosts.reduce((s, p) => s + p.unlock_count, 0);
    return { revenue, unlockCount };
  }, [myPosts]);

  // Detail view: render the single-post viewer when ?post=<id> is present.
  // This branch runs AFTER all hooks above to satisfy Rules of Hooks.
  if (detailPostId) {
    return (
      <PPVPostDetail
        postId={detailPostId}
        onBack={() => {
          const next = new URLSearchParams(params);
          next.delete("post");
          setParams(next, { replace: true });
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="PPV Posts — ZIVO" description="Your pay-per-view content & unlocks." noIndex />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate("/creator-dashboard")}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-500" />
            PPV
          </h1>
          <button
            type="button"
            onClick={() => navigate("/ppv/create")}
            className="h-9 px-3 rounded-full bg-rose-500 text-white text-[12px] font-extrabold flex items-center gap-1 hover:bg-rose-600 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border/30">
          {(["mine", "unlocked", "paid-dms"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 h-11 text-[13px] font-extrabold relative",
                tab === t ? "text-rose-500" : "text-muted-foreground"
              )}
            >
              {t === "mine" ? "My Posts" : t === "unlocked" ? "Unlocked" : "Paid DMs"}
              {tab === t && (
                <motion.div
                  layoutId="ppv-tab-bar"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Just-created success banner */}
      {justCreatedId && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 flex items-start gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
          <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
            PPV post published — share it from your profile or DMs to start earning.
          </p>
        </motion.div>
      )}

      {/* My posts: revenue summary */}
      {tab === "mine" && myPosts.length > 0 && (
        <div className="px-4 mt-4 grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
            <DollarSign className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
            <p className="text-sm font-extrabold">${(totals.revenue / 100).toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Revenue</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
            <Users className="h-4 w-4 text-rose-500 mx-auto mb-1" />
            <p className="text-sm font-extrabold">{totals.unlockCount}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Unlocks</p>
          </div>
          <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
            <Sparkles className="h-4 w-4 text-amber-500 mx-auto mb-1" />
            <p className="text-sm font-extrabold">{myPosts.length}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Posts</p>
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {tab === "mine" && myPosts.length === 0 && (
          <EmptyState
            title="No PPV posts yet"
            desc="Drop your first locked post — fans pay once to unlock."
            cta="Create your first PPV"
            onCta={() => navigate("/ppv/create")}
          />
        )}

        {tab === "mine" &&
          myPosts.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() => navigate(`/ppv?post=${post.id}`)}
              className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
            >
              <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                <PreviewThumb path={post.preview_path || post.media_paths[0] || null} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[14px] truncate">{post.title}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  ${(post.price_cents / 100).toFixed(2)} · {post.media_paths.length} file
                  {post.media_paths.length === 1 ? "" : "s"} ·{" "}
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] font-bold text-emerald-500 inline-flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />${(post.revenue_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-[10px] font-bold text-rose-500 inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {post.unlock_count}
                  </span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
            </button>
          ))}

        {tab === "unlocked" && unlocks.length === 0 && (
          <EmptyState
            title="Nothing unlocked yet"
            desc="Pay-per-view content you unlock will show up here."
            cta="Explore creators"
            onCta={() => navigate("/explore")}
          />
        )}

        {tab === "unlocked" &&
          unlocks.map((u: any) => {
            const post: PPVPost | null = u.ppv_posts;
            if (!post) return null;
            return (
              <div
                key={u.id}
                className="flex gap-3 p-3 rounded-2xl border border-border/40 bg-card"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                  <PreviewThumb path={post.preview_path || post.media_paths[0] || null} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[14px] truncate">{post.title}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">
                    {post.description || "Locked content"}
                  </p>
                  <p className="text-[10px] text-emerald-500 font-bold mt-1">
                    Unlocked · ${(u.amount_cents_paid / 100).toFixed(2)} ·{" "}
                    {formatDistanceToNow(new Date(u.unlocked_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
              </div>
            );
          })}

        {tab === "paid-dms" && dmUnlocks.length === 0 && (
          <EmptyState
            title="No paid DMs yet"
            desc="Locked messages you pay to read will appear here."
            cta="Open chat"
            onCta={() => navigate("/chat")}
          />
        )}

        {tab === "paid-dms" &&
          dmUnlocks.map((u: any) => {
            const msg = u.direct_messages;
            const profile = dmCreatorProfiles[u.creator_id];
            const name = profile?.full_name || "Creator";
            const messageType = msg?.message_type as string | undefined;
            const isMediaUnlock = messageType === "locked_image" || messageType === "locked_video";
            const snippet = isMediaUnlock
              ? messageType === "locked_video"
                ? "🎥 Locked video"
                : "📷 Locked photo"
              : (msg?.message as string | undefined) || "Locked message";
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => navigate(`/chat?with=${u.creator_id}`)}
                className="w-full text-left flex gap-3 p-3 rounded-2xl border border-border/40 bg-card hover:border-rose-500/40 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-muted overflow-hidden shrink-0">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-rose-500/25 to-pink-500/15" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[13px] truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{snippet}</p>
                  <p className="text-[10px] text-emerald-500 font-bold mt-1">
                    Unlocked · ${(u.amount_cents_paid / 100).toFixed(2)} ·{" "}
                    {formatDistanceToNow(new Date(u.unlocked_at), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground self-center shrink-0" />
              </button>
            );
          })}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  desc,
  cta,
  onCta,
}: {
  title: string;
  desc: string;
  cta: string;
  onCta: () => void;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-3">
        <Flame className="h-7 w-7 text-rose-500" />
      </div>
      <p className="text-[15px] font-extrabold">{title}</p>
      <p className="text-[12px] text-muted-foreground mt-1 mb-4">{desc}</p>
      <button
        type="button"
        onClick={onCta}
        className="h-11 px-5 rounded-2xl bg-rose-500 text-white text-[13px] font-extrabold hover:bg-rose-600"
      >
        {cta}
      </button>
    </div>
  );
}
