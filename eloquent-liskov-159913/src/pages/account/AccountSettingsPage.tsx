import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import {
  ArrowLeft, Shield, Globe, UserCheck, Bell, CreditCard, Gift, ChevronRight,
  UserPen, Scale, BarChart3, ShieldCheck, Download, Clock, Search, X,
  Smartphone, Heart, Users, Palette, MapPin, Plane, Star, Tag, Crown, UserPlus,
  FileText, HelpCircle, MessageSquare, AlertTriangle, Send, Info, Sparkles, StarIcon, LogOut, Database,
  Briefcase, Tv, Video, Mic, DollarSign, ClipboardList, Stethoscope, Dumbbell, Activity,
  Rocket, Hash, BookOpen, PenTool, KeyRound, Languages, Eye, Lock, Fingerprint,
  Cookie, Wallet, Receipt, ShoppingBag, Bookmark, Target, Trophy,
  Sun, Moon, BellOff, Zap, Camera, Check, Upload, RefreshCw, ExternalLink, Share2, Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useUsername } from "@/hooks/useUsername";
import { useLoyaltyPoints } from "@/hooks/useLoyaltyPoints";
import { useAccessibilityPrefs } from "@/hooks/useAccessibilityPrefs";
import { useNotificationPreferences, useUpdateNotificationPreferences } from "@/hooks/useNotificationPreferences";
import { useNotifications } from "@/hooks/useNotifications";
import { useRecentSettings } from "@/hooks/useRecentSettings";
import { usePinnedSettings } from "@/hooks/usePinnedSettings";
import { useLinkedDevices } from "@/hooks/useLinkedDevices";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import ProfileShareDialog from "@/components/account/ProfileShareDialog";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import packageJson from "../../../package.json";

type BadgeVariant = "ok" | "warn" | "info" | "danger";

interface SettingBadge {
  text: string;
  variant: BadgeVariant;
}

interface SettingItem {
  icon: typeof Shield;
  label: string;
  description: string;
  href: string;
  color: string;
  iconColor: string;
}

const BADGE_CLASSES: Record<BadgeVariant, string> = {
  ok: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  warn: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  info: "bg-sky-500/15 text-sky-600 border-sky-500/20",
  danger: "bg-rose-500/15 text-rose-600 border-rose-500/20",
};

interface SettingsGroup {
  title: string;
  items: SettingItem[];
}

const settingsGroups: SettingsGroup[] = [
  {
    title: "Account",
    items: [
      { icon: UserPen, label: "Profile Information", description: "Name, email & phone", href: "/account/profile-edit", color: "bg-emerald-500/15", iconColor: "text-emerald-500" },
      { icon: Shield, label: "Security", description: "Password & 2FA", href: "/account/security", color: "bg-teal-500/15", iconColor: "text-teal-500" },
      { icon: KeyRound, label: "Passcode", description: "App lock code", href: "/chat/settings/passcode", color: "bg-teal-500/15", iconColor: "text-teal-500" },
      { icon: Fingerprint, label: "Biometrics", description: "Face ID & fingerprint", href: "/account/security", color: "bg-cyan-500/15", iconColor: "text-cyan-500" },
      { icon: Smartphone, label: "Linked Devices", description: "Sign in another device with QR", href: "/account/linked-devices", color: "bg-cyan-500/15", iconColor: "text-cyan-500" },
      { icon: UserCheck, label: "Account Status", description: "Manage your account", href: "/profile/delete-account", color: "bg-orange-500/15", iconColor: "text-orange-500" },
      { icon: ShieldCheck, label: "Verification", description: "Request verified badge", href: "/account/verification", color: "bg-blue-500/15", iconColor: "text-blue-500" },
      { icon: MapPin, label: "Saved Addresses", description: "Manage saved places & addresses", href: "/account/addresses", color: "bg-lime-500/15", iconColor: "text-lime-500" },
      { icon: Plane, label: "Traveler Profiles", description: "Manage travel profiles & preferences", href: "/account/travelers", color: "bg-violet-500/15", iconColor: "text-violet-500" },
      { icon: Hash, label: "Username", description: "Change your @handle", href: "/account/username", color: "bg-blue-500/15", iconColor: "text-blue-500" },
    ],
  },
  {
    title: "Privacy & Notifications",
    items: [
      { icon: Shield, label: "Privacy & Safety", description: "Blocks, mutes & visibility", href: "/account/privacy", color: "bg-rose-500/15", iconColor: "text-rose-500" },
      { icon: Database, label: "Data Rights", description: "GDPR/CCPA — access, delete, consents", href: "/account/data-rights", color: "bg-zinc-500/15", iconColor: "text-zinc-500" },
      { icon: Bell, label: "Inbox", description: "Past notifications & alerts", href: "/notifications", color: "bg-sky-500/15", iconColor: "text-sky-500" },
      { icon: Bell, label: "Notification Settings", description: "Preferences & channels", href: "/account/notifications", color: "bg-sky-500/15", iconColor: "text-sky-500" },
      { icon: Globe, label: "Preferences", description: "Language & settings", href: "/account/preferences", color: "bg-indigo-500/15", iconColor: "text-indigo-500" },
      { icon: Eye, label: "Read Receipts", description: "Show when you read messages", href: "/account/privacy#receipts", color: "bg-rose-500/15", iconColor: "text-rose-500" },
      { icon: Lock, label: "Two-Step Verification", description: "Extra login security", href: "/chat/settings/two-step", color: "bg-emerald-500/15", iconColor: "text-emerald-500" },
      { icon: Bell, label: "Login Alerts", description: "New device notifications", href: "/chat/settings/login-alerts", color: "bg-sky-500/15", iconColor: "text-sky-500" },
      { icon: Cookie, label: "Cookie Settings", description: "Tracking preferences", href: "/account/data-rights#cookies", color: "bg-amber-500/15", iconColor: "text-amber-500" },
      { icon: Languages, label: "Auto-Translate", description: "Translate messages & posts", href: "/account/preferences#translation", color: "bg-teal-500/15", iconColor: "text-teal-500" },
    ],
  },
  {
    title: "Payments & Rewards",
    items: [
      { icon: CreditCard, label: "Payment Methods", description: "Manage cards & wallets", href: "/account/wallet", color: "bg-purple-500/15", iconColor: "text-purple-500" },
      { icon: Gift, label: "Gift Cards", description: "Buy, send, or redeem", href: "/account/gift-cards", color: "bg-pink-500/15", iconColor: "text-pink-500" },
      { icon: Heart, label: "Favorites", description: "Saved items & places", href: "/account/favorites", color: "bg-red-500/15", iconColor: "text-red-500" },
      { icon: Star, label: "Loyalty Rewards", description: "Points, rewards & tier status", href: "/account/loyalty", color: "bg-yellow-500/15", iconColor: "text-yellow-500" },
      { icon: Tag, label: "Promos & Offers", description: "Promo codes & special deals", href: "/account/promos", color: "bg-fuchsia-500/15", iconColor: "text-fuchsia-500" },
      { icon: Crown, label: "Membership", description: "ZIVO+ plans & benefits", href: "/account/membership", color: "bg-amber-600/15", iconColor: "text-amber-600" },
      { icon: UserPlus, label: "Referrals", description: "Invite friends & earn rewards", href: "/account/referrals", color: "bg-teal-600/15", iconColor: "text-teal-600" },
      { icon: FileText, label: "Invoices", description: "View & download business invoices", href: "/account/invoices", color: "bg-stone-500/15", iconColor: "text-stone-500" },
    ],
  },
  {
    title: "Creator & Monetization",
    items: [
      { icon: Rocket, label: "Creator Dashboard", description: "Earnings, stats & analytics", href: "/creator-dashboard", color: "bg-violet-500/15", iconColor: "text-violet-500" },
      { icon: DollarSign, label: "Monetization", description: "Revenue programs & payouts", href: "/monetization", color: "bg-emerald-500/15", iconColor: "text-emerald-500" },
      { icon: Activity, label: "Live Earnings", description: "Real-time tips & gifts", href: "/creator/live-earnings", color: "bg-pink-500/15", iconColor: "text-pink-500" },
      { icon: Hash, label: "My Channels", description: "Manage your channels", href: "/channels", color: "bg-blue-500/15", iconColor: "text-blue-500" },
      { icon: BarChart3, label: "Content Analytics", description: "Performance insights", href: "/content-analytics", color: "bg-cyan-500/15", iconColor: "text-cyan-500" },
      { icon: PenTool, label: "Digital Products", description: "Sell courses & files", href: "/digital-products", color: "bg-fuchsia-500/15", iconColor: "text-fuchsia-500" },
      { icon: BookOpen, label: "Creator Academy", description: "Guides & tutorials", href: "/monetization/articles", color: "bg-orange-500/15", iconColor: "text-orange-500" },
    ],
  },
  {
    title: "Workplace & Jobs",
    items: [
      { icon: Briefcase, label: "Workplace", description: "Clock in, jobs & schedule", href: "/personal-dashboard", color: "bg-blue-500/15", iconColor: "text-blue-500" },
      { icon: Target, label: "Apply for Jobs", description: "Browse open positions", href: "/personal/apply-job", color: "bg-sky-500/15", iconColor: "text-sky-500" },
      { icon: ClipboardList, label: "My Applications", description: "Track application status", href: "/personal/my-applications", color: "bg-amber-500/15", iconColor: "text-amber-500" },
      { icon: FileText, label: "Resume / CV", description: "Build & manage CV", href: "/personal/create-cv", color: "bg-emerald-500/15", iconColor: "text-emerald-500" },
      { icon: UserPlus, label: "Find Employees", description: "Hire talent", href: "/personal/find-employee", color: "bg-violet-500/15", iconColor: "text-violet-500" },
      { icon: Bell, label: "Job Alerts", description: "Match notifications", href: "/personal/notifications", color: "bg-yellow-500/15", iconColor: "text-yellow-500" },
      { icon: Wallet, label: "Pay Stubs", description: "Payment history", href: "/personal/pay-stubs", color: "bg-green-500/15", iconColor: "text-green-500" },
    ],
  },
  {
    title: "Live & Streaming",
    items: [
      { icon: Tv, label: "Live Streams", description: "Watch live broadcasts", href: "/live", color: "bg-rose-500/15", iconColor: "text-rose-500" },
      { icon: Video, label: "Go Live", description: "Start broadcasting", href: "/go-live", color: "bg-red-500/15", iconColor: "text-red-500" },
      { icon: Mic, label: "Audio Spaces", description: "Voice rooms", href: "/spaces", color: "bg-purple-500/15", iconColor: "text-purple-500" },
      { icon: Hash, label: "Channels Directory", description: "Discover channels", href: "/channels", color: "bg-blue-500/15", iconColor: "text-blue-500" },
      { icon: Sparkles, label: "AR Filters", description: "Effects & filters", href: "/filters", color: "bg-fuchsia-500/15", iconColor: "text-fuchsia-500" },
      { icon: Bell, label: "Live Notifications", description: "Alerts when followed creators go live", href: "/account/notifications#live", color: "bg-amber-500/15", iconColor: "text-amber-500" },
    ],
  },
  {
    title: "Health & Wellness",
    items: [
      { icon: Activity, label: "Activity Tracker", description: "Daily stats & steps", href: "/wellness/activity", color: "bg-emerald-500/15", iconColor: "text-emerald-500" },
      { icon: Dumbbell, label: "Workouts", description: "Plans & guides", href: "/wellness/workouts", color: "bg-red-500/15", iconColor: "text-red-500" },
      { icon: Heart, label: "Health Vitals", description: "Heart rate, BP, sleep", href: "/wellness/vitals", color: "bg-pink-500/15", iconColor: "text-pink-500" },
      { icon: Stethoscope, label: "Telehealth", description: "Talk to a doctor", href: "/wellness/telehealth", color: "bg-blue-500/15", iconColor: "text-blue-500" },
      { icon: Trophy, label: "Wellness Goals", description: "Milestones & rewards", href: "/wellness/goals", color: "bg-yellow-500/15", iconColor: "text-yellow-500" },
      { icon: Bell, label: "Reminders", description: "Daily wellness reminders", href: "/account/notifications#wellness", color: "bg-sky-500/15", iconColor: "text-sky-500" },
    ],
  },
  {
    title: "Shopping & Orders",
    items: [
      { icon: ShoppingBag, label: "My Orders", description: "Order history", href: "/grocery/orders", color: "bg-amber-500/15", iconColor: "text-amber-500" },
      { icon: Receipt, label: "Receipts", description: "Past payments", href: "/account/invoices", color: "bg-stone-500/15", iconColor: "text-stone-500" },
      { icon: Bookmark, label: "Saved Items", description: "Wishlist", href: "/saved", color: "bg-violet-500/15", iconColor: "text-violet-500" },
      { icon: ClipboardList, label: "Subscriptions", description: "Plans & renewals", href: "/account/membership", color: "bg-purple-500/15", iconColor: "text-purple-500" },
    ],
  },
  {
    title: "Data & Activity",
    items: [
      { icon: BarChart3, label: "Analytics", description: "Profile stats & insights", href: "/account/analytics", color: "bg-cyan-500/15", iconColor: "text-cyan-500" },
      { icon: Download, label: "Export Data", description: "Download your data", href: "/account/export", color: "bg-green-500/15", iconColor: "text-green-500" },
      { icon: Clock, label: "Activity Log", description: "Login & action history", href: "/account/activity-log", color: "bg-amber-500/15", iconColor: "text-amber-500" },
      { icon: Database, label: "Storage", description: "Manage cache & files", href: "/chat/settings/storage", color: "bg-indigo-500/15", iconColor: "text-indigo-500" },
      { icon: Scale, label: "Legal & Policies", description: "Terms, privacy & policies", href: "/account/legal", color: "bg-slate-500/15", iconColor: "text-slate-500" },
    ],
  },
  {
    title: "Help & Support",
    items: [
      { icon: HelpCircle, label: "Help Center", description: "Browse articles & FAQs", href: "/help-center", color: "bg-blue-400/15", iconColor: "text-blue-400" },
      { icon: MessageSquare, label: "Contact Support", description: "Get help from our team", href: "/support", color: "bg-emerald-400/15", iconColor: "text-emerald-400" },
      { icon: AlertTriangle, label: "Report a Problem", description: "Tell us about a bug or issue", href: "/feedback?type=bug", color: "bg-orange-400/15", iconColor: "text-orange-400" },
      { icon: Send, label: "Send Feedback", description: "Share ideas & suggestions", href: "/feedback", color: "bg-violet-400/15", iconColor: "text-violet-400" },
    ],
  },
  {
    title: "About",
    items: [
      { icon: Info, label: "About ZIVO", description: "Our mission & story", href: "/about", color: "bg-slate-400/15", iconColor: "text-slate-400" },
      { icon: Sparkles, label: "What's New", description: "Latest features & updates", href: "/about#changelog", color: "bg-pink-400/15", iconColor: "text-pink-400" },
      { icon: StarIcon, label: "Rate the App", description: "Leave a rating in the store", href: "/about#rate", color: "bg-yellow-400/15", iconColor: "text-yellow-400" },
    ],
  },
];

export default function AccountSettingsPage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isOFMode: zivoOFMode, setOFMode: setZivoOFMode } = useZivoOFMode();
  const { data: profile } = useUserProfile();
  const { username } = useUsername();
  const { points } = useLoyaltyPoints();
  const { prefs: a11yPrefs, update: updateA11yPref } = useAccessibilityPrefs();
  const { data: notifPrefs } = useNotificationPreferences();
  const updateNotifPrefs = useUpdateNotificationPreferences();
  const { unreadCount: notifUnread } = useNotifications(50);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { items: recentItems, record: recordRecent, clear: clearRecents } = useRecentSettings();
  const { isPinned, toggle: togglePin } = usePinnedSettings();
  const { devices } = useLinkedDevices();
  const [search, setSearch] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  // Keyboard shortcuts: Cmd/Ctrl+K focuses search, Esc clears
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [shortcutLabel] = useState<string>(() => {
    if (typeof navigator === "undefined") return "Ctrl K";
    return /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘ K" : "Ctrl K";
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === "Escape" && document.activeElement === searchInputRef.current) {
        if (search) {
          e.preventDefault();
          setSearch("");
        } else {
          searchInputRef.current?.blur();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [search]);

  const memberSince = useMemo(() => {
    const created = (user as any)?.created_at as string | undefined;
    if (!created) return null;
    const d = new Date(created);
    return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
  }, [user]);

  const tierLabel = useMemo(() => {
    const t = points?.tier;
    if (!t || t === "standard") return null;
    return t.charAt(0).toUpperCase() + t.slice(1);
  }, [points?.tier]);

  const isDark = (theme === "system" ? resolvedTheme : theme) === "dark";
  const notificationsMuted = notifPrefs?.inAppEnabled === false;

  // ── Account Setup checklist ──────────────────────────
  const SETUP_DISMISS_KEY = "zivo_setup_dismissed";
  const [setupDismissed, setSetupDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(SETUP_DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Live security/profile signals from Supabase
  const { data: setupSignals } = useQuery({
    queryKey: ["account-setup-signals", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const [{ data: profileRow }, { data: mfa }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("phone_e164, phone_verified")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase.auth.mfa.listFactors(),
      ]);
      const totp2faOn = (mfa?.totp ?? []).some((f: any) => f.status === "verified");
      return {
        phoneVerified: !!profileRow?.phone_verified,
        twoFactorOn: totp2faOn,
        emailConfirmed: !!user?.email_confirmed_at,
      };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const setupSteps = useMemo(() => {
    return [
      {
        id: "avatar",
        label: "Add a profile photo",
        icon: Camera,
        done: !!profile?.avatar_url,
        href: "/account/profile-edit",
      },
      {
        id: "name",
        label: "Add your name",
        icon: UserPen,
        done: !!profile?.full_name?.trim(),
        href: "/account/profile-edit",
      },
      {
        id: "username",
        label: "Claim a @username",
        icon: Hash,
        done: !!username,
        href: "/account/profile-edit",
      },
      {
        id: "phone",
        label: "Verify your phone",
        icon: Smartphone,
        done: !!setupSignals?.phoneVerified,
        href: "/account/security",
      },
      {
        id: "twofa",
        label: "Enable two-factor auth",
        icon: ShieldCheck,
        done: !!setupSignals?.twoFactorOn,
        href: "/account/security",
      },
      {
        id: "notifications",
        label: "Turn on push notifications",
        icon: Bell,
        done: notifPrefs?.inAppEnabled === true,
        href: "/account/notifications",
      },
    ];
  }, [profile?.avatar_url, profile?.full_name, username, setupSignals, notifPrefs?.inAppEnabled]);

  // ── Security snapshot (last sign-in, sessions, security events) ──
  const { data: securitySummary } = useQuery({
    queryKey: ["security-summary", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await (supabase as any).rpc("get_user_security_summary", { p_user_id: user.id });
      if (error) return null;
      // RPC returns an array of one row in PostgREST
      return (Array.isArray(data) ? data[0] : data) as {
        active_sessions_count: number;
        blocked_events: number;
        failed_logins: number;
        last_login: string | null;
        successful_logins: number;
        total_events: number;
      } | null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const formatRelative = (iso: string | null) => {
    if (!iso) return "—";
    const ms = Date.now() - new Date(iso).getTime();
    if (ms < 60_000) return "just now";
    const mins = Math.floor(ms / 60_000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  // Dynamic per-item status badges keyed by href
  const itemBadges: Record<string, SettingBadge> = useMemo(() => {
    const map: Record<string, SettingBadge> = {};
    if (setupSignals?.twoFactorOn) {
      map["/account/security"] = { text: "2FA on", variant: "ok" };
    } else if (user) {
      map["/account/security"] = { text: "2FA off", variant: "warn" };
    }
    if (profile?.is_verified) {
      map["/account/verification"] = { text: "Verified", variant: "ok" };
    }
    if (devices && devices.length > 0) {
      map["/account/linked-devices"] = { text: `${devices.length} device${devices.length === 1 ? "" : "s"}`, variant: "info" };
    }
    if (securitySummary?.failed_logins && securitySummary.failed_logins > 0) {
      // Promote the existing 2FA badge — failed logins is more urgent
      map["/account/security"] = { text: `${securitySummary.failed_logins} failed login${securitySummary.failed_logins === 1 ? "" : "s"}`, variant: "danger" };
    }
    if (notifPrefs?.inAppEnabled === false) {
      map["/account/notifications"] = { text: "Muted", variant: "warn" };
    }
    if (notifUnread > 0) {
      map["/notifications"] = { text: `${notifUnread} new`, variant: "info" };
    }
    if (setupSignals && !setupSignals.phoneVerified) {
      map["/account/profile-edit"] = { text: "Verify phone", variant: "warn" };
    }
    if (points?.points_balance && points.points_balance > 0) {
      map["/account/loyalty"] = { text: `${points.points_balance.toLocaleString()} pts`, variant: "info" };
    }
    return map;
  }, [setupSignals, user, profile?.is_verified, devices, notifPrefs?.inAppEnabled, notifUnread, points?.points_balance, securitySummary?.failed_logins]);

  const setupDone = setupSteps.filter((s) => s.done).length;
  const setupTotal = setupSteps.length;
  const setupPct = Math.round((setupDone / setupTotal) * 100);
  const setupComplete = setupDone === setupTotal;
  const showSetup = !setupDismissed && !setupComplete && !!user;

  const dismissSetup = () => {
    try {
      localStorage.setItem(SETUP_DISMISS_KEY, "true");
    } catch {
      // ignore
    }
    setSetupDismissed(true);
  };

  // ── Profile share / preview / copy ID ─────────────
  const profileUrl = useMemo(() => {
    if (!user?.id || typeof window === "undefined") return "";
    const suffix = zivoOFMode ? "?from=account&as=visitor" : "?from=account";
    return `${window.location.origin}/user/${user.id}${suffix}`;
  }, [user?.id, zivoOFMode]);

  const handlePreviewProfile = () => {
    if (!profileUrl) return;
    window.open(profileUrl, "_blank", "noopener,noreferrer");
  };

  const visibleSettingsGroups = useMemo(() => {
    if (!zivoOFMode) return settingsGroups;
    const ofTitles = new Set([
      "Account",
      "Creator & Monetization",
      "Payments & Rewards",
      "Data & Activity",
    ]);
    return settingsGroups.filter((group) => ofTitles.has(group.title));
  }, [zivoOFMode]);

  const visibleItems = useMemo(() => visibleSettingsGroups.flatMap((g) => g.items), [visibleSettingsGroups]);

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const handleShareProfile = () => setShareDialogOpen(true);

  const handleCopyId = async () => {
    if (!user?.id) return;
    try {
      await navigator.clipboard.writeText(user.id);
      toast.success("ZIVO ID copied");
    } catch {
      toast.error("Could not copy ID");
    }
  };

  // ── Connected Accounts (OAuth providers) ──────────
  const connectedProviders = useMemo(() => {
    const identities = (user as any)?.identities ?? [];
    const providers = new Set<string>();
    for (const ident of identities) {
      if (ident?.provider) providers.add(String(ident.provider).toLowerCase());
    }
    // Email is implicit if user has an email and email confirmation
    if (user?.email && providers.size === 0) providers.add("email");
    return providers;
  }, [user]);

  const PROVIDER_META: Record<string, { name: string; bg: string; iconColor: string; letter: string }> = {
    google: { name: "Google", bg: "bg-blue-500/10", iconColor: "text-blue-500", letter: "G" },
    apple: { name: "Apple", bg: "bg-foreground/10", iconColor: "text-foreground", letter: "" },
    facebook: { name: "Facebook", bg: "bg-blue-600/10", iconColor: "text-blue-600", letter: "f" },
    azure: { name: "Microsoft", bg: "bg-cyan-500/10", iconColor: "text-cyan-500", letter: "M" },
    github: { name: "GitHub", bg: "bg-foreground/10", iconColor: "text-foreground", letter: "" },
    twitter: { name: "X / Twitter", bg: "bg-foreground/10", iconColor: "text-foreground", letter: "X" },
    email: { name: "Email & Password", bg: "bg-emerald-500/10", iconColor: "text-emerald-500", letter: "@" },
    phone: { name: "Phone", bg: "bg-violet-500/10", iconColor: "text-violet-500", letter: "" },
  };

  const allProviders: { id: string; connected: boolean }[] = [
    { id: "email", connected: connectedProviders.has("email") },
    { id: "google", connected: connectedProviders.has("google") },
    { id: "apple", connected: connectedProviders.has("apple") },
    { id: "facebook", connected: connectedProviders.has("facebook") },
  ];

  const handleLinkProvider = async (provider: string) => {
    if (provider === "email") {
      navigate("/account/security");
      return;
    }
    try {
      const { data, error } = await (supabase.auth as any).linkIdentity({
        provider,
        options: { redirectTo: `${window.location.origin}/account/settings` },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Could not link account");
    }
  };

  const performUnlinkProvider = async (provider: string) => {
    try {
      const identities = (user as any)?.identities ?? [];
      const target = identities.find((i: any) => String(i.provider).toLowerCase() === provider);
      if (!target) {
        toast.error("Identity not found");
        return;
      }
      const { error } = await (supabase.auth as any).unlinkIdentity(target);
      if (error) throw error;
      toast.success(`Disconnected ${PROVIDER_META[provider]?.name ?? provider}`);
      // Refresh after a brief delay
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast.error(e?.message || "Could not disconnect");
    }
  };

  const handleUnlinkProvider = (provider: string) => {
    const name = PROVIDER_META[provider]?.name ?? provider;
    toast(`Disconnect ${name}?`, {
      description: "You won't be able to sign in with it anymore.",
      action: { label: "Disconnect", onClick: () => { void performUnlinkProvider(provider); } },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  // ── System Diagnostics (for support / bug reports) ──
  const [diagOpen, setDiagOpen] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  const diagnostics = useMemo(() => {
    if (typeof window === "undefined") return null;
    let lsBytes = 0;
    let lsKeys = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        const v = localStorage.getItem(k) ?? "";
        lsBytes += k.length + v.length;
        lsKeys++;
      }
    } catch {
      // ignore
    }
    const ua = navigator.userAgent || "";
    let browser = "Unknown";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
    let os = "Unknown";
    if (/Windows/.test(ua)) os = "Windows";
    else if (/Mac/.test(ua) && !/iPhone|iPad/.test(ua)) os = "macOS";
    else if (/iPhone|iPad/.test(ua)) os = "iOS";
    else if (/Android/.test(ua)) os = "Android";
    else if (/Linux/.test(ua)) os = "Linux";

    return {
      version: packageJson.version,
      browser,
      os,
      online: isOnline,
      screen: `${window.screen?.width}×${window.screen?.height}`,
      viewport: `${window.innerWidth}×${window.innerHeight}`,
      pushSupported: "PushManager" in window,
      serviceWorkerSupported: "serviceWorker" in navigator,
      cookies: navigator.cookieEnabled,
      lang: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      lsKeys,
      lsKB: (lsBytes / 1024).toFixed(1),
    };
  }, [isOnline]);

  const copyDiagnostics = async () => {
    if (!diagnostics) return;
    const lines = [
      `App version: ${diagnostics.version}`,
      `Browser: ${diagnostics.browser}`,
      `OS: ${diagnostics.os}`,
      `Online: ${diagnostics.online}`,
      `Screen: ${diagnostics.screen}`,
      `Viewport: ${diagnostics.viewport}`,
      `Push supported: ${diagnostics.pushSupported}`,
      `Service worker: ${diagnostics.serviceWorkerSupported}`,
      `Cookies: ${diagnostics.cookies}`,
      `Language: ${diagnostics.lang}`,
      `Timezone: ${diagnostics.timezone}`,
      `localStorage: ${diagnostics.lsKeys} keys, ${diagnostics.lsKB} KB`,
      `User: ${user?.id ?? "—"}`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      toast.success("Diagnostics copied to clipboard");
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access");
    }
  };

  // ── Backup & Restore for client preferences ──────────
  const PREF_KEYS = [
    "zivo_unit_preferences",
    "zivo_accessibility_prefs",
    "zivo_translation_prefs",
    "zivo_cookie_consent",
    "zivo_notification_prefs",
    "zivo_recent_settings",
  ];

  const handleExportPrefs = () => {
    try {
      const payload: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        appVersion: packageJson.version,
        prefs: {} as Record<string, any>,
      };
      for (const key of PREF_KEYS) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            payload.prefs[key] = JSON.parse(raw);
          } catch {
            payload.prefs[key] = raw;
          }
        }
      }
      const json = JSON.stringify(payload, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zivo-settings-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Settings exported");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };

  const importInputRef = useRef<HTMLInputElement>(null);
  const handleImportPrefsFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed?.prefs || typeof parsed.prefs !== "object") {
        throw new Error("Invalid backup file");
      }
      let imported = 0;
      for (const key of PREF_KEYS) {
        if (parsed.prefs[key] !== undefined) {
          localStorage.setItem(key, JSON.stringify(parsed.prefs[key]));
          imported++;
        }
      }
      toast.success(`Imported ${imported} preference${imported === 1 ? "" : "s"}. Reloading…`);
      setTimeout(() => window.location.reload(), 800);
    } catch (e: any) {
      toast.error(e?.message || "Import failed — invalid file");
    }
  };

  const handleResetPrefs = () => {
    toast("Reset all local preferences?", {
      description: "Clears theme, units, accessibility, translation, cookies, notification toggles, and recent visits on this device.",
      action: {
        label: "Reset",
        onClick: () => {
          for (const key of PREF_KEYS) {
            try { localStorage.removeItem(key); } catch { /* ignore */ }
          }
          toast.success("Preferences reset. Reloading…");
          setTimeout(() => window.location.reload(), 800);
        },
      },
      cancel: { label: "Cancel", onClick: () => {} },
    });
  };

  // Followers / following counts
  const { data: socialStats } = useQuery({
    queryKey: ["account-settings-social", user?.id],
    queryFn: async () => {
      if (!user) return { followers: 0, following: 0 };
      const [{ count: followers }, { count: following }] = await Promise.all([
        (supabase as any).from("follows").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        (supabase as any).from("follows").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);
      return { followers: followers || 0, following: following || 0 };
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return n.toLocaleString();
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return visibleItems.filter(
      i => i.label.toLowerCase().includes(q) || i.description.toLowerCase().includes(q)
    );
  }, [search, visibleItems]);

  // Items the user has pinned, in pin order
  const pinnedItems = useMemo(() => {
    return visibleItems.filter((i) => isPinned(i.href));
  }, [isPinned, visibleItems]);

  const initials = useMemo(() => {
    if (profile?.full_name) return profile.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    if (user?.email) return user.email[0].toUpperCase();
    return "U";
  }, [profile?.full_name, user?.email]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      toast.success("Signed out");
      navigate("/login");
    } catch (e: any) {
      toast.error(e?.message || "Failed to sign out");
      setSigningOut(false);
    }
  };

  const SEEN_CHANGELOG_KEY = "zivo_seen_changelog_version";
  const [seenChangelogVersion, setSeenChangelogVersion] = useState<string | null>(() => {
    if (typeof window === "undefined") return packageJson.version;
    try {
      return localStorage.getItem(SEEN_CHANGELOG_KEY);
    } catch {
      return packageJson.version;
    }
  });
  const showWhatsNew = seenChangelogVersion !== packageJson.version;
  const dismissWhatsNew = () => {
    try {
      localStorage.setItem(SEEN_CHANGELOG_KEY, packageJson.version);
    } catch {
      // ignore
    }
    setSeenChangelogVersion(packageJson.version);
  };
  const openWhatsNew = () => {
    dismissWhatsNew();
    navigate("/about#changelog");
  };

  const renderItem = (item: SettingItem, index: number) => {
    const badge = itemBadges[item.href];
    const pinned = isPinned(item.href);
    return (
      <motion.div
        key={item.label}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.2 }}
        className="group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all"
      >
        <button
          type="button"
          onClick={() => {
            recordRecent(item.href, item.label);
            navigate(item.href);
          }}
          className="flex items-center gap-3 flex-1 min-w-0 text-left active:scale-[0.99] transition-transform"
        >
          <div className={`h-9 w-9 min-w-9 rounded-full ${item.color} flex items-center justify-center`}>
            <item.icon className={`h-4 w-4 ${item.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground">{item.label}</p>
            <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
          </div>
        </button>
        {badge && (
          <span className={`shrink-0 inline-flex items-center text-[10px] font-semibold rounded-full border px-1.5 py-0.5 ${BADGE_CLASSES[badge.variant]}`}>
            {badge.text}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            togglePin(item.href);
            toast.success(pinned ? `Unpinned "${item.label}"` : `Pinned "${item.label}"`);
          }}
          aria-label={pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
          className={`shrink-0 p-1.5 rounded-md transition-all ${
            pinned
              ? "text-amber-500 opacity-100"
              : "text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-amber-500 hover:bg-amber-500/10"
          }`}
        >
          <Star className={`h-3.5 w-3.5 ${pinned ? "fill-amber-500" : ""}`} />
        </button>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Settings – ZIVO" description="Manage your account settings, privacy preferences, payment methods, loyalty rewards, and notification channels." />
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" aria-label="Back" className="h-10 w-10 rounded-full" onClick={() => navigate("/more")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </div>

      {/* Body — capped to 2xl on tablet/desktop, full width on mobile */}
      <div className="mx-auto w-full max-w-2xl">

      {/* User profile header */}
      {user && (
        <motion.button
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => navigate("/account/profile-edit")}
          className="w-[calc(100%-1.5rem)] mx-3 mt-3 flex items-center gap-3 px-3 py-3 rounded-2xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.99]"
        >
          <Avatar className="h-12 w-12 ring-2 ring-primary/20">
            <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || "Profile"} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-base font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.full_name || "Add your name"}
            </p>
            {username && (
              <p className="text-[11px] text-primary font-medium truncate">@{username}</p>
            )}
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            {(memberSince || tierLabel) && (
              <div className="flex items-center gap-1.5 mt-1.5">
                {tierLabel && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                    <Crown className="h-2.5 w-2.5" />
                    {tierLabel}
                  </span>
                )}
                {memberSince && (
                  <span className="inline-flex items-center text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                    Since {memberSince}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] text-muted-foreground">View profile</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
          </div>
        </motion.button>
      )}

      {/* Share toolbar */}
      {user && (
        <div className="mt-2 grid grid-cols-3 gap-2 px-3">
          <button type="button"
            onClick={handlePreviewProfile}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold">Preview</span>
          </button>
          <button type="button"
            onClick={handleShareProfile}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
          >
            <Share2 className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold">Share</span>
          </button>
          <button type="button"
            onClick={handleCopyId}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
          >
            <Copy className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[11px] font-semibold">Copy ID</span>
          </button>
        </div>
      )}

      {/* Quick stats bar */}
      {user && (
        <div className="mt-2 grid grid-cols-3 gap-2 px-3">
          <button type="button"
            onClick={() => navigate("/profile?tab=followers")}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
          >
            <span className="text-sm font-bold text-foreground tabular-nums">{formatCount(socialStats?.followers ?? 0)}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Followers</span>
          </button>
          <button type="button"
            onClick={() => navigate("/profile?tab=following")}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
          >
            <span className="text-sm font-bold text-foreground tabular-nums">{formatCount(socialStats?.following ?? 0)}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Following</span>
          </button>
          <button type="button"
            onClick={() => navigate("/account/loyalty")}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-card border border-border/40 hover:bg-accent/50 transition-all active:scale-[0.97]"
          >
            <span className="text-sm font-bold text-primary tabular-nums">{formatCount(points?.points_balance ?? 0)}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Points</span>
          </button>
        </div>
      )}

      {/* What's New callout */}
      {showWhatsNew && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="mt-3 px-3"
        >
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="relative shrink-0 h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
            </div>
            <button type="button" onClick={openWhatsNew} className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                What's new in v{packageJson.version}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                Accessibility, auto-translate, cookies & more
              </p>
            </button>
            <button type="button"
              onClick={dismissWhatsNew}
              aria-label="Dismiss"
              className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Quick toggles */}
      {user && (
        <div className="mt-3 grid grid-cols-3 gap-2 px-3">
          <button type="button"
            onClick={() => {
              const next = isDark ? "light" : "dark";
              setTheme(next);
              toast.success(`${next === "dark" ? "Dark" : "Light"} mode`);
            }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.97] ${
              isDark ? "bg-primary/10 border-primary/30 text-primary" : "bg-card border-border/40 hover:bg-accent/50"
            }`}
          >
            {isDark ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0 text-amber-500" />}
            <div className="text-left min-w-0 flex-1">
              <p className="text-[11px] font-semibold leading-tight truncate">{isDark ? "Dark" : "Light"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Theme</p>
            </div>
          </button>
          <button type="button"
            onClick={() => {
              const enable = notificationsMuted;
              updateNotifPrefs.mutate({ inAppEnabled: enable });
              toast.success(enable ? "Notifications on" : "Notifications muted");
            }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.97] ${
              notificationsMuted ? "bg-rose-500/10 border-rose-500/30 text-rose-500" : "bg-card border-border/40 hover:bg-accent/50"
            }`}
          >
            {notificationsMuted ? <BellOff className="h-4 w-4 shrink-0" /> : <Bell className="h-4 w-4 shrink-0 text-foreground" />}
            <div className="text-left min-w-0 flex-1">
              <p className="text-[11px] font-semibold leading-tight truncate">{notificationsMuted ? "Muted" : "On"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Notifications</p>
            </div>
          </button>
          <button type="button"
            onClick={() => {
              const next = !a11yPrefs.reducedMotion;
              updateA11yPref("reducedMotion", next);
              toast.success(next ? "Motion reduced" : "Motion restored");
            }}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all active:scale-[0.97] ${
              a11yPrefs.reducedMotion ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-card border-border/40 hover:bg-accent/50"
            }`}
          >
            <Zap className="h-4 w-4 shrink-0" />
            <div className="text-left min-w-0 flex-1">
              <p className="text-[11px] font-semibold leading-tight truncate">{a11yPrefs.reducedMotion ? "Reduced" : "Normal"}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">Motion</p>
            </div>
          </button>
        </div>
      )}

      {/* ZIVO OF workflow quick panel */}
      {user && zivoOFMode && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.12 }}
          className="mt-3 px-3"
        >
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3.5">
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-foreground">ZIVO OF workflow</p>
                <p className="text-[11px] text-muted-foreground">Account and creator shortcuts optimized for subscription workflow.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setZivoOFMode(false);
                  toast.success("ZIVO OF Mode turned off");
                }}
                className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/25 hover:bg-rose-500/20 transition-colors"
              >
                OF mode on · Turn off
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Public preview", href: "/profile" },
                { label: "Monetization", href: "/monetization" },
                { label: "Subscribers", href: "/creator/subscribers" },
                { label: "Subscriptions", href: "/account/subscriptions" },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="text-left rounded-xl border border-border/40 bg-card/70 px-3 py-2 hover:bg-accent/50 transition-colors"
                >
                  <p className="text-[12px] font-semibold text-foreground leading-tight">{item.label}</p>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Account Setup checklist */}
      {showSetup && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className="mt-3 px-3"
        >
          <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
            <div className="p-4 border-b border-border/30">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-foreground">Finish setting up</p>
                  <p className="text-[11px] text-muted-foreground">
                    {setupDone} of {setupTotal} done · {setupPct}%
                  </p>
                </div>
                <button type="button"
                  onClick={dismissSetup}
                  aria-label="Dismiss setup checklist"
                  className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${setupPct}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                />
              </div>
            </div>
            <div className="divide-y divide-border/20">
              {setupSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <button type="button"
                    key={step.id}
                    onClick={() => navigate(step.href)}
                    disabled={step.done}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      step.done ? "opacity-60" : "hover:bg-accent/50 active:bg-accent/70"
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                        step.done ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"
                      }`}
                    >
                      {step.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    </div>
                    <span
                      className={`flex-1 text-[12.5px] ${
                        step.done ? "line-through text-muted-foreground" : "text-foreground font-medium"
                      }`}
                    >
                      {step.label}
                    </span>
                    {!step.done && <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Snapshot — shown only when we have data */}
      {user && securitySummary && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="mt-3 px-3"
        >
          <button type="button"
            onClick={() => navigate("/account/security")}
            className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/40 hover:bg-accent/50 transition-all text-left active:scale-[0.99]"
          >
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              securitySummary.failed_logins > 0
                ? "bg-rose-500/15"
                : setupSignals?.twoFactorOn
                  ? "bg-emerald-500/15"
                  : "bg-amber-500/15"
            }`}>
              {securitySummary.failed_logins > 0 ? (
                <AlertTriangle className="h-5 w-5 text-foreground" />
              ) : setupSignals?.twoFactorOn ? (
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
              ) : (
                <Shield className="h-5 w-5 text-amber-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-foreground">
                {securitySummary.failed_logins > 0
                  ? `${securitySummary.failed_logins} failed login attempt${securitySummary.failed_logins === 1 ? "" : "s"}`
                  : setupSignals?.twoFactorOn
                    ? "Account secured"
                    : "Enable 2FA to protect your account"}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Last sign-in {formatRelative(securitySummary.last_login)}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="h-3 w-3" /> {securitySummary.active_sessions_count} active session{securitySummary.active_sessions_count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          </button>
        </motion.div>
      )}

      {/* Recently visited */}
      {recentItems.length > 0 && !search && (
        <div className="mt-3 px-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Recently visited</p>
            <button type="button"
              onClick={clearRecents}
              className="text-[10px] text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-3 px-3 pb-1">
            {recentItems.map((item) => (
              <button type="button"
                key={item.href}
                onClick={() => navigate(item.href)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border/30 text-[12px] font-medium text-foreground hover:bg-muted/70 active:scale-[0.97] transition"
              >
                <Clock className="h-3 w-3 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <div className="px-3 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search settings…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search settings"
            className="pl-9 pr-16 h-10 rounded-xl bg-muted/50 border-border/40 text-sm"
          />
          {search ? (
            <button type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/70 hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd
              className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background border border-border/50 text-[10px] font-medium text-muted-foreground tabular-nums select-none pointer-events-none"
              aria-hidden="true"
            >
              {shortcutLabel}
            </kbd>
          )}
        </div>
        {search && filtered && filtered.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            {filtered.length} result{filtered.length === 1 ? "" : "s"} · press <kbd className="px-1 rounded bg-muted/60 text-[9px]">Esc</kbd> to clear
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-5">
        <AnimatePresence mode="wait">
          {filtered ? (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No settings found for "{search}"</p>
              ) : (
                filtered.map((item, i) => renderItem(item, i))
              )}
            </motion.div>
          ) : (
            <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5">
              {/* Pinned settings — appear at the top */}
              {pinnedItems.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-amber-500 uppercase tracking-wider px-1 mb-2 flex items-center gap-1.5">
                    <Star className="h-3 w-3 fill-amber-500" />
                    Pinned
                  </p>
                  <div className="space-y-1.5">
                    {pinnedItems.map((item, i) => renderItem(item, i))}
                  </div>
                </div>
              )}

              {visibleSettingsGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                    {group.title}
                  </p>
                  <div className="space-y-1.5">
                    {group.items.map((item, i) => renderItem(item, i))}
                  </div>
                </div>
              ))}

              {/* Connected Accounts */}
              {user && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                    Connected Accounts
                  </p>
                  <div className="rounded-xl bg-card border border-border/40 divide-y divide-border/30">
                    {allProviders.map((p) => {
                      const meta = PROVIDER_META[p.id];
                      if (!meta) return null;
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                          <div className={`h-9 w-9 min-w-9 rounded-full ${meta.bg} flex items-center justify-center font-bold text-sm`}>
                            <span className={meta.iconColor}>{meta.letter || meta.name.slice(0, 1)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-foreground">{meta.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate">
                              {p.connected ? "Connected" : "Not connected"}
                            </p>
                          </div>
                          {p.connected ? (
                            p.id === "email" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/account/security")}
                                className="h-8 px-3 text-xs rounded-lg"
                              >
                                Change
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleUnlinkProvider(p.id)}
                                className="h-8 px-3 text-xs rounded-lg text-foreground hover:bg-secondary hover:text-foreground"
                              >
                                Disconnect
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLinkProvider(p.id)}
                              className="h-8 px-3 text-xs rounded-lg"
                            >
                              Connect
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1.5 px-1 leading-relaxed">
                    Connecting an account lets you sign in with one tap. Disconnecting won't delete your ZIVO account.
                  </p>
                </div>
              )}

              {/* System Diagnostics — useful for support / bug reports */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  System
                </p>
                <div className="rounded-xl bg-card border border-border/40 overflow-hidden">
                  <button type="button"
                    onClick={() => setDiagOpen((o) => !o)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-accent/40 transition-colors text-left"
                  >
                    <div className="h-9 w-9 min-w-9 rounded-full bg-slate-500/15 flex items-center justify-center">
                      <Info className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground">System Diagnostics</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        v{diagnostics?.version} · {diagnostics?.browser} on {diagnostics?.os} · {isOnline ? "Online" : "Offline"}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center text-[10px] font-semibold rounded-full border px-1.5 py-0.5 ${
                        isOnline ? BADGE_CLASSES.ok : BADGE_CLASSES.warn
                      }`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </span>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground/40 shrink-0 transition-transform ${diagOpen ? "rotate-90" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {diagOpen && diagnostics && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-t border-border/30"
                      >
                        <div className="p-3 space-y-1.5 text-[11.5px] font-mono text-muted-foreground bg-muted/20">
                          <div className="flex justify-between gap-2"><span>App version</span><span className="text-foreground">{diagnostics.version}</span></div>
                          <div className="flex justify-between gap-2"><span>Browser</span><span className="text-foreground">{diagnostics.browser}</span></div>
                          <div className="flex justify-between gap-2"><span>OS</span><span className="text-foreground">{diagnostics.os}</span></div>
                          <div className="flex justify-between gap-2"><span>Screen</span><span className="text-foreground">{diagnostics.screen}</span></div>
                          <div className="flex justify-between gap-2"><span>Viewport</span><span className="text-foreground">{diagnostics.viewport}</span></div>
                          <div className="flex justify-between gap-2"><span>Push notifications</span><span className="text-foreground">{diagnostics.pushSupported ? "Supported" : "Not supported"}</span></div>
                          <div className="flex justify-between gap-2"><span>Service worker</span><span className="text-foreground">{diagnostics.serviceWorkerSupported ? "Supported" : "Not supported"}</span></div>
                          <div className="flex justify-between gap-2"><span>Cookies</span><span className="text-foreground">{diagnostics.cookies ? "Enabled" : "Disabled"}</span></div>
                          <div className="flex justify-between gap-2"><span>Language</span><span className="text-foreground">{diagnostics.lang}</span></div>
                          <div className="flex justify-between gap-2"><span>Timezone</span><span className="text-foreground">{diagnostics.timezone}</span></div>
                          <div className="flex justify-between gap-2"><span>Local storage</span><span className="text-foreground">{diagnostics.lsKeys} keys · {diagnostics.lsKB} KB</span></div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={copyDiagnostics}
                            className="w-full mt-2 h-8 rounded-lg text-xs"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1.5" />
                            Copy diagnostics
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Backup & Restore (client-side preferences only) */}
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  Backup & Restore
                </p>
                <div className="rounded-xl bg-card border border-border/40 p-3 space-y-2">
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Save your local preferences (theme, units, accessibility, notifications, cookies) as a JSON file you can import on another device.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportPrefs}
                      className="h-9 rounded-lg text-xs"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Export
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => importInputRef.current?.click()}
                      className="h-9 rounded-lg text-xs"
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Import
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetPrefs}
                      className="h-9 rounded-lg text-xs text-foreground hover:bg-secondary hover:text-foreground"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                  </div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept="application/json"
                    aria-label="Import preferences JSON"
                    title="Import preferences JSON"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImportPrefsFile(file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {/* Sign out */}
              {user && (
                <div>
                  <Button
                    variant="outline"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full h-11 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive font-medium"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    {signingOut ? "Signing out…" : "Sign out"}
                  </Button>
                </div>
              )}

              {/* Version footer */}
              <p className="text-center text-[10px] text-muted-foreground/60 pt-2 pb-6">
                ZIVO v{packageJson.version}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>{/* /max-w-2xl wrapper */}

      {/* Share dialog */}
      <ProfileShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={profileUrl}
        username={username}
        fullName={profile?.full_name}
      />
    </div>
  );
}
