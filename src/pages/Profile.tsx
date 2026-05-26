import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createPortal } from "react-dom";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useI18n } from "@/hooks/useI18n";
import SafeCaption from "@/components/social/SafeCaption";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import { stripImageMetadata } from "@/utils/stripImageMetadata";
import { pickImageFromLibrary } from "@/lib/imagePicker";

import SEOHead from "@/components/SEOHead";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import {
  User, ArrowLeft, Loader2, Sparkles, Camera, ImagePlus, Check, X, MoveVertical,
  Shield, Star, ChevronRight, UserPlus, BadgeCheck,
  Wallet, Store, ExternalLink, Users, Globe, ChevronDown, Crown, MapPin, ShoppingBag,
  Handshake, Car, Wrench, UtensilsCrossed, Building2, Truck, Phone, AlertCircle, Bell, MoreHorizontal,
  Pencil, RotateCcw, Share2, BarChart3, Link as LinkIcon,
  Repeat, DollarSign, Briefcase, User as UserIcon,
  Heart, Lock, Gift, MessageCircle, Video, TrendingUp, Eye,
  Settings as SettingsIcon,
} from "lucide-react";
import { useHaptics } from "@/hooks/useHaptics";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import UsernameShareSheet from "@/components/profile/UsernameShareSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile, useUpdateUserProfile, useUploadAvatar, useUploadCover } from "@/hooks/useUserProfile";
import { useUsername } from "@/hooks/useUsername";
import { useMerchantRole } from "@/hooks/useMerchantRole";
import { useOwnerStoreProfile } from "@/hooks/useOwnerStoreProfile";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { MERCHANT_APP_URL } from "@/lib/eatsTables";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import NavBar from "@/components/home/NavBar";
import { motion, useScroll, useTransform, AnimatePresence, useMotionValueEvent } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { copyText } from "@/lib/native/clipboard";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { assessLinkSync } from "@/hooks/useLinkRisk";
import ExternalLinkWarning from "@/components/security/ExternalLinkWarning";
import { stripTrackingParams } from "@/lib/linkSafetyExtras";
import ProfileContentTabs from "@/components/profile/ProfileContentTabs";
import ProfileStories from "@/components/profile/ProfileStories";
import SocialListModal from "@/components/profile/SocialListModal";
// Wallet, Completeness, Referral & QuickLinks cards moved to /more page
import ProfileTripsCard from "@/components/profile/ProfileTripsCard";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { useWalletSummary } from "@/hooks/useZivoWallet";
import { useReferrals } from "@/hooks/useReferrals";
import { useBookingHistory } from "@/hooks/useBookingHistory";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { useNotifications } from "@/hooks/useNotifications";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";
import { formatDistanceToNowStrict } from "date-fns";

const LANGS = [
  { code: "en", label: "English", cc: "us" },
  { code: "km", label: "ខ្មែរ", cc: "kh" },
  { code: "zh", label: "中文", cc: "cn" },
  { code: "ko", label: "한국어", cc: "kr" },
  { code: "ja", label: "日本語", cc: "jp" },
  { code: "vi", label: "Tiếng Việt", cc: "vn" },
  { code: "th", label: "ไทย", cc: "th" },
  { code: "es", label: "Español", cc: "es" },
  { code: "fr", label: "Français", cc: "fr" },
  { code: "de", label: "Deutsch", cc: "de" },
  { code: "it", label: "Italiano", cc: "it" },
  { code: "pt", label: "Português", cc: "pt" },
  { code: "nl", label: "Nederlands", cc: "nl" },
  { code: "pl", label: "Polski", cc: "pl" },
  { code: "sv", label: "Svenska", cc: "se" },
  { code: "da", label: "Dansk", cc: "dk" },
  { code: "fi", label: "Suomi", cc: "fi" },
  { code: "el", label: "Ελληνικά", cc: "gr" },
  { code: "cs", label: "Čeština", cc: "cz" },
  { code: "ro", label: "Română", cc: "ro" },
  { code: "hu", label: "Magyar", cc: "hu" },
  { code: "hr", label: "Hrvatski", cc: "hr" },
  { code: "bg", label: "Български", cc: "bg" },
  { code: "sk", label: "Slovenčina", cc: "sk" },
  { code: "lt", label: "Lietuvių", cc: "lt" },
  { code: "no", label: "Norsk", cc: "no" },
  { code: "ru", label: "Русский", cc: "ru" },
  { code: "uk", label: "Українська", cc: "ua" },
  { code: "tr", label: "Türkçe", cc: "tr" },
  { code: "ar", label: "العربية", cc: "sa" },
  { code: "id", label: "Bahasa Indonesia", cc: "id" },
];

const getFlagUrl = (cc: string) => `/flags/${cc}.svg`;

import VerifiedBadge from "@/components/VerifiedBadge";
import { formatCount } from "@/lib/social/formatCount";

const BlueVerifiedBadge = ({ className = "h-5 w-5" }: { className?: string }) => (
  <VerifiedBadge className={className} />
);

/* ── 3D tilt hook ── */
function use3DTilt(ref: React.RefObject<HTMLElement | null>, intensity = 8) {
  const [style, setStyle] = useState({ rotateX: 0, rotateY: 0 });

  const handleMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    const x = (clientX - rect.left) / rect.width - 0.5;
    const y = (clientY - rect.top) / rect.height - 0.5;
    setStyle({ rotateX: -y * intensity, rotateY: x * intensity });
  }, [ref, intensity]);

  const handleLeave = useCallback(() => setStyle({ rotateX: 0, rotateY: 0 }), []);

  return { style, handleMove, handleLeave };
}

/* ── Animated bokeh particle ── */
const BokehParticle = ({ delay, size, x, y, color }: { delay: number; size: number; x: string; y: string; color: string }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, left: x, top: y, background: color, filter: `blur(${size * 0.4}px)` }}
    animate={{ opacity: [0.15, 0.4, 0.15], scale: [0.8, 1.2, 0.8], y: [0, -20, 0] }}
    transition={{ duration: 5 + delay, repeat: Infinity, ease: "easeInOut", delay }}
  />
);

/* ── Parallax section wrapper ── */
const ParallaxSection = ({ children, index }: { children: React.ReactNode; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 50, rotateX: 8 }}
    whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
    viewport={{ once: true, margin: "-30px" }}
    transition={{ duration: 0.6, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    style={{ perspective: "1200px" }}
  >
    {children}
  </motion.div>
);

/* ── 3D Glass Card wrapper ── */
const GlassCard3D = ({ children, className = "", glow = false }: { children: React.ReactNode; className?: string; glow?: boolean }) => (
  <div className={`relative rounded-3xl overflow-hidden ${className}`}>
    {/* Glassmorphism layers */}
    <div className="absolute inset-0 bg-card/70 backdrop-blur-2xl" />
    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02]" />
    <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]" />
    {glow && <div className="pointer-events-none absolute -inset-px rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />}
    <div className="relative z-10">{children}</div>
  </div>
);

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useLocation();
  const { t, currentLanguage, changeLanguage } = useI18n();
  
  const { user, isAdmin } = useAuth();
  const { data: profile, isLoading: profileLoading, isError: hasProfileError } = useUserProfile();
  const { username: claimedUsername } = useUsername();
  // Brand-name override (e.g. "ZIVO" for staff/founder accounts) — falls back to legal name.
  const brandName = (profile as { display_brand_name?: string | null } | undefined)?.display_brand_name || null;
  const titleCase = (s: string) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
  const rawHeaderName = brandName || profile?.full_name || "";
  const headerName = brandName ? rawHeaderName : (rawHeaderName ? titleCase(rawHeaderName) : "");
  const { data: merchantData } = useMerchantRole();
  const { data: ownerStore, isLoading: ownerStoreLoading } = useOwnerStoreProfile();
  const { unreadCount: notifUnreadCount, notifications, isLoading: notifLoading, markAsRead, markAllAsRead } = useNotifications(20);
  const { data: latestVerificationRequest, isError: hasVerificationRequestError } = useQuery({
    queryKey: ["verification-request", user?.id, "latest"],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any)
        .from("verification_requests")
        .select("id, status, rejection_reason, created_at, reviewed_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string | null; rejection_reason: string | null; created_at: string; reviewed_at?: string | null } | null;
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const refreshBlueVerified = () => {
      queryClient.invalidateQueries({ queryKey: ["verification-request", user.id, "latest"] });
      queryClient.invalidateQueries({ queryKey: ["verification-request", user.id] });
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
    };

    const channel = supabase
      .channel(`blue-verified-status-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "verification_requests", filter: `user_id=eq.${user.id}` }, refreshBlueVerified)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` }, refreshBlueVerified)
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, refreshBlueVerified)
      .subscribe();

    // Fallback: re-check when tab regains focus or network reconnects
    window.addEventListener("focus", refreshBlueVerified);
    window.addEventListener("online", refreshBlueVerified);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", refreshBlueVerified);
      window.removeEventListener("online", refreshBlueVerified);
    };
  }, [queryClient, user?.id]);
  
  // Count pending friend requests + new followers
  const [socialCount, setSocialCount] = useState(0);
  useEffect(() => {
    if (!user) return;
    const fetchSocialCount = async () => {
      const { count: friendReqCount } = await (supabase as any)
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('friend_id', user.id)
        .eq('status', 'pending');
      setSocialCount(friendReqCount || 0);
    };
    fetchSocialCount();
    
    // Listen for realtime changes
    const channel = supabase
      .channel('profile-social-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `friend_id=eq.${user.id}` }, () => {
        fetchSocialCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);
  
  const totalNotifCount = notifUnreadCount + socialCount;
  const { isPlus, plan } = useZivoPlus();
  const { balance: coinBalance, loading: coinLoading } = useCoinBalance();
  const { data: walletSummary, isLoading: walletLoading } = useWalletSummary();
  const { referralCode, isLoading: referralsLoading, copyReferralLink, shareReferral } = useReferrals();
  const { bookings, isLoading: bookingsLoading } = useBookingHistory();
  const updateProfile = useUpdateUserProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadCover = useUploadCover();
  const langTriggerRef = useRef<HTMLButtonElement>(null);
  const { impact, selectionChanged } = useHaptics();
  const [showNotifPanel, setShowNotifPanel] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem("zivo:profile:notif-panel") === "1"; } catch { return false; }
  });
  useEffect(() => {
    try { sessionStorage.setItem("zivo:profile:notif-panel", showNotifPanel ? "1" : "0"); } catch {}
  }, [showNotifPanel]);
  useEffect(() => {
    const restore = () => {
      try {
        const v = sessionStorage.getItem("zivo:profile:notif-panel") === "1";
        setShowNotifPanel(v);
      } catch {}
    };
    window.addEventListener("orientationchange", restore);
    document.addEventListener("visibilitychange", restore);
    return () => {
      window.removeEventListener("orientationchange", restore);
      document.removeEventListener("visibilitychange", restore);
    };
  }, []);
  const handleBack = useCallback(() => {
    impact("light");
    if (window.history.length > 1) navigate(-1);
    else navigate("/feed");
  }, [impact, navigate]);
  const handleToggleNotif = useCallback(() => {
    selectionChanged();
    setShowLangPicker(false);
    setShowNotifPanel(p => !p);
  }, [selectionChanged]);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread">("all");
  const notifPanelRef = useRef<HTMLDivElement>(null);
  const notifBellRef = useRef<HTMLButtonElement>(null);
  // Outside-click + Escape close
  useEffect(() => {
    if (!showNotifPanel) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (notifPanelRef.current?.contains(t)) return;
      if (notifBellRef.current?.contains(t)) return;
      setShowNotifPanel(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setShowNotifPanel(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showNotifPanel]);
  const resolveNotifLink = useCallback((n: { action_url: string | null; metadata: Record<string, any>; template: string }) => {
    if (n.action_url) return n.action_url;
    const md = n.metadata || {};
    const dl = md.deepLink || md.deep_link || md.url;
    if (typeof dl === "string" && dl) return dl;
    const tpl = (n.template || "").toLowerCase();
    if (tpl.includes("friend") || tpl.includes("follow")) return "/notifications?tab=requests";
    if (tpl.includes("message") || tpl.includes("chat")) return md.thread_id ? `/chat/${md.thread_id}` : "/chat";
    if (tpl.includes("comment") || tpl.includes("like") || tpl.includes("reaction") || tpl.includes("mention") || tpl.includes("post")) {
      return md.post_id ? `/post/${md.post_id}` : "/feed";
    }
    if (tpl.includes("ride") || tpl.includes("trip") || tpl.includes("driver")) return md.job_id ? `/rides/track/${md.job_id}` : "/rides/hub";
    if (tpl.includes("order") || tpl.includes("delivery")) return md.order_id ? `/orders/${md.order_id}` : "/account/orders";
    if (tpl.includes("wallet") || tpl.includes("payout") || tpl.includes("payment")) return "/wallet";
    if (tpl.includes("verification") || tpl.includes("verify")) return "/account/verification";
    if (tpl.includes("security") || tpl.includes("login")) return "/account/security";
    if (tpl.includes("promo") || tpl.includes("coupon")) return "/wallet/promos";
    return "/notifications";
  }, []);
  const handleNotifClick = useCallback((n: { id: string; action_url: string | null; metadata: Record<string, any>; template: string; is_read: boolean }) => {
    selectionChanged();
    if (!n.is_read) {
      void markAsRead([n.id]).catch(() => undefined);
    }
    setShowNotifPanel(false);
    navigate(resolveNotifLink(n));
  }, [markAsRead, navigate, resolveNotifLink, selectionChanged]);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const handleMarkAllRead = useCallback(async () => {
    if (notifUnreadCount === 0 || isMarkingAllRead) return;
    selectionChanged();
    setIsMarkingAllRead(true);
    try {
      await markAllAsRead();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Couldn't mark all as read");
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [isMarkingAllRead, markAllAsRead, notifUnreadCount, selectionChanged]);
  const handleResetCover = useCallback(() => { impact("light"); setCoverPosition(50); }, [impact]);
  
  const [showLangPicker, setShowLangPicker] = useState(false);
  const profileCardRef = useRef<HTMLDivElement>(null);

  // Cover photo state
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverRepositioning, setCoverRepositioning] = useState(false);
  const [coverPosition, setCoverPosition] = useState<number>(profile?.cover_position ?? 50);
  const coverPositionClass = useMemo(() => {
    const snapped = Math.round(Math.min(100, Math.max(0, coverPosition)) / 10) * 10;
    const map: Record<number, string> = {
      0: "object-[center_0%]",
      10: "object-[center_10%]",
      20: "object-[center_20%]",
      30: "object-[center_30%]",
      40: "object-[center_40%]",
      50: "object-[center_50%]",
      60: "object-[center_60%]",
      70: "object-[center_70%]",
      80: "object-[center_80%]",
      90: "object-[center_90%]",
      100: "object-[center_100%]",
    };
    return map[snapped] ?? "object-[center_50%]";
  }, [coverPosition]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bioDraft, setBioDraft] = useState("");
  const [bioEditing, setBioEditing] = useState(false);
  const [safeLinkPrompt, setSafeLinkPrompt] = useState<string | null>(null);
  const coverDragRef = useRef<{ startY: number; startPos: number } | null>(null);

  const profileTilt = use3DTilt(profileCardRef);

  // Social-graph counts unified into a single React Query instead of 4 ad-hoc
  // useState + manual visibility-change listeners. React Query handles focus
  // refetch + caching (staleTime 30s) so we don't burn 4 round-trips on every
  // re-render of the profile header.
  const { data: socialCounts, refetch: refetchSocialCounts, isError: hasSocialCountsError } = useQuery({
    queryKey: ["profile-social-counts", user?.id],
    queryFn: async () => {
      if (!user?.id) return { friends: 0, followers: 0, following: 0, posts: 0 };
      const [
        { count: fc, error: friendsError },
        { count: flc, error: followersError },
        { count: fgc, error: followingError },
        { count: pc, error: postsError },
      ] = await Promise.all([
        (supabase as any).from("friendships").select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
        (supabase as any).from("user_followers").select("id", { count: "exact", head: true })
          .eq("following_id", user.id),
        (supabase as any).from("user_followers").select("id", { count: "exact", head: true })
          .eq("follower_id", user.id),
        (supabase as any).from("user_posts").select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_published", true),
      ]);
      const firstError = friendsError || followersError || followingError || postsError;
      if (firstError) throw firstError;
      return { friends: fc || 0, followers: flc || 0, following: fgc || 0, posts: pc || 0 };
    },
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const friendCount = socialCounts?.friends ?? 0;
  const followerCount = socialCounts?.followers ?? 0;
  const followingCount = socialCounts?.following ?? 0;
  const postsCount = socialCounts?.posts ?? 0;
  // Modal callbacks just invalidate — React Query refetches the canonical counts.
  const setFriendCount = (_n: number) => { void refetchSocialCounts(); };
  const setFollowerCount = (_n: number) => { void refetchSocialCounts(); };
  const setFollowingCount = (_n: number) => { void refetchSocialCounts(); };
  const [socialModal, setSocialModal] = useState<{ open: boolean; tab: "friends" | "followers" | "following" }>({ open: false, tab: "friends" });
  const [shareOpen, setShareOpen] = useState(false);
  const [profileLinkCopied, setProfileLinkCopied] = useState(false);
  const [modeOpen, setModeOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<string>(() => {
    if (typeof window === "undefined") return "personal";
    return localStorage.getItem("zivo:active_mode") || "personal";
  });
  const { isOFMode: zivoOFMode, setOFMode: setZivoOFMode } = useZivoOFMode();

  const { data: ofSubscribersCount = 0 } = useQuery({
    queryKey: ["of-active-subs-count", user?.id],
    enabled: !!user?.id && zivoOFMode,
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("creator_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("creator_id", user!.id)
        .eq("status", "active");
      return (count as number) || 0;
    },
  });

  useEffect(() => {
    if (!zivoOFMode) return;
    setActiveMode("creator");
    try { localStorage.setItem("zivo:active_mode", "creator"); } catch {}
  }, [zivoOFMode]);

  const workflowMode = zivoOFMode ? "creator" : activeMode;
  const profileShareUrl = useMemo(
    () => {
      const origin = getPublicOrigin();
      if (claimedUsername) return `${origin}/u/${encodeURIComponent(claimedUsername)}`;
      if (user?.id) return `${origin}/user/${encodeURIComponent(user.id)}`;
      return "";
    },
    [claimedUsername, user?.id],
  );

  const handleCopyProfileLink = useCallback(async () => {
    selectionChanged();
    if (!claimedUsername && !user?.id) {
      toast.error("Profile link is not ready yet");
      return;
    }
    try {
      await copyText(profileShareUrl);
      setProfileLinkCopied(true);
      toast.success("Profile link copied");
      window.setTimeout(() => setProfileLinkCopied(false), 1600);
    } catch {
      setShareOpen(true);
      toast.info("Copy failed, share options opened");
    }
  }, [claimedUsername, profileShareUrl, selectionChanged, user?.id]);

  const getShopDashboardPath = useCallback(() => {
    if (!ownerStore?.id) return "/shop-dashboard";
    return resolveBusinessDashboardRoute(ownerStore.category, ownerStore.id).path;
  }, [ownerStore]);

  const openShopDashboard = useCallback(() => {
    selectionChanged();
    if (!user) {
      toast.info("Sign in to open Shop Dashboard");
      navigate("/login?redirect=/shop-dashboard");
      return;
    }
    if (ownerStoreLoading) {
      toast.info("Loading your shop dashboard");
      return;
    }
    navigate(getShopDashboardPath());
  }, [getShopDashboardPath, navigate, ownerStoreLoading, selectionChanged, user]);

  // Social counts now flow through useQuery above — refetched on focus and
  // staleTime'd so 4 round-trips don't fire on every re-render.

  useEffect(() => {
    setBioDraft(profile?.bio ?? "");
  }, [profile?.bio]);

  // Scroll to top on mount/navigation
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const { scrollYProgress, scrollY } = useScroll();
  const bgParallax = useTransform(scrollYProgress, [0, 1], [0, -80]);
  // Mobile cover parallax + rubber-band
  const coverY = useTransform(scrollY, [0, 240], [0, -60]);
  const coverScale = useTransform(scrollY, [-100, 0], [1.15, 1]);
  // Header is always pinned & visible. Toggle "over cover" styling vs solid bar
  // once the user scrolls past the cover area for legibility.
  const [overCover, setOverCover] = useState(true);
  useMotionValueEvent(scrollY, "change", (latest) => {
    setOverCover(latest < 80);
  });

  const getInitials = () => {
    if (brandName) return brandName.slice(0, 2).toUpperCase();
    if (profile?.full_name) return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (claimedUsername) return claimedUsername.slice(0, 2).toUpperCase();
    return "U";
  };

  // Cover photo upload
  const uploadCoverFile = async (file: File) => {
    if (!user?.id) return;
    setCoverUploading(true);
    try {
      await uploadCover.mutateAsync(file);
      // Edge function already persisted cover_url. Reset position locally and
      // write cover_position as a best-effort follow-up. Profiles are keyed
      // by user_id, NOT the row PK `id`, so match on user_id (a previous bug
      // hit the same column-confusion in ShareProfileRedirect / QRProfilePage).
      setCoverPosition(50);
      try {
        await supabase.from("profiles").update({ cover_position: 50 }).eq("user_id", user.id);
      } catch (e) {
        console.warn("[uploadCoverFile] cover_position update skipped", e);
      }
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] });
    } catch (err: any) {
      console.error("[uploadCoverFile]", err);
      toast.error(`Cover upload failed: ${err?.message || "unknown"}`);
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverPick = async () => {
    const file = await pickImageFromLibrary();
    if (file) await uploadCoverFile(file);
  };


  const uploadAvatarFile = async (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
      await uploadAvatar.mutateAsync(file);
      setAvatarPreview(null);
    } catch (err: any) {
      console.error("[uploadAvatarFile]", err);
      setAvatarPreview(null);
      toast.error(`Avatar upload failed: ${err?.message || "unknown"}`);
    }
  };

  const handleAvatarPick = async () => {
    const file = await pickImageFromLibrary();
    if (file) await uploadAvatarFile(file);
  };


  // Cover repositioning handlers
  const handleCoverDragStart = (clientY: number) => {
    coverDragRef.current = { startY: clientY, startPos: coverPosition };
  };
  const handleCoverDragMove = (clientY: number) => {
    if (!coverDragRef.current) return;
    const delta = clientY - coverDragRef.current.startY;
    const newPos = Math.max(0, Math.min(100, coverDragRef.current.startPos + delta * 0.3));
    setCoverPosition(newPos);
  };
  const handleCoverDragEnd = () => { coverDragRef.current = null; };
  const saveCoverPosition = async () => {
    if (updateProfile.isPending) return;
    try {
      await updateProfile.mutateAsync({ cover_position: Math.round(coverPosition) });
      setCoverRepositioning(false);
      toast.success("Cover position saved!");
    } catch {
      toast.error("Couldn't save cover position");
    }
  };




  const currentLang = LANGS.find(l => l.code === currentLanguage) || LANGS[0];

  const { data: recentApps, isError: hasRecentAppsError } = useQuery({
    queryKey: ["profile-recent-apps", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await (supabase as any)
        .from("career_applications")
        .select("id, status, created_at, career_jobs!inner(title)")
        .eq("applicant_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return (data ?? []) as Array<{ id: string; status: string; created_at: string; career_jobs: { title: string } | null }>;
    },
  });

  const recentActivity = useMemo(() => {
    const items: Array<{ label: string; date: string; iconType: "car" | "briefcase"; href: string }> = [];
    for (const b of (bookings || []).slice(0, 3)) {
      if (!(b as any).created_at) continue;
      items.push({ label: "Trip", date: (b as any).created_at, iconType: "car", href: "/trips" });
    }
    for (const a of (recentApps || []).slice(0, 3)) {
      if (!a.created_at) continue;
      items.push({ label: `Applied: ${a.career_jobs?.title || "Job"}`, date: a.created_at, iconType: "briefcase", href: "/personal/my-applications" });
    }
    return items
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [bookings, recentApps]);

  const hasAnyProfileData = Boolean(profile);
  const hasProfileRefreshError =
    hasAnyProfileData &&
    (hasProfileError || hasVerificationRequestError || hasSocialCountsError || hasRecentAppsError);

  const retryProfileQueries = useCallback(() => {
    if (!user?.id) return;
    invalidateAllStoryCaches(queryClient, user.id);
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["verification-request", user.id, "latest"] }),
      queryClient.invalidateQueries({ queryKey: ["profile-social-counts", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["profile-recent-apps", user.id] }),
    ]);
  }, [queryClient, user?.id]);

  const handlePullRefresh = useCallback(async () => {
    if (!user?.id) return;
    invalidateAllStoryCaches(queryClient, user.id);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["verification-request", user.id, "latest"] }),
      queryClient.invalidateQueries({ queryKey: ["profile-social-counts", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["profile-recent-apps", user.id] }),
    ]);
  }, [queryClient, user?.id]);

  return (
    <PullToRefresh
      onRefresh={handlePullRefresh}
      mouseDragScroll
      className="min-h-screen bg-background relative overflow-x-hidden safe-area-bottom"
    >
      <SEOHead title="Profile Settings – ZIVO" description="Manage your ZIVO account, profile, and travel preferences." noIndex={true} />

      {/* Desktop NavBar */}
      <div className="hidden lg:block">
        <NavBar />
      </div>

      {/* ── Background: clean Facebook-style on mobile, parallax on desktop ── */}
      <motion.div style={{ y: bgParallax }} className="pointer-events-none fixed inset-0 z-0 hidden lg:block">
        {/* Base gradient (desktop only) */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-background to-primary/[0.04]" />
        {/* Radial glows */}
        <div className="absolute top-[-25%] right-[-15%] w-[70vw] h-[70vw] rounded-full bg-primary/[0.07] blur-[120px]" />
        <div className="absolute bottom-[5%] left-[-20%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.05] blur-[100px]" />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[40vw] h-[40vw] rounded-full bg-primary/[0.03] blur-[80px]" />
        {/* Bokeh particles */}
        <BokehParticle delay={0} size={60} x="10%" y="15%" color="hsl(var(--primary) / 0.08)" />
        <BokehParticle delay={1.5} size={40} x="75%" y="25%" color="hsl(var(--primary) / 0.06)" />
        <BokehParticle delay={2.8} size={80} x="85%" y="60%" color="hsl(var(--primary) / 0.05)" />
        <BokehParticle delay={0.8} size={35} x="20%" y="70%" color="hsl(var(--primary) / 0.07)" />
        <BokehParticle delay={3.5} size={50} x="55%" y="85%" color="hsl(var(--primary) / 0.04)" />
        <BokehParticle delay={1.2} size={45} x="40%" y="10%" color="hsl(var(--primary) / 0.06)" />
      </motion.div>

      {/* ── Mobile sticky compact header (Facebook-style) ──
          Portaled to <body> so the position:fixed element escapes the
          PullToRefresh transformed ancestor (which would otherwise re-anchor
          fixed positioning and hide the header). */}
      {typeof document !== "undefined" && createPortal(
        <motion.header
          role="banner"
          aria-label="Profile quick navigation"
          data-testid="profile-sticky-header"
          style={{
            paddingTop: "var(--zivo-safe-top-sticky)",
            height: "calc(var(--zivo-safe-top-sticky) + 3rem)",
          }}
          className="lg:hidden fixed top-0 inset-x-0 z-40 px-3 flex items-center gap-3"
        >
          {/* Adaptive background: gradient scrim over cover, solid blurred bar after scroll */}
          <div
            aria-hidden
            className={cn(
              "absolute inset-0 -z-10 transition-all duration-300",
              overCover
                ? "bg-background/92 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-background/20"
                : "bg-background/90 backdrop-blur-xl border-b border-border/40 shadow-sm shadow-background/20"
            )}
          />
          <motion.button
            onClick={handleBack}
            aria-label="Go back"
            whileTap={{ scale: 0.86 }}
            whileHover={{ scale: 1.04 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "h-9 w-9 -ml-1 flex items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "hover:bg-muted/60 active:bg-muted/70"
            )}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </motion.button>
          <span aria-hidden="true">
            <Avatar className="h-8 w-8 ring-1 ring-border/60">
              <AvatarImage src={profile?.avatar_url || undefined} alt="" />
              <AvatarFallback className="text-xs">{getInitials()}</AvatarFallback>
            </Avatar>
          </span>
          <div className="flex items-center gap-1 min-w-0 flex-1" aria-live="polite">
            <span
              translate="no"
              className={cn(
              "font-semibold text-sm truncate",
              "text-foreground"
            )}>
              {headerName || "Profile"}
            </span>
            {profile?.is_verified && <VerifiedBadge size={14} />}
          </div>
          <div className="relative">
            <motion.button
              ref={langTriggerRef}
              type="button"
              onClick={() => {
                selectionChanged();
                setShowNotifPanel(false);
                setShowLangPicker((open) => !open);
              }}
              aria-label="Change language"
              aria-expanded={showLangPicker}
              aria-controls="profile-language-menu"
              whileTap={{ scale: 0.86 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
              className={cn(
                "relative h-9 w-9 flex items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                showLangPicker ? "bg-primary/10 text-primary" : "hover:bg-muted/60 text-foreground"
              )}
              title="Change language"
            >
              <Globe className="h-5 w-5" />
              <img
                src={getFlagUrl(currentLang.cc)}
                alt=""
                className="absolute -right-0.5 -bottom-0.5 h-4 w-4 rounded-full border border-background bg-background object-cover shadow-sm"
              />
            </motion.button>
            <AnimatePresence>
              {showLangPicker && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    onClick={() => setShowLangPicker(false)}
                    className="fixed inset-0 z-40 bg-transparent"
                    aria-hidden
                  />
                  <motion.div
                    id="profile-language-menu"
                    role="dialog"
                    aria-label="Change language"
                    initial={{ opacity: 0, y: -8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed z-50 overflow-hidden rounded-2xl border border-border/60 bg-card/95 text-card-foreground shadow-2xl shadow-black/25 backdrop-blur-xl right-2 left-2 mx-auto max-w-[320px] lg:left-auto lg:right-20 lg:mx-0 lg:w-[260px]"
                    style={{
                      top: "calc(var(--zivo-safe-top-sticky) + 3rem + 6px)",
                      maxHeight: "calc(100vh - var(--zivo-safe-top-sticky) - 3rem - 24px)",
                    }}
                  >
                    <div className="border-b border-border/40 bg-muted/30 px-3 py-2.5">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        {t("lang.select")}
                      </p>
                    </div>
                    <div className="max-h-[320px] overflow-y-auto py-1">
                      {LANGS.map((lang) => {
                        const selected = currentLanguage === lang.code;
                        return (
                          <button
                            type="button"
                            key={lang.code}
                            onClick={() => {
                              changeLanguage(lang.code);
                              setShowLangPicker(false);
                            }}
                            className={cn(
                              "relative flex w-full items-center gap-3 overflow-hidden px-3 py-2.5 text-left text-sm transition-colors",
                              selected ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted/60 text-foreground"
                            )}
                          >
                            <img
                              src={getFlagUrl(lang.cc)}
                              alt=""
                              className="absolute right-0 top-1/2 h-[120%] w-auto -translate-y-1/2 opacity-[0.07] pointer-events-none"
                            />
                            <img
                              src={getFlagUrl(lang.cc)}
                              alt=""
                              className="relative z-10 h-5 w-5 rounded-full object-cover ring-1 ring-border/50"
                            />
                            <span className="relative z-10 min-w-0 flex-1 truncate">{lang.label}</span>
                            {selected && <Check className="relative z-10 h-4 w-4 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <motion.button
            type="button"
            onClick={handleCopyProfileLink}
            aria-label={profileLinkCopied ? "Profile link copied" : "Copy profile link"}
            aria-pressed={profileLinkCopied}
            whileTap={{ scale: 0.86 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-full border transition focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none",
              profileLinkCopied
                ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-600"
                : "border-transparent hover:bg-muted/60 text-foreground"
            )}
          >
            {profileLinkCopied ? <Check className="h-5 w-5" /> : <LinkIcon className="h-5 w-5" />}
          </motion.button>
          <div className="relative">
          <motion.button
            ref={notifBellRef}
            onClick={handleToggleNotif}
            aria-label={showNotifPanel ? "Close notifications" : "Open notifications"}
            aria-pressed={showNotifPanel}
            aria-expanded={showNotifPanel}
            aria-controls="profile-notif-panel"
            whileTap={{ scale: 0.86 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              showNotifPanel
                ? "bg-primary text-primary-foreground"
                : overCover
                  ? "hover:bg-muted/60 text-foreground"
                  : "hover:bg-muted/60 text-foreground"
            )}
          >
            <Bell className="h-5 w-5" />
            {totalNotifCount > 0 && !showNotifPanel && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground shadow-sm">
                {totalNotifCount > 99 ? "99+" : totalNotifCount}
              </span>
            )}
          </motion.button>
          <AnimatePresence>
            {showNotifPanel && (
              <>
                {/* Soft backdrop on mobile so the popover clearly stands above the page */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setShowNotifPanel(false)}
                  className="lg:hidden fixed inset-0 z-40 bg-background/40 backdrop-blur-[2px]"
                  style={{ top: "calc(var(--zivo-safe-top-sticky) + 3rem)" }}
                  aria-hidden
                />
                <motion.div
                  ref={notifPanelRef}
                  id="profile-notif-panel"
                  role="dialog"
                  aria-label="Notifications"
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="fixed z-50 origin-top-right overflow-hidden rounded-2xl border border-border/60 bg-card text-card-foreground shadow-2xl shadow-black/30 backdrop-blur-xl right-2 left-2 mx-auto max-w-[420px] lg:left-auto lg:right-4 lg:mx-0 lg:w-[400px]"
                  style={{
                    top: "calc(var(--zivo-safe-top-sticky) + 3rem + 6px)",
                    maxHeight: "calc(100vh - var(--zivo-safe-top-sticky) - 3rem - 24px)",
                  }}
                >
                {/* Caret pointing at the bell */}
                <div className="pointer-events-none absolute -top-1.5 right-12 h-3 w-3 rotate-45 rounded-sm border-l border-t border-border/60 bg-card lg:right-6" />
                {/* Header (sticky) */}
                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border/40 bg-card/95 px-4 pt-3 pb-2.5 backdrop-blur pt-safe">
                  <div className="flex items-center gap-2" aria-live="polite">
                    <h3 className="text-[15px] font-bold leading-none tracking-tight">Notifications</h3>
                    {totalNotifCount > 0 && (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{totalNotifCount}</Badge>
                    )}
                  </div>
                  {notifUnreadCount > 0 && (
                    <button type="button"
                      onClick={handleMarkAllRead}
                      disabled={isMarkingAllRead}
                      className="rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                    >
                      {isMarkingAllRead ? "Marking..." : "Mark all read"}
                    </button>
                  )}
                </div>
                {/* Filter chips */}
                <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-1">
                  {(["all", "unread"] as const).map((f) => (
                    <button type="button"
                      key={f}
                      onClick={() => setNotifFilter(f)}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                        notifFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {f === "all" ? "All" : `Unread${notifUnreadCount > 0 ? ` (${notifUnreadCount})` : ""}`}
                    </button>
                  ))}
                </div>
                {/* List */}
                <div className="max-h-[60vh] overflow-y-auto overscroll-contain px-1.5 py-1.5">
                  {/* Friend requests pinned */}
                  {socialCount > 0 && (
                    <button type="button"
                      onClick={() => { selectionChanged(); setShowNotifPanel(false); navigate("/notifications?tab=requests"); }}
                      className="flex w-full items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 p-2.5 text-left transition-colors hover:bg-primary/10"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">Friend requests</p>
                        <p className="truncate text-xs text-muted-foreground">{socialCount} pending · tap to review</p>
                      </div>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    </button>
                  )}

                  {notifLoading && notifications.length === 0 ? (
                    <div className="space-y-2 p-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted" />
                          <div className="flex-1 space-y-1.5">
                            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                            <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted/70" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (() => {
                    const filtered = (notifFilter === "unread"
                      ? notifications.filter((n) => !n.is_read)
                      : notifications);
                    if (filtered.length === 0 && socialCount === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center gap-1.5 px-4 py-7 text-center">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/40">
                            <Bell className="h-5 w-5 text-muted-foreground/60" />
                          </div>
                          <p className="text-sm font-semibold text-foreground">You're all caught up</p>
                          <p className="text-xs text-muted-foreground">New notifications will appear here.</p>
                        </div>
                      );
                    }
                    return (
                      <AnimatePresence initial={false}>
                        {filtered.slice(0, 12).map((n) => {
                          let timeLabel = "";
                          try { timeLabel = formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: false }); } catch {}
                          const md: Record<string, any> = n.metadata || {};
                          const actorAvatar: string | undefined = md.actor_avatar_url || md.avatar_url || md.image_url;
                          const actorName: string = md.actor_name || md.actor || n.title || "?";
                          const initials = actorName
                            .split(/\s+/)
                            .map((s: string) => s[0])
                            .filter(Boolean)
                            .slice(0, 2)
                            .join("")
                            .toUpperCase() || "Z";
                          return (
                            <motion.button
                              key={n.id}
                              layout
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -4 }}
                              transition={{ type: "spring", stiffness: 380, damping: 30, mass: 0.6 }}
                              onClick={() => handleNotifClick(n)}
                              className="group flex w-full items-start gap-3 rounded-xl p-2.5 text-left"
                              style={{
                                backgroundColor: n.is_read ? "transparent" : "hsl(var(--primary) / 0.06)",
                                transition: "background-color 200ms ease",
                              }}
                            >
                              {actorAvatar ? (
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarImage src={actorAvatar} alt="" />
                                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className={cn(
                                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                                  n.category === "transactional" ? "bg-emerald-500/15 text-emerald-500"
                                    : n.category === "operational" ? "bg-amber-500/15 text-amber-500"
                                    : n.category === "marketing" ? "bg-fuchsia-500/15 text-fuchsia-500"
                                    : "bg-primary/15 text-primary"
                                )}>
                                  <Bell className="h-5 w-5" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className={cn("truncate text-sm transition-all", n.is_read ? "font-medium text-foreground/90" : "font-semibold text-foreground")}>
                                  {n.title || "Notification"}
                                </p>
                                {n.body && (
                                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                                )}
                                {timeLabel && (
                                  <p className={cn("mt-0.5 text-[10px] font-medium", n.is_read ? "text-muted-foreground" : "text-primary")}>
                                    {timeLabel} ago
                                  </p>
                                )}
                              </div>
                              <motion.span
                                initial={false}
                                animate={{ opacity: n.is_read ? 0 : 1, scale: n.is_read ? 0.4 : 1 }}
                                transition={{ duration: 0.18 }}
                                className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                aria-label={n.is_read ? "Read" : "Unread"}
                              />
                            </motion.button>
                          );
                        })}
                      </AnimatePresence>
                    );
                  })()}
                </div>
                {/* Footer */}
                <div className="border-t border-border/40 px-2 py-1.5">
                  <button type="button"
                    onClick={() => { setShowNotifPanel(false); navigate("/notifications"); }}
                    className="w-full rounded-xl py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    See all notifications
                  </button>
                </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
          </div>
          <motion.button
            onClick={() => navigate("/more?from=profile")}
            aria-label="More account options"
            whileTap={{ scale: 0.86 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            className={cn(
              "h-9 w-9 -mr-1 flex items-center justify-center rounded-full transition focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              "hover:bg-muted/60 text-foreground"
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
          </motion.button>
        </motion.header>,
        document.body
      )}


      {/* ── Scrollable content ── */}
      <div className="relative z-10 min-h-screen pb-24 scroll-smooth bg-background no-scrollbar">
        {/* Mobile: edge-to-edge full-screen (Facebook-style). Desktop: centered card. */}
        <div className="px-0 lg:px-4 pt-[calc(var(--zivo-safe-top-sticky)+3rem)] lg:pt-20 max-w-none lg:max-w-3xl mx-auto">

          {profileLoading ? (
            <div className="flex items-center justify-center py-20">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                <Loader2 className="h-8 w-8 text-primary" />
              </motion.div>
            </div>
          ) : hasProfileError && !profile ? (
            <LoadFailureCard
              className="px-4 lg:px-0 py-10"
              title="Profile refresh failed"
              description="We couldn&apos;t load your profile right now. Retry to reconnect and restore your account data."
              onRetry={retryProfileQueries}
              onSecondary={() => navigate("/feed")}
              secondaryLabel="Go Home"
              trackingContext="profile"
            />
          ) : (
            <div className="space-y-2 pt-0 lg:pt-1">
              {hasProfileRefreshError && (
                <DegradedDataBanner
                  className="px-4 lg:px-0 pt-2"
                  message="Showing cached profile data. Refresh failed."
                  onRetry={retryProfileQueries}
                  trackingContext="profile"
                />
              )}

              {/* ── Profile Card with Cover Photo ──
                  No ParallaxSection here: the hero card must paint immediately
                  to avoid a giant blank area at the top of the viewport. */}
              <div>
                <motion.div
                  ref={profileCardRef}
                  onMouseMove={profileTilt.handleMove as any}
                  onMouseLeave={profileTilt.handleLeave}
                  animate={{ rotateX: profileTilt.style.rotateX, rotateY: profileTilt.style.rotateY }}
                  transition={{ type: "spring", stiffness: 200, damping: 20 }}
                  style={{ perspective: "1200px", transformStyle: "preserve-3d" }}
                  className="group"
                >
                  {/* Mobile: edge-to-edge plain surface (Facebook). Desktop: glass card. */}
                  <div className="relative bg-card lg:rounded-3xl lg:overflow-hidden lg:shadow-2xl lg:shadow-primary/[0.08]">
                    <div className="hidden lg:block absolute inset-0 bg-card/70 backdrop-blur-2xl rounded-3xl" />
                    <div className="hidden lg:block absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-primary/[0.02] rounded-3xl" />
                    <div className="hidden lg:block pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-inset ring-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]" />
                    <div className="relative z-10">
                    {/* Cover photo sits below the fixed mobile header so content never collides with the notch. */}
                    <div
                      data-disable-pull-to-refresh="true"
                      className={cn("zivo-profile-cover-height relative w-full overflow-hidden select-none", coverRepositioning ? "cursor-ns-resize" : "cursor-default")}
                      onMouseDown={coverRepositioning ? (e) => { e.preventDefault(); handleCoverDragStart(e.clientY); } : undefined}
                      onMouseMove={coverRepositioning ? (e) => handleCoverDragMove(e.clientY) : undefined}
                      onMouseUp={coverRepositioning ? handleCoverDragEnd : undefined}
                      onMouseLeave={coverRepositioning ? handleCoverDragEnd : undefined}
                      onTouchStart={coverRepositioning ? (e) => handleCoverDragStart(e.touches[0].clientY) : undefined}
                      onTouchMove={coverRepositioning ? (e) => handleCoverDragMove(e.touches[0].clientY) : undefined}
                      onTouchEnd={coverRepositioning ? handleCoverDragEnd : undefined}
                      onDoubleClick={coverRepositioning ? () => { impact("medium"); setCoverPosition(50); } : undefined}
                    >
                      {/* Status-bar legibility scrim (mobile only). pointer-events disabled. */}
                      <div
                        aria-hidden="true"
                        className="zivo-profile-cover-scrim lg:hidden pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/45 via-black/15 to-transparent"
                      />
                      <motion.div
                        className="pointer-events-none absolute inset-0 lg:!translate-y-0 lg:!scale-100"
                        style={coverRepositioning ? undefined : { y: coverY, scale: coverScale }}
                      >
                      {profile?.cover_url ? (
                        <img
                          src={profile.cover_url}
                          alt="Cover"
                          className={cn("absolute inset-0 w-full h-full object-cover transition-[object-position] duration-100", coverPositionClass)}
                          draggable={false}
                        />
                      ) : zivoOFMode ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00AEEF] via-[#0099D9] to-[#0077B6]">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(255,255,255,0.18),transparent_70%)]" />
                          <div className="absolute bottom-3 right-4 text-white/70 text-[11px] font-medium flex items-center gap-1">
                            <ImagePlus className="w-3.5 h-3.5" /> Add cover photo
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-accent/20">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,hsl(var(--primary)/0.25),transparent_70%)]" />
                          <div className="absolute bottom-3 right-4 text-primary/40 text-[11px] font-medium flex items-center gap-1">
                            <ImagePlus className="w-3.5 h-3.5" /> Add cover photo
                          </div>
                        </div>
                      )}
                      {/* Gradient overlay (subtle on mobile so cover stays vivid like Facebook) */}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-card/40 via-transparent to-transparent lg:from-card/90 lg:via-card/20" />
                      </motion.div>

                      {/* Cover action buttons — Facebook-style bottom-right of cover.
                          Pinned to the bottom of the cover photo so they sit far
                          below the iOS status bar / Dynamic Island safe zone and
                          never overlap the sticky header (back/bell/more).
                          Uses a native <label htmlFor> so the file picker
                          reliably opens on iOS / Android Capacitor. */}
                      {user && !coverRepositioning && (
                        <div className="absolute bottom-3 right-3 z-40 flex items-center gap-2 pointer-events-auto">
                          {profile?.cover_url && (
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.88 }}
                              onClick={() => { setCoverPosition(profile?.cover_position ?? 50); setCoverRepositioning(true); }}
                              aria-label="Reposition cover photo"
                              className="h-9 w-9 flex items-center justify-center rounded-full bg-background/90 backdrop-blur-md text-foreground hover:bg-background shadow-lg border border-border/40 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                            >
                              <MoveVertical className="h-[16px] w-[16px]" />
                            </motion.button>
                          )}
                          <button
                            type="button"
                            onClick={handleCoverPick}
                            disabled={coverUploading}
                            aria-label={profile?.cover_url ? "Change cover photo" : "Add cover photo"}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-9 rounded-full bg-background/90 backdrop-blur-md text-foreground hover:bg-background shadow-lg border border-border/40 cursor-pointer active:scale-95 transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                              profile?.cover_url ? "w-9 justify-center" : "px-3.5 text-xs font-semibold",
                              coverUploading && "opacity-60 pointer-events-none"
                            )}
                          >
                            {coverUploading ? (
                              <Loader2 className="h-[16px] w-[16px] animate-spin" />
                            ) : (
                              <>
                                <ImagePlus className="h-[16px] w-[16px]" />
                                {!profile?.cover_url && <span>Add cover</span>}
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Repositioning controls */}
                      {coverRepositioning && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center">
                          <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px]" />
                          <div className="relative flex items-center gap-3 bg-background/90 backdrop-blur-xl rounded-full px-4 py-2 shadow-xl border border-border/50">
                            <MoveVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">Drag to reposition</span>
                            <button type="button" onClick={saveCoverPosition} disabled={updateProfile.isPending} aria-label="Save cover position" className="p-1.5 rounded-full bg-primary text-primary-foreground transition active:scale-90 disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">
                              {updateProfile.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button type="button" onClick={handleResetCover} aria-label="Reset cover position to center" className="p-1.5 rounded-full bg-muted/70 text-foreground hover:bg-muted transition active:scale-90 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => { setCoverPosition(profile?.cover_position ?? 50); setCoverRepositioning(false); }} aria-label="Cancel cover repositioning" className="p-1.5 rounded-full bg-muted text-muted-foreground transition active:scale-90 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none">
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                    </div>


                    {/* Avatar overlapping cover */}
                    <div className="relative z-10 -mt-9 px-5 sm:-mt-11 sm:px-6">
                      <div className="flex justify-start">
                        <motion.div
                          className="relative group/avatar"
                          whileHover={{ scale: 1.05 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {/* Story-ring around the profile avatar.
                              OF mode swaps to OnlyFans cyan/blue. */}
                          <div className={cn(
                            "absolute -inset-1 rounded-full pointer-events-none",
                            zivoOFMode
                              ? "bg-gradient-to-tr from-[#0077B6] via-[#00AEEF] to-[#7CD6FF]"
                              : "bg-ig-gradient"
                          )} />
                          <Avatar className="relative h-16 w-16 sm:h-24 sm:w-24 md:h-28 md:w-28 ring-2 ring-background">
                            <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt="Profile" />
                            <AvatarFallback className="bg-muted text-foreground text-2xl font-bold">
                              {getInitials()}
                            </AvatarFallback>
                          </Avatar>
                          <button
                            type="button"
                            onClick={handleAvatarPick}
                            disabled={uploadAvatar.isPending}
                            aria-label="Change profile photo"
                            className={cn(
                              "absolute bottom-0 right-0 p-1.5 sm:p-2 bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/40 ring-2 ring-card cursor-pointer active:scale-90 transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none",
                              uploadAvatar.isPending && "opacity-50 pointer-events-none"
                            )}
                          >
                            {uploadAvatar.isPending ? <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> : <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                          </button>
                        </motion.div>
                      </div>
                    </div>

                    {/* Name & status */}
                    <div className="px-5 sm:px-6 pb-1 pt-1.5 sm:pt-2 text-left">
                      <CardTitle translate="no" className="flex items-center justify-start gap-2 text-xl sm:text-2xl font-bold tracking-tight">
                        <span>{headerName || t("profile.set_name")}</span>
                        {profile?.is_verified && <VerifiedBadge size={28} />}
                      </CardTitle>
                      {/* @username line — link or "set" CTA. Email never shown publicly. */}
                      <div className="mt-0.5 text-sm text-muted-foreground">
                        {claimedUsername ? (
                          <span>@{claimedUsername}</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate("/account/username?from=profile")}
                            className="text-primary hover:underline"
                          >
                            Set a username
                          </button>
                        )}
                      </div>
                      {/* Email hidden — only visible to account owner in settings */}
                      <div className="flex flex-wrap items-center justify-start gap-2 mt-2 sm:mt-3">
                        {isPlus && (
                          <Badge translate="no" className="bg-ig-gradient text-white border-0 font-semibold rounded-full px-3 py-1">
                            <Crown className="w-3 h-3 mr-1" /> ZIVO+ {plan === "annual" ? "Annual" : "Monthly"}
                          </Badge>
                        )}
                      </div>

                      {!profile?.is_verified && (
                        <button
                          type="button"
                          onClick={() => navigate("/account/verification")}
                          className={cn(
                            "group mt-3 inline-flex min-h-[36px] items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-bold shadow-sm transition-all duration-200 active:scale-95 hover:shadow-md hover:-translate-y-0.5",
                            latestVerificationRequest?.status === "pending"
                              ? "border-border bg-muted text-foreground"
                              : latestVerificationRequest?.status === "rejected"
                                ? "border-destructive/25 bg-destructive/5 text-destructive"
                                : "border-foreground bg-foreground text-background"
                          )}
                        >
                          {latestVerificationRequest?.status === "pending" ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Verification pending
                            </>
                          ) : latestVerificationRequest?.status === "rejected" ? (
                            <>
                              <AlertCircle className="h-3.5 w-3.5" /> Reapply for blue verified
                            </>
                          ) : (
                            <>
                              <BlueVerifiedBadge className="h-4 w-4 transition-transform duration-300 group-hover:rotate-12" /> Get blue verified
                            </>
                          )}
                        </button>
                      )}

                      {/* Bio */}
                      <div className="mt-2 max-w-sm">
                        {profile?.bio && !bioEditing ? (
                          <div className="flex items-start gap-2">
                            <p className="flex-1 text-xs text-foreground/85 whitespace-pre-wrap break-words">
                              <SafeCaption text={profile.bio} />
                            </p>
                            <button
                              type="button"
                              onClick={() => { setBioDraft(profile.bio ?? ""); setBioEditing(true); }}
                              aria-label="Edit bio"
                              className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : !profile?.bio && !bioEditing ? (
                          <button
                            type="button"
                            onClick={() => { setBioDraft(""); setBioEditing(true); }}
                            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition-colors"
                          >
                            <Pencil className="h-3 w-3" />
                            Add bio
                          </button>
                        ) : (
                          <>
                            <textarea
                              value={bioDraft}
                              onChange={(e) => setBioDraft(e.target.value.slice(0, 160))}
                              placeholder="Add a short bio so people know who you are."
                              maxLength={160}
                              rows={2}
                              autoFocus
                              aria-label="Bio"
                              className="w-full resize-none rounded-2xl border border-border/50 bg-background/80 px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
                            />
                            <div className="mt-1 flex justify-end">
                              <span className={cn("text-[10px] tabular-nums", bioDraft.length >= 150 ? "text-amber-500" : "text-muted-foreground/70")}>
                                {bioDraft.length}/160
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  if (!confirmContentSafe(bioDraft, "bio")) return;
                                  updateProfile.mutate(
                                    { bio: bioDraft.trim() || null },
                                    { onSuccess: () => setBioEditing(false) }
                                  );
                                }}
                                disabled={updateProfile.isPending}
                                className="rounded-full px-4"
                              >
                                {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save bio"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => { setBioDraft(profile?.bio ?? ""); setBioEditing(false); }}
                                className="rounded-full px-3 text-muted-foreground"
                              >
                                Cancel
                              </Button>
                            </div>
                          </>
                        )}

                      </div>

                      {/* ── Edit Profile / Share / Analytics row ── */}
                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => { selectionChanged(); navigate("/account/profile-edit"); }}
                          className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                        >
                          <Pencil className="h-3.5 w-3.5 text-foreground" />
                          <span>Edit profile</span>
                        </button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.93 }}
                          onClick={() => { selectionChanged(); setShareOpen(true); }}
                          aria-label="Share profile"
                          className="h-9 w-9 flex items-center justify-center rounded-full border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                        >
                          <Share2 className="h-4 w-4 text-foreground" />
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.93 }}
                          onClick={() => { if (user?.id) { selectionChanged(); navigate(`/user/${user.id}?from=profile&as=visitor`); } }}
                          aria-label="Preview public profile"
                          disabled={!user?.id}
                          className="h-9 w-9 flex items-center justify-center rounded-full border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Eye className="h-4 w-4 text-foreground" />
                        </motion.button>
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.93 }}
                          onClick={() => { selectionChanged(); navigate("/account/analytics"); }}
                          aria-label="Profile analytics"
                          className="h-9 w-9 flex items-center justify-center rounded-full border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                        >
                          <BarChart3 className="h-4 w-4 text-foreground" />
                        </motion.button>
                      </div>

                      {/* Stats row — OF mode shows subscribers + posts only,
                          default mode shows the full social signals. */}
                      {zivoOFMode ? (
                        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                          <button
                            type="button"
                            aria-label={`View ${ofSubscribersCount} subscribers`}
                            onClick={() => { selectionChanged(); navigate("/creator/subscribers"); }}
                            className="inline-flex items-baseline gap-1 rounded-md px-1 -mx-1 py-0.5 hover:underline focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none"
                          >
                            <span className="font-bold text-foreground">{formatCount(ofSubscribersCount) ?? "0"}</span>
                            <span className="font-medium text-muted-foreground">subscribers</span>
                          </button>
                          <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                          <span className="inline-flex items-baseline gap-1">
                            <span className="font-bold text-foreground">{formatCount(postsCount) ?? "0"}</span>
                            <span className="font-medium text-muted-foreground">{postsCount === 1 ? "post" : "posts"}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                          <button
                            type="button"
                            aria-label={`View ${followerCount} followers`}
                            onClick={() => setSocialModal({ open: true, tab: "followers" })}
                            className="inline-flex items-baseline gap-1 rounded-md px-1 -mx-1 py-0.5 hover:underline focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                          >
                            <span className="font-bold text-foreground">{formatCount(followerCount) ?? "0"}</span>
                            <span className="font-medium text-muted-foreground">{followerCount === 1 ? "follower" : "followers"}</span>
                          </button>
                          <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                          <button
                            type="button"
                            aria-label={`View ${followingCount} following`}
                            onClick={() => setSocialModal({ open: true, tab: "following" })}
                            className="inline-flex items-baseline gap-1 rounded-md px-1 -mx-1 py-0.5 hover:underline focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                          >
                            <span className="font-bold text-foreground">{formatCount(followingCount) ?? "0"}</span>
                            <span className="font-medium text-muted-foreground">following</span>
                          </button>
                          <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                          <span className="inline-flex items-baseline gap-1">
                            <span className="font-bold text-foreground">{formatCount(postsCount) ?? "0"}</span>
                            <span className="font-medium text-muted-foreground">{postsCount === 1 ? "post" : "posts"}</span>
                          </span>
                          <span aria-hidden="true" className="text-muted-foreground/70">·</span>
                          <button
                            type="button"
                            aria-label={`View ${friendCount} friends`}
                            onClick={() => setSocialModal({ open: true, tab: "friends" })}
                            className="inline-flex items-baseline gap-1 rounded-md px-1 -mx-1 py-0.5 hover:underline focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
                          >
                            <span className="font-bold text-foreground">{formatCount(friendCount) ?? "0"}</span>
                            <span className="font-medium text-muted-foreground">{friendCount === 1 ? "friend" : "friends"}</span>
                          </button>
                        </div>
                      )}

                      {/* Quick Actions row (mobile-only).
                          OF mode: single OnlyFans-style monetization CTA.
                          Default: business shortcuts (Shop, Employees, Mode, Monetization). */}
                      {zivoOFMode ? (
                        <div className="lg:hidden mt-3 space-y-2">
                          <button
                            type="button"
                            onClick={() => { selectionChanged(); navigate("/monetization"); }}
                            className="w-full flex items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#00AEEF]/30 bg-gradient-to-r from-[#00AEEF] to-[#0099D9] hover:from-[#00B8F5] hover:to-[#00A3E5] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none transition-all"
                          >
                            <Lock className="h-4 w-4" />
                            <span>{zivoOFMode ? "ZIVO OF · Subscribe & Monetize" : "Subscribe & Monetize"}</span>
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => { selectionChanged(); navigate("/monetization"); }}
                              className="flex items-center justify-center gap-1.5 rounded-full border border-[#00AEEF]/30 bg-[#00AEEF]/5 px-4 py-2 text-[12px] font-semibold text-[#00AEEF] hover:bg-[#00AEEF]/10 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[#00AEEF]/60 focus-visible:outline-none transition-all"
                            >
                              <SettingsIcon className="h-3.5 w-3.5" />
                              <span>ZIVO OF Settings</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => { selectionChanged(); setModeOpen(true); }}
                              className="flex items-center justify-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-4 py-2 text-[12px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition-all"
                            >
                              <Repeat className="h-3.5 w-3.5" />
                              <span>Switch Mode</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="lg:hidden mt-3 grid grid-cols-4 gap-2">
                          {[
                            { label: "Shop", icon: Store, onClick: openShopDashboard },
                            { label: "Employees", icon: Users, onClick: () => { selectionChanged(); if (!user) { toast.info("Sign in to open Workplace"); navigate("/login?redirect=/personal-dashboard"); return; } navigate("/personal-dashboard"); } },
                            { label: "Switch Mode", icon: Repeat, onClick: () => { selectionChanged(); setModeOpen(true); } },
                            { label: "Monetization", icon: DollarSign, onClick: () => { selectionChanged(); navigate("/monetization"); } },
                          ].map((a) => (
                            <button type="button"
                              key={a.label}
                              onClick={a.onClick}
                              className="flex flex-col items-center gap-1 rounded-2xl border border-border/50 bg-muted/25 px-2 py-2 text-[11px] font-semibold text-foreground hover:bg-muted/50 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none transition-all"
                            >
                              <a.icon className="h-4 w-4 text-primary" />
                              <span className="truncate">{a.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Social Links Row */}
                      {profile?.social_links_visible !== false && (() => {
                        const socials = [
                          { key: "social_facebook", name: "Facebook", color: "bg-[#1877F2]", icon: (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                          )},
                          { key: "social_instagram", name: "Instagram", color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]", icon: (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                          )},
                          { key: "social_tiktok", name: "TikTok", color: "bg-[#010101]", icon: (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                          )},
                          { key: "social_snapchat", name: "Snapchat", color: "bg-[#FFFC00]", icon: (
                            <svg viewBox="0 0 512 512" className="w-5 h-5 fill-white" stroke="black" strokeWidth="18"><path d="M256 32c-60 0-104 26-131 76-18 34-14 88-11 128l1 12c-8-4-18-7-27-7-14 0-25 6-31 16-5 9-5 20-1 30 10 24 36 35 56 43l5 2c-4 14-10 27-20 40-20 26-46 45-72 55-10 4-16 13-15 23 1 9 7 16 12 20 17 11 37 17 55 21 5 1 10 3 13 5 5 4 7 11 11 18 3 7 8 15 16 22 9 8 22 12 37 12 10 0 20-2 30-4 18-5 34-9 56-9s38 4 56 9c10 3 20 4 30 4 15 0 28-4 37-12 8-7 13-15 16-22 4-7 6-14 11-18 3-2 8-4 13-5 18-4 38-10 55-21 5-4 11-11 12-20 1-10-5-19-15-23-26-10-52-29-72-55-10-13-16-26-20-40l5-2c20-8 46-19 56-43 4-10 4-21-1-30-6-10-17-16-31-16-9 0-19 3-27 7l1-12c3-40 7-94-11-128C360 58 316 32 256 32z"/></svg>
                          )},
                          { key: "social_x", name: "X", color: "bg-foreground", icon: (
                            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-background"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                          )},
                          { key: "social_linkedin", name: "LinkedIn", color: "bg-[#0A66C2]", icon: (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                          )},
                          { key: "social_telegram", name: "Telegram", color: "bg-[#26A5E4]", icon: (
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                          )},
                        ].filter(s => (profile as any)?.[s.key]);

                        return socials.length > 0 ? (
                          <div className="flex items-center justify-center gap-3 mt-4">
                            {socials.map((social) => (
                              <motion.button
                                key={social.name}
                                whileTap={{ scale: 0.85 }}
                                whileHover={{ scale: 1.1, y: -2 }}
                                onClick={() => {
                                  const raw = (profile as any)[social.key];
                                  if (!raw) return;
                                  const cleaned = stripTrackingParams(raw);
                                  const r = assessLinkSync(cleaned);
                                  if (r.level === "blocked") {
                                    toast.error("This link looks unsafe and was blocked.");
                                    return;
                                  }
                                  if (r.level === "trusted") { void openExternalUrl(cleaned); return; }
                                  setSafeLinkPrompt(cleaned);
                                }}
                                title={social.name}
                                className={`w-10 h-10 rounded-full ${social.color} flex items-center justify-center shadow-md hover:shadow-lg transition-shadow`}
                              >
                                {social.icon}
                              </motion.button>
                            ))}
                          </div>
                        ) : null;
                      })()}

                      {/* Add Friend & Follow buttons — only shown when viewing other users' profiles */}
                    </div>

                    <CardContent className="px-6 pb-4 pt-2">
                    </CardContent>
                    </div>
                  </div>

                </motion.div>
              </div>

              {/* ZIVO+ upgrade moved to /more page */}

              {/* Wallet, Completeness & Referral cards moved to /more page to avoid duplication */}

              {/* ── Recent Trips ── */}
              {user && (bookingsLoading || bookings.length > 0) && (
                <ParallaxSection index={1.15}>
                  <ProfileTripsCard
                    bookings={bookings}
                    loading={bookingsLoading}
                    onViewAll={() => { selectionChanged(); navigate("/trips"); }}
                    onOpen={(b) => { selectionChanged(); navigate(`/trips?booking=${b.id}`); }}
                  />
                </ParallaxSection>
              )}

              {/* ── Recent Activity ── */}
              {user && recentActivity.length > 0 && (
                <ParallaxSection index={1.3}>
                  <div className="mx-3 lg:mx-0">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
                      <button type="button" className="text-xs font-medium text-primary"
                        onClick={() => { selectionChanged(); navigate("/trips"); }}>
                        See all
                      </button>
                    </div>
                    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                      {recentActivity.map((item, i) => (
                        <button
                          type="button"
                          key={i}
                          onClick={() => { selectionChanged(); navigate(item.href); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/20 last:border-0 hover:bg-muted/30 active:bg-muted/40 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                            {item.iconType === "car"
                              ? <Car className="w-4 h-4 text-muted-foreground" />
                              : <Briefcase className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {(() => { try { return formatDistanceToNowStrict(new Date(item.date), { addSuffix: true }); } catch { return ""; } })()}
                            </p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </ParallaxSection>
              )}

              {/* Profile Completeness & Referral cards moved to /more page */}

              {/* ── Phone Required Card ── */}
              {!profile?.phone?.trim() && (
                <ParallaxSection index={1.5}>
                  <div
                    className="mx-3 lg:mx-0 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-transform"
                    onClick={() => navigate("/account/profile-edit?focus=phone")}
                  >
                    <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-destructive" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground">Phone number required</p>
                      <p className="text-xs text-muted-foreground">Add your phone number to access rides, flights & more</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-destructive/50 shrink-0" />
                  </div>
                </ParallaxSection>
              )}

              {/* ── Stories Row ── */}
              <ParallaxSection index={2}>
                <ProfileStories />
              </ParallaxSection>

          {/* Notifications panel moved into the sticky header (Facebook-style popover) */}

              {/* Account Quick Links moved to /more page to avoid duplication */}

              {/* ── Social Content Tabs (Posts, Videos, Live, Status) ── */}
              <ParallaxSection index={2.5}>
                <ProfileContentTabs
                  userId={user?.id}
                  profileDisplayName={headerName || profile?.full_name}
                  profileAvatarUrl={profile?.avatar_url}
                  onPostsChanged={() => { void refetchSocialCounts(); }}
                />
              </ParallaxSection>




            </div>
          )}
        </div>
      </div>

      <ZivoMobileNav />

      <ExternalLinkWarning
        url={safeLinkPrompt}
        open={!!safeLinkPrompt}
        onOpenChange={(o) => { if (!o) setSafeLinkPrompt(null); }}
        onConfirm={(u) => { void openExternalUrl(u); setSafeLinkPrompt(null); }}
      />

      {/* Language picker moved to /more page (TranslateButton component) */}



      <SocialListModal
        open={socialModal.open}
        onClose={() => setSocialModal({ ...socialModal, open: false })}
        initialTab={socialModal.tab}
        onCountsChange={(f, fl, fg) => {
          if (socialModal.tab === "friends") setFriendCount(f);
          if (socialModal.tab === "followers") setFollowerCount(fl);
          if (socialModal.tab === "following") setFollowingCount(fg);
        }}
      />

      {/* Mode Switch bottom sheet — placeholder for future per-mode routing */}
      <Sheet open={modeOpen} onOpenChange={setModeOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10 max-h-[88vh] overflow-y-auto z-[1500]">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-base font-bold">Switch mode</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2">
            {zivoOFMode && (
              <div className="mb-1 rounded-2xl border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">ZIVO OF Mode is active</p>
                  <p className="text-[11px] text-muted-foreground">Creator workflow is locked while OF mode is on.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setZivoOFMode(false);
                    toast.success("ZIVO OF Mode turned off");
                  }}
                  className="shrink-0 text-[11px] font-semibold rounded-lg border border-border/40 px-2.5 py-1.5 hover:bg-muted/50"
                >
                  Turn off
                </button>
              </div>
            )}
            {(zivoOFMode
              ? [
                  { id: "creator", label: "Creator", desc: "Subscriptions, PPV & tips", icon: Sparkles, route: "/creator-dashboard" },
                ]
              : [
                  { id: "personal", label: "Personal", desc: "Your everyday account", icon: UserIcon, route: "/profile" },
                  { id: "fan", label: "Fan", desc: "Subscribe to creators & unlock content", icon: Heart, route: "/account/subscriptions" },
                  { id: "creator", label: "Creator", desc: "Subscriptions, PPV & tips", icon: Sparkles, route: "/creator-dashboard" },
                  { id: "business", label: "Business", desc: "Manage company travel & teams", icon: Briefcase, route: "/business" },
                  { id: "driver", label: "Driver", desc: "Go online and accept rides", icon: Car, route: "/driver/home" },
                  { id: "shop", label: "Shop Partner", desc: "Open your store dashboard", icon: Store, route: getShopDashboardPath() },
                ]).map((m) => {
              const active = workflowMode === m.id;
              const Icon = m.icon;
              return (
                <button type="button"
                  key={m.id}
                  onClick={() => {
                    if (zivoOFMode && m.id !== "creator") {
                      toast.info("Disable ZIVO OF Mode in Monetization to switch modes");
                      return;
                    }
                    setActiveMode(m.id);
                    try { localStorage.setItem("zivo:active_mode", m.id); } catch {}
                    toast.success(`Switched to ${m.label} mode`);
                    setModeOpen(false);
                    if (m.id === "shop") openShopDashboard();
                    else if (m.route && m.id !== "personal") navigate(m.route);
                  }}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.99] ${
                    active ? "border-primary/60 bg-primary/5" : "border-border/50 bg-muted/25 hover:bg-muted/50"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background border border-border/40">
                    <Icon className="h-4 w-4 text-primary" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{m.label}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{m.desc}</span>
                  </span>
                  {active && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}
                </button>
              );
            })}
          </div>

          {workflowMode === "personal" && (
            <div className="mt-5 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal controls</span>
                <button
                  type="button"
                  onClick={() => { setModeOpen(false); navigate("/settings"); }}
                  className="text-[11px] font-semibold text-primary"
                >
                  See all
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Edit profile", icon: Pencil, route: "/account/profile-edit" },
                  { label: "Privacy", icon: Shield, route: "/account/privacy" },
                  { label: "18+ Blur", icon: Eye, route: "/account/privacy#sensitive" },
                  { label: "Notifications", icon: Bell, route: "/account/notifications" },
                  { label: "Wallet", icon: Wallet, route: "/wallet" },
                  { label: "Saved places", icon: MapPin, route: "/account/saved-places" },
                  { label: "Security", icon: Lock, route: "/account/security" },
                  { label: "Language", icon: Globe, route: "/more" },
                  { label: "Activity", icon: BarChart3, route: "/account/activity-log" },
                  { label: "Share profile", icon: Share2, route: "" },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button type="button"
                      key={a.label}
                      onClick={() => {
                        setModeOpen(false);
                        if (a.label === "Share profile") setShareOpen(true);
                        else if (a.route) navigate(a.route);
                      }}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/30 p-3 active:scale-[0.97] transition-transform"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-[11px] font-semibold text-center leading-tight">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {workflowMode === "creator" && (
            <div className="mt-5 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {zivoOFMode ? "ZIVO OF tools" : "Creator tools"}
                </span>
                <button
                  type="button"
                  onClick={() => { setModeOpen(false); navigate("/monetization"); }}
                  className="text-[11px] font-semibold text-primary"
                >
                  See all
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(zivoOFMode
                  ? [
                      { label: "Subscribers", icon: Users, route: "/creator/subscribers" },
                      { label: "Subscription", icon: Crown, route: "/monetization/program/subscription" },
                      { label: "Locked media", icon: Lock, route: "/monetization/program/locked-media" },
                      { label: "Paid DMs", icon: MessageCircle, route: "/monetization/program/paid-dms" },
                      { label: "Tips", icon: Gift, route: "/monetization/program/tips-donations" },
                      { label: "Payouts", icon: DollarSign, route: "/wallet" },
                    ]
                  : [
                      { label: "Subscribers", icon: Users, route: "/creator/subscribers" },
                      { label: "PPV posts", icon: Lock, route: "/monetization" },
                      { label: "Tips", icon: Gift, route: "/creator/tips" },
                      { label: "Mass DM", icon: MessageCircle, route: "/chat" },
                      { label: "Earnings", icon: TrendingUp, route: "/creator-analytics" },
                      { label: "Go live", icon: Video, route: "/live" },
                    ]).map((a) => {
                  const Icon = a.icon;
                  return (
                    <button type="button"
                      key={a.label}
                      onClick={() => { setModeOpen(false); navigate(a.route); }}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/30 p-3 active:scale-[0.97] transition-transform"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-[11px] font-semibold text-center leading-tight">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {workflowMode === "fan" && (
            <div className="mt-5 pt-4 border-t border-border/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">My fan activity</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Subscriptions", icon: Heart, route: "/account/subscriptions" },
                  { label: "Unlocked", icon: Lock, route: "/account/subscriptions" },
                  { label: "Tips sent", icon: Gift, route: "/account/tips" },
                  { label: "DMs", icon: MessageCircle, route: "/chat" },
                  { label: "Wallet", icon: DollarSign, route: "/wallet" },
                  { label: "Discover", icon: Sparkles, route: "/feed?tab=foryou" },
                ].map((a) => {
                  const Icon = a.icon;
                  return (
                    <button type="button"
                      key={a.label}
                      onClick={() => { setModeOpen(false); navigate(a.route); }}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border border-border/40 bg-muted/30 p-3 active:scale-[0.97] transition-transform"
                    >
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="text-[11px] font-semibold text-center leading-tight">{a.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Share Profile bottom sheet */}
      <UsernameShareSheet
        open={shareOpen}
        username={claimedUsername || null}
        profileId={user?.id || null}
        displayName={headerName || undefined}
        onClose={() => setShareOpen(false)}
      />
    </PullToRefresh>
  );
};

export default Profile;
