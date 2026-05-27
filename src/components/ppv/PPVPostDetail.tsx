/**
 * PPVPostDetail — single-post view with unlock flow.
 *
 * Rendered by PPVPostsPage when the URL has ?post=<id>. Three states:
 *   1. Owner viewing own post — show all media + revenue summary, no unlock button.
 *   2. Visitor who already unlocked — show all media, "Unlocked" badge.
 *   3. Visitor not yet unlocked — show only the preview_path (or a generic lock
 *      placeholder) plus an "Unlock for $X" button that inserts into ppv_unlocks.
 *
 * Payment integration (wallet / Stripe) is layered on later; this component
 * just records the unlock in the table — same pattern as creator_tips.
 */
import { useMemo, useState, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft, Lock, Loader2, DollarSign, Users, Eye, CheckCircle2, Flame,
  Pencil, Trash2, EyeOff, MoreVertical, X, Check, ChevronRight, Crown, Heart,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { signedUrlFor, signedUrlsFor } from "@/lib/security/signedMedia";
import { cn } from "@/lib/utils";

const TipSheet = lazy(() => import("@/components/social/TipSheet"));

interface PPVPost {
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
  free_for_subscribers: boolean;
}

interface Props {
  postId: string;
  onBack: () => void;
}

export default function PPVPostDetail({ postId, onBack }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [actionsOpen, setActionsOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriceUsd, setEditPriceUsd] = useState("");
  const [editFreeForSubs, setEditFreeForSubs] = useState(false);
  const [previewAsFan, setPreviewAsFan] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);

  const { data: post, isLoading } = useQuery({
    queryKey: ["ppv-post", postId],
    queryFn: async (): Promise<PPVPost | null> => {
      const { data, error } = await (supabase as any)
        .from("ppv_posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();
      if (error) throw error;
      return (data as PPVPost) ?? null;
    },
  });

  const isOwner = !!user && !!post && user.id === post.creator_id;

  // Is the current visitor an active subscriber to the creator? When true on a
  // free_for_subscribers post, unlocking is free via the RPC's tier path.
  const { data: isActiveSubscriber } = useQuery({
    queryKey: ["ppv-active-sub", post?.creator_id, user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user || !post) return false;
      const { count } = await (supabase as any)
        .from("creator_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", post.creator_id)
        .eq("subscriber_id", user.id)
        .eq("status", "active");
      return (count as number) > 0;
    },
    enabled: !!user && !!post && !isOwner && !!post?.free_for_subscribers,
    staleTime: 60 * 1000,
  });

  // Creator's profile — for the byline below the title.
  const { data: creator } = useQuery({
    queryKey: ["ppv-creator", post?.creator_id],
    queryFn: async () => {
      if (!post?.creator_id) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url, share_code, username")
        .eq("user_id", post.creator_id)
        .maybeSingle();
      return data as {
        user_id: string;
        full_name: string | null;
        avatar_url: string | null;
        share_code: string | null;
        username: string | null;
      } | null;
    },
    enabled: !!post?.creator_id,
    staleTime: 60 * 1000,
  });

  // Current user's wallet balance — shown next to the unlock button so they
  // can see at a glance whether they can afford the price.
  const { data: walletBalance } = useQuery({
    queryKey: ["wallet-balance", user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;
      const { data } = await (supabase as any)
        .from("user_wallets")
        .select("available_cents")
        .eq("user_id", user.id)
        .maybeSingle();
      return (data?.available_cents as number) ?? 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  const { data: unlock } = useQuery({
    queryKey: ["ppv-unlock", postId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await (supabase as any)
        .from("ppv_unlocks")
        .select("id, amount_cents_paid, unlocked_at")
        .eq("ppv_id", postId)
        .eq("unlocker_id", user.id)
        .maybeSingle();
      return data as { id: string; amount_cents_paid: number; unlocked_at: string } | null;
    },
    enabled: !!user && !!post && !isOwner,
  });

  const canViewFull = isOwner || !!unlock;

  // Signed URL for the preview thumbnail (always allowed to read)
  const { data: previewUrl } = useQuery({
    queryKey: ["ppv-preview-url", post?.preview_path],
    queryFn: () => (post?.preview_path ? signedUrlFor("ppv-media", post.preview_path, "display") : ""),
    enabled: !!post?.preview_path,
    staleTime: 5 * 60 * 1000,
  });

  // Full media (only fetched if owner or unlocked — RLS will reject otherwise)
  const { data: mediaUrls } = useQuery({
    queryKey: ["ppv-media-urls", post?.id, canViewFull],
    queryFn: () => (post ? signedUrlsFor("ppv-media", post.media_paths, "display") : []),
    enabled: !!post && canViewFull,
    staleTime: 5 * 60 * 1000,
  });

  const unlockMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to unlock");
      if (!post) throw new Error("Post not loaded");
      if (user.id === post.creator_id) throw new Error("You're the creator — no need to unlock");

      // Atomic wallet RPC: debits unlocker, credits creator, inserts unlock row,
      // writes both ledger entries. Raises 'insufficient_funds' if balance too low.
      const { error } = await (supabase as any).rpc("unlock_ppv_with_wallet", {
        p_ppv_id: post.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Unlocked — enjoy!");
      qc.invalidateQueries({ queryKey: ["ppv-unlock", postId, user?.id] });
      qc.invalidateQueries({ queryKey: ["ppv-post", postId] });
      qc.invalidateQueries({ queryKey: ["ppv-posts"] });
      qc.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
    onError: (err: any) => {
      const msg = String(err?.message ?? "");
      if (msg.includes("insufficient_funds")) {
        toast.error("Not enough wallet balance — top up and try again.");
      } else {
        toast.error(err?.message ?? "Couldn't unlock");
      }
    },
  });

  // ─── Owner actions: edit, publish toggle, delete ──────────────────────────
  const updateMut = useMutation({
    mutationFn: async (patch: Partial<Pick<PPVPost, "title" | "description" | "price_cents" | "is_published" | "free_for_subscribers">>) => {
      if (!post) throw new Error("Post not loaded");
      const { error } = await (supabase as any)
        .from("ppv_posts")
        .update(patch)
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ppv-post", postId] });
      qc.invalidateQueries({ queryKey: ["ppv-posts"] });
      qc.invalidateQueries({ queryKey: ["public-ppv-posts"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Update failed"),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("Post not loaded");
      // Best-effort media cleanup before deleting the row. RLS lets owners
      // delete their own files; we ignore individual file errors so a missing
      // file doesn't block deletion of the row.
      const paths = [
        ...post.media_paths,
        ...(post.preview_path ? [post.preview_path] : []),
      ];
      if (paths.length > 0) {
        try {
          await (supabase.storage.from("ppv-media") as any).remove(paths);
        } catch {
          /* swallow — DB cascade will still clean up the row + unlocks */
        }
      }
      const { error } = await (supabase as any)
        .from("ppv_posts")
        .delete()
        .eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PPV post deleted");
      qc.invalidateQueries({ queryKey: ["ppv-posts"] });
      qc.invalidateQueries({ queryKey: ["public-ppv-posts"] });
      onBack();
    },
    onError: (err: any) => toast.error(err?.message ?? "Delete failed"),
  });

  const openEdit = () => {
    if (!post) return;
    setEditTitle(post.title);
    setEditDesc(post.description ?? "");
    setEditPriceUsd((post.price_cents / 100).toFixed(2));
    setEditFreeForSubs(!!post.free_for_subscribers);
    setEditMode(true);
    setActionsOpen(false);
  };

  const saveEdit = async () => {
    const priceCents = Math.max(0, Math.round(parseFloat(editPriceUsd || "0") * 100));
    if (!editTitle.trim()) {
      toast.error("Title can't be empty");
      return;
    }
    await updateMut.mutateAsync({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      price_cents: priceCents,
      free_for_subscribers: editFreeForSubs,
    });
    toast.success("PPV updated");
    setEditMode(false);
  };

  const togglePublished = async () => {
    if (!post) return;
    await updateMut.mutateAsync({ is_published: !post.is_published });
    toast.success(post.is_published ? "Unpublished" : "Published");
    setActionsOpen(false);
  };

  const canViewFullEffective = canViewFull && !previewAsFan;

  const mediaToRender = useMemo<{ path: string; url: string }[]>(() => {
    if (!post) return [];
    if (canViewFullEffective && mediaUrls) {
      return post.media_paths.map((path, idx) => ({ path, url: mediaUrls[idx] ?? "" }));
    }
    // Locked view: only the preview, if any
    if (post.preview_path && previewUrl) {
      return [{ path: post.preview_path, url: previewUrl }];
    }
    return [];
  }, [post, canViewFullEffective, mediaUrls, previewUrl]);

  return (
    <div className="min-h-dvh bg-background pb-32">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 truncate flex items-center gap-2">
            <Lock className="h-4 w-4 text-rose-500" />
            {post?.title || "PPV Post"}
          </h1>
          {isOwner && post && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setActionsOpen((v) => !v)}
                aria-label="Post actions"
                className="p-2 -mr-2 rounded-full hover:bg-muted/50"
              >
                <MoreVertical className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {actionsOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setActionsOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute right-0 top-full mt-1 w-48 z-50 rounded-2xl border border-border bg-card shadow-lg overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={openEdit}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold hover:bg-muted/50 text-left"
                      >
                        <Pencil className="h-4 w-4" /> Edit details
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewAsFan((v) => !v);
                          setActionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold hover:bg-muted/50 text-left"
                      >
                        <Eye className="h-4 w-4" />
                        {previewAsFan ? "Exit fan preview" : "View as fan"}
                      </button>
                      <button
                        type="button"
                        onClick={togglePublished}
                        disabled={updateMut.isPending}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold hover:bg-muted/50 text-left disabled:opacity-60"
                      >
                        <EyeOff className="h-4 w-4" />
                        {post.is_published ? "Unpublish" : "Republish"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDelete(true);
                          setActionsOpen(false);
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] font-bold hover:bg-rose-500/10 text-rose-500 text-left border-t border-border"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !post ? (
        <div className="px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="font-extrabold">Post not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            This PPV post may have been removed or is no longer available.
          </p>
        </div>
      ) : (
        <div className="px-4 py-5 space-y-5">
          {/* Fan-preview banner (owners only, when previewing) */}
          {isOwner && previewAsFan && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                  Previewing as a fan — full media hidden.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewAsFan(false)}
                className="text-[11px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline shrink-0"
              >
                Exit
              </button>
            </div>
          )}

          {/* Unpublished banner (owners only) */}
          {isOwner && !post.is_published && !previewAsFan && (
            <div className="rounded-2xl border border-muted-foreground/30 bg-muted/40 px-4 py-3 flex items-center gap-2.5">
              <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-[12px] font-semibold text-muted-foreground leading-relaxed">
                Unpublished — fans can't see or unlock this post.
              </p>
            </div>
          )}

          {/* Status badge */}
          {isOwner && !previewAsFan ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-start gap-2.5">
              <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Your post — fans see only the preview until they unlock.
              </p>
            </div>
          ) : unlock ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Unlocked · ${(unlock.amount_cents_paid / 100).toFixed(2)} on{" "}
                {new Date(unlock.unlocked_at).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-pink-500/5 px-4 py-3 flex items-start gap-2.5">
              <Flame className="h-4 w-4 text-rose-500 mt-0.5 shrink-0" />
              <p className="text-[12px] font-semibold text-rose-600 dark:text-rose-400 leading-relaxed">
                Locked content — unlock for ${(post.price_cents / 100).toFixed(2)} to view all{" "}
                {post.media_paths.length} file{post.media_paths.length === 1 ? "" : "s"}.
              </p>
            </div>
          )}

          {/* Creator byline */}
          {creator && (
            <Link
              to={creator.share_code ? `/u/${creator.share_code}` : creator.username ? `/@${creator.username}` : `#`}
              className="flex items-center gap-2.5 -mt-2 hover:opacity-80"
            >
              <div className="h-9 w-9 rounded-full bg-muted overflow-hidden shrink-0">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-rose-500/30 to-pink-500/15" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate">{creator.full_name || creator.username || "Creator"}</p>
                <p className="text-[10px] text-muted-foreground">Tap to view profile</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          )}

          {/* Title + description */}
          <div>
            <h2 className="text-[20px] font-extrabold tracking-tight">{post.title}</h2>
            {post.description && (
              <p className="text-[13px] text-muted-foreground mt-1.5 whitespace-pre-line">
                {post.description}
              </p>
            )}
          </div>

          {/* Owner-only stats */}
          {isOwner && (
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <DollarSign className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                <p className="text-sm font-extrabold">${(post.revenue_cents / 100).toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Revenue</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <Users className="h-4 w-4 text-rose-500 mx-auto mb-1" />
                <p className="text-sm font-extrabold">{post.unlock_count}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Unlocks</p>
              </div>
              <div className="rounded-2xl border border-border/40 bg-card p-3 text-center">
                <Lock className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                <p className="text-sm font-extrabold">${(post.price_cents / 100).toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Price</p>
              </div>
            </div>
          )}

          {/* Media gallery */}
          <div className="space-y-2">
            {mediaToRender.length === 0 ? (
              <div className="aspect-square rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/15 to-pink-500/5 flex items-center justify-center">
                <Lock className="h-12 w-12 text-rose-500/70" />
              </div>
            ) : (
              mediaToRender.map(({ path, url }) => {
                const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(path);
                return (
                  <motion.div
                    key={path}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "relative rounded-2xl overflow-hidden border border-border/40 bg-muted",
                      !canViewFullEffective && "ring-2 ring-rose-500/30",
                    )}
                  >
                    {url ? (
                      isVideo ? (
                        <video src={url} controls={canViewFullEffective} muted playsInline className="w-full" />
                      ) : (
                        <img src={url} alt="" className="w-full" />
                      )
                    ) : (
                      <div className="aspect-square animate-pulse" />
                    )}
                    {!canViewFullEffective && (
                      <div className="absolute inset-0 backdrop-blur-md bg-black/30 flex flex-col items-center justify-center gap-2">
                        <Lock className="h-10 w-10 text-white" />
                        <p className="text-white text-[12px] font-semibold">Preview only</p>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Post-unlock tip CTA — appears once the visitor has unlocked */}
          {!isOwner && !!unlock && (
            <button
              type="button"
              onClick={() => setTipOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-pink-500/5 hover:from-rose-500/15 hover:to-pink-500/10 transition-colors text-left active:scale-[0.99]"
            >
              <div className="h-9 w-9 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-[13px]">Loved it? Tip the creator</p>
                <p className="text-[10px] text-muted-foreground">100% goes to {creator?.full_name || "the creator"}</p>
              </div>
              <span className="text-[11px] font-extrabold text-rose-500">Tip →</span>
            </button>
          )}

          {/* Subscriber-tier badge — surfaces the bundled-benefit upfront */}
          {!isOwner && !unlock && post.free_for_subscribers && (
            <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-2.5">
              <Crown className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-[12px] font-semibold text-amber-700 dark:text-amber-400 leading-relaxed">
                {isActiveSubscriber
                  ? "You're an active subscriber — unlock free."
                  : "Subscribers unlock free. Non-subs pay the price below."}
              </p>
            </div>
          )}

          {/* Unlock CTA (visitors only) */}
          {!isOwner && !unlock && (() => {
            const subFree = !!post.free_for_subscribers && !!isActiveSubscriber;
            const balance = walletBalance ?? 0;
            const canAfford = subFree || balance >= post.price_cents;
            return (
              <div className="space-y-2">
                {!subFree && (
                  <div className="flex items-center justify-between text-[11px] px-1">
                    <span className="text-muted-foreground">
                      Wallet: <span className="font-bold text-foreground">${(balance / 100).toFixed(2)}</span>
                    </span>
                    {!canAfford && user && (
                      <a href="/wallet" className="font-bold text-rose-500 hover:underline">Top up →</a>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => unlockMut.mutate()}
                  disabled={unlockMut.isPending || !user || !canAfford}
                  className={cn(
                    "w-full h-14 rounded-2xl font-extrabold text-[15px] flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                    user && canAfford
                      ? subFree
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : "bg-rose-500 text-white hover:bg-rose-600"
                      : "bg-muted/50 text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {unlockMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : subFree ? (
                    <Crown className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                  {unlockMut.isPending
                    ? "Unlocking…"
                    : !user
                      ? "Sign in to unlock"
                      : subFree
                        ? "Unlock free with subscription"
                        : !canAfford
                          ? `Need $${((post.price_cents - balance) / 100).toFixed(2)} more`
                          : `Unlock for $${(post.price_cents / 100).toFixed(2)}`}
                </button>
                {post.free_for_subscribers && !isActiveSubscriber && user && (
                  <a
                    href={creator?.share_code ? `/u/${creator.share_code}` : "#"}
                    className="block w-full text-center text-[12px] font-bold text-amber-600 dark:text-amber-400 hover:underline py-1"
                  >
                    Or subscribe to unlock everything →
                  </a>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Edit modal */}
      <AnimatePresence>
        {editMode && post && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center px-4 overflow-y-auto py-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-extrabold">Edit PPV</h3>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="p-1.5 -mr-1.5 rounded-full hover:bg-muted/50"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={120}
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-background text-[14px] font-bold outline-none focus:border-rose-500/60"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Description</label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  rows={3}
                  maxLength={500}
                  className="mt-1 w-full p-3 rounded-xl border border-border bg-background text-[13px] outline-none focus:border-rose-500/60 resize-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setEditFreeForSubs((v) => !v)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-colors text-left",
                  editFreeForSubs
                    ? "border-rose-500 bg-rose-500/8"
                    : "border-border bg-background hover:border-rose-500/40"
                )}
              >
                <Crown className="h-4 w-4 text-rose-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-[12px]">Free for subscribers</p>
                  <p className="text-[10px] text-muted-foreground">Non-subs still pay below</p>
                </div>
                <div
                  className={cn(
                    "w-9 h-5 rounded-full p-0.5 transition-colors shrink-0",
                    editFreeForSubs ? "bg-rose-500" : "bg-muted-foreground/30"
                  )}
                >
                  <motion.div
                    animate={{ x: editFreeForSubs ? 14 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="w-4 h-4 rounded-full bg-white shadow"
                  />
                </div>
              </button>

              <div>
                <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{editFreeForSubs ? "Non-subscriber price" : "Price (USD)"}</label>
                <div className="mt-1 flex items-center h-11 rounded-xl border border-border bg-background overflow-hidden focus-within:border-rose-500/60">
                  <DollarSign className="h-4 w-4 text-muted-foreground ml-3" />
                  <input
                    type="number"
                    step="0.01"
                    min="0.99"
                    value={editPriceUsd}
                    onChange={(e) => setEditPriceUsd(e.target.value)}
                    className="flex-1 px-2 h-full bg-transparent text-[16px] font-extrabold outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={saveEdit}
                disabled={updateMut.isPending}
                className="w-full h-12 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[14px] flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {updateMut.isPending ? "Saving…" : "Save changes"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm sheet */}
      <AnimatePresence>
        {confirmDelete && post && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-end sm:items-center justify-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="w-full max-w-sm m-4 rounded-2xl border border-border bg-card p-5 space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Trash2 className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-[15px] font-extrabold">Delete this PPV?</h3>
                  <p className="text-[11px] text-muted-foreground">
                    {post.unlock_count} unlock{post.unlock_count === 1 ? "" : "s"} · this cannot be undone
                  </p>
                </div>
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Fans who already unlocked will lose access. Media files are removed
                from storage. Revenue already recorded stays in your wallet.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleteMut.isPending}
                  className="flex-1 h-11 rounded-xl border border-border bg-card font-bold text-[13px] hover:bg-muted/50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteMut.mutate()}
                  disabled={deleteMut.isPending}
                  className="flex-1 h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[13px] flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {deleteMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {deleteMut.isPending ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tip sheet — opened from the post-unlock CTA */}
      {tipOpen && post && (
        <Suspense fallback={null}>
          <TipSheet
            open={tipOpen}
            onClose={() => setTipOpen(false)}
            creatorId={post.creator_id}
            creatorName={creator?.full_name || creator?.username || "Creator"}
            creatorAvatar={creator?.avatar_url ?? null}
          />
        </Suspense>
      )}
    </div>
  );
}
