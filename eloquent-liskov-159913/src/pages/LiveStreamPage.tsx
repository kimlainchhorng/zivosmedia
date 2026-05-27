/**
 * LiveStreamPage — Browse live streams + immersive watcher.
 *
 * 100% real data:
 * - Stream list comes from `live_streams` (no demo / mock fallback)
 * - Watcher subscribes to `live_comments`, `live_viewers`, `live_likes`,
 * `live_gift_displays` via Supabase Realtime
 * - Coin balance comes from `user_coin_balances`
 * - Gifts are sent via the `send_live_gift` RPC (atomic debit + credit)
 * - Recharge calls the `recharge_coins` RPC (the Add Coin sheet is the only
 * way to add coins, per product spec)
 */
import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import SEOHead from "@/components/SEOHead";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Radio from "lucide-react/dist/esm/icons/radio";
import Eye from "lucide-react/dist/esm/icons/eye";
import Heart from "lucide-react/dist/esm/icons/heart";
import Send from "lucide-react/dist/esm/icons/send";
import Search from "lucide-react/dist/esm/icons/search";
import Plus from "lucide-react/dist/esm/icons/plus";
import Wifi from "lucide-react/dist/esm/icons/wifi";
import WifiOff from "lucide-react/dist/esm/icons/wifi-off";
import Gift from "lucide-react/dist/esm/icons/gift";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import X from "lucide-react/dist/esm/icons/x";
import Volume2 from "lucide-react/dist/esm/icons/volume-2";
import VolumeX from "lucide-react/dist/esm/icons/volume-x";
import Clapperboard from "lucide-react/dist/esm/icons/clapperboard";
import Flame from "lucide-react/dist/esm/icons/flame";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Crown from "lucide-react/dist/esm/icons/crown";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Mic from "lucide-react/dist/esm/icons/mic";
import Swords from "lucide-react/dist/esm/icons/swords";
import Users from "lucide-react/dist/esm/icons/users";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Globe from "lucide-react/dist/esm/icons/globe";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import ShoppingBag from "lucide-react/dist/esm/icons/shopping-bag";
import History from "lucide-react/dist/esm/icons/history";
import Film from "lucide-react/dist/esm/icons/film";
import MicVocal from "lucide-react/dist/esm/icons/mic-vocal";
import Hammer from "lucide-react/dist/esm/icons/hammer";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Target from "lucide-react/dist/esm/icons/target";

import Coins from "lucide-react/dist/esm/icons/coins";
import Clock from "lucide-react/dist/esm/icons/clock";
import Cake from "lucide-react/dist/esm/icons/cake";
import Bell from "lucide-react/dist/esm/icons/bell";
import Check from "lucide-react/dist/esm/icons/check";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Plane from "lucide-react/dist/esm/icons/plane";
import Megaphone from "lucide-react/dist/esm/icons/megaphone";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import Headphones from "lucide-react/dist/esm/icons/headphones";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useGiftAnimationQueue } from "@/hooks/useGiftAnimationQueue";
import goldCoinIcon from "@/assets/gifts/gold-coin.png";
import { giftImages, preloadGiftImages } from "@/config/giftIcons";
import { hasGiftVideo, preloadGiftAnimations } from "@/config/giftAnimations";
import { giftCatalog, getLevelColor, type GiftItem } from "@/config/giftCatalog";
import { playGiftSound, playPremiumGiftSound, playLegendaryGiftSound } from "@/utils/giftSounds";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";
import { LIVE_FEATURE_FLAGS } from "@/config/liveFeatureFlags";
import { useRecentlyWatchedLive } from "@/hooks/useRecentlyWatchedLive";
import { useTopLiveGifters } from "@/hooks/useTopLiveGifters";

const ZivoMobileNav = lazy(() =>import("@/components/app/ZivoMobileNav"));
const GiftAnimationOverlay = lazy(() =>import("@/components/live/GiftAnimationOverlay"));
const CoinRechargeSheet = lazy(() =>import("@/components/live/CoinRechargeSheet"));
const LiveWebRTCVideo = lazy(() =>import("@/components/live/LiveWebRTCVideo"));
const DailyRewardCard = lazy(() =>import("@/components/live/DailyRewardCard"));

interface LiveStream {
 id: string;
 user_id: string;
 host_name: string;
 host_avatar: string | null;
 host_is_verified?: boolean;
 title: string;
 topic: string;
 viewer_count: number;
 like_count: number;
 status: "live" | "scheduled" | "ended";
 started_at: string;
 ended_at?: string | null;
}

interface ChatMsg {
 id: string;
 user_id: string;
 user_name: string;
 user_is_verified?: boolean;
 user_avatar?: string | null;
 text: string;
 created_at: string;
}

/* ─────────── Watcher Component ─────────── */
function LiveWatcher({ stream, onLeave }: { stream: LiveStream; onLeave: () =>void }) {
 const { user } = useAuth();
 const { balance: coinBalance, recharge } = useCoinBalance();

 useEffect(() =>{
 preloadGiftAnimations();
 preloadGiftImages();
 }, []);

 const [chatInput, setChatInput] = useState("");
 const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
 const [showGiftPanel, setShowGiftPanel] = useState(false);
 const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
 const [giftQty, setGiftQty] = useState(1);
 const [giftTab, setGiftTab] = useState<"gifts" | "interactive" | "exclusive">("gifts");
 const [floatingHearts, setFloatingHearts] = useState<{ id: string; x: number }[]>([]);
 const [viewerCount, setViewerCount] = useState(stream.viewer_count || 0);
 const [likes, setLikes] = useState(stream.like_count || 0);
 const [muted, setMuted] = useState(true);
 const [doubleTapHeart, setDoubleTapHeart] = useState<{ id: string; x: number; y: number } | null>(null);
 const [showRechargeSheet, setShowRechargeSheet] = useState(false);
 const [sending, setSending] = useState(false);
 const [showViewerList, setShowViewerList] = useState(false);
 const [viewerNames, setViewerNames] = useState<{ user_id: string; name: string; avatar: string | null; is_verified?: boolean }[]>([]);
 // Cache of resolved verified flags so chat/gift inserts can hydrate the badge without flicker
 const verifiedCacheRef = useRef<Map<string, boolean>>(new Map());
 const [elapsed, setElapsed] = useState(0);
 const [streamEnded, setStreamEnded] = useState(stream.status === "ended");
 const [isFollowingHost, setIsFollowingHost] = useState(false);
 const [followBusy, setFollowBusy] = useState(false);
 const isHostMe = !!user && user.id === stream.user_id;

 // Hydrate follow state for the host (skip if viewer IS the host)
 useEffect(() => {
   if (!user || isHostMe) return;
   let alive = true;
   (supabase as any)
     .from("user_followers")
     .select("id")
     .eq("follower_id", user.id)
     .eq("following_id", stream.user_id)
     .maybeSingle()
     .then(({ data }: any) => { if (alive) setIsFollowingHost(Boolean(data)); });
   return () => { alive = false; };
 }, [user, stream.user_id, isHostMe]);

 const handleFollowHost = useCallback(async () => {
   if (!user) { toast.error("Sign in to follow"); return; }
   if (isHostMe || followBusy) return;
   setFollowBusy(true);
   const wasFollowing = isFollowingHost;
   setIsFollowingHost(!wasFollowing); // optimistic
   try {
     if (wasFollowing) {
       const { error } = await (supabase as any)
         .from("user_followers")
         .delete()
         .eq("follower_id", user.id)
         .eq("following_id", stream.user_id);
       if (error) throw error;
     } else {
       const { error } = await (supabase as any)
         .from("user_followers")
         .insert({ follower_id: user.id, following_id: stream.user_id });
       if (error && !String(error.message).includes("duplicate")) throw error;
       toast.success(`Following ${stream.host_name}`);
     }
   } catch {
     setIsFollowingHost(wasFollowing); // rollback
     toast.error(wasFollowing ? "Couldn't unfollow" : "Couldn't follow");
   } finally {
     setFollowBusy(false);
   }
 }, [user, isHostMe, followBusy, isFollowingHost, stream.user_id, stream.host_name]);

 const lastTapRef = useRef<number>(0);
 const chatEndRef = useRef<HTMLDivElement>(null);
 const { activeGift: activeGiftAnim, comboCount: giftCombo, enqueue: enqueueGiftAnim, onComplete: onGiftAnimComplete } = useGiftAnimationQueue();
 const allGifts = useMemo(() =>giftCatalog, []);

 // ── Stream timer ──
 useEffect(() =>{
 const startedAt = new Date(stream.started_at).getTime();
 const tick = () =>setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
 tick();
 const i = setInterval(tick, 1000);
 return () =>clearInterval(i);
 }, [stream.started_at]);

 // ── Initial load: chat history + viewer names + viewer count ──
 useEffect(() =>{
 let cancelled = false;
 (async () =>{
 const [{ data: comments }, { data: viewers }, { data: streamRow }] = await Promise.all([
 (supabase as any)
 .from("live_comments")
 .select("id, user_id, content, created_at")
 .eq("stream_id", stream.id)
 .order("created_at", { ascending: false })
 .limit(40),
 (supabase as any)
 .from("live_viewers")
 .select("user_id")
 .eq("stream_id", stream.id),
 (supabase as any)
 .from("live_streams")
 .select("viewer_count, like_count")
 .eq("id", stream.id)
 .maybeSingle(),
 ]);
 if (cancelled) return;

 if (streamRow) {
 if (typeof streamRow.viewer_count === "number") setViewerCount(streamRow.viewer_count);
 if (typeof streamRow.like_count === "number") setLikes(streamRow.like_count);
 }

 // Resolve user names for both chat + viewers
 const userIds = new Set<string>();
 (comments ?? []).forEach((c: any) =>userIds.add(c.user_id));
 (viewers ?? []).forEach((v: any) =>userIds.add(v.user_id));
 const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; is_verified?: boolean | null }>();
 if (userIds.size) {
 const { data: profs } = await supabase
 .from("profiles")
 .select("id, user_id, full_name, avatar_url, is_verified")
 .in("user_id", Array.from(userIds));
 for (const p of profs ?? []) {
 profileMap.set((p as any).user_id, { full_name: (p as any).full_name, avatar_url: (p as any).avatar_url, is_verified: (p as any).is_verified });
 verifiedCacheRef.current.set((p as any).user_id, (p as any).is_verified === true);
 }
 }

 setChatMessages(
 ((comments ?? []) as any[]).reverse().map((c: any) =>({
 id: c.id,
 user_id: c.user_id,
 user_name: profileMap.get(c.user_id)?.full_name || "Guest",
 user_avatar: profileMap.get(c.user_id)?.avatar_url ?? null,
 user_is_verified: profileMap.get(c.user_id)?.is_verified === true,
 text: c.content,
 created_at: c.created_at,
 }))
 );

 setViewerNames(
 ((viewers ?? []) as any[]).map((v: any) =>({
 user_id: v.user_id,
 name: profileMap.get(v.user_id)?.full_name || "Guest",
 avatar: profileMap.get(v.user_id)?.avatar_url ?? null,
 is_verified: profileMap.get(v.user_id)?.is_verified === true,
 }))
 );
 })();
 return () =>{
 cancelled = true;
 };
 }, [stream.id]);

 // ── Join as viewer (insert + delete on leave) ──
 useEffect(() =>{
 if (!user?.id) return;
 let active = true;
 (async () =>{
 await (supabase as any)
 .from("live_viewers")
 .insert({ stream_id: stream.id, user_id: user.id })
 .then(() =>null, () =>null); // ignore duplicates
 })();
 return () =>{
 if (!active) return;
 (supabase as any)
 .from("live_viewers")
 .delete()
 .eq("stream_id", stream.id)
 .eq("user_id", user.id)
 .then(() =>null, () =>null);
 active = false;
 };
 }, [stream.id, user?.id]);

 // ── Realtime: chat, viewers, likes, gifts ──
 useEffect(() =>{
 const channel = supabase
 .channel(`live-${stream.id}`)
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_comments", filter: `stream_id=eq.${stream.id}` },
 async (payload: any) =>{
 const row = payload.new;
 // Lookup author name
 const { data: prof } = await supabase
 .from("profiles")
 .select("full_name, avatar_url, is_verified")
 .eq("user_id", row.user_id)
 .maybeSingle();
 setChatMessages((prev) =>[
 ...prev.slice(-39),
 {
 id: row.id,
 user_id: row.user_id,
 user_name: (prof as any)?.full_name || "Guest",
 user_avatar: (prof as any)?.avatar_url ?? null,
 user_is_verified: (prof as any)?.is_verified === true,
 text: row.content,
 created_at: row.created_at,
 },
 ]);
 }
 )
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_viewers", filter: `stream_id=eq.${stream.id}` },
 () =>setViewerCount((v) =>v + 1)
 )
 .on(
 "postgres_changes",
 { event: "DELETE", schema: "public", table: "live_viewers", filter: `stream_id=eq.${stream.id}` },
 () =>setViewerCount((v) =>Math.max(0, v - 1))
 )
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_likes", filter: `stream_id=eq.${stream.id}` },
 () =>{
 setLikes((l) =>l + 1);
 setFloatingHearts((prev) =>[
 ...prev,
 { id: `h-${Date.now()}-${Math.random()}`, x: 60 + Math.random() * 30 },
 ]);
 }
 )
 .on(
 "postgres_changes",
 { event: "INSERT", schema: "public", table: "live_gift_displays", filter: `stream_id=eq.${stream.id}` },
 async (payload: any) =>{
 const g = payload.new;
 // Premium animation when applicable
 if (hasGiftVideo(g.gift_name)) {
 enqueueGiftAnim({ name: g.gift_name, coins: g.coins, senderName: g.sender_name });
 } else {
 // Sound feedback for everyone else's gifts too
 if (g.coins >= 20000) playLegendaryGiftSound();
 else if (g.coins >= 500) playPremiumGiftSound();
 else playGiftSound(1, g.coins);
 }
 // Resolve sender verified flag (cache → fetch). Awaited so the row never flickers.
 let senderVerified = verifiedCacheRef.current.get(g.sender_id);
 if (senderVerified === undefined) {
 const { data: prof } = await (supabase as any)
 .from("profiles")
 .select("is_verified")
 .eq("user_id", g.sender_id)
 .maybeSingle();
 senderVerified = (prof as any)?.is_verified === true;
 verifiedCacheRef.current.set(g.sender_id, senderVerified);
 }
 // Add to chat as a "gift" line
 setChatMessages((prev) =>[
 ...prev.slice(-39),
 {
 id: `gift-${g.id}`,
 user_id: g.sender_id,
 user_name: g.sender_name,
 user_avatar: null,
 user_is_verified: senderVerified,
 text: `sent ${g.gift_name}`,
 created_at: g.created_at,
 },
 ]);
 }
 )
 .on(
 "postgres_changes",
 { event: "UPDATE", schema: "public", table: "live_streams", filter: `id=eq.${stream.id}` },
 (payload: any) =>{
 const next = payload.new;
 if (next?.status === "ended") setStreamEnded(true);
 if (typeof next?.viewer_count === "number") setViewerCount(next.viewer_count);
 if (typeof next?.like_count === "number") setLikes(next.like_count);
 }
 )
 .subscribe();

 return () =>{
 supabase.removeChannel(channel);
 };
 }, [stream.id, enqueueGiftAnim]);

 // Auto-scroll chat
 useEffect(() =>{
 chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [chatMessages]);

 // Auto-clear floating hearts
 useEffect(() =>{
 if (!floatingHearts.length) return;
 const t = setTimeout(() =>setFloatingHearts((p) =>p.slice(1)), 2200);
 return () =>clearTimeout(t);
 }, [floatingHearts]);

 const sendChat = useCallback(async () =>{
 if (!chatInput.trim() || !user?.id) {
 if (!user?.id) toast.error("Sign in to chat");
 return;
 }
 const content = chatInput.trim();
 setChatInput("");
 const { error } = await (supabase as any)
 .from("live_comments")
 .insert({ stream_id: stream.id, user_id: user.id, content });
 if (error) toast.error("Failed to send", { description: error.message });
 }, [chatInput, stream.id, user?.id]);

 const sendLike = useCallback(async () =>{
 if (!user?.id) {
 toast.error("Sign in to like");
 return;
 }
 const { error } = await (supabase as any)
 .from("live_likes")
 .insert({ stream_id: stream.id, user_id: user.id });
 if (error && !String(error.message).includes("duplicate")) {
 toast.error("Failed to like");
 }
 }, [stream.id, user?.id]);

 const sendGift = useCallback(async () =>{
 if (!selectedGift || !user?.id) {
 if (!user?.id) toast.error("Sign in to send gifts");
 return;
 }
 const totalCoins = selectedGift.coins * giftQty;
 if (totalCoins >coinBalance) {
 toast.error("Not enough coins!", { description: "Top up your balance to send this gift." });
 setShowRechargeSheet(true);
 return;
 }
 setSending(true);
 try {
 const tier = selectedGift.coins >= 20000 ? "legendary" : selectedGift.coins >= 500 ? "premium" : "standard";
 const { error } = await (supabase as any).rpc("send_live_gift", {
 p_stream_id: stream.id,
 p_gift_name: selectedGift.name,
 p_gift_icon: selectedGift.icon,
 p_coins: selectedGift.coins,
 p_tier: tier,
 p_quantity: giftQty,
 });
 if (error) throw error;
 try { navigator.vibrate?.(giftQty >1 ? [50, 30, 50] : [50]); } catch { /* noop */ }
 // Sound for the sender (others get one via realtime handler)
 if (selectedGift.coins >= 20000) playLegendaryGiftSound();
 else if (hasGiftVideo(selectedGift.name)) playPremiumGiftSound();
 else playGiftSound(1, selectedGift.coins);
 setGiftQty(1);
 } catch (e: any) {
 toast.error("Couldn't send gift", { description: e?.message ?? "Please try again." });
 } finally {
 setSending(false);
 }
 }, [selectedGift, giftQty, coinBalance, stream.id, user?.id]);

 const handleShare = () =>{
 if (navigator.share) {
 navigator.share({ title: stream.title, text: `Watch ${stream.host_name} live on ZIVO!`, url: window.location.href });
 } else {
 navigator.clipboard.writeText(window.location.href);
 toast.success("Link copied!");
 }
 };

 const formatTime = (s: number) =>{
 const m = Math.floor(s / 60);
 const sec = s % 60;
 return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
 };

 const handleDoubleTap = useCallback(
 (e: React.TouchEvent | React.MouseEvent) =>{
 const now = Date.now();
 if (now - lastTapRef.current< 300) {
 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
 const clientX = "touches" in e ? e.touches[0]?.clientX ?? rect.width / 2 : (e as React.MouseEvent).clientX;
 const clientY = "touches" in e ? e.touches[0]?.clientY ?? rect.height / 2 : (e as React.MouseEvent).clientY;
 setDoubleTapHeart({ id: Date.now().toString(), x: clientX - rect.left, y: clientY - rect.top });
 sendLike();
 setTimeout(() =>setDoubleTapHeart(null), 1000);
 }
 lastTapRef.current = now;
 },
 [sendLike]
 );

 return (
<div className="fixed inset-0 z-50 bg-black flex flex-col">
 <SEOHead
 title="Live Streams – ZIVO"
 description="Watch live streams from creators, join interactive voice rooms, and discover trending content. Send gifts, participate in battles, and engage with community."
 />
 {/* Stream ended overlay */}
 {streamEnded && (
<div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center px-6 overflow-y-auto pt-12 pb-6">
<div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4">
<Radio className="w-8 h-8 text-white/70" />
</div>
<h2 className="text-2xl font-bold text-white mb-2">Stream ended</h2>
<p className="text-sm text-white/70 mb-6 max-w-xs text-center">
 {stream.host_name} has ended this live stream. Thanks for watching!
</p>

<div className="flex gap-2">
  <button type="button"
    onClick={onLeave}
    className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm active:scale-95 transition-transform"
   title="Back to live list">
    Back to Live
  </button>
</div>
</div>
 )}
 {/* Background — real WebRTC video from publisher */}
<div className="absolute inset-0" onClick={handleDoubleTap} onTouchEnd={handleDoubleTap}>
<div className="absolute inset-0 bg-gradient-to-br from-violet-900/80 via-black to-rose-900/60" />
<Suspense fallback={null}>
<LiveWebRTCVideo streamId={stream.id} muted={muted} />
</Suspense>
 {/* Subtle dim overlay for legibility of chat / controls */}
<div className="absolute inset-0 bg-black/20 pointer-events-none" />
<AnimatePresence>
 {doubleTapHeart && (
<motion.div
 key={doubleTapHeart.id}
 initial={{ scale: 0, opacity: 1, x: doubleTapHeart.x - 24, y: doubleTapHeart.y - 24 }}
 animate={{ scale: 1.5, opacity: 0, x: doubleTapHeart.x - 24, y: doubleTapHeart.y - 84 }}
 exit={{ opacity: 0 }}
 transition={{ duration: 0.8, ease: "easeOut" }}
 className="absolute pointer-events-none z-40"
 >
<Heart className="h-12 w-12 text-red-500 fill-red-500" />
</motion.div>
 )}
</AnimatePresence>
</div>

 {/* Top bar */}
<div
 className="zivo-live-topbar-safe relative z-20 flex items-center gap-2 px-3 pt-2"
 >
<button type="button" onClick={onLeave} aria-label="Leave stream" title="Leave stream" className="min-w-[44px] min-h-[44px] -my-1.5 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
<X className="h-4 w-4 text-white" />
</button>

<div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full pl-1 pr-1 py-0.5 flex-1 min-w-0">
<Avatar className="h-7 w-7 border-2 border-red-500 shrink-0">
<AvatarImage src={stream.host_avatar || undefined} />
<AvatarFallback className="bg-red-500/20 text-red-400 text-xs font-bold">
 {stream.host_name[0]}
</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0 px-1">
<p className="text-white text-xs font-bold truncate leading-tight inline-flex items-center gap-1">
<span className="truncate">{stream.host_name}</span>
 {isBlueVerified(stream.host_is_verified) &&<VerifiedBadge size={11} interactive={false} />}
</p>
<p className="text-white/50 text-[10px] leading-tight">{stream.topic}</p>
</div>
{!isHostMe && (
  <button type="button"
    onClick={handleFollowHost}
    disabled={followBusy}
    className={cn(
      "shrink-0 rounded-full text-[11px] font-bold px-3 py-1 transition-colors disabled:opacity-60",
      isFollowingHost
        ? "bg-white/10 text-white/70 border border-white/15"
        : "bg-ig-gradient text-white hover:opacity-90 shadow-sm",
    )}
    aria-label={isFollowingHost ? "Following" : "Follow host"}
    title={isFollowingHost ? "Following" : "Follow host"}
  >
    {isFollowingHost ? "Following" : "Follow"}
  </button>
)}
</div>

<div className="flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1">
<Eye className="h-3 w-3 text-white/70" />
<span className="text-[11px] text-white font-medium">{viewerCount.toLocaleString()}</span>
</div>
</div>

 {/* LIVE badge + title */}
<div className="relative z-10 px-4 mt-2">
<div className="flex items-center gap-2">
<Badge className="bg-red-500 text-white border-0 text-[10px] gap-1 px-2 py-0.5 animate-pulse">
<Radio className="h-2.5 w-2.5" />LIVE
</Badge>
<p className="text-white/80 text-xs font-medium truncate flex-1">{stream.title}</p>
<span className="text-white/50 text-[10px] font-mono">{formatTime(elapsed)}</span>
</div>
</div>


 {/* Floating like hearts */}
<div className="absolute right-4 bottom-48 z-30 w-14 pointer-events-none">
<AnimatePresence>
 {floatingHearts.map((r) =>{
 const randomScale = 0.8 + Math.random() * 0.8;
 const randomDrift = (Math.random() - 0.5) * 50;
 const randomDur = 1.8 + Math.random() * 1.2;
 return (
<motion.div
 key={r.id}
 initial={{ y: 0, opacity: 1, scale: 0.3 }}
 animate={{
 y: -220 - Math.random() * 80,
 opacity: [1, 1, 0.8, 0],
 scale: [0.3, randomScale, randomScale * 0.9, randomScale * 0.5],
 x: [0, randomDrift * 0.3, randomDrift],
 }}
 exit={{ opacity: 0 }}
 transition={{ duration: randomDur, ease: "easeOut" }}
 className="absolute bottom-0"
 style={{ left: `${r.x - 60}%` }}
 >
<Heart className="h-6 w-6 text-red-500 fill-red-500" />
</motion.div>
 );
 })}
</AnimatePresence>
</div>

 {/* Right sidebar actions */}
<div
 className="zivo-live-actions-offset absolute right-3 z-20 flex flex-col gap-2.5 items-center"
 >
<button type="button" onClick={() =>setMuted(!muted)} aria-label={muted ? "Unmute stream" : "Mute stream"} title={muted ? "Unmute stream" : "Mute stream"} className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
 {muted ?<VolumeX className="h-4 w-4 text-white/70" />:<Volume2 className="h-4 w-4 text-white/70" />}
</button>
<button type="button" onClick={handleShare} aria-label="Share stream" title="Share stream" className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center">
<Share2 className="h-4 w-4 text-white" />
</button>
<button type="button" onClick={sendLike} aria-label="Like stream" title="Like stream" className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center">
<Heart className="h-4 w-4 text-red-400 fill-red-400" />
 {likes >0 &&<span className="text-[8px] text-white/60 -mt-0.5">{likes >999 ? `${(likes / 1000).toFixed(1)}k` : likes}</span>}
</button>
<button type="button" onClick={() =>setShowViewerList((s) =>!s)} aria-label={showViewerList ? "Hide viewers" : "Show viewers"} title={showViewerList ? "Hide viewers" : "Show viewers"} className="w-11 h-11 rounded-full bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center">
<Eye className="h-4 w-4 text-white/70" />
<span className="text-[7px] text-white/50 -mt-0.5">{viewerCount >999 ? `${(viewerCount / 1000).toFixed(1)}k` : viewerCount}</span>
</button>
<button type="button" onClick={() =>setShowGiftPanel(true)} aria-label="Open gifts" title="Open gifts" className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
<Gift className="h-5 w-5 text-white" />
</button>
</div>

 {/* Viewer list */}
<AnimatePresence>
 {showViewerList && (
<motion.div
 initial={{ x: 200, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 exit={{ x: 200, opacity: 0 }}
 transition={{ type: "spring", damping: 20 }}
 className="zivo-live-viewers-offset absolute right-2 z-40 w-56 bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden"
 >
<div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
<span className="text-xs font-bold text-white">Viewers ({viewerCount})</span>
<button type="button" onClick={() =>setShowViewerList(false)} aria-label="Close viewer list" title="Close viewer list" className="text-white/40">
<X className="h-3.5 w-3.5" />
</button>
</div>
<div className="p-2 space-y-0.5 max-h-[250px] overflow-y-auto">
 {viewerNames.length === 0 ? (
<p className="text-[10px] text-white/40 text-center py-3">No viewers yet</p>
 ) : (
 viewerNames.slice(0, 25).map((v) =>(
<div key={v.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5">
<Avatar className="h-6 w-6"><AvatarImage src={v.avatar || undefined} /><AvatarFallback className="text-[9px]">{v.name[0]}</AvatarFallback></Avatar>
<span className="text-[11px] text-white font-medium truncate inline-flex items-center gap-1 min-w-0">
<span className="truncate">{v.name}</span>
 {isBlueVerified(v.is_verified) &&<VerifiedBadge size={11} interactive={false} />}
</span>
</div>
 ))
 )}
</div>
</motion.div>
 )}
</AnimatePresence>

 {/* Chat overlay */}
<div className="zivo-live-chat-offset absolute left-0 right-16 z-20">
<div className="pl-3 pr-16 max-h-[180px] overflow-y-auto scrollbar-hide space-y-2 flex flex-col items-start">
 {chatMessages.length === 0 ? (
<div className="text-[11px] text-white/40 italic px-2 py-1">Be the first to say hi</div>
 ) : (
 chatMessages.slice(-8).map((msg) =>(
<motion.div
 key={msg.id}
 initial={{ opacity: 0, x: -16 }}
 animate={{ opacity: 1, x: 0 }}
 className="bg-black/40 backdrop-blur-sm rounded-2xl px-2.5 py-1.5 max-w-full"
 >
<span className="text-[10px] font-bold text-amber-300 mr-1.5 inline-flex items-center gap-0.5">
 {msg.user_name}
 {isBlueVerified(msg.user_is_verified) &&<VerifiedBadge size={10} interactive={false} />}
</span>
<span className="text-[11px] text-white">{msg.text}</span>
</motion.div>
 ))
 )}
<div ref={chatEndRef} />
</div>
</div>

 {/* Bottom input */}
<div className="zivo-live-input-offset absolute left-0 right-0 z-30 px-3 pb-3 flex items-center gap-2">
<div className="flex-1 relative">
<input
 placeholder={user ? "Say something..." : "Sign in to chat"}
 value={chatInput}
 onChange={(e) =>setChatInput(e.target.value)}
 onKeyDown={(e) =>e.key === "Enter" && sendChat()}
 disabled={!user}
 className="w-full px-3 py-2 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-1 focus:ring-white/20 border border-white/10 disabled:opacity-50"
 />
</div>
<button type="button" onClick={() =>setShowGiftPanel(true)} aria-label="Send gift" title="Send gift" className="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
<Gift className="h-4 w-4 text-white" />
</button>
<button type="button" onClick={sendChat} aria-label="Send" title="Send" className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shrink-0">
<Send className="h-4 w-4 text-primary-foreground" />
</button>
</div>

 {/* Gift panel */}
<AnimatePresence>
 {showGiftPanel && (
<motion.div
 initial={{ y: "100%" }}
 animate={{ y: 0 }}
 exit={{ y: "100%" }}
 transition={{ type: "spring", damping: 25, stiffness: 300 }}
 className="zivo-live-gift-panel absolute bottom-0 left-0 right-0 z-50 bg-zinc-900/98 backdrop-blur-xl rounded-t-3xl border-t border-white/10"
 >
<div className="flex justify-center py-2"><div className="w-10 h-1 rounded-full bg-white/20" /></div>

<div className="border-b border-white/5 py-2 px-4 flex items-center gap-3">
<div className="flex items-center gap-2 shrink-0">
<div className="flex items-center gap-1 bg-amber-500/15 rounded-full px-2.5 py-1 border border-amber-500/20">
<img src={goldCoinIcon} alt="coins" className="w-4 h-4" />
<span className="text-amber-300 text-[11px] font-bold">{coinBalance.toLocaleString()}</span>
</div>
<button type="button"
 onClick={() =>setShowRechargeSheet(true)}
 className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 active:scale-90 transition-transform"
 aria-label="Add coins"
 title="Add coins"
 >
<span className="text-amber-300 text-xs font-bold leading-none">+</span>
</button>
</div>
<div className="flex-1" />
<button type="button" onClick={() => { setShowGiftPanel(false); setSelectedGift(null); }} aria-label="Close gifts" title="Close gifts" className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center shrink-0">
<X className="h-3.5 w-3.5 text-white/60" />
</button>
</div>

<div className={cn("overflow-y-auto px-2 py-3", selectedGift ? "zivo-live-gifts-scroll-compact" : "zivo-live-gifts-scroll-default")}>
<div className="grid grid-cols-4 gap-1.5">
 {allGifts[giftTab].map((gift) =>(
<button type="button"
 key={gift.name}
 onClick={() => { setSelectedGift(selectedGift?.name === gift.name ? null : gift); setGiftQty(1); }}
 className={cn(
 "relative flex flex-col items-center gap-0.5 py-2.5 px-1 rounded-xl transition-all",
 selectedGift?.name === gift.name ? "bg-amber-500/15 ring-2 ring-amber-500/40 scale-105" : "hover:bg-white/5 active:scale-90"
 )}
 >
<div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br overflow-hidden relative", gift.bg)}>
 {giftImages[gift.name] ? (
<img src={giftImages[gift.name]} alt={gift.name} className="w-10 h-10 object-contain" loading="lazy" />
 ) : (
<span className="text-3xl">{gift.icon}</span>
 )}
 {hasGiftVideo(gift.name) && (
<span className="absolute bottom-0.5 left-0.5 text-[7px] bg-black/50 text-white/80 px-1 py-0.5 rounded-md font-bold backdrop-blur-sm flex items-center"><Clapperboard className="h-2 w-2" /></span>
 )}
</div>
<span className="text-[10px] text-white/70 truncate w-full text-center leading-tight mt-0.5">{gift.name}</span>
<div className="flex items-center gap-0.5">
<span className={cn("text-[8px] font-bold", getLevelColor(gift.level))}>Lv.{gift.level}</span>
<img src={goldCoinIcon} alt="coin" className="w-3 h-3 object-contain" loading="lazy" />
<span className="text-[10px] text-yellow-400 font-semibold">{gift.coins.toLocaleString()}</span>
</div>
</button>
 ))}
</div>
</div>

<AnimatePresence>
 {selectedGift && (
<motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: "auto", opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="overflow-hidden border-t border-white/10"
 >
<div className="flex items-center gap-2 px-4 py-2.5">
<div className={cn("w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br overflow-hidden shrink-0", selectedGift.coins >= 100 ? "from-amber-400 to-orange-500" : "from-violet-400 to-purple-500")}>
 {giftImages[selectedGift.name] ? (
<img src={giftImages[selectedGift.name]} alt="" className="w-7 h-7 object-contain" />
 ) : (
<span className="text-xl">{selectedGift.icon}</span>
 )}
</div>
<div className="flex-1 min-w-0">
<p className="text-white text-xs font-semibold truncate">{selectedGift.name}</p>
<div className="flex items-center gap-1">
<img src={goldCoinIcon} alt="" className="w-3 h-3" />
<span className="text-amber-300 text-[11px] font-bold">{(selectedGift.coins * giftQty).toLocaleString()}</span>
</div>
</div>
<div className="flex gap-1 shrink-0 overflow-x-auto max-w-[180px] no-scrollbar snap-x snap-mandatory py-0.5">
 {[1, 3, 5, 10, 20, 33, 50, 99].map((q) =>(
<button type="button"
 key={q}
 onClick={() =>setGiftQty(q)}
 className={cn(
 "min-w-[34px] h-7 rounded-full text-[10px] font-bold transition-all snap-center shrink-0 px-1.5",
 giftQty === q ? "bg-amber-500/30 text-amber-300 border border-amber-500/40" : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
 )}
 >
 {q}x
</button>
 ))}
</div>
<button type="button"
 onClick={sendGift}
 disabled={sending}
 className={cn(
 "flex items-center gap-1.5 rounded-full px-4 py-2.5 shadow-lg active:scale-90 transition-all shrink-0 disabled:opacity-50",
 selectedGift.coins >= 500 ? "bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/25" : "bg-gradient-to-r from-amber-500 to-yellow-400 shadow-amber-500/25"
 )}
 >
<Send className="h-3.5 w-3.5 text-white" />
<span className="text-white text-xs font-bold">{sending ? "..." : giftQty >1 ? `x${giftQty}` : "Send"}</span>
</button>
</div>
</motion.div>
 )}
</AnimatePresence>

<div className="flex items-center border-t border-white/10 px-2 py-2 gap-1">
 {(["gifts", "interactive", "exclusive"] as const).map((tab) =>(
<button type="button"
 key={tab}
 onClick={() => { setGiftTab(tab); setSelectedGift(null); }}
 className={cn("px-3 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors", giftTab === tab ? "text-white bg-white/10" : "text-white/40")}
 >
 {tab === "gifts" ? "Gifts" : tab === "interactive" ? "Interactive" : "Exclusive"}
</button>
 ))}
<div className="flex-1" />
<button type="button" onClick={() =>setShowRechargeSheet(true)} className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-yellow-500 rounded-full px-3.5 py-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-transform">
<img src={goldCoinIcon} alt="" className="w-4 h-4" />
<span className="text-[11px] text-white font-bold">Add Coin</span>
</button>
</div>
</motion.div>
 )}
</AnimatePresence>

<Suspense fallback={null}>
<GiftAnimationOverlay
 activeGift={activeGiftAnim}
 onComplete={onGiftAnimComplete}
 giftPanelOpen={showGiftPanel}
 comboCount={giftCombo}
 />
</Suspense>

<Suspense fallback={null}>
<CoinRechargeSheet
 open={showRechargeSheet}
 onClose={() =>setShowRechargeSheet(false)}
 currentBalance={coinBalance}
 onPurchase={async (coins) =>{
 try {
 await recharge(coins);
 } catch (e: any) {
 throw new Error(e?.message ?? "Recharge failed");
 }
 }}
 />
</Suspense>
</div>
 );
}

/* ─────────── Main Page ─────────── */
export default function LiveStreamPage() {
 const navigate = useNavigate();
 const [activeStream, setActiveStream] = useState<LiveStream | null>(null);
 const [filter, setFilter] = useState<"all" | "live" | "scheduled" | "popular" | "following" | "nearby" | "pk" | "voice" | "multi">("all");
 const [showScrollTop, setShowScrollTop] = useState(false);
 const [selectedCountry, setSelectedCountry] = useState("global");
 const [rewardClaimed, setRewardClaimed] = useState(false);
 const [completedMissions, setCompletedMissions] = useState<number[]>([0, 1]);
 const [reminded, setReminded] = useState<string[]>(["maya"]);
 const [wavedNames, setWavedNames] = useState<Set<string>>(new Set());
 const [matchedNames, setMatchedNames] = useState<Set<string>>(new Set());
 const [notifiedOffline, setNotifiedOffline] = useState<Set<string>>(() => {
   try { return new Set(JSON.parse(localStorage.getItem("zivo_live_notify") || "[]")); } catch { return new Set(); }
 });
 const [followedCreators, setFollowedCreators] = useState<string[]>([]);
 const [feedbackToast, setFeedbackToast] = useState(false);
 const [eventReminders, setEventReminders] = useState<string[]>([]);
 const [joinedFamily, setJoinedFamily] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>("");

  // Real data for the Community panel
  const { data: recentlyWatched = [] } = useRecentlyWatchedLive(5);
  const { data: topGifters = [] } = useTopLiveGifters(5, 7);

 // Observe section visibility to highlight quick-nav chip
 useEffect(() => {
   const ids = ["section-discover", "section-community", "section-battles", "section-daily", "section-categories", "section-spotlight"];
   const observer = new IntersectionObserver(
     (entries) => {
       const visible = entries
         .filter((e) =>e.isIntersecting)
         .sort((a, b) =>(b.intersectionRatio || 0) - (a.intersectionRatio || 0));
       if (visible[0]) setActiveSection(visible[0].target.id);
     },
     { rootMargin: "-30% 0px -50% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
   );
   ids.forEach((id) => {
     const el = document.getElementById(id);
     if (el) observer.observe(el);
   });
   return () =>observer.disconnect();
 }, []);
 useEffect(() => {
   const handler = () =>setShowScrollTop(window.scrollY > 600);
   window.addEventListener("scroll", handler, { passive: true });
   return () =>window.removeEventListener("scroll", handler);
 }, []);
 const [searchQuery, setSearchQuery] = useState("");

 const { data: streams = [], isLoading, isFetching, refetch } = useQuery({
 queryKey: ["live-streams-real"],
 queryFn: async (): Promise<LiveStream[]>=>{
 // Sweep ghost streams (publisher heartbeat older than 60s) before listing.
 // Safe to ignore errors — worst case we briefly show a stale row.
 try {
 await (supabase as any).rpc("expire_all_stale_live_streams");
 } catch {
 /* non-fatal */
 }
 const { data: rows } = await (supabase as any)
 .from("live_streams")
 .select("id, user_id, title, topic, viewer_count, like_count, status, started_at, ended_at, host_name, host_avatar")
 .in("status", ["live", "scheduled"])
 .is("ended_at", null)
 .order("started_at", { ascending: false })
 .limit(50);
 if (!rows?.length) return [];

 // Resolve missing host names from profiles
 const missing = (rows as any[]).filter((r) =>!r.host_name).map((r) =>r.user_id);
 const allHostIds = (rows as any[]).map((r) =>r.user_id);
 const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null; is_verified?: boolean | null }>();
 if (allHostIds.length) {
 const { data: profs } = await supabase
 .from("profiles")
 .select("user_id, full_name, avatar_url, is_verified")
 .in("user_id", allHostIds);
 for (const p of (profs ?? []) as any[]) profileMap.set(p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url, is_verified: p.is_verified });
 }

 return (rows as any[])
 .filter((r) =>!r.ended_at)
 .map((r) =>({
 id: r.id,
 user_id: r.user_id,
 title: r.title || "Live Stream",
 topic: r.topic || "General",
 viewer_count: r.viewer_count ?? 0,
 like_count: r.like_count ?? 0,
 status: (r.status === "live" ? "live" : r.status === "scheduled" ? "scheduled" : "ended") as LiveStream["status"],
 started_at: r.started_at,
 ended_at: r.ended_at ?? null,
 host_name: r.host_name || profileMap.get(r.user_id)?.full_name || "Creator",
 host_avatar: r.host_avatar || profileMap.get(r.user_id)?.avatar_url || null,
 host_is_verified: profileMap.get(r.user_id)?.is_verified === true,
 }));
 },
 staleTime: 5_000,
 gcTime: 60_000,
 refetchOnWindowFocus: true,
 refetchOnReconnect: true,
 refetchInterval: 20_000, // safety poll in case realtime drops
 });

 // Realtime: refetch when any stream changes (debounced to avoid thrash)
 useEffect(() =>{
 let timer: ReturnType<typeof setTimeout>| null = null;
 const scheduleRefetch = () =>{
 if (timer) clearTimeout(timer);
 timer = setTimeout(() =>refetch(), 400);
 };
 const ch = supabase
 .channel("live-streams-list")
 .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, scheduleRefetch)
 .subscribe();
 return () =>{
 if (timer) clearTimeout(timer);
 supabase.removeChannel(ch);
 };
 }, [refetch]);

 const filteredStreams = streams.filter((s) =>{
 if (filter === "live" && s.status !== "live") return false;
 if (filter === "scheduled" && s.status !== "scheduled") return false;
 if (
 searchQuery &&
 !s.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
 !s.host_name.toLowerCase().includes(searchQuery.toLowerCase())
 )
 return false;
 return true;
 });

 const liveCount = streams.filter((s) =>s.status === "live").length;
 const handleGoLive = () =>navigate("/go-live");

 if (activeStream) {
 return<LiveWatcher stream={activeStream} onLeave={() =>setActiveStream(null)} />;
 }

 const topicPhotos: Record<string, string>= {
 Music: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=70&auto=format&fit=crop",
 Gaming: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=70&auto=format&fit=crop",
 Cooking: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800&q=70&auto=format&fit=crop",
 Fitness: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=70&auto=format&fit=crop",
 Art: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=70&auto=format&fit=crop",
 Travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=70&auto=format&fit=crop",
 Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=70&auto=format&fit=crop",
 Fashion: "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=70&auto=format&fit=crop",
 Comedy: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=70&auto=format&fit=crop",
 Education: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=70&auto=format&fit=crop",
 Sports: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=70&auto=format&fit=crop",
 General: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=70&auto=format&fit=crop",
 };

 return (
<div className="zivo-shell-mobile bg-background pb-20 scroll-smooth lg:max-w-4xl lg:mx-auto">
<div className="zivo-sticky-mobile-header pt-safe">
<div className="flex items-center gap-2 px-4 py-2.5">
<button type="button" onClick={() =>navigate(-1)} aria-label="Back" title="Back" className="min-h-[44px] min-w-[44px] flex items-center justify-center">
<ArrowLeft className="h-5 w-5 text-foreground" />
</button>
<Radio className="h-5 w-5 text-red-500" />
<h1 className="text-lg font-bold text-ig-gradient flex-1">Live</h1>
 {liveCount >0 && (
<Badge className="bg-red-500 text-white border-0 text-xs gap-1 animate-pulse">
<Wifi className="h-3 w-3" />{liveCount} Live
</Badge>
 )}
<Button
 size="sm"
 variant="ghost"
 onClick={async () =>{
 const res = await refetch();
 const count = (res.data ?? []).filter((s) =>s.status === "live").length;
 toast.success(count >0 ? `${count} live stream${count === 1 ? "" : "s"}` : "No live streams right now");
 }}
 disabled={isFetching}
 className="rounded-full min-h-[40px] min-w-[40px] p-0"
 aria-label="Refresh streams"
 >
<RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
</Button>
<Button size="sm" onClick={handleGoLive} className="rounded-full gap-1.5 bg-red-500 hover:bg-red-600 text-white">
<Plus className="h-4 w-4" />Go Live
</Button>
</div>

<div className="px-4 pb-2">
<div className="relative">
<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
<input
 value={searchQuery}
 onChange={(e) =>setSearchQuery(e.target.value)}
 placeholder="Search live streams..."
 className="w-full pl-9 pr-4 py-2 rounded-full bg-muted/40 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500/30"
 />
</div>
</div>

<div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
 {[
 { id: "all", label: "All", icon: null, live: false },
 { id: "live", label: liveCount >0 ? `Live (${liveCount})` : "Live", icon: null, live: true },
 { id: "popular", label: "Popular", icon: Flame, live: false },
 { id: "following", label: "Following", icon: Heart, live: false },
 { id: "nearby", label: "Nearby", icon: Globe, live: false },
 { id: "pk", label: "PK Battles", icon: Swords, live: false },
 { id: "voice", label: "Voice Rooms", icon: Mic, live: false },
 { id: "multi", label: "Multi-Guest", icon: Users, live: false },
 { id: "scheduled", label: "Scheduled", icon: null, live: false },
 ].map((f) =>{
 const Icon = f.icon;
 return (
<button type="button"
 key={f.id}
 onClick={() =>setFilter(f.id as any)}
 className={cn(
 "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1",
 filter === f.id ? "bg-red-500 text-white" : "bg-muted/50 text-muted-foreground hover:bg-muted"
 )}
 >
 {f.live &&<span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
 {Icon &&<Icon className="h-3 w-3" />}
 {f.label}
</button>
 );
 })}
  </div>
</div>

{/* All discover-row sections (News ticker, Live Now stories, Following ticker,
    Country picker, Daily rewards, PK Battles, Trending hashtags, Voice rooms,
    Live Events, Mini Games, Live Shopping, New Faces) are hidden — no real
    backend yet. They will return once each underlying data source ships. */}


 {/* ─── Section divider: Community ─── */}
<div id="section-community" className="px-4 pt-6 pb-1 flex items-center gap-3 scroll-mt-20">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-blue-500/30" />
  <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/80 uppercase">Community</span>
  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-blue-500/30" />
</div>

 {/* Daily login coin bonus (real DB) */}
<Suspense fallback={null}>
<DailyRewardCard />
</Suspense>

 {/* ─── Recently Watched / Continue Watching (real data) ─── */}
{LIVE_FEATURE_FLAGS.recentlyWatched && recentlyWatched.length > 0 && (
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<History className="w-4 h-4 text-blue-500" />Recently Watched
</h2>
<button type="button" onClick={() =>toast.info("Watch history is managed automatically")} className="text-[11px] text-muted-foreground flex items-center gap-0.5 active:text-foreground">
 Clear<X className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {recentlyWatched.map((r) =>(
<button type="button"
  key={r.hostId}
  onClick={() => {
    if (r.isLive) toast.success(`Resuming ${r.name}'s stream`);
    else toast.info(`${r.name} isn't live — we'll notify you when they go live`);
  }}
  className="shrink-0 flex flex-col items-center gap-1.5 w-[64px] active:scale-95 transition-transform"
>
<div className="relative">
<Avatar className={cn("h-14 w-14 ring-2", r.isLive ? "ring-red-500" : "ring-border/40 grayscale-[20%]")}>
<AvatarImage src={r.avatar ?? undefined} />
<AvatarFallback className="bg-muted">{r.name[0]}</AvatarFallback>
</Avatar>
 {r.isLive && (
<span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[7px] font-bold shadow-md">
 LIVE
</span>
 )}
</div>
<p className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">{r.name}</p>
<p className="text-[9px] text-muted-foreground">{r.lastSeen}</p>
</button>
 ))}
</div>
</div>
)}

 {/* ─── Top Gifters leaderboard (real data) ─── */}
{LIVE_FEATURE_FLAGS.topGifters && topGifters.length > 0 && (
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Gift className="w-4 h-4 text-amber-500" />Top Gifters
<Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[9px]">This week</Badge>
</h2>
<button type="button" onClick={() =>navigate("/leaderboard")} className="text-[11px] text-muted-foreground flex items-center gap-0.5 active:text-foreground">
 See all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="rounded-2xl border border-border/40 bg-gradient-to-br from-amber-500/5 via-card to-orange-500/5 p-3 space-y-2">
 {topGifters.map((g) =>(
<button type="button"
  key={g.userId}
  onClick={() =>toast.info(`${g.name} · ${g.coinsLabel} coins gifted this week`)}
  className="w-full flex items-center gap-3 p-1 rounded-xl hover:bg-muted/40 active:scale-[0.99] transition-all text-left"
>
<div className={cn(
 "w-7 text-center font-black text-[14px] shrink-0",
 g.rank === 1 ? "text-amber-500" : g.rank === 2 ? "text-zinc-400" : g.rank === 3 ? "text-orange-600" : "text-muted-foreground",
 )}>
 {`#${g.rank}`}
</div>
<Avatar className="h-9 w-9 ring-1 ring-border/40">
<AvatarImage src={g.avatar ?? undefined} />
<AvatarFallback>{g.name[0]}</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-1.5">
<p className="text-[12px] font-bold text-foreground truncate">{g.name}</p>
</div>
<p className="text-[10px] text-muted-foreground">Top supporter this week</p>
</div>
<div className="flex items-center gap-1 shrink-0">
<Gift className="w-3 h-3 text-amber-500" />
<span className="text-[12px] font-bold text-amber-600 dark:text-amber-400">{g.coinsLabel}</span>
</div>
</button>
 ))}
</div>
</div>
)}

 {/* ─── Karaoke / Singing Rooms (no backend yet — flagged off) ─── */}
{LIVE_FEATURE_FLAGS.karaokeRooms && (
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<MicVocal className="w-4 h-4 text-pink-500" />Karaoke Rooms
<Badge className="bg-pink-500 text-white border-0 text-[9px]">Sing now</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { song: "Perfect — Ed Sheeran", host: "Aria Tan", listeners: "1.2K", img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=70&auto=format&fit=crop", lang: "US" },
 { song: "Dynamite — BTS", host: "Sarah Lee", listeners: "2.8K", img: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=70&auto=format&fit=crop", lang: "KR" },
 { song: "ស្រលាញ់បងម្នាក់ឯង", host: "Sophea", listeners: "890", img: "https://images.unsplash.com/photo-1517450612988-c79b1f4ee2d3?w=400&q=70&auto=format&fit=crop", lang: "KH" },
 { song: "Lemon — Kenshi", host: "Niko Ito", listeners: "1.5K", img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=70&auto=format&fit=crop", lang: "JP" },
 { song: "Shape of You", host: "Felix", listeners: "640", img: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=70&auto=format&fit=crop", lang: "GB" },
 ].map((k, i) =>(
<button type="button"
 key={i}
 onClick={() =>navigate("/spaces")}
 className="shrink-0 w-[180px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative h-[100px]">
<img src={k.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-tr from-pink-600/85 via-rose-500/60 to-purple-500/40" />
<span className="absolute top-2 left-2 text-base">{k.lang}</span>
<Badge className="absolute top-2 right-2 bg-pink-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Mic className="w-2 h-2" />SINGING
</Badge>
<div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
<Users className="w-2.5 h-2.5 text-white/80" />
<span className="text-[9px] text-white font-semibold">{k.listeners}</span>
</div>
<MicVocal className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 text-white/80" />
</div>
<div className="p-2.5">
<p className="font-semibold text-[12px] text-foreground line-clamp-1">{k.song}</p>
<p className="text-[10px] text-muted-foreground mt-0.5">@{k.host}</p>
</div>
</button>
 ))}
</div>
</div>
)}

 {/* ─── Birthday Celebrations (no backend yet — flagged off) ─── */}
{LIVE_FEATURE_FLAGS.birthdayCelebrations && (
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Birthday Celebrations
<Badge className="bg-fuchsia-500 text-white border-0 text-[9px]">Send gifts</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "Maya Chen", age: "22", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70&auto=format&fit=crop", today: true },
 { name: "Niko Ito", age: "25", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=70&auto=format&fit=crop", today: false, when: "Tomorrow" },
 { name: "Sarah Lee", age: "21", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=70&auto=format&fit=crop", today: false, when: "in 2 days" },
 { name: "Felix B.", age: "27", img: "https://images.unsplash.com/photo-1528741013444-c4e9f3f5beda?w=200&q=70&auto=format&fit=crop", today: false, when: "in 3 days" },
 { name: "Emma R.", age: "24", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=70&auto=format&fit=crop", today: false, when: "in 5 days" },
 ].map((b) =>(
<button type="button"
 key={b.name}
 onClick={() => {
   if (b.today) toast.success(`Sending birthday gift to ${b.name}!`, { description: "Opening gift menu..." });
   else toast.info(`Reminder set for ${b.name}'s birthday ${b.when}`);
 }}
 className="shrink-0 w-[100px] rounded-2xl overflow-hidden bg-gradient-to-br from-fuchsia-500/10 via-pink-500/5 to-rose-500/10 border border-fuchsia-500/30 p-2.5 text-center active:scale-95 transition-transform"
 >
<div className="relative inline-block">
<Avatar className="h-14 w-14 ring-2 ring-fuchsia-400 mx-auto">
<AvatarImage src={b.img} />
<AvatarFallback>{b.name[0]}</AvatarFallback>
</Avatar>
<Cake className="absolute -top-1 -right-1 w-4 h-4 text-fuchsia-500" />
</div>
<p className="text-[11px] font-bold text-foreground truncate mt-1.5">{b.name}</p>
<p className={cn("text-[9px] font-semibold", b.today ? "text-fuchsia-500" : "text-muted-foreground")}>
 {b.today ? "Today" : b.when}
</p>
</button>
 ))}
</div>
</div>
)}

{/* The following sections (Replays, PK Season, Agency, AR Studio, Dating Live,
    Become a Host, Auctions, Study Rooms, Daily Missions, Upcoming, Game/Pet/Travel/
    Hot News/Sports/Zodiac/DJ/Comedy/Quiz Live, Creator of Day, Rising Stars,
    Cosplay/ASMR/Crypto/Magic Live, Coin Recharge promo, Categories grid,
    Top Creators leaderboard) are mock-only and hidden until backends ship. */}
{false && (<>
 {/* ─── Replays / Top Moments ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Clapperboard className="w-4 h-4 text-violet-500" />Top Moments
<Badge className="bg-violet-500 text-white border-0 text-[9px]">Replays</Badge>
</h2>
<button type="button" onClick={() =>navigate("/reels")} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
 See all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { title: "Best PK comeback ever", host: "Maya", views: "2.1M", duration: "0:48", img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=70&auto=format&fit=crop" },
 { title: "Hit the high note ", host: "Aria", views: "890K", duration: "1:12", img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=70&auto=format&fit=crop" },
 { title: "Cooking gone wrong ", host: "Alex", views: "1.4M", duration: "0:32", img: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=400&q=70&auto=format&fit=crop" },
 { title: "Diamond rain shower ", host: "DiamondKing", views: "640K", duration: "1:05", img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70&auto=format&fit=crop" },
 { title: "Surprise birthday party ", host: "Sarah", views: "412K", duration: "2:18", img: "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=400&q=70&auto=format&fit=crop" },
 ].map((m, i) =>(
<button type="button"
 key={i}
 onClick={() =>navigate("/reels")}
 className="shrink-0 w-[140px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative aspect-[9/16]">
<img src={m.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
<Film className="w-4 h-4 text-white" />
</div>
<Badge className="absolute top-2 left-2 bg-violet-500 text-white border-0 text-[9px]">REPLAY</Badge>
<span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono font-bold">{m.duration}</span>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[12px] leading-tight line-clamp-2 drop-shadow">{m.title}</p>
<div className="flex items-center justify-between mt-1">
<span className="text-[10px] text-white/80">@{m.host}</span>
<div className="flex items-center gap-0.5">
<Eye className="w-2.5 h-2.5 text-white/80" />
<span className="text-[9px] text-white/80 font-semibold">{m.views}</span>
</div>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Section divider: Battles & Studio ─── */}
<div id="section-battles" className="px-4 pt-6 pb-1 flex items-center gap-3 scroll-mt-20">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-amber-500/30" />
  <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/80 uppercase">Battles & Studio</span>
  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-amber-500/30" />
</div>

 {/* ─── PK Battle Tier / Season Ranking ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Swords className="w-4 h-4 text-amber-500" />PK Season 4
<Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[9px]">Ends in 12d</Badge>
</h2>
<button type="button" className="text-[11px] text-muted-foreground flex items-center gap-0.5" title="View PK rules">
 Rules<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-rose-500/5 p-3">
<div className="grid grid-cols-5 gap-2 mb-3">
 {[
 { tier: "Bronze", emoji: "", color: "from-orange-700 to-orange-500", count: "12K" },
 { tier: "Silver", emoji: "", color: "from-zinc-400 to-zinc-300", count: "8.4K" },
 { tier: "Gold", emoji: "", color: "from-amber-500 to-yellow-400", count: "3.2K" },
 { tier: "Diamond", emoji: "", color: "from-cyan-400 to-blue-500", count: "820" },
 { tier: "Master", emoji: "", color: "from-fuchsia-500 to-purple-600", count: "Top 50" },
 ].map((t) =>(
<div key={t.tier} className="flex flex-col items-center gap-1">
<div className={cn("w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md", t.color)}>
<span className="text-xl">{t.emoji}</span>
</div>
<p className="text-[10px] font-bold text-foreground">{t.tier}</p>
<p className="text-[9px] text-muted-foreground">{t.count}</p>
</div>
 ))}
</div>
<div className="border-t border-border/40 pt-2.5 flex items-center justify-between">
<div className="flex items-center gap-2">
<span className="text-lg"></span>
<div>
<p className="text-[11px] font-bold text-foreground">Your tier: Silver II</p>
<p className="text-[10px] text-muted-foreground">Win 3 more PKs to reach Gold</p>
</div>
</div>
<button type="button" className="text-[11px] font-bold text-amber-600 dark:text-amber-400" title="View season ladder">
 View ladder →
</button>
</div>
</div>
</div>

 {/* ─── Family / Agency Spotlight ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Users className="w-4 h-4 text-indigo-500" />Top Families
<Badge className="bg-indigo-500 text-white border-0 text-[9px]">Join one</Badge>
</h2>
<button type="button" className="text-[11px] text-muted-foreground flex items-center gap-0.5" title="See all families">
 See all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "DragonFamily", emoji: "", members: "1.2K", rank: 1, color: "from-red-600 via-orange-500 to-amber-500" },
 { name: "MoonGuild", emoji: "", members: "894", rank: 2, color: "from-violet-600 via-purple-500 to-indigo-500" },
 { name: "PhoenixFam", emoji: "", members: "740", rank: 3, color: "from-orange-600 via-red-500 to-pink-500" },
 { name: "SakuraVibe", emoji: "", members: "612", rank: 4, color: "from-pink-500 via-rose-400 to-fuchsia-500" },
 { name: "AngelClub", emoji: "", members: "548", rank: 5, color: "from-cyan-400 via-sky-500 to-blue-500" },
 { name: "RoyalCrew", emoji: "", members: "490", rank: 6, color: "from-amber-500 via-yellow-400 to-orange-400" },
 ].map((f) =>{
   const isJoined = joinedFamily === f.name;
   return (
<button type="button"
 key={f.name}
 onClick={() => {
   if (isJoined) {
     setJoinedFamily(null);
     toast.info(`Left ${f.name}`);
   } else {
     setJoinedFamily(f.name);
     toast.success(`Welcome to ${f.name}!`, { description: `${f.members} members · You're #${f.rank}'s newest fan` });
   }
 }}
 className={cn(
 "shrink-0 w-[140px] h-[110px] rounded-2xl bg-gradient-to-br p-3 active:scale-95 transition-transform shadow-md text-left relative overflow-hidden",
 f.color,
 isJoined && "ring-2 ring-white",
 )}
 >
<div className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-white/15 backdrop-blur-sm" />
<span className="text-3xl block mb-1">{f.emoji}</span>
<p className="text-white font-bold text-[12px] leading-tight">{f.name}</p>
<div className="flex items-center justify-between mt-1">
<span className="text-white/80 text-[10px]">#{f.rank}</span>
<div className="flex items-center gap-0.5">
<Users className="w-2.5 h-2.5 text-white/80" />
<span className="text-white/80 text-[10px] font-semibold">{f.members}</span>
</div>
</div>
{isJoined && (
  <div className="absolute bottom-2 left-3 right-3 py-0.5 rounded-full bg-white/30 backdrop-blur-sm text-center">
    <span className="text-[9px] font-black text-white uppercase tracking-wider">Joined</span>
  </div>
)}
</button>
   );
 })}
</div>
</div>

 {/* ─── AR Effects / Studio Preview ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Sparkles className="w-4 h-4 text-cyan-500" />Studio Effects
<Badge className="bg-cyan-500 text-white border-0 text-[9px]">Try free</Badge>
</h2>
<button type="button" onClick={() =>navigate("/filters")} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
 Browse all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { label: "Beauty", emoji: "", desc: "Smooth skin & glow", gradient: "from-muted to-muted" },
 { label: "Anime Eyes", emoji: "", desc: "Big sparkly eyes", gradient: "from-muted to-muted" },
 { label: "Cat Ears", emoji: "", desc: "Cute kitty filter", gradient: "from-muted to-muted" },
 { label: "Bunny", emoji: "", desc: "Pink bunny ears", gradient: "from-muted to-muted" },
 { label: "Crown", emoji: "", desc: "Royal sparkle", gradient: "from-amber-300 via-yellow-200 to-orange-300" },
 { label: "Galaxy", emoji: "", desc: "Star background", gradient: "from-muted to-muted" },
 { label: "Vintage", emoji: "", desc: "Film grain", gradient: "from-amber-200 via-orange-200 to-yellow-200" },
 { label: "Neon", emoji: "", desc: "Cyberpunk glow", gradient: "from-muted to-muted" },
 ].map((e) =>(
<button type="button"
 key={e.label}
 onClick={() =>navigate("/go-live?effect=" + e.label.toLowerCase())}
 className="shrink-0 w-[100px] flex flex-col items-center gap-1.5"
 >
<div className={cn(
 "w-[88px] h-[88px] rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-md active:scale-95 transition-transform relative overflow-hidden",
 e.gradient,
 )}>
<span className="text-4xl">{e.emoji}</span>
<Badge className="absolute bottom-1 right-1 bg-white/30 backdrop-blur-sm text-white border-0 text-[8px] font-bold">TRY</Badge>
</div>
<p className="text-[11px] font-semibold text-foreground">{e.label}</p>
<p className="text-[9px] text-muted-foreground text-center leading-tight">{e.desc}</p>
</button>
 ))}
</div>
</div>

 {/* ─── Dating Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Heart className="w-4 h-4 text-pink-500 fill-pink-500" />Dating Live
<Badge className="bg-pink-500 text-white border-0 text-[9px]">18+</Badge>
</h2>
<button type="button" onClick={() =>navigate("/dating")} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
 See all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "Aria", age: 24, country: "SG", interests: "Music, Travel", img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=70&auto=format&fit=crop", online: true },
 { name: "Felix", age: 27, country: "GB", interests: "Gym, Coffee", img: "https://images.unsplash.com/photo-1528741013444-c4e9f3f5beda?w=400&q=70&auto=format&fit=crop", online: true },
 { name: "Emma", age: 23, country: "FR", interests: "Art, Cooking", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&q=70&auto=format&fit=crop", online: false },
 { name: "Yui", age: 25, country: "JP", interests: "Anime, Tech", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=70&auto=format&fit=crop", online: true },
 { name: "Marco", age: 28, country: "IT", interests: "Food, Wine", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=70&auto=format&fit=crop", online: false },
 ].map((d) =>(
<div
 key={d.name}
 className="shrink-0 w-[140px] rounded-2xl overflow-hidden bg-card border border-border/30 shadow-sm text-left"
 >
<button type="button"
 onClick={() =>navigate("/dating")}
 className="block w-full text-left active:scale-[0.97] transition-transform"
 >
<div className="relative aspect-[3/4]">
<img src={d.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent" />
 {d.online && (
<div className="absolute top-2 left-2 flex items-center gap-1 bg-emerald-500 rounded-full px-1.5 py-0.5">
<span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
<span className="text-[8px] text-white font-bold">ONLINE</span>
</div>
 )}
<span className="absolute top-2 right-2 text-base">{d.country}</span>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[13px] leading-tight">{d.name}, {d.age}</p>
<p className="text-white/80 text-[10px] line-clamp-1">{d.interests}</p>
</div>
</div>
</button>
<div className="p-2 flex gap-1.5">
<button type="button"
  disabled={wavedNames.has(d.name)}
  onClick={() => { setWavedNames(prev => new Set([...prev, d.name])); toast.success(`Waved at ${d.name}! 👋`); }}
  className={cn("flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all", wavedNames.has(d.name) ? "bg-pink-500/5 text-pink-400/50 cursor-default" : "bg-pink-500/15 text-pink-600 dark:text-pink-400 active:scale-95")}
>
  {wavedNames.has(d.name) ? "Waved ✓" : "Wave"}
</button>
<button type="button"
  disabled={matchedNames.has(d.name)}
  onClick={() => { setMatchedNames(prev => new Set([...prev, d.name])); toast.success(`Match request sent to ${d.name}!`); }}
  className={cn("flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all", matchedNames.has(d.name) ? "bg-pink-400 text-white/60 cursor-default" : "bg-pink-500 text-white active:scale-95")}
>
  {matchedNames.has(d.name) ? "Sent ✓" : "Match"}
</button>
</div>
</div>
 ))}
</div>
</div>

 {/* ─── Become a Host promo banner ─── */}
<div className="px-4 pt-4 pb-1">
<button type="button"
 onClick={handleGoLive}
 className="w-full relative rounded-2xl overflow-hidden p-4 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 text-left active:scale-[0.99] transition-transform shadow-lg"
  title="Become a ZIVO host">
<div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&q=50&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-25" />
<div className="relative z-10 flex items-center gap-3">
<div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
<Mic className="w-6 h-6 text-white" />
</div>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-1.5 flex-wrap">
<Badge className="bg-amber-400 text-amber-900 border-0 text-[9px] font-black">RECRUITING</Badge>
<span className="text-[10px] text-white/90 font-semibold">Earn up to $5K/mo</span>
</div>
<p className="text-white font-bold text-[14px] leading-tight mt-1">Become a ZIVO Host</p>
<p className="text-white/80 text-[11px] leading-tight mt-0.5">Join our creator program — get bonuses, gifts, and global reach</p>
</div>
<div className="flex items-center gap-1 bg-white rounded-full px-3 py-2 shrink-0 shadow-md">
<span className="text-violet-600 text-[11px] font-bold">Apply</span>
<ChevronRight className="w-3 h-3 text-violet-600" />
</div>
</div>
</button>
</div>

 {/* ─── Live Auctions ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Hammer className="w-4 h-4 text-rose-500" />Live Auctions
<Badge className="bg-rose-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<span className="h-1.5 w-1.5 rounded-full bg-white" />Bidding now
</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { item: "Vintage Rolex Submariner", current: 8420, ends: "2m 15s", bidders: 42, img: "https://images.unsplash.com/photo-1547996160-81dfa63595aa?w=400&q=70&auto=format&fit=crop" },
 { item: "Signed Jordan Jersey", current: 1240, ends: "12m 04s", bidders: 28, img: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=70&auto=format&fit=crop" },
 { item: "Limited Edition Sneakers", current: 580, ends: "5m 32s", bidders: 67, img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=70&auto=format&fit=crop" },
 { item: "Rare Pokémon Card", current: 920, ends: "8m 18s", bidders: 35, img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=70&auto=format&fit=crop" },
 ].map((a, i) =>(
<button type="button"
 key={i}
 onClick={() => {
   const next = a.current + Math.ceil(a.current * 0.05);
   toast.success(`Bid placed: $${next.toLocaleString()}`, { description: `${a.item} · ends in ${a.ends}` });
 }}
 className="shrink-0 w-[160px] rounded-2xl overflow-hidden bg-card border border-rose-500/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative aspect-square">
<img src={a.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<Badge className="absolute top-2 left-2 bg-rose-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Hammer className="w-2 h-2" />LIVE
</Badge>
<div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-0.5">
<span className="text-[9px] text-white font-mono font-bold">{a.ends}</span>
</div>
</div>
<div className="p-2.5">
<p className="font-semibold text-[12px] text-foreground line-clamp-1">{a.item}</p>
<div className="flex items-center justify-between mt-1.5">
<div>
<p className="text-[9px] text-muted-foreground leading-none">Current bid</p>
<p className="text-[13px] font-black text-rose-600 dark:text-rose-400 leading-tight">${a.current.toLocaleString()}</p>
</div>
<div className="flex items-center gap-0.5 text-muted-foreground">
<Users className="w-2.5 h-2.5" />
<span className="text-[10px] font-semibold">{a.bidders}</span>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Study Together rooms ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<BookOpen className="w-4 h-4 text-emerald-500" />Study Together
<Badge className="bg-emerald-500 text-white border-0 text-[9px]">Focus mode</Badge>
</h2>
</div>
<div className="grid grid-cols-2 gap-2.5">
 {[
 { title: "Pomodoro 25/5", studying: 142, emoji: "", gradient: "from-red-500 to-orange-500" },
 { title: "Silent library", studying: 89, emoji: "", gradient: "from-emerald-500 to-teal-500" },
 { title: "Coding bootcamp", studying: 64, emoji: "", gradient: "from-muted to-muted" },
 { title: "Lo-fi study", studying: 218, emoji: "", gradient: "from-muted to-muted" },
 ].map((r, i) =>(
<button type="button"
 key={i}
 onClick={() =>navigate("/spaces")}
 className={cn(
 "rounded-2xl bg-gradient-to-br p-3 h-[80px] flex flex-col justify-between active:scale-95 hover:shadow-md transition-all shadow-sm text-left",
 r.gradient,
 )}
 >
<span className="text-2xl">{r.emoji}</span>
<div>
<p className="text-white font-bold text-[12px] leading-tight">{r.title}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-white/80 text-[10px]">{r.studying} studying</span>
<span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Section divider: Daily ─── */}
<div id="section-daily" className="px-4 pt-6 pb-1 flex items-center gap-3 scroll-mt-20">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-emerald-500/30" />
  <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/80 uppercase">Daily</span>
  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-emerald-500/30" />
</div>

 {/* ─── Daily Missions / Quests ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Target className="w-4 h-4 text-emerald-500" />Daily Missions
<Badge className="bg-emerald-500 text-white border-0 text-[9px]">{completedMissions.length}/5 done</Badge>
</h2>
<span className="text-[11px] text-muted-foreground">+220 coins</span>
</div>
<div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-card to-teal-500/5 p-2 space-y-1.5">
 {[
 { label: "Watch a live stream for 5 min", reward: 30 },
 { label: "Send 1 gift to any host", reward: 50 },
 { label: "Like 3 streams", reward: 20, progress: "1/3" },
 { label: "Join a voice room", reward: 40 },
 { label: "Share a stream", reward: 80, badge: "BIG" },
 ].map((m, i) =>{
   const done = completedMissions.includes(i);
   return (
<button type="button"
  key={i}
  onClick={() => {
    setCompletedMissions((prev) => {
      if (prev.includes(i)) return prev.filter((x) =>x !== i);
      toast.success(`Mission complete! +${m.reward} coins`);
      return [...prev, i];
    });
  }}
  className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-background/40 hover:bg-background/60 active:scale-[0.99] transition-all text-left"
>
<div className={cn(
 "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold",
 done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground border border-border",
 )}>
 {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
</div>
<div className="flex-1 min-w-0">
<p className={cn("text-[12px] font-semibold leading-tight", done ? "text-muted-foreground line-through" : "text-foreground")}>
 {m.label}
</p>
 {m.progress && !done &&<p className="text-[10px] text-emerald-600 font-medium">Progress: {m.progress}</p>}
</div>
 {m.badge &&<Badge className="bg-amber-500 text-white border-0 text-[8px] font-bold shrink-0">{m.badge}</Badge>}
<div className="flex items-center gap-0.5 shrink-0">
<Coins className="w-3 h-3 text-amber-500" />
<span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">+{m.reward}</span>
</div>
</button>
   );
 })}
</div>
</div>

 {/* ─── Upcoming / Scheduled Live (Anchor Schedule) ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Calendar className="w-4 h-4 text-blue-500" />Coming Up
<Badge className="bg-ig-gradient text-white border-0 text-[9px]">Set reminder</Badge>
</h2>
</div>
<div className="space-y-2">
 {[
 { name: "Maya Chen", title: "Album launch party ", time: "Tonight 8PM", topic: "Music", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70&auto=format&fit=crop", reminded: true },
 { name: "Jin Park", title: "Ranked grind to Diamond", time: "Tomorrow 7PM", topic: "Gaming", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70&auto=format&fit=crop", reminded: false },
 { name: "Lily Wong", title: "Spring makeup tutorial", time: "Sat 3PM", topic: "Beauty", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70&auto=format&fit=crop", reminded: false },
 ].map((s, i) =>{
   const key = s.name.split(" ")[0].toLowerCase();
   const isReminded = reminded.includes(key);
   return (
<div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border/30">
<Avatar className="h-12 w-12 shrink-0">
<AvatarImage src={s.img} />
<AvatarFallback>{s.name[0]}</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0">
<div className="flex items-center gap-1.5">
<p className="text-[12px] font-bold text-foreground truncate">{s.name}</p>
<Badge className="bg-muted text-muted-foreground border-border text-[8px] py-0 px-1.5">{s.topic}</Badge>
</div>
<p className="text-[12px] text-foreground/90 line-clamp-1">{s.title}</p>
<p className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5"><Clock className="inline w-2.5 h-2.5" /> {s.time}</p>
</div>
<button type="button"
  onClick={() => {
    setReminded((prev) => {
      if (prev.includes(key)) {
        toast.info(`Reminder removed for ${s.name}`);
        return prev.filter((x) =>x !== key);
      }
      toast.success(`Reminder set for ${s.name} at ${s.time}`);
      return [...prev, key];
    });
  }}
  className={cn(
 "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all active:scale-95",
 isReminded ? "bg-white/15 text-white border border-white/30" : "bg-ig-gradient text-white shadow-sm hover:opacity-90",
 )}>
 {isReminded ? "Reminded" : "+ Remind"}
</button>
</div>
   );
 })}
</div>
</div>

 {/* ─── Section divider: Categories ─── */}
<div id="section-categories" className="px-4 pt-6 pb-1 flex items-center gap-3 scroll-mt-20">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-violet-500/30" />
  <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/80 uppercase">Browse Categories</span>
  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-violet-500/30" />
</div>

 {/* ─── Game Live Hub (game-specific streams) ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Gaming Live
<Badge className="bg-violet-500 text-white border-0 text-[9px]">Esports</Badge>
</h2>
<button type="button" onClick={() =>setSearchQuery("gaming")} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
 See all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { game: "Mobile Legends", players: "1.2K live", img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=70&auto=format&fit=crop", color: "from-blue-600 to-cyan-500" },
 { game: "PUBG Mobile", players: "890 live", img: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&q=70&auto=format&fit=crop", color: "from-orange-600 to-amber-500" },
 { game: "Free Fire", players: "640 live", img: "https://images.unsplash.com/photo-1556438064-2d7646166914?w=400&q=70&auto=format&fit=crop", color: "from-red-600 to-rose-500" },
 { game: "Valorant", players: "480 live", img: "https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=400&q=70&auto=format&fit=crop", color: "from-rose-600 to-pink-500" },
 { game: "Genshin Impact", players: "420 live", img: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&q=70&auto=format&fit=crop", color: "from-violet-600 to-fuchsia-500" },
 { game: "Call of Duty", players: "380 live", img: "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&q=70&auto=format&fit=crop", color: "from-emerald-600 to-teal-500" },
 ].map((g, i) =>(
<button type="button"
 key={i}
 onClick={() =>setSearchQuery(g.game)}
 className="shrink-0 w-[140px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative h-[140px]">
<img src={g.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className={cn("absolute inset-0 bg-gradient-to-tr opacity-80", g.color)} />
<Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[12px] leading-tight drop-shadow">{g.game}</p>
<p className="text-white/90 text-[10px] font-semibold">{g.players}</p>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Pet Live (cute animals) ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Pet Live
<Badge className="bg-orange-500 text-white border-0 text-[9px]">So cute</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "Mochi the Shiba", host: "Yui", viewers: 2840, emoji: "", img: "https://images.unsplash.com/photo-1546238232-20216dec9f72?w=400&q=70&auto=format&fit=crop" },
 { name: "Luna the Cat", host: "Sarah", viewers: 1920, emoji: "", img: "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=400&q=70&auto=format&fit=crop" },
 { name: "Bunny Bowl", host: "Emma", viewers: 1240, emoji: "", img: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?w=400&q=70&auto=format&fit=crop" },
 { name: "Parrot Show", host: "Marco", viewers: 890, emoji: "", img: "https://images.unsplash.com/photo-1452570053594-1b985d6ea890?w=400&q=70&auto=format&fit=crop" },
 { name: "Aquarium tour", host: "Felix", viewers: 720, emoji: "", img: "https://images.unsplash.com/photo-1544552866-d3ed42536cfd?w=400&q=70&auto=format&fit=crop" },
 ].map((p, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("pet"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[150px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative aspect-square">
<img src={p.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<span className="absolute top-2 right-2 text-2xl">{p.emoji}</span>
<div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
<Eye className="w-2.5 h-2.5 text-white/80" />
<span className="text-[9px] text-white font-semibold">{p.viewers.toLocaleString()}</span>
</div>
</div>
<div className="p-2">
<p className="font-semibold text-[12px] text-foreground line-clamp-1">{p.name}</p>
<p className="text-[10px] text-muted-foreground">@{p.host}</p>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Travel Live (vlog streams) ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Plane className="w-4 h-4 text-sky-500" />Travel Live
<Badge className="bg-sky-500 text-white border-0 text-[9px]">Around the world</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { city: "Tokyo, Japan", host: "Niko Ito", viewers: 4820, country: "JP", img: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=70&auto=format&fit=crop" },
 { city: "Bali, Indonesia", host: "Dewi", viewers: 3210, country: "ID", img: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&q=70&auto=format&fit=crop" },
 { city: "Paris, France", host: "Emma", viewers: 2540, country: "FR", img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&q=70&auto=format&fit=crop" },
 { city: "Phnom Penh, Cambodia", host: "Sokha", viewers: 1860, country: "KH", img: "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=400&q=70&auto=format&fit=crop" },
 { city: "Bangkok, Thailand", host: "Ploy", viewers: 1420, country: "TH", img: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=400&q=70&auto=format&fit=crop" },
 { city: "Seoul, Korea", host: "Min-Jun", viewers: 1180, country: "KR", img: "https://images.unsplash.com/photo-1538485399081-7c8970d5ff97?w=400&q=70&auto=format&fit=crop" },
 ].map((t, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("travel"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[180px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative h-[110px]">
<img src={t.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
<Badge className="absolute top-2 left-2 bg-red-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<span className="absolute top-2 right-2 text-base">{t.country}</span>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[12px] leading-tight drop-shadow">{t.city}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-white/80 text-[10px]">@{t.host}</span>
<div className="flex items-center gap-0.5 text-white/90">
<Eye className="w-2.5 h-2.5" />
<span className="text-[9px] font-semibold">{t.viewers.toLocaleString()}</span>
</div>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Hot News / Live Newsroom ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Megaphone className="w-4 h-4 text-red-500" />Hot Topics Live
<Badge className="bg-red-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<span className="h-1.5 w-1.5 rounded-full bg-white" />Breaking
</Badge>
</h2>
</div>
<div className="space-y-2">
 {[
 { title: "ZIVO 2026 launch — global watch party", host: "ZIVO Official", topic: "Tech", viewers: 28430, img: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=70&auto=format&fit=crop", verified: true, breaking: true },
 { title: "Live Q&A with founders", host: "ZIVO News", topic: "News", viewers: 12480, img: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=400&q=70&auto=format&fit=crop", verified: true },
 { title: "Khmer New Year traditions explained", host: "Sokha", topic: "Culture", viewers: 8240, img: "https://images.unsplash.com/photo-1532635241-17e820acc59f?w=400&q=70&auto=format&fit=crop", verified: false },
 ].map((n, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("news"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="w-full flex items-center gap-3 p-2 rounded-2xl bg-card border border-border/30 active:scale-[0.99] transition-transform shadow-sm text-left"
 >
<div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
<img src={n.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
 {n.breaking &&<Badge className="absolute top-1 left-1 bg-red-500 text-white border-0 text-[8px] px-1 animate-pulse">BREAKING</Badge>}
</div>
<div className="flex-1 min-w-0">
<p className="font-bold text-[12px] text-foreground line-clamp-2 leading-tight">{n.title}</p>
<div className="flex items-center gap-1.5 mt-1">
<span className="text-[10px] font-semibold text-foreground inline-flex items-center gap-0.5">
 {n.host}
 {n.verified &&<BadgeCheck className="w-2.5 h-2.5 text-blue-500 fill-blue-500/20" />}
</span>
<span className="text-[10px] text-muted-foreground">·</span>
<Badge className="bg-muted text-muted-foreground border-border text-[8px] py-0 px-1">{n.topic}</Badge>
</div>
<div className="flex items-center gap-1 mt-0.5">
<Eye className="w-3 h-3 text-muted-foreground" />
<span className="text-[10px] text-muted-foreground font-semibold">{n.viewers.toLocaleString()} watching</span>
</div>
</div>
<ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
</button>
 ))}
</div>
</div>

 {/* ─── Sports Live (matches & e-sports) ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Sports Live
<Badge className="bg-emerald-600 text-white border-0 text-[9px] gap-1 animate-pulse">
<span className="h-1.5 w-1.5 rounded-full bg-white" />Match on
</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { league: "Premier League", teams: "Liverpool vs Arsenal", score: "2 - 1", minute: "78'", img: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { league: "NBA", teams: "Lakers vs Warriors", score: "98 - 102", minute: "Q3 5:42", img: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { league: "Esports — ML Pro", teams: "ONIC vs RRQ", score: "1 - 1", minute: "Game 3", img: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { league: "UFC 312", teams: "Pereira vs Ankalaev", score: "Round 2", minute: "2:14", img: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { league: "Tennis Open", teams: "Alcaraz vs Sinner", score: "4 - 6, 6 - 4", minute: "Set 3", img: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=400&q=70&auto=format&fit=crop", emoji: "" },
 ].map((s, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("sports"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[200px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative h-[110px]">
<img src={s.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
<Badge className="absolute top-2 left-2 bg-emerald-600 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<span className="absolute top-2 right-2 text-xl">{s.emoji}</span>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white/70 text-[9px] font-semibold uppercase tracking-wide">{s.league}</p>
<p className="text-white font-bold text-[12px] leading-tight">{s.teams}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-amber-300 text-[12px] font-mono font-bold">{s.score}</span>
<span className="text-white/80 text-[10px] font-semibold">{s.minute}</span>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Zodiac / Astrology Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Zodiac & Tarot Live
<Badge className="bg-violet-500 text-white border-0 text-[9px]">Daily reading</Badge>
</h2>
</div>
<div className="grid grid-cols-4 gap-2">
 {[
 { sign: "Aries", emoji: "", date: "Mar 21 - Apr 19" },
 { sign: "Taurus", emoji: "", date: "Apr 20 - May 20" },
 { sign: "Gemini", emoji: "", date: "May 21 - Jun 20" },
 { sign: "Cancer", emoji: "", date: "Jun 21 - Jul 22" },
 { sign: "Leo", emoji: "", date: "Jul 23 - Aug 22" },
 { sign: "Virgo", emoji: "", date: "Aug 23 - Sep 22" },
 { sign: "Libra", emoji: "", date: "Sep 23 - Oct 22" },
 { sign: "Scorpio", emoji: "", date: "Oct 23 - Nov 21" },
 ].map((z, i) =>(
<button type="button"
 key={z.sign}
 onClick={() => {
   const horoscopes: Record<string, string> = {
     Aries: "A bold opportunity surfaces today — say yes",
     Taurus: "Slow down and savor a small win",
     Gemini: "A meaningful conversation is coming",
     Cancer: "Trust your instincts on a personal matter",
     Leo: "Spotlight finds you — own it",
     Virgo: "A small detail will pay off big",
     Libra: "Balance work with rest tonight",
     Scorpio: "Mystery solved — proceed with confidence",
   };
   toast.success(`${z.sign} · Today's reading`, { description: horoscopes[z.sign] || "A new chapter begins" });
 }}
 className="rounded-2xl bg-gradient-to-br from-violet-500/15 via-purple-500/10 to-indigo-500/15 border border-violet-500/20 p-2 h-[80px] flex flex-col items-center justify-center gap-0.5 active:scale-95 hover:shadow-md transition-all shadow-sm relative overflow-hidden"
 >
<span className="text-2xl">{z.emoji}</span>
<span className="text-[11px] font-bold text-foreground">{z.sign}</span>
 {i< 3 && (
<Badge className="absolute top-1 right-1 bg-violet-500 text-white border-0 text-[8px] px-1 animate-pulse">LIVE</Badge>
 )}
</button>
 ))}
</div>
<button type="button" onClick={() => { setSearchQuery("astrology"); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="mt-2 w-full py-2 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-bold text-violet-600 dark:text-violet-400">
 Browse all 12 signs & tarot
</button>
</div>

 {/* ─── DJ / Music Mix Live rooms ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 DJ Live Rooms
<Badge className="bg-fuchsia-600 text-white border-0 text-[9px]">Beat drops</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { dj: "DJ Skylight", set: "House sunset mix", listeners: "8.4K", img: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400&q=70&auto=format&fit=crop", bpm: 124, vibe: " Chillhouse" },
 { dj: "BassBoss", set: "EDM festival mode", listeners: "12.1K", img: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=70&auto=format&fit=crop", bpm: 132, vibe: " Heavy bass" },
 { dj: "Lofi Cat", set: "Late night beats", listeners: "5.2K", img: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&q=70&auto=format&fit=crop", bpm: 88, vibe: " Lo-fi" },
 { dj: "TechnoQueen", set: "Berlin techno", listeners: "3.8K", img: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=70&auto=format&fit=crop", bpm: 138, vibe: " Underground" },
 ].map((d, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("music"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[180px] rounded-2xl overflow-hidden active:scale-[0.97] hover:shadow-xl transition-all shadow-md text-left relative"
 >
<div className="relative h-[150px]">
<img src={d.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-700/85 via-purple-600/70 to-pink-500/40" />
<Badge className="absolute top-2 left-2 bg-fuchsia-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />ON AIR
</Badge>
<Badge className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm text-white border-0 text-[9px] font-mono">{d.bpm} BPM</Badge>
<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center animate-pulse">
<Headphones className="w-6 h-6 text-white" />
</div>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[12px] leading-tight drop-shadow">@{d.dj}</p>
<p className="text-white/85 text-[10px] line-clamp-1">{d.set} • {d.vibe}</p>
<div className="flex items-center gap-0.5 mt-0.5">
<Users className="w-2.5 h-2.5 text-white/80" />
<span className="text-[10px] text-white/90 font-semibold">{d.listeners}</span>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Comedy / Stand-up Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Comedy Live
<Badge className="bg-yellow-500 text-yellow-950 border-0 text-[9px]">LOL</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "Stand-up Marathon", host: "Mike L.", lol: "412K ", img: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=400&q=70&auto=format&fit=crop" },
 { name: "Khmer comedy night", host: "Vannak", lol: "180K ", img: "https://images.unsplash.com/photo-1521336575822-6da63fb45455?w=400&q=70&auto=format&fit=crop" },
 { name: "Improv jam", host: "Sara T.", lol: "98K ", img: "https://images.unsplash.com/photo-1559223607-a43c990c692c?w=400&q=70&auto=format&fit=crop" },
 { name: "Roast room", host: "Big J", lol: "76K ", img: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=400&q=70&auto=format&fit=crop" },
 ].map((c, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("comedy"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[160px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative h-[90px]">
<img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
<Badge className="absolute top-2 left-2 bg-yellow-500 text-yellow-950 border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<span className="absolute top-2 right-2 text-xl"></span>
</div>
<div className="p-2">
<p className="font-bold text-[12px] text-foreground line-clamp-1">{c.name}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-[10px] text-muted-foreground">@{c.host}</span>
<span className="text-[10px] text-yellow-600 dark:text-yellow-400 font-semibold">{c.lol}</span>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Quiz Show / Trivia Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Quiz Show Live
<Badge className="bg-ig-gradient text-white border-0 text-[9px]">Win prizes</Badge>
</h2>
</div>
<div className="space-y-2">
 {[
 { name: "Daily Trivia Champion", players: 12420, prize: "10K coins", time: "Starts in 18 min", host: "ZIVO Quiz", topic: "General knowledge", emoji: "" },
 { name: "Music Quiz Battle", players: 4120, prize: "5K coins", time: "Live now", host: "DJ Skylight", topic: "Music 80s-2020s", emoji: "" },
 { name: "Movie Buff Trivia", players: 2840, prize: "3K coins", time: "Starts in 1h", host: "FilmFan", topic: "Cinema & TV", emoji: "" },
 ].map((q, i) =>(
<div key={i} className="flex items-center gap-3 p-2.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-card to-cyan-500/10 border border-blue-500/20">
<div className="w-12 h-12 rounded-2xl bg-blue-500/15 flex items-center justify-center shrink-0">
<span className="text-2xl">{q.emoji}</span>
</div>
<div className="flex-1 min-w-0">
<p className="font-bold text-[12px] text-foreground line-clamp-1">{q.name}</p>
<p className="text-[10px] text-muted-foreground">{q.topic} • @{q.host}</p>
<div className="flex items-center gap-2 mt-0.5">
<span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold">{q.time}</span>
<span className="text-[10px] text-muted-foreground">·</span>
<span className="text-[10px] text-foreground font-semibold">{q.players.toLocaleString()} playing</span>
</div>
</div>
<div className="text-right shrink-0">
<p className="text-[9px] text-muted-foreground leading-none">Prize</p>
<p className="text-[12px] font-black text-amber-600 dark:text-amber-400 leading-tight">{q.prize}</p>
<button type="button"
  onClick={() =>toast.success(`Joined ${q.name}! Game starts ${q.time.toLowerCase()}`)}
  className="mt-1 px-2.5 py-1 rounded-full bg-ig-gradient text-white text-[10px] font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
>
 Join
</button>
</div>
</div>
 ))}
</div>
</div>

 {/* ─── Section divider: Spotlight ─── */}
<div id="section-spotlight" className="px-4 pt-6 pb-1 flex items-center gap-3 scroll-mt-20">
  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-rose-500/30" />
  <span className="text-[10px] font-black tracking-[0.2em] text-muted-foreground/80 uppercase">Spotlight</span>
  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-rose-500/30" />
</div>

 {/* ─── Creator of the Day spotlight ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Crown className="w-4 h-4 text-amber-500" />Creator of the Day
<Badge className="bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 border-0 text-[9px] font-black">SPOTLIGHT</Badge>
</h2>
</div>
<button type="button"
 onClick={() => { setSearchQuery("music"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="w-full relative rounded-2xl overflow-hidden h-[150px] active:scale-[0.99] transition-transform shadow-lg shadow-amber-500/20"
 >
<img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=70&auto=format&fit=crop" alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-tr from-amber-600/80 via-orange-500/60 to-rose-500/40" />
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
<Badge className="absolute top-3 left-3 bg-white/25 backdrop-blur-md text-white border-0 text-[10px] gap-1 font-bold">
<Crown className="w-3 h-3" />#1 TODAY
</Badge>
<Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-[10px] gap-1 animate-pulse">
<Radio className="w-2.5 h-2.5" />LIVE
</Badge>
<div className="absolute bottom-0 left-0 right-0 p-4">
<div className="flex items-center gap-3">
<Avatar className="h-14 w-14 ring-3 ring-white shadow-lg">
<AvatarImage src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70&auto=format&fit=crop" />
<AvatarFallback>M</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0 text-left">
<div className="flex items-center gap-1.5">
<p className="text-white font-bold text-[15px] drop-shadow">Maya Chen</p>
<BadgeCheck className="w-4 h-4 text-blue-300 fill-blue-500/40" />
</div>
<p className="text-white/85 text-[11px] line-clamp-1">Late night vibes — Music acoustic set</p>
<div className="flex items-center gap-3 mt-1 text-white/90">
<span className="text-[10px] font-semibold flex items-center gap-0.5"><Eye className="w-3 h-3" />12.4K</span>
<span className="text-[10px] font-semibold flex items-center gap-0.5"><Heart className="w-3 h-3 fill-rose-300 text-rose-300" />89.2K</span>
<span className="text-[10px] font-semibold flex items-center gap-0.5"><Gift className="w-3 h-3 text-amber-300" />4.1M</span>
</div>
</div>
<div className="bg-white text-amber-700 rounded-full px-4 py-2 font-bold text-[12px] shadow-md shrink-0">
 Watch
</div>
</div>
</div>
</button>
</div>

 {/* ─── Rising Stars (trending creators) ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<TrendingUp className="w-4 h-4 text-emerald-500" />Rising Stars
<Badge className="bg-emerald-500 text-white border-0 text-[9px]">+200%</Badge>
</h2>
<span className="text-[10px] text-muted-foreground">This week</span>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "Kai Tanaka", growth: "+340%", followers: "84K", country: "JP", img: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=70&auto=format&fit=crop" },
 { name: "Sophea", growth: "+280%", followers: "62K", country: "KH", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70&auto=format&fit=crop" },
 { name: "Min-Joo", growth: "+260%", followers: "48K", country: "KR", img: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=70&auto=format&fit=crop" },
 { name: "Diego R.", growth: "+220%", followers: "39K", country: "MX", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70&auto=format&fit=crop" },
 { name: "Zara K.", growth: "+200%", followers: "31K", country: "ID", img: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&q=70&auto=format&fit=crop" },
 { name: "Theo M.", growth: "+180%", followers: "28K", country: "FR", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=70&auto=format&fit=crop" },
 ].map((s) =>{
   const isFollowed = followedCreators.includes(s.name);
   return (
<div key={s.name} className="shrink-0 w-[120px] rounded-2xl bg-card border border-emerald-500/30 p-3 text-center">
<div className="relative inline-block mb-2">
<Avatar className="h-14 w-14 ring-2 ring-emerald-500/40 mx-auto">
<AvatarImage src={s.img} />
<AvatarFallback>{s.name[0]}</AvatarFallback>
</Avatar>
<span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-card flex items-center justify-center text-[11px] shadow ring-1 ring-border">
 {s.country}
</span>
</div>
<p className="text-[11px] font-bold text-foreground truncate">{s.name}</p>
<p className="text-[10px] text-muted-foreground">{s.followers}</p>
<Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[9px] mt-1">
 {s.growth}
</Badge>
<button type="button"
  onClick={() => {
    setFollowedCreators((prev) => {
      if (prev.includes(s.name)) {
        toast.info(`Unfollowed ${s.name}`);
        return prev.filter((x) =>x !== s.name);
      }
      toast.success(`Following ${s.name}!`);
      return [...prev, s.name];
    });
  }}
  className={cn(
    "mt-2 w-full py-1 rounded-full text-[10px] font-bold active:scale-95 transition-transform",
    isFollowed ? "bg-white/15 text-white border border-white/30" : "bg-ig-gradient text-white hover:opacity-90 shadow-sm",
  )}
>
 {isFollowed ? "Following" : "+ Follow"}
</button>
</div>
   );
 })}
</div>
</div>

 {/* ─── Cosplay Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Cosplay Live
<Badge className="bg-purple-500 text-white border-0 text-[9px]">Anime fans</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { character: "Demon Slayer", host: "Yui", viewers: 6420, img: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { character: "Sailor Moon", host: "Aria", viewers: 4810, img: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { character: "JoJo's Pose", host: "Kai", viewers: 3640, img: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { character: "Lolita Fashion", host: "Mei", viewers: 2920, img: "https://images.unsplash.com/photo-1517023321906-9b86d22f3aab?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { character: "K-Pop Idol", host: "Min-Joo", viewers: 2410, img: "https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&q=70&auto=format&fit=crop", emoji: "" },
 ].map((c, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("cosplay"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[150px] rounded-2xl overflow-hidden bg-card border border-border/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative aspect-[4/5]">
<img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-tr from-purple-700/85 via-pink-500/40 to-fuchsia-500/30" />
<Badge className="absolute top-2 left-2 bg-purple-500 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<span className="absolute top-2 right-2 text-xl">{c.emoji}</span>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[12px] leading-tight drop-shadow">{c.character}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-white/80 text-[10px]">@{c.host}</span>
<div className="flex items-center gap-0.5">
<Eye className="w-2.5 h-2.5 text-white/80" />
<span className="text-[9px] text-white/90 font-semibold">{c.viewers.toLocaleString()}</span>
</div>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── ASMR / Relaxation Rooms ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Headphones className="w-4 h-4 text-cyan-500" />ASMR & Relaxation
<Badge className="bg-cyan-500 text-white border-0 text-[9px]">Tingles</Badge>
</h2>
</div>
<div className="grid grid-cols-2 gap-2.5">
 {[
 { title: "Whisper sleep", listeners: "8.4K", emoji: "", gradient: "from-muted to-muted" },
 { title: "Rain & thunder", listeners: "6.2K", emoji: "", gradient: "from-slate-700 via-slate-600 to-blue-700" },
 { title: "Tapping & scratching", listeners: "4.8K", emoji: "", gradient: "from-muted to-muted" },
 { title: "Roleplay haircut", listeners: "3.6K", emoji: "", gradient: "from-muted to-muted" },
 ].map((a, i) =>(
<button type="button"
 key={i}
 onClick={() =>navigate("/spaces")}
 className={cn(
 "rounded-2xl bg-gradient-to-br p-3 h-[88px] flex flex-col justify-between active:scale-95 hover:shadow-md transition-all shadow-sm text-left relative overflow-hidden",
 a.gradient,
 )}
 >
<div className="absolute -right-2 -top-2 w-12 h-12 rounded-full bg-white/10 blur-md" />
<div className="flex items-center justify-between relative z-10">
<span className="text-2xl">{a.emoji}</span>
<Badge className="bg-white/25 backdrop-blur-sm text-white border-0 text-[8px] font-bold">LIVE</Badge>
</div>
<div className="relative z-10">
<p className="text-white font-bold text-[12px] leading-tight">{a.title}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-white/80 text-[10px]">{a.listeners}</span>
<span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Crypto / Trading Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Crypto & Trading Live
<Badge className="bg-blue-600 text-white border-0 text-[9px]">Markets open</Badge>
</h2>
</div>
<div className="space-y-2">
 {[
 { name: "BTC analysis live", host: "TradeKing", change: "+4.2%", price: "$68,420", viewers: 12480, ticker: "BTC", emoji: "₿" },
 { name: "ETH 4h breakout", host: "CryptoQueen", change: "+2.8%", price: "$3,820", viewers: 8240, ticker: "ETH", emoji: "Ξ" },
 { name: "Tech stocks daily", host: "WallSt Pro", change: "+1.4%", price: "NASDAQ", viewers: 5240, ticker: "NSDQ", emoji: "" },
 { name: "Forex EUR/USD", host: "FXMaster", change: "-0.6%", price: "$1.0842", viewers: 3120, ticker: "FX", emoji: "" },
 ].map((t, i) =>{
 const positive = t.change.startsWith("+");
 return (
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("trading"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-card border border-border/30 active:scale-[0.99] transition-transform shadow-sm text-left"
 >
<div className={cn(
 "w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0",
 positive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-red-500/15 text-red-600 dark:text-red-400",
 )}>
<span>{t.emoji}</span>
</div>
<div className="flex-1 min-w-0">
<p className="font-bold text-[12px] text-foreground truncate">{t.name}</p>
<p className="text-[10px] text-muted-foreground">@{t.host} · {t.viewers.toLocaleString()} watching</p>
</div>
<div className="text-right shrink-0">
<p className="text-[11px] font-mono font-bold text-foreground leading-none">{t.price}</p>
<p className={cn("text-[10px] font-bold mt-0.5", positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
 {t.change}
</p>
</div>
<Badge className={cn("border-0 text-[9px] gap-1 animate-pulse shrink-0", positive ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
<Radio className="w-2 h-2" />LIVE
</Badge>
</button>
 );
 })}
</div>
</div>

 {/* ─── Magic Shows / Illusion Live ─── */}
<div className="px-4 pt-4 pb-1">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
 Magic & Illusion
<Badge className="bg-fuchsia-600 text-white border-0 text-[9px]">Mind blown</Badge>
</h2>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { trick: "Card mind-reading", host: "MagicMike", viewers: 3420, img: "https://images.unsplash.com/photo-1542652694-40abf526446e?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { trick: "Coin vanish trick", host: "Illusio", viewers: 2810, img: "https://images.unsplash.com/photo-1534073828943-f801091bb18c?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { trick: "Levitation street magic", host: "Mystica", viewers: 4120, img: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&q=70&auto=format&fit=crop", emoji: "" },
 { trick: "Escape act live", host: "HoudiniJr", viewers: 6240, img: "https://images.unsplash.com/photo-1535063406830-27dec3df96fc?w=400&q=70&auto=format&fit=crop", emoji: "" },
 ].map((m, i) =>(
<button type="button"
 key={i}
 onClick={() => { setSearchQuery("magic"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
 className="shrink-0 w-[160px] rounded-2xl overflow-hidden bg-card border border-fuchsia-500/30 active:scale-[0.97] hover:shadow-md transition-all shadow-sm text-left"
 >
<div className="relative aspect-square">
<img src={m.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
<div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-700/85 via-purple-700/60 to-pink-500/30" />
<Badge className="absolute top-2 left-2 bg-fuchsia-600 text-white border-0 text-[9px] gap-1 animate-pulse">
<Radio className="w-2 h-2" />LIVE
</Badge>
<span className="absolute top-2 right-2 text-xl">{m.emoji}</span>
<div className="absolute bottom-2 left-2 right-2">
<p className="text-white font-bold text-[12px] leading-tight drop-shadow">{m.trick}</p>
<div className="flex items-center justify-between mt-0.5">
<span className="text-white/80 text-[10px]">@{m.host}</span>
<div className="flex items-center gap-0.5">
<Eye className="w-2.5 h-2.5 text-white/80" />
<span className="text-[9px] text-white/90 font-semibold">{m.viewers.toLocaleString()}</span>
</div>
</div>
</div>
</div>
</button>
 ))}
</div>
</div>

 {/* ─── Coin Recharge promo (limited offer) ─── */}
<div className="px-4 pt-4 pb-1">
<button type="button"
  onClick={() => {
    toast.success("Opening recharge with +50% bonus locked in", { description: "First recharge of the day" });
    navigate("/wallet");
  }}
  className="w-full relative rounded-2xl overflow-hidden p-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-left active:scale-[0.99] transition-transform shadow-lg shadow-amber-500/30"
>
<div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/15" />
<div className="absolute -right-1 -bottom-6 w-16 h-16 rounded-full bg-white/10" />
<div className="relative z-10 flex items-center gap-3">
<div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shrink-0">
<Coins className="w-6 h-6 text-white" />
</div>
<div className="flex-1 min-w-0">
<Badge className="bg-white/30 backdrop-blur-sm text-white border-0 text-[8px] font-black mb-1">FLASH 24H</Badge>
<p className="text-white font-bold text-[14px] leading-tight">+50% Bonus on first recharge</p>
<p className="text-white/85 text-[11px] leading-tight">Top up coins • Send bigger gifts • Climb the ladder</p>
</div>
<div className="flex items-center gap-1 bg-white rounded-full px-3 py-2 shrink-0 shadow-md">
<span className="text-amber-700 text-[11px] font-bold">Recharge</span>
<ChevronRight className="w-3 h-3 text-amber-700" />
</div>
</div>
</button>
</div>

 {/* ─── Live Shopping is above; this section was the old Bigo-style categories grid ─── */}

 {/* ─── Bigo-style categories grid ─── */}
<div className="px-4 pt-4 pb-2">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Sparkles className="w-4 h-4 text-amber-500" />Explore
</h2>
<button type="button" onClick={() =>navigate("/explore")} className="text-[11px] text-muted-foreground flex items-center gap-0.5 active:text-foreground">
 See all<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="grid grid-cols-4 gap-2">
 {[
 { label: "Music", icon: "", gradient: "from-muted to-muted", q: "music" },
 { label: "Gaming", icon: "", gradient: "from-muted to-muted", q: "gaming" },
 { label: "Dance", icon: "", gradient: "from-muted to-muted", q: "dance" },
 { label: "Talent", icon: "", gradient: "from-amber-500 to-orange-400", q: "talent" },
 { label: "Beauty", icon: "", gradient: "from-muted to-muted", q: "beauty" },
 { label: "Cooking", icon: "", gradient: "from-orange-500 to-yellow-400", q: "cooking" },
 { label: "Sports", icon: "", gradient: "from-emerald-500 to-teal-400", q: "sports" },
 { label: "Travel", icon: "", gradient: "from-muted to-muted", q: "travel" },
 { label: "Fashion", icon: "", gradient: "from-muted to-muted", q: "fashion" },
 { label: "Tech", icon: "", gradient: "from-muted to-muted", q: "tech" },
 { label: "Comedy", icon: "", gradient: "from-yellow-400 to-orange-400", q: "comedy" },
 { label: "Education", icon: "", gradient: "from-teal-500 to-emerald-500", q: "education" },
 ].map((c) =>(
<button type="button"
 key={c.label}
 onClick={() =>setSearchQuery(c.q)}
 className={cn(
 "rounded-2xl bg-gradient-to-br p-2.5 h-[78px] flex flex-col items-center justify-center gap-1 active:scale-95 hover:shadow-md transition-all shadow-sm",
 c.gradient,
 )}
 >
<span className="text-2xl">{c.icon}</span>
<span className="text-[10px] font-bold text-white">{c.label}</span>
</button>
 ))}
</div>
</div>

 {/* ─── Top Creators leaderboard ─── */}
<div className="px-4 pt-4 pb-2">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5">
<Trophy className="w-4 h-4 text-amber-500" />Top Creators
</h2>
<button type="button" onClick={() =>navigate("/leaderboard")} className="text-[11px] text-muted-foreground flex items-center gap-0.5">
 Leaderboard<ChevronRight className="w-3 h-3" />
</button>
</div>
<div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-1">
 {[
 { name: "Maya Chen", followers: "2.4M", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70&auto=format&fit=crop", rank: 1 },
 { name: "Alex Rivera", followers: "1.8M", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=70&auto=format&fit=crop", rank: 2 },
 { name: "Jin Park", followers: "1.5M", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70&auto=format&fit=crop", rank: 3 },
 { name: "Lily Wong", followers: "1.2M", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70&auto=format&fit=crop", rank: 4 },
 { name: "Carlos M.", followers: "950K", img: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=70&auto=format&fit=crop", rank: 5 },
 { name: "Sofia G.", followers: "780K", img: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=70&auto=format&fit=crop", rank: 6 },
 { name: "Ryan T.", followers: "640K", img: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=70&auto=format&fit=crop", rank: 7 },
 ].map((c) =>{
   const isFollowed = followedCreators.includes(c.name);
   return (
<button type="button"
  key={c.name}
  onClick={() => {
    setFollowedCreators((prev) => {
      if (prev.includes(c.name)) {
        toast.info(`Unfollowed ${c.name}`);
        return prev.filter((x) =>x !== c.name);
      }
      toast.success(`Following ${c.name} (#${c.rank})`);
      return [...prev, c.name];
    });
  }}
  className="shrink-0 flex flex-col items-center gap-1.5 w-[64px] active:scale-95 transition-transform"
>
<div className="relative">
<Avatar className={cn(
 "h-14 w-14 ring-2",
 c.rank === 1 ? "ring-amber-400" : c.rank === 2 ? "ring-zinc-300" : c.rank === 3 ? "ring-orange-600" : "ring-border",
 )}>
<AvatarImage src={c.img} />
<AvatarFallback className="bg-muted">{c.name[0]}</AvatarFallback>
</Avatar>
 {c.rank<= 3 && (
<div className={cn(
 "absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shadow-md",
 c.rank === 1 ? "bg-amber-500" : c.rank === 2 ? "bg-zinc-400" : "bg-orange-600",
 )}>
 {c.rank === 1 &&<Crown className="w-2.5 h-2.5" />}
 {c.rank >1 && c.rank}
</div>
 )}
{isFollowed && (
  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow ring-1 ring-background"><Check className="w-2.5 h-2.5" strokeWidth={3} /></span>
)}
</div>
<p className="text-[10px] font-semibold text-foreground truncate w-full text-center leading-tight">{c.name}</p>
<p className={cn("text-[9px]", isFollowed ? "text-emerald-500 font-bold" : "text-muted-foreground")}>{isFollowed ? "Following" : c.followers}</p>
</button>
   );
 })}
</div>
</div>
</>)}

 {/* ─── Recommended for you / Multi-guest preview ─── */}
<div className="px-4 pt-4 pb-2">
<div className="flex items-center justify-between mb-2.5">
<h2 className="font-bold text-sm text-foreground flex items-center gap-1.5 flex-wrap">
<TrendingUp className="w-4 h-4 text-rose-500" />{filteredStreams.length === 0 ? "Coming soon" : "Live now"}
{filter !== "all" && <Badge className="bg-muted text-foreground/60 border-border text-[9px] px-1.5 capitalize">filter: {filter}</Badge>}
{searchQuery && <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 text-[9px] px-1.5">"{searchQuery}"</Badge>}
</h2>
</div>
</div>

<div className="p-4 pt-0 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
 {isLoading ? (
<div className="col-span-full flex items-center justify-center h-40">
<div className="flex flex-col items-center gap-3">
<Radio className="h-8 w-8 text-red-500 animate-pulse" />
<p className="text-sm text-muted-foreground">Loading streams...</p>
</div>
</div>
 ) : filteredStreams.length === 0 ? (
<>
 {/* Suggested Bigo-style preview cards when nobody is live */}
 {[
 { name: "Maya Chen", title: "Late night vibes ", topic: "Music", viewers: 12453, photo: topicPhotos.Music, host: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=70&auto=format&fit=crop", verified: true, hot: true },
 { name: "Jin Park", title: "Pro gameplay clinic", topic: "Gaming", viewers: 8521, photo: topicPhotos.Gaming, host: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=70&auto=format&fit=crop", verified: true, hot: true },
 { name: "Lily Wong", title: "Glow-up makeup tutorial", topic: "Beauty", viewers: 6210, photo: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=800&q=70&auto=format&fit=crop", host: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=70&auto=format&fit=crop", verified: true, hot: false },
 { name: "Alex Rivera", title: "Cooking carbonara live", topic: "Cooking", viewers: 4870, photo: topicPhotos.Cooking, host: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=70&auto=format&fit=crop", verified: false, hot: false },
 { name: "Sofia G.", title: "Yoga & morning flow", topic: "Fitness", viewers: 3942, photo: topicPhotos.Fitness, host: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=70&auto=format&fit=crop", verified: true, hot: false },
 { name: "Ryan T.", title: "Singing my favorites", topic: "Music", viewers: 2810, photo: topicPhotos.Music, host: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=70&auto=format&fit=crop", verified: false, hot: false },
 ].map((s, i) =>(
<motion.div key={s.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
<button type="button"
 onClick={() => {
   const isNotified = notifiedOffline.has(s.name);
   setNotifiedOffline(prev => {
     const next = new Set(prev);
     isNotified ? next.delete(s.name) : next.add(s.name);
     localStorage.setItem("zivo_live_notify", JSON.stringify([...next]));
     return next;
   });
   toast.success(isNotified ? `Notification removed for ${s.name}` : `You'll be notified when ${s.name} goes live!`);
 }}
 className="w-full text-left bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-red-500/30 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300 opacity-90"
 >
<div className="relative aspect-[3/4] overflow-hidden bg-muted">
<img src={s.photo} alt={s.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale-[20%]" />
<div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />
<Badge className={cn("absolute top-3 left-3 backdrop-blur-sm text-white border-0 text-[10px] gap-1", notifiedOffline.has(s.name) ? "bg-primary/90" : "bg-zinc-700/90")}>
<span className={cn("h-1.5 w-1.5 rounded-full", notifiedOffline.has(s.name) ? "bg-white" : "bg-zinc-300")} />{notifiedOffline.has(s.name) ? "Notify set ✓" : "Soon"}
</Badge>
 {s.hot && (
<Badge className="absolute top-3 left-[68px] bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-[10px] gap-0.5 shadow-lg">
<Flame className="h-2.5 w-2.5" />Hot
</Badge>
 )}
<div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
<Eye className="h-3 w-3 text-white/80" />
<span className="text-[11px] text-white font-semibold">{s.viewers.toLocaleString()}</span>
</div>
<div className="absolute bottom-0 left-0 right-0 p-3">
<div className="flex items-center gap-2 mb-2">
<Avatar className="h-8 w-8 border-2 border-white/80 shadow-lg">
<AvatarImage src={s.host} />
<AvatarFallback className="bg-red-500/20 text-white text-[10px] font-bold">{s.name[0]}</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0">
<p className="text-[11px] font-semibold text-white truncate drop-shadow inline-flex items-center gap-1">
<span className="truncate">{s.name}</span>
 {s.verified &&<VerifiedBadge size={11} interactive={false} />}
</p>
<p className="text-[10px] text-white/70 truncate drop-shadow">{s.topic}</p>
</div>
</div>
<h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-lg">{s.title}</h3>
</div>
</div>
</button>
</motion.div>
 ))}
<div className="col-span-full flex flex-col items-center justify-center mt-2 mb-4 text-center px-6">
<p className="text-[12px] text-muted-foreground mb-3">
 Nobody's live right now — explore creators above or start your own stream.
</p>
<Button onClick={handleGoLive} className="rounded-full gap-1.5 bg-red-500 hover:bg-red-600 text-white">
<Radio className="h-4 w-4" />Start Your Own
</Button>
</div>
</>
 ) : (
 filteredStreams.map((stream, i) =>{
 const photo = topicPhotos[stream.topic] || topicPhotos.General;
 return (
<motion.div key={stream.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
<button type="button"
 onClick={() => {
 if (stream.status === "ended") { toast.info("This stream has ended"); return; }
 setActiveStream(stream);
 }}
 className="w-full text-left bg-card rounded-2xl border border-border/30 overflow-hidden hover:border-red-500/30 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300"
 >
<div className="relative aspect-[3/4] overflow-hidden bg-muted">
<img src={photo} alt={stream.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
<div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />
 {stream.status === "live" && (
<Badge className="absolute top-3 left-3 bg-red-500 text-white border-0 text-[10px] gap-1 animate-pulse shadow-lg">
<Radio className="h-2.5 w-2.5" />LIVE
</Badge>
 )}
 {stream.status === "live" && stream.viewer_count >= 1000 && (
<Badge className="absolute top-3 left-[68px] bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 text-[10px] gap-0.5 shadow-lg">
<Flame className="h-2.5 w-2.5" />Hot
</Badge>
 )}
<div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
<Eye className="h-3 w-3 text-white/80" />
<span className="text-[11px] text-white font-semibold">{stream.viewer_count.toLocaleString()}</span>
</div>

 {/* Host info overlay at bottom */}
<div className="absolute bottom-0 left-0 right-0 p-3">
<div className="flex items-center gap-2 mb-2">
<Avatar className="h-8 w-8 border-2 border-white/80 shadow-lg">
<AvatarImage src={stream.host_avatar || undefined} />
<AvatarFallback className="bg-red-500/20 text-white text-[10px] font-bold">{stream.host_name[0]}</AvatarFallback>
</Avatar>
<div className="flex-1 min-w-0">
<p className="text-[11px] font-semibold text-white truncate drop-shadow inline-flex items-center gap-1">
<span className="truncate">{stream.host_name}</span>
 {isBlueVerified(stream.host_is_verified) &&<VerifiedBadge size={11} interactive={false} />}
</p>
<p className="text-[10px] text-white/70 truncate drop-shadow">{stream.topic}</p>
</div>
</div>
<h3 className="font-bold text-white text-sm leading-tight line-clamp-2 drop-shadow-lg">{stream.title}</h3>
</div>
</div>
</button>
</motion.div>
 );
 })
 )}
</div>

<Suspense fallback={null}>
<ZivoMobileNav />
</Suspense>

{/* Floating Back-to-Top FAB + Quick Go-Live shortcut */}
<AnimatePresence>
  {showScrollTop && (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.8 }}
      className="zivo-live-fab-offset fixed right-4 z-[60] flex flex-col gap-2"
    >
      <button type="button"
        onClick={handleGoLive}
        aria-label="Go Live"
        title="Go Live"
        className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center shadow-xl shadow-rose-500/40 active:scale-90 transition-transform"
      >
        <Plus className="h-5 w-5 text-white" />
      </button>
      <button type="button"
        onClick={() =>window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className="w-12 h-12 rounded-full bg-card border border-border/50 backdrop-blur-md flex items-center justify-center shadow-lg active:scale-90 transition-transform"
      >
        <ArrowLeft className="h-5 w-5 text-foreground rotate-90" />
      </button>
    </motion.div>
  )}
</AnimatePresence>
</div>
 );
}

