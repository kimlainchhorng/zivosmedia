/**
 * MorePage — ZIVO Signature Design (2026)
 * Full hub with real user profile, quick actions, 70+ links, and organic design.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useUsername } from "@/hooks/useUsername";
import { useCoinBalance } from "@/hooks/useCoinBalance";
import { formatCount } from "@/lib/social/formatCount";
import { useTheme } from "next-themes";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronRight, LogOut, Settings, ShoppingBag, Wallet, MapPin, Handshake,
  Sparkles, Car, UtensilsCrossed, Store, Wrench, Building2, Truck, Shield, DollarSign,
  Heart, Bell, HelpCircle, Lock, Users, Globe, Bookmark, Eye, FileText,
  Award, Briefcase, Palette, Music, Headphones, QrCode, BarChart3,
  Camera, Video, Megaphone, Gift, Crown, Zap, Star, Calendar,
  BookOpen, Plane, Coffee, Radio, BadgeCheck, Smartphone, Download,
  TrendingUp, Target, Lightbulb, PenTool, Share2, Compass, ArrowRight,
  Gem, Rocket, Layers, CircleDot, User, CreditCard, Map as MapIcon, Package,
  Clock, Receipt, Ticket, ShieldCheck, Flame, AlertCircle, Inbox,
  Search, Vote, Clapperboard, GraduationCap, Trophy, Banknote, ArrowLeft,
  Sun, Moon, Trash2, X, Hash, Tv, Mic, Activity, Dumbbell, Brain,
  Languages, Database, UserPlus, Film, MessageSquare, Hotel,
  Hammer, Sliders, FileSignature, Cookie, BookMarked, Stethoscope,
  ClipboardList, Building, Tag, ScrollText, History, ArrowDownToLine,
  Fingerprint, Pin, AtSign, Image as ImageIcon, MicVocal, Volume2,
  ExternalLink, Boxes, Hourglass, Pencil, ListChecks,
  Headset, MessagesSquare, BarChart, Cpu, GanttChart, Network, Pill,
  Info, Newspaper, MapPinned, Bug, Code, Server, ShieldAlert,
  HandHeart, Mountain, Wifi, Sparkle, Globe2, Box, Banknote as BanknoteIcon,
  AlarmClock, FileBadge, GitBranch, RefreshCw, Mail, Scale, Users2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { cn } from "@/lib/utils";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import FeedSidebar from "@/components/social/FeedSidebar";
import NavBar from "@/components/home/NavBar";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import VerifiedBadge from "@/components/VerifiedBadge";
import { Badge } from "@/components/ui/badge";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { toast } from "sonner";

const formatNotificationText = (text: string | null | undefined) =>
  (text ?? "").replace(/\$(\d+(?:,\d{3})*)\.(\d{2})0{3,}\b/g, "$$$1.$2");

type MoreNotificationPreview = {
  id: string;
  title: string | null;
  body: string | null;
  action_url: string | null;
  created_at: string;
};

type MoreActivityRow = {
  id: string;
  source: string | null;
  path: string | null;
  region_code: string | null;
  device_kind: string | null;
  platform: string | null;
  created_at: string;
};

type MoreActivityResult = {
  rows: MoreActivityRow[];
  syncAvailable: boolean;
};

const isMoreChatNotification = (notification: Pick<MoreNotificationPreview, "title" | "body" | "action_url">) => {
  const haystack = [
    notification.title,
    notification.body,
    notification.action_url,
  ].filter(Boolean).join(" ").toLowerCase();

  return /(^|\/)(chat|messages|conversation|inbox)(\/|$|\?)/.test(haystack)
    || /\b(message|chat|conversation|dm)\b/.test(haystack);
};

/* ============================================= */
/*  PARTNER OPTIONS                              */
/* ============================================= */
const partnerOptions = [
  { icon: Car, label: "Become a Driver", description: "Earn money driving with ZIVO", href: "/partner-with-zivo?type=driver", accent: "hsl(221 83% 53%)" },
  { icon: UtensilsCrossed, label: "Restaurant Partner", description: "List your restaurant on ZIVO", href: "/partner-with-zivo?type=restaurant", accent: "hsl(25 95% 53%)" },
  { icon: Store, label: "Shop Partner", description: "Sell products through ZIVO", href: "/partner-with-zivo?type=store", accent: "hsl(142 71% 45%)" },
  { icon: Wrench, label: "Auto Repair Partner", description: "Offer repair services on ZIVO", href: "/partner-with-zivo?type=auto-repair", accent: "hsl(215 16% 47%)" },
  { icon: Building2, label: "Hotel Partner", description: "List your property on ZIVO", href: "/partner-with-zivo?type=hotel", accent: "hsl(263 70% 58%)" },
  { icon: Truck, label: "Delivery Partner", description: "Deliver food & packages", href: "/partner-with-zivo?type=delivery", accent: "hsl(340 75% 55%)" },
];

/* ============================================= */
/*  QUICK ACTIONS (horizontal row)               */
/* ============================================= */
const quickActions = [
  { icon: User, label: "Profile", href: "/profile", accent: "hsl(199 89% 48%)" },
  { icon: Wallet, label: "Wallet", href: "/wallet", accent: "hsl(142 71% 45%)" },
  { icon: ShoppingBag, label: "Orders", href: "/grocery/orders", accent: "hsl(221 83% 53%)" },
  { icon: Heart, label: "Saved", href: "/saved", accent: "hsl(340 75% 55%)" },
  { icon: UserPlus, label: "Friends", href: "/notifications?tab=requests", accent: "hsl(263 70% 58%)" },
  { icon: Ticket, label: "Support", href: "/support/tickets", accent: "hsl(38 92% 50%)" },
  { icon: QrCode, label: "QR Code", href: "/qr-profile", accent: "hsl(263 70% 58%)" },
  { icon: History, label: "Activity", href: "/account/activity-log?filter=account_hub", accent: "hsl(198 93% 59%)" },
  { icon: Gift, label: "Invite", href: "/referrals", accent: "hsl(199 89% 48%)" },
  { icon: Plane, label: "Trips", href: "/my-trips", accent: "hsl(199 89% 48%)" },
  { icon: Bell, label: "Alerts", href: "/notification-center", accent: "hsl(45 93% 58%)" },
  { icon: Search, label: "Search", href: "/smart-search", accent: "hsl(263 70% 58%)" },
];

const ACCENT_CLASS_MAP: Record<string, { text: string; bg: string; border: string }> = {
  "hsl(199 89% 48%)": { text: "text-sky-500", bg: "bg-sky-500/15", border: "border-l-sky-500" },
  "hsl(142 71% 45%)": { text: "text-emerald-500", bg: "bg-emerald-500/15", border: "border-l-emerald-500" },
  "hsl(221 83% 53%)": { text: "text-blue-500", bg: "bg-blue-500/15", border: "border-l-blue-500" },
  "hsl(340 75% 55%)": { text: "text-rose-500", bg: "bg-rose-500/15", border: "border-l-rose-500" },
  "hsl(263 70% 58%)": { text: "text-violet-500", bg: "bg-violet-500/15", border: "border-l-violet-500" },
  "hsl(38 92% 50%)": { text: "text-amber-500", bg: "bg-amber-500/15", border: "border-l-amber-500" },
  "hsl(198 93% 59%)": { text: "text-cyan-500", bg: "bg-cyan-500/15", border: "border-l-cyan-500" },
  "hsl(0 84% 60%)": { text: "text-red-500", bg: "bg-red-500/15", border: "border-l-red-500" },
  "hsl(172 66% 50%)": { text: "text-teal-500", bg: "bg-teal-500/15", border: "border-l-teal-500" },
  "hsl(25 95% 53%)": { text: "text-orange-500", bg: "bg-orange-500/15", border: "border-l-orange-500" },
  "hsl(45 93% 58%)": { text: "text-yellow-500", bg: "bg-yellow-500/15", border: "border-l-yellow-500" },
  "hsl(300 70% 55%)": { text: "text-fuchsia-500", bg: "bg-fuchsia-500/15", border: "border-l-fuchsia-500" },
  "hsl(215 16% 47%)": { text: "text-slate-500", bg: "bg-slate-500/15", border: "border-l-slate-500" },
  "hsl(var(--primary))": { text: "text-primary", bg: "bg-primary/15", border: "border-l-primary" },
  "hsl(var(--muted-foreground))": { text: "text-muted-foreground", bg: "bg-muted/50", border: "border-l-muted-foreground" },
};

const getAccentClasses = (accent: string) => ACCENT_CLASS_MAP[accent] ?? { text: "text-primary", bg: "bg-primary/15", border: "border-l-primary" };

/* ============================================= */
/*  LINK TYPES                                   */
/* ============================================= */
type QuickLink = {
  icon: any;
  label: string;
  href: string;
  description: string;
  accent: string;
  badge?: string;
};

type MoreSearchResult = {
  link: QuickLink;
  sectionTitle: string;
  sectionIcon: any;
};

const sanitizeStoredStringList = (items: unknown[], maxItems: number) => {
  const seen = new Set<string>();
  return items.reduce<string[]>((cleaned, item) => {
    if (typeof item !== "string") return cleaned;
    const value = item.trim();
    if (!value || seen.has(value) || cleaned.length >= maxItems) return cleaned;
    seen.add(value);
    cleaned.push(value);
    return cleaned;
  }, []);
};

const readStoredStringList = (key: string, maxItems: number) => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sanitizeStoredStringList(parsed, maxItems);
  } catch {
    return [];
  }
};

const persistStoredStringList = (key: string, items: string[], maxItems = items.length) => {
  if (typeof window === "undefined") return;
  try {
    const cleaned = sanitizeStoredStringList(items, maxItems);
    if (cleaned.length === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(cleaned));
  } catch {}
};

const sameStringList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((item, index) => item === b[index]);

const normalizeInternalHref = (href: string) => {
  const value = href.trim();
  // "\" is normalized to "/" by browsers, so "/\evil.com" → authority //evil.com.
  const probe = value.replace(/\\/g, "/");
  return value && probe.startsWith("/") && !probe.startsWith("//") ? value : null;
};

const formatToolCount = (count: number) => `${count} ${count === 1 ? "tool" : "tools"}`;
const formatSectionCount = (count: number) => `${count} ${count === 1 ? "section" : "sections"}`;
const formatMatchCount = (count: number) => `${count} ${count === 1 ? "match" : "matches"}`;
const formatShortcutCount = (count: number, label: "pinned" | "recent") => `${count} ${label}`;
const formatSearchCount = (count: number) => `${count} saved ${count === 1 ? "search" : "searches"}`;

const quickLinksMain: QuickLink[] = [
  { icon: User, label: "My Profile", href: "/profile", description: "View & edit", accent: "hsl(199 89% 48%)" },
  { icon: Gift, label: "Refer a Friend", href: "/referrals", description: "Earn rewards", accent: "hsl(142 71% 45%)", badge: "Earn" },
  { icon: Clock, label: "Account Activity", href: "/account/activity-log", description: "Logins & changes", accent: "hsl(198 93% 59%)" },
  { icon: Users, label: "Switch Account", href: "#switch-account", description: "Add or change", accent: "hsl(263 70% 58%)" },
  { icon: Settings, label: "Settings", href: "/account/settings", description: "App preferences", accent: "hsl(var(--muted-foreground))" },
  { icon: ShoppingBag, label: "My Orders", href: "/grocery/orders", description: "Order history", accent: "hsl(221 83% 53%)" },
  { icon: Wallet, label: "Wallet", href: "/wallet", description: "Balance & pay", accent: "hsl(142 71% 45%)" },
  { icon: MapPin, label: "Saved Addresses", href: "/account/addresses", description: "Delivery spots", accent: "hsl(0 84% 60%)" },
  { icon: DollarSign, label: "Monetization", href: "/monetization", description: "Revenue hub", accent: "hsl(var(--primary))" },
  { icon: Handshake, label: "Become Partner", href: "#partner", description: "Join ZIVO", accent: "hsl(263 70% 58%)" },
  { icon: Heart, label: "Favorites", href: "/account/favorites", description: "Saved items", accent: "hsl(340 75% 55%)" },
  { icon: Award, label: "Badges", href: "/badges", description: "Achievements", accent: "hsl(38 92% 50%)" },
  { icon: CreditCard, label: "Payment Methods", href: "/account/wallet", description: "Cards & banks", accent: "hsl(199 89% 48%)" },
  { icon: Inbox, label: "Inbox", href: "/notification-center", description: "All alerts", accent: "hsl(45 93% 58%)" },
  { icon: Bell, label: "Notifications", href: "/account/notifications", description: "Alerts feed", accent: "hsl(45 93% 58%)" },
  { icon: Plane, label: "My Trips", href: "/my-trips", description: "Travel history", accent: "hsl(199 89% 48%)" },
  { icon: Receipt, label: "Receipts", href: "/account/receipts", description: "Past payments", accent: "hsl(215 16% 47%)" },
  { icon: Hash, label: "QR Profile", href: "/qr-profile", description: "Share & scan", accent: "hsl(263 70% 58%)" },
  { icon: Star, label: "My Reviews", href: "/account/reviews", description: "Ratings given", accent: "hsl(45 93% 58%)" },
  { icon: ScrollText, label: "Subscriptions", href: "/account/subscriptions", description: "Plans & renewals", accent: "hsl(263 70% 58%)" },
  { icon: BadgeCheck, label: "Verification", href: "/account/verification", description: "Get verified", accent: "hsl(221 83% 53%)" },
  { icon: Calendar, label: "Bookings", href: "/booking-management", description: "Manage all", accent: "hsl(199 89% 48%)" },
  { icon: Sparkles, label: "Salon visits", href: "/salon/me", description: "Visits & loyalty", accent: "hsl(340 75% 55%)" },
  { icon: Ticket, label: "Gift Cards", href: "/account/gift-cards", description: "Buy & redeem", accent: "hsl(340 75% 55%)" },
  { icon: FileText, label: "Invoices", href: "/account/invoices", description: "Tax invoices", accent: "hsl(215 16% 47%)" },
  { icon: Tag, label: "Promo Codes", href: "/account/promos", description: "Active offers", accent: "hsl(0 84% 60%)", badge: "Save" },
  { icon: Gift, label: "Referral History", href: "/account/referrals", description: "Track invites", accent: "hsl(142 71% 45%)" },
  { icon: Users2, label: "Travelers", href: "/account/travelers", description: "Saved travelers", accent: "hsl(199 89% 48%)" },
  { icon: MapPinned, label: "Saved Places", href: "/account/saved-places", description: "Home & work", accent: "hsl(0 84% 60%)" },
  { icon: Award, label: "Loyalty Program", href: "/account/loyalty", description: "Points & perks", accent: "hsl(45 93% 58%)" },
  { icon: Smartphone, label: "Linked Devices", href: "/account/linked-devices", description: "Connected gear", accent: "hsl(263 70% 58%)" },
];

const quickLinksCreator: QuickLink[] = [
  { icon: BarChart3, label: "Creator Dashboard", href: "/creator-dashboard", description: "Earnings & stats", accent: "hsl(198 93% 59%)", badge: "Pro" },
  { icon: TrendingUp, label: "Analytics", href: "/creator-analytics", description: "Deep insights", accent: "hsl(263 70% 58%)", badge: "New" },
  { icon: Video, label: "Content Scheduler", href: "/content-scheduler", description: "Plan posts", accent: "hsl(270 95% 75%)" },
  { icon: BookOpen, label: "Creator Academy", href: "/monetization/articles", description: "500+ guides", accent: "hsl(25 95% 53%)" },
  { icon: Gift, label: "Affiliate Hub", href: "/affiliate-hub", description: "Referrals", accent: "hsl(172 66% 50%)", badge: "New" },
  { icon: PenTool, label: "Digital Products", href: "/digital-products", description: "Sell courses", accent: "hsl(300 70% 55%)" },
  { icon: Eye, label: "Content Analytics", href: "/content-analytics", description: "Performance", accent: "hsl(199 89% 48%)" },
  { icon: Target, label: "Drafts", href: "/drafts", description: "Unpublished", accent: "hsl(215 16% 47%)" },
  { icon: Vote, label: "Story Polls", href: "/story-polls", description: "Engage fans", accent: "hsl(340 75% 55%)" },
  { icon: Share2, label: "Link Hub", href: "/link-hub", description: "All your links", accent: "hsl(221 83% 53%)" },
  { icon: Sparkles, label: "Creator Setup", href: "/creator/setup", description: "Get started", accent: "hsl(263 70% 58%)" },
  { icon: DollarSign, label: "Live Earnings", href: "/creator/live-earnings", description: "Real-time payouts", accent: "hsl(142 71% 45%)" },
  { icon: ImageIcon, label: "Media Library", href: "/media-library", description: "All your assets", accent: "hsl(199 89% 48%)" },
  { icon: MicVocal, label: "Sound Library", href: "/explore", description: "Trending audio", accent: "hsl(340 75% 55%)" },
  { icon: Megaphone, label: "Promote Posts", href: "/promote", description: "Boost reach", accent: "hsl(38 92% 50%)" },
  { icon: GanttChart, label: "Brand Deals", href: "/brand-deals", description: "Sponsorships", accent: "hsl(263 70% 58%)" },
  { icon: BookMarked, label: "Content Library", href: "/library", description: "Saved drafts", accent: "hsl(172 66% 50%)" },
  { icon: ListChecks, label: "Goals", href: "/creator/goals", description: "Milestones", accent: "hsl(45 93% 58%)" },
];

const quickLinksTravel: QuickLink[] = [
  { icon: Plane, label: "My Trips", href: "/trips", description: "All journeys", accent: "hsl(199 89% 48%)" },
  { icon: Bookmark, label: "Saved Searches", href: "/saved-searches", description: "Alerts", accent: "hsl(38 92% 50%)" },
  { icon: Car, label: "Ride History", href: "/rides/hub", description: "Receipts", accent: "hsl(221 83% 53%)" },
  { icon: Coffee, label: "Food Orders", href: "/eats/orders", description: "Past orders", accent: "hsl(25 95% 53%)" },
  { icon: Calendar, label: "Check-in", href: "/check-in", description: "Flight check-in", accent: "hsl(142 71% 45%)" },
  { icon: Compass, label: "Explore Nearby", href: "/nearby", description: "Around you", accent: "hsl(0 84% 60%)" },
  { icon: Globe, label: "AI Trip Planner", href: "/ai-trip-planner", description: "AI-powered", accent: "hsl(263 70% 58%)", badge: "AI" },
  { icon: Smartphone, label: "Booking Mgmt", href: "/booking-management", description: "Manage trips", accent: "hsl(198 93% 59%)" },
  { icon: MapIcon, label: "City Guides", href: "/guides", description: "Expert tips", accent: "hsl(172 66% 50%)" },
  { icon: Package, label: "Delivery", href: "/delivery", description: "Send packages", accent: "hsl(215 16% 47%)" },
  { icon: Flame, label: "Deals", href: "/deals", description: "Hot offers", accent: "hsl(0 84% 60%)", badge: "Hot" },
  { icon: Plane, label: "Book Flight", href: "/flights", description: "Search flights", accent: "hsl(199 89% 48%)" },
  { icon: Hotel, label: "Book Hotel", href: "/hotels", description: "Find stays", accent: "hsl(263 70% 58%)" },
  { icon: Car, label: "Book a Ride", href: "/rides/hub", description: "Get a ride", accent: "hsl(221 83% 53%)" },
  { icon: UtensilsCrossed, label: "Order Food", href: "/eats", description: "Restaurants near you", accent: "hsl(25 95% 53%)" },
  { icon: ShoppingBag, label: "Grocery", href: "/grocery", description: "Shop essentials", accent: "hsl(142 71% 45%)" },
  { icon: Boxes, label: "Marketplace", href: "/marketplace", description: "Buy & sell", accent: "hsl(38 92% 50%)" },
  { icon: Receipt, label: "Marketplace Orders", href: "/marketplace/orders", description: "Item orders", accent: "hsl(215 16% 47%)" },
  { icon: Pin, label: "Saved Addresses", href: "/account/addresses", description: "Home & work", accent: "hsl(0 84% 60%)" },
  { icon: ExternalLink, label: "Track Package", href: "/track", description: "Live tracking", accent: "hsl(199 89% 48%)" },
  { icon: MapIcon, label: "Multi-City Builder", href: "/multi-city-builder", description: "Plan multi-stop trip", accent: "hsl(199 89% 48%)" },
  { icon: Plane, label: "Flight Tracker", href: "/flights/live", description: "Live flight status", accent: "hsl(199 89% 48%)", badge: "Live" },
  { icon: Receipt, label: "Flight Bookings", href: "/flights/bookings", description: "All flight orders", accent: "hsl(263 70% 58%)" },
  { icon: ShieldCheck, label: "Travel Insurance", href: "/travel-insurance", description: "Protect your trip", accent: "hsl(142 71% 45%)" },
  { icon: Sparkle, label: "Travel Extras", href: "/travel-extras", description: "Add-ons & perks", accent: "hsl(38 92% 50%)" },
  { icon: Mountain, label: "Things to Do", href: "/things-to-do", description: "Tours & tickets", accent: "hsl(172 66% 50%)" },
  { icon: Compass, label: "Experiences", href: "/experiences", description: "Curated activities", accent: "hsl(263 70% 58%)" },
  { icon: Briefcase, label: "Business Travel", href: "/business-travel", description: "Corporate trips", accent: "hsl(215 16% 47%)" },
  { icon: Truck, label: "Ground Transport", href: "/ground-transport", description: "Airport rides", accent: "hsl(221 83% 53%)" },
  { icon: Box, label: "Package Delivery", href: "/package-delivery", description: "Courier service", accent: "hsl(38 92% 50%)" },
  { icon: ShieldCheck, label: "Insurance Hub", href: "/insurance", description: "All policies", accent: "hsl(142 71% 45%)" },
];

const quickLinksSocial: QuickLink[] = [
  { icon: Users, label: "Communities", href: "/communities", description: "Groups", accent: "hsl(263 70% 58%)" },
  { icon: Radio, label: "Audio Spaces", href: "/spaces", description: "Live rooms", accent: "hsl(300 70% 55%)" },
  { icon: Camera, label: "Reels", href: "/reels", description: "Short videos", accent: "hsl(340 75% 55%)" },
  { icon: Share2, label: "Share Profile", href: "/qr-profile", description: "QR & link", accent: "hsl(142 71% 45%)" },
  { icon: Megaphone, label: "Events", href: "/events", description: "Upcoming", accent: "hsl(38 92% 50%)" },
  { icon: Star, label: "Leaderboard", href: "/leaderboard", description: "Top creators", accent: "hsl(45 93% 58%)" },
  { icon: Clapperboard, label: "Watch Party", href: "/watch-party", description: "Watch together", accent: "hsl(199 89% 48%)" },
  { icon: Bookmark, label: "Bookmarks", href: "/saved", description: "Saved posts", accent: "hsl(25 95% 53%)" },
  { icon: Heart, label: "Dating", href: "/dating", description: "Find connections", accent: "hsl(340 75% 55%)" },
  { icon: Search, label: "Smart Search", href: "/smart-search", description: "AI search", accent: "hsl(263 70% 58%)", badge: "AI" },
  { icon: Pencil, label: "Whiteboard", href: "/whiteboard", description: "Collaborate", accent: "hsl(199 89% 48%)" },
  { icon: Tv, label: "Live Stream", href: "/live", description: "Watch live", accent: "hsl(0 84% 60%)" },
];

const quickLinksBusiness: QuickLink[] = [
  { icon: Store, label: "Shop Dashboard", href: "/shop-dashboard", description: "Your store", accent: "hsl(142 71% 45%)" },
  { icon: Truck, label: "Driver Dashboard", href: "/drive", description: "Earnings", accent: "hsl(221 83% 53%)" },
  { icon: UtensilsCrossed, label: "Restaurant Dash", href: "/eats/restaurant-dashboard", description: "Food orders", accent: "hsl(25 95% 53%)" },
  { icon: Briefcase, label: "Business Account", href: "/business/account", description: "Corporate", accent: "hsl(215 16% 47%)" },
  { icon: Building2, label: "Store Map", href: "/store-map", description: "Map view", accent: "hsl(263 70% 58%)" },
  { icon: Wrench, label: "Store Setup", href: "/store/setup", description: "Configure", accent: "hsl(0 84% 60%)" },
  { icon: BarChart3, label: "Business Insights", href: "/business/insights", description: "Data analytics", accent: "hsl(198 93% 59%)" },
  { icon: GraduationCap, label: "Marketplace", href: "/marketplace", description: "Buy & sell", accent: "hsl(38 92% 50%)" },
  { icon: Package, label: "Shop Products", href: "/shop-dashboard/products", description: "Manage catalog", accent: "hsl(199 89% 48%)" },
  { icon: ShoppingBag, label: "Shop Orders", href: "/shop-dashboard/orders", description: "Customer orders", accent: "hsl(221 83% 53%)" },
  { icon: BarChart, label: "Shop Analytics", href: "/shop-dashboard/analytics", description: "Sales reports", accent: "hsl(263 70% 58%)" },
  { icon: Tag, label: "Promotions", href: "/shop-dashboard/promotions", description: "Discounts & offers", accent: "hsl(0 84% 60%)" },
  { icon: Truck, label: "Shop Delivery", href: "/shop-dashboard/delivery", description: "Logistics", accent: "hsl(38 92% 50%)" },
  { icon: Users, label: "Employees", href: "/shop-dashboard/employees", description: "Manage team", accent: "hsl(172 66% 50%)" },
  { icon: DollarSign, label: "Payroll", href: "/shop-dashboard/payroll", description: "Pay employees", accent: "hsl(142 71% 45%)" },
  { icon: Clock, label: "Time Clock", href: "/shop-dashboard/time-clock", description: "Track hours", accent: "hsl(199 89% 48%)" },
  { icon: Calendar, label: "Employee Schedule", href: "/shop-dashboard/employee-schedule", description: "Staff shifts", accent: "hsl(263 70% 58%)" },
  { icon: TrendingUp, label: "Merchant ROI", href: "/shop-dashboard/roi", description: "Performance", accent: "hsl(198 93% 59%)" },
  { icon: Truck, label: "Truck Dashboard", href: "/shop-dashboard/truck", description: "Fleet view", accent: "hsl(221 83% 53%)" },
  { icon: Network, label: "Sales Attribution", href: "/shop-dashboard/attribution", description: "Track sources", accent: "hsl(45 93% 58%)" },
  { icon: Cpu, label: "Sandbox Mode", href: "/shop-dashboard/sandbox", description: "Test features", accent: "hsl(215 16% 47%)" },
  { icon: Gift, label: "Refer a Shop", href: "/shop-dashboard/refer", description: "Earn referrals", accent: "hsl(142 71% 45%)" },
  { icon: Truck, label: "Driver Earnings", href: "/driver/earnings", description: "Trip income", accent: "hsl(142 71% 45%)" },
  { icon: Banknote, label: "Driver Payouts", href: "/driver/payouts", description: "Cash out", accent: "hsl(199 89% 48%)" },
  { icon: ClipboardList, label: "Driver Orders", href: "/driver/orders", description: "Active jobs", accent: "hsl(221 83% 53%)" },
  { icon: Activity, label: "Driver Performance", href: "/driver/performance", description: "Stats", accent: "hsl(263 70% 58%)" },
  { icon: FileSignature, label: "Driver Onboarding", href: "/driver/onboarding/documents", description: "Submit docs", accent: "hsl(38 92% 50%)" },
  { icon: UtensilsCrossed, label: "Eats Driver", href: "/eats/driver-deliveries", description: "Food delivery", accent: "hsl(25 95% 53%)" },
  { icon: MapIcon, label: "Driver Map", href: "/driver/map", description: "Live trip map", accent: "hsl(221 83% 53%)" },
  { icon: Compass, label: "Driver Home", href: "/driver/home", description: "Start driving", accent: "hsl(199 89% 48%)" },
  { icon: Sparkles, label: "AI Content Studio", href: "/shop-dashboard/ai-content", description: "Auto-write copy", accent: "hsl(263 70% 58%)", badge: "AI" },
  { icon: Palette, label: "AI Creative", href: "/shop-dashboard/ai-creative", description: "Visual generator", accent: "hsl(340 75% 55%)", badge: "AI" },
  { icon: Rocket, label: "Boost Engine", href: "/shop-dashboard/boost-engine", description: "Auto-optimize", accent: "hsl(0 84% 60%)" },
  { icon: Zap, label: "Boost Posts", href: "/shop-dashboard/boost", description: "Promote content", accent: "hsl(38 92% 50%)" },
  { icon: ScrollText, label: "Shop Documents", href: "/shop-dashboard/documents", description: "Tax & licenses", accent: "hsl(215 16% 47%)" },
  { icon: TrendingUp, label: "Shop Performance", href: "/shop-dashboard/performance", description: "Live KPIs", accent: "hsl(199 89% 48%)" },
  { icon: FileSignature, label: "Tax Reports", href: "/shop-dashboard/tax-reports", description: "1099 & filings", accent: "hsl(142 71% 45%)" },
  { icon: GraduationCap, label: "Shop Training", href: "/shop-dashboard/training", description: "Onboarding course", accent: "hsl(263 70% 58%)" },
  { icon: Wallet, label: "Shop Wallet", href: "/shop-dashboard/wallet", description: "Earnings balance", accent: "hsl(142 71% 45%)" },
  { icon: ClipboardList, label: "Attendance", href: "/shop-dashboard/attendance", description: "Staff sign-ins", accent: "hsl(38 92% 50%)" },
  { icon: Sliders, label: "Employee Rules", href: "/shop-dashboard/employee-rules", description: "HR policies", accent: "hsl(215 16% 47%)" },
  { icon: Settings, label: "Shop Settings", href: "/shop-dashboard/settings", description: "Configure store", accent: "hsl(var(--muted-foreground))" },
  { icon: Building2, label: "Hotel Admin", href: "/hotel-admin", description: "Property mgmt", accent: "hsl(263 70% 58%)" },
  { icon: BarChart3, label: "Business Dashboard", href: "/business/dashboard", description: "Org overview", accent: "hsl(198 93% 59%)" },
  { icon: UserPlus, label: "Add Business", href: "/business/new", description: "Register company", accent: "hsl(199 89% 48%)" },
  { icon: Globe2, label: "Connect Website", href: "/connect-website", description: "Link your site", accent: "hsl(263 70% 58%)" },
];

const quickLinksAccount: QuickLink[] = [
  { icon: Bell, label: "Notifications", href: "/account/notifications", description: "Manage alerts", accent: "hsl(45 93% 58%)" },
  { icon: Lock, label: "Privacy", href: "/account/privacy", description: "Security", accent: "hsl(0 84% 60%)" },
  { icon: BadgeCheck, label: "Verification", href: "/account/verification", description: "Get verified", accent: "hsl(221 83% 53%)" },
  { icon: Globe, label: "Language", href: "/account/preferences", description: "Region", accent: "hsl(172 66% 50%)" },
  { icon: FileText, label: "Legal", href: "/account/legal", description: "Terms", accent: "hsl(215 16% 47%)" },
  { icon: Download, label: "Get App", href: "/install", description: "Download", accent: "hsl(var(--primary))" },
  { icon: Lightbulb, label: "Feedback", href: "/feedback", description: "Ideas", accent: "hsl(45 93% 58%)" },
  { icon: Shield, label: "Safety Center", href: "/safety", description: "Reporting", accent: "hsl(0 84% 60%)" },
  { icon: Palette, label: "Appearance", href: "#theme-toggle", description: "Light / Dark theme", accent: "hsl(263 70% 58%)" },
  { icon: AlertCircle, label: "Report a Problem", href: "/feedback", description: "Bug report", accent: "hsl(0 84% 60%)" },
  { icon: ShieldCheck, label: "Security Report", href: "/security/report", description: "Status", accent: "hsl(142 71% 45%)" },
  { icon: Smartphone, label: "Login & Devices", href: "/account/security", description: "Active sessions", accent: "hsl(221 83% 53%)" },
  { icon: Lock, label: "Two-Factor Auth", href: "/account/security", description: "Extra security", accent: "hsl(142 71% 45%)" },
  { icon: Users, label: "Blocked Users", href: "/account/privacy#blocked", description: "Manage blocks", accent: "hsl(0 84% 60%)" },
  { icon: Trash2, label: "Delete Account", href: "/profile/delete-account", description: "Permanently remove", accent: "hsl(0 84% 60%)" },
  { icon: BarChart3, label: "Account Analytics", href: "/account/analytics", description: "Your stats", accent: "hsl(198 93% 59%)" },
  { icon: History, label: "Account Activity", href: "/account/activity-log", description: "Full audit trail", accent: "hsl(215 16% 47%)" },
  { icon: ArrowDownToLine, label: "Export Data", href: "/account/export", description: "Download your data", accent: "hsl(199 89% 48%)" },
  { icon: Fingerprint, label: "Biometrics", href: "/account/security", description: "Face & fingerprint", accent: "hsl(263 70% 58%)" },
  { icon: Cookie, label: "Cookie Settings", href: "/account/cookies", description: "Tracking prefs", accent: "hsl(38 92% 50%)" },
  { icon: Languages, label: "Translation", href: "/account/translation", description: "Auto-translate", accent: "hsl(172 66% 50%)" },
  { icon: Sliders, label: "Accessibility", href: "/account/accessibility", description: "Adjust UI", accent: "hsl(263 70% 58%)" },
  { icon: AtSign, label: "Email & Phone", href: "/account/contact", description: "Update contact", accent: "hsl(199 89% 48%)" },
  { icon: Building, label: "Tax Info", href: "/account/tax", description: "1099 & docs", accent: "hsl(215 16% 47%)" },
  { icon: Headset, label: "Contact Support", href: "/support", description: "Get help", accent: "hsl(221 83% 53%)" },
  { icon: HelpCircle, label: "Help Center", href: "/help-center", description: "Detailed articles", accent: "hsl(199 89% 48%)" },
  { icon: BookOpen, label: "FAQ", href: "/faq", description: "Common questions", accent: "hsl(38 92% 50%)" },
  { icon: Bug, label: "Site Issues", href: "/support/site-issues", description: "Report bug", accent: "hsl(0 84% 60%)" },
  { icon: Plane, label: "Travel Booking Help", href: "/support/travel-bookings", description: "Trip support", accent: "hsl(199 89% 48%)" },
  { icon: Server, label: "Service Status", href: "/status", description: "System uptime", accent: "hsl(142 71% 45%)" },
  { icon: Scale, label: "Data Rights", href: "/account/data-rights", description: "GDPR & CCPA", accent: "hsl(263 70% 58%)" },
];

const quickLinksJobs: QuickLink[] = [
  { icon: Briefcase, label: "Workplace", href: "/personal-dashboard", description: "Clock in, jobs & schedule", accent: "hsl(221 83% 53%)" },
  { icon: Target, label: "Apply for Jobs", href: "/personal/apply-job", description: "Find work", accent: "hsl(199 89% 48%)" },
  { icon: UserPlus, label: "Find Employees", href: "/personal/find-employee", description: "Hire talent", accent: "hsl(263 70% 58%)" },
  { icon: FileSignature, label: "Create CV", href: "/personal/create-cv", description: "Build resume", accent: "hsl(142 71% 45%)" },
  { icon: ClipboardList, label: "My Applications", href: "/personal/my-applications", description: "Track status", accent: "hsl(38 92% 50%)" },
  { icon: Building, label: "Employer Hub", href: "/personal/employer", description: "Post & hire", accent: "hsl(215 16% 47%)" },
  { icon: Users, label: "My Employees", href: "/personal/employees", description: "Team list", accent: "hsl(172 66% 50%)" },
  { icon: Calendar, label: "My Schedule", href: "/personal/schedule", description: "Work shifts", accent: "hsl(199 89% 48%)" },
  { icon: Hourglass, label: "Timesheet", href: "/personal/timesheet", description: "Hours logged", accent: "hsl(45 93% 58%)" },
  { icon: Banknote, label: "Pay Stubs", href: "/personal/pay-stubs", description: "Payment history", accent: "hsl(142 71% 45%)" },
  { icon: Globe, label: "Connect Website", href: "/personal/connect-website", description: "Link portfolio", accent: "hsl(263 70% 58%)" },
  { icon: Bell, label: "Job Alerts", href: "/personal/notifications", description: "New matches", accent: "hsl(45 93% 58%)" },
  { icon: HelpCircle, label: "Workplace Help", href: "/personal/help", description: "Tips & FAQ", accent: "hsl(var(--muted-foreground))" },
  { icon: Settings, label: "Workplace Settings", href: "/personal/settings", description: "Preferences", accent: "hsl(215 16% 47%)" },
];

const quickLinksLive: QuickLink[] = [
  { icon: Tv, label: "Live Streams", href: "/live", description: "Watch live", accent: "hsl(0 84% 60%)" },
  { icon: Video, label: "Go Live", href: "/go-live", description: "Start broadcasting", accent: "hsl(340 75% 55%)", badge: "New" },
  { icon: Radio, label: "Audio Spaces", href: "/spaces", description: "Voice rooms", accent: "hsl(300 70% 55%)" },
  { icon: Clapperboard, label: "Watch Party", href: "/watch-party", description: "Watch with friends", accent: "hsl(199 89% 48%)" },
  { icon: Camera, label: "Reels", href: "/reels", description: "Short videos", accent: "hsl(340 75% 55%)" },
  { icon: Film, label: "Feed", href: "/feed", description: "Posts & updates", accent: "hsl(263 70% 58%)" },
  { icon: Mic, label: "Podcasts", href: "/podcasts", description: "Listen on the go", accent: "hsl(45 93% 58%)" },
  { icon: Megaphone, label: "Events", href: "/events", description: "Upcoming streams", accent: "hsl(38 92% 50%)" },
  { icon: Volume2, label: "Sound Effects", href: "/sounds", description: "Audio library", accent: "hsl(172 66% 50%)" },
  { icon: DollarSign, label: "Stream Earnings", href: "/creator/live-earnings", description: "Tips & gifts", accent: "hsl(142 71% 45%)" },
  { icon: Pencil, label: "Whiteboard", href: "/whiteboard", description: "Draw together", accent: "hsl(199 89% 48%)" },
  { icon: Cpu, label: "AR Filters", href: "/filters", description: "Effects studio", accent: "hsl(263 70% 58%)" },
];

const quickLinksWellness: QuickLink[] = [
  { icon: Activity, label: "Activity Tracker", href: "/wellness/activity", description: "Daily stats", accent: "hsl(142 71% 45%)" },
  { icon: Dumbbell, label: "Workouts", href: "/wellness/workouts", description: "Plans & guides", accent: "hsl(0 84% 60%)" },
  { icon: Heart, label: "Health Vitals", href: "/wellness/vitals", description: "HR, BP, sleep", accent: "hsl(340 75% 55%)" },
  { icon: Brain, label: "Mindfulness", href: "/wellness/mindfulness", description: "Meditation", accent: "hsl(263 70% 58%)" },
  { icon: Stethoscope, label: "Telehealth", href: "/wellness/telehealth", description: "Talk to a doctor", accent: "hsl(199 89% 48%)" },
  { icon: Pill, label: "Medications", href: "/wellness/meds", description: "Reminders", accent: "hsl(38 92% 50%)" },
  { icon: UtensilsCrossed, label: "Nutrition", href: "/wellness/nutrition", description: "Track meals", accent: "hsl(25 95% 53%)" },
  { icon: Trophy, label: "Goals", href: "/wellness/goals", description: "Set targets", accent: "hsl(45 93% 58%)" },
];

const quickLinksAI: QuickLink[] = [
  { icon: Sparkles, label: "AI Trip Planner", href: "/ai-trip-planner", description: "Plan with AI", accent: "hsl(263 70% 58%)", badge: "AI" },
  { icon: Search, label: "Smart Search", href: "/smart-search", description: "Semantic search", accent: "hsl(199 89% 48%)", badge: "AI" },
  { icon: PenTool, label: "AI Content Studio", href: "/shop-dashboard/ai-content", description: "Auto-write copy", accent: "hsl(263 70% 58%)", badge: "AI" },
  { icon: Palette, label: "AI Creative", href: "/shop-dashboard/ai-creative", description: "Visual generator", accent: "hsl(340 75% 55%)", badge: "AI" },
  { icon: Cpu, label: "AR Filters Studio", href: "/filters", description: "Effects & masks", accent: "hsl(263 70% 58%)" },
  { icon: Pencil, label: "Whiteboard AI", href: "/whiteboard", description: "Smart canvas", accent: "hsl(199 89% 48%)" },
  { icon: Languages, label: "Auto-Translate", href: "/account/translation", description: "AI translation", accent: "hsl(172 66% 50%)" },
  { icon: Rocket, label: "Boost Engine", href: "/shop-dashboard/boost-engine", description: "AI auto-promote", accent: "hsl(0 84% 60%)", badge: "AI" },
  { icon: TrendingUp, label: "Sales Attribution", href: "/shop-dashboard/attribution", description: "AI insights", accent: "hsl(45 93% 58%)" },
  { icon: BarChart3, label: "Creator Analytics", href: "/creator-analytics", description: "AI deep dive", accent: "hsl(263 70% 58%)" },
  { icon: GitBranch, label: "Content Scheduler", href: "/content-scheduler", description: "Smart timing", accent: "hsl(199 89% 48%)" },
  { icon: Brain, label: "Mindfulness AI", href: "/wellness/mindfulness", description: "Guided sessions", accent: "hsl(263 70% 58%)" },
  { icon: Stethoscope, label: "AI Telehealth", href: "/wellness/telehealth", description: "Symptom check", accent: "hsl(199 89% 48%)" },
];

const quickLinksMoney: QuickLink[] = [
  { icon: Wallet, label: "Wallet", href: "/wallet", description: "Balance & cards", accent: "hsl(142 71% 45%)" },
  { icon: Star, label: "ZIVO Coins", href: "/rewards", description: "Earn & redeem", accent: "hsl(45 93% 58%)" },
  { icon: Trophy, label: "Redeem Rewards", href: "/rewards/redeem", description: "Exchange points", accent: "hsl(38 92% 50%)" },
  { icon: CreditCard, label: "Payment Methods", href: "/account/wallet", description: "Cards & banks", accent: "hsl(199 89% 48%)" },
  { icon: Receipt, label: "Receipts", href: "/account/receipts", description: "Past payments", accent: "hsl(215 16% 47%)" },
  { icon: FileText, label: "Invoices", href: "/account/invoices", description: "Tax invoices", accent: "hsl(263 70% 58%)" },
  { icon: Building, label: "Tax Info", href: "/account/tax", description: "1099 & docs", accent: "hsl(215 16% 47%)" },
  { icon: ScrollText, label: "Subscriptions", href: "/account/subscriptions", description: "Plans & renewals", accent: "hsl(263 70% 58%)" },
  { icon: Crown, label: "ZIVO Plus", href: "/zivo-plus", description: "Premium plan", accent: "hsl(45 93% 58%)" },
  { icon: Award, label: "Membership", href: "/membership", description: "Tier benefits", accent: "hsl(38 92% 50%)" },
  { icon: Ticket, label: "Gift Cards", href: "/account/gift-cards", description: "Buy & redeem", accent: "hsl(340 75% 55%)" },
  { icon: Tag, label: "Promo Codes", href: "/account/promos", description: "Active discounts", accent: "hsl(0 84% 60%)" },
  { icon: Gift, label: "Refer & Earn", href: "/referrals", description: "Invite friends", accent: "hsl(142 71% 45%)" },
  { icon: DollarSign, label: "Monetization", href: "/monetization", description: "Creator revenue", accent: "hsl(var(--primary))" },
  { icon: BookOpen, label: "Monetization Articles", href: "/monetization/articles", description: "Earn smarter", accent: "hsl(263 70% 58%)" },
  { icon: DollarSign, label: "Live Earnings", href: "/creator/live-earnings", description: "Real-time payouts", accent: "hsl(142 71% 45%)" },
  { icon: Banknote, label: "Driver Earnings", href: "/driver/earnings", description: "Trip income", accent: "hsl(142 71% 45%)" },
  { icon: BanknoteIcon, label: "Driver Payouts", href: "/driver/payouts", description: "Cash out", accent: "hsl(199 89% 48%)" },
  { icon: Wallet, label: "Shop Wallet", href: "/shop-dashboard/wallet", description: "Store earnings", accent: "hsl(142 71% 45%)" },
  { icon: TrendingUp, label: "Merchant ROI", href: "/shop-dashboard/roi", description: "Performance", accent: "hsl(198 93% 59%)" },
  { icon: FileSignature, label: "Tax Reports", href: "/shop-dashboard/tax-reports", description: "1099 & filings", accent: "hsl(142 71% 45%)" },
  { icon: Banknote, label: "Pay Stubs", href: "/personal/pay-stubs", description: "Job payments", accent: "hsl(142 71% 45%)" },
  { icon: AlertCircle, label: "Refunds", href: "/legal/refunds", description: "Request refund", accent: "hsl(0 84% 60%)" },
  { icon: FileBadge, label: "Refund Policy", href: "/legal/refunds", description: "Money-back rules", accent: "hsl(215 16% 47%)" },
];

const quickLinksDiscover: QuickLink[] = [
  { icon: Flame, label: "Trending", href: "/trending", description: "What's hot now", accent: "hsl(0 84% 60%)", badge: "Hot" },
  { icon: Search, label: "Universal Search", href: "/search", description: "Search everything", accent: "hsl(263 70% 58%)" },
  { icon: Compass, label: "Explore", href: "/explore", description: "Discover content", accent: "hsl(172 66% 50%)" },
  { icon: History, label: "View History", href: "/history", description: "Recently viewed", accent: "hsl(215 16% 47%)" },
  { icon: Bell, label: "Alerts", href: "/alerts", description: "Price & deal drops", accent: "hsl(45 93% 58%)" },
  { icon: Activity, label: "Activities", href: "/activities", description: "Local events", accent: "hsl(199 89% 48%)" },
  { icon: MapIcon, label: "City Guides", href: "/guides", description: "Travel tips", accent: "hsl(172 66% 50%)" },
  { icon: Clock, label: "Best Time to Book", href: "/guides/best-time-to-book", description: "Smart timing", accent: "hsl(45 93% 58%)" },
  { icon: Plane, label: "Cheap Flights Guide", href: "/guides/cheap-flights", description: "Save big", accent: "hsl(199 89% 48%)" },
  { icon: Star, label: "Brand Showcase", href: "/brand", description: "ZIVO brand kit", accent: "hsl(263 70% 58%)" },
  { icon: Sparkle, label: "What's New", href: "/roadmap", description: "Upcoming features", accent: "hsl(340 75% 55%)" },
  { icon: Megaphone, label: "Promotions", href: "/promotions", description: "Active campaigns", accent: "hsl(38 92% 50%)" },
];

const quickLinksSecurity: QuickLink[] = [
  { icon: Server, label: "Service Status", href: "/status", description: "Live uptime", accent: "hsl(142 71% 45%)" },
  { icon: ShieldCheck, label: "Trust Hub", href: "/security/trust", description: "Why ZIVO is safe", accent: "hsl(199 89% 48%)" },
  { icon: ShieldAlert, label: "Scam Center", href: "/security/scams", description: "Report fraud", accent: "hsl(0 84% 60%)" },
  { icon: Shield, label: "Zero Trust", href: "/security/zero-trust", description: "Architecture", accent: "hsl(263 70% 58%)" },
  { icon: Database, label: "Data Protection", href: "/security/data-protection", description: "Encryption & policies", accent: "hsl(199 89% 48%)" },
  { icon: Lock, label: "Privacy Compliance", href: "/security/privacy-compliance", description: "Regulations", accent: "hsl(45 93% 58%)" },
  { icon: Bug, label: "Vulnerability Disclosure", href: "/security/vulnerability-disclosure", description: "Report a bug", accent: "hsl(0 84% 60%)" },
  { icon: RefreshCw, label: "Disaster Recovery", href: "/security/disaster-recovery", description: "Backup posture", accent: "hsl(215 16% 47%)" },
  { icon: Activity, label: "Security Monitoring", href: "/security/monitoring", description: "Live signals", accent: "hsl(263 70% 58%)" },
  { icon: TrendingUp, label: "Scale Protection", href: "/security/scale-protection", description: "DDoS defense", accent: "hsl(38 92% 50%)" },
  { icon: AlarmClock, label: "Security Operations", href: "/security/operations", description: "24/7 SOC", accent: "hsl(0 84% 60%)" },
  { icon: ShieldCheck, label: "Compliance Center", href: "/compliance", description: "Audits & certs", accent: "hsl(142 71% 45%)" },
  { icon: BadgeCheck, label: "Enterprise Trust", href: "/enterprise-trust", description: "For business", accent: "hsl(199 89% 48%)" },
  { icon: Shield, label: "Enterprise Ready", href: "/enterprise-ready", description: "SOC2 & SSO", accent: "hsl(263 70% 58%)" },
];

const quickLinksCompany: QuickLink[] = [
  { icon: Info, label: "About ZIVO", href: "/about", description: "Our story", accent: "hsl(199 89% 48%)" },
  { icon: HandHeart, label: "Mission", href: "/mission", description: "Why we exist", accent: "hsl(340 75% 55%)" },
  { icon: Mountain, label: "Vision", href: "/vision", description: "Where we're going", accent: "hsl(263 70% 58%)" },
  { icon: GitBranch, label: "Roadmap", href: "/roadmap", description: "What's coming", accent: "hsl(172 66% 50%)" },
  { icon: Briefcase, label: "Careers", href: "/careers", description: "Join the team", accent: "hsl(221 83% 53%)" },
  { icon: Newspaper, label: "Press", href: "/press", description: "News & coverage", accent: "hsl(38 92% 50%)" },
  { icon: ShieldCheck, label: "Reliability", href: "/reliability", description: "Uptime promise", accent: "hsl(142 71% 45%)" },
  { icon: BadgeCheck, label: "Trust Statement", href: "/trust-statement", description: "Our commitments", accent: "hsl(199 89% 48%)" },
  { icon: Lightbulb, label: "How It Works", href: "/how-it-works", description: "Quick tour", accent: "hsl(45 93% 58%)" },
  { icon: Heart, label: "For Customers", href: "/for-customers", description: "Customer charter", accent: "hsl(340 75% 55%)" },
  { icon: Handshake, label: "Partners", href: "/partners", description: "Partner ecosystem", accent: "hsl(263 70% 58%)" },
  { icon: Code, label: "Developers", href: "/developers", description: "API & SDKs", accent: "hsl(215 16% 47%)" },
  { icon: Network, label: "API Partners", href: "/api-partners", description: "Integrations", accent: "hsl(199 89% 48%)" },
  { icon: Building, label: "Corporate", href: "/corporate", description: "Enterprise hub", accent: "hsl(215 16% 47%)" },
  { icon: FileText, label: "Terms of Service", href: "/legal/terms", description: "Legal terms", accent: "hsl(215 16% 47%)" },
  { icon: Lock, label: "Privacy Policy", href: "/legal/privacy", description: "How we handle data", accent: "hsl(263 70% 58%)" },
  { icon: Cookie, label: "Cookies Policy", href: "/legal/cookies", description: "Tracking notice", accent: "hsl(38 92% 50%)" },
  { icon: Banknote, label: "Refund Policy", href: "/legal/refunds", description: "Money back rules", accent: "hsl(142 71% 45%)" },
  { icon: AlertCircle, label: "Cancellation Policy", href: "/legal/cancellation", description: "Cancel rules", accent: "hsl(0 84% 60%)" },
  { icon: Mail, label: "Unsubscribe", href: "/unsubscribe", description: "Stop emails", accent: "hsl(215 16% 47%)" },
];

const sections = [
  { title: "Essentials", description: "Profile, orders, wallet, rewards, and daily account tasks.", icon: Layers, links: quickLinksMain },
  { title: "Creator Studio", description: "Content, analytics, monetization, and creator growth tools.", icon: Sparkles, links: quickLinksCreator },
  { title: "Travel & Orders", description: "Trips, bookings, rides, groceries, marketplace, and delivery.", icon: Plane, links: quickLinksTravel },
  { title: "Social", description: "Friends, communities, events, bookmarks, and discovery.", icon: Users, links: quickLinksSocial },
  { title: "Live & Streaming", description: "Live video, spaces, watch parties, and reels.", icon: Tv, links: quickLinksLive },
  { title: "Workplace & Jobs", description: "Jobs, schedules, timesheets, applications, and employee tools.", icon: Briefcase, links: quickLinksJobs },
  { title: "Business", description: "Shop, driver, restaurant, hotel, payroll, and merchant tools.", icon: Building2, links: quickLinksBusiness },
  { title: "Health & Wellness", description: "Activity, workouts, health, mindfulness, nutrition, and care.", icon: Heart, links: quickLinksWellness },
  { title: "Money & Earnings", description: "Payments, rewards, subscriptions, payouts, taxes, and refunds.", icon: Wallet, links: quickLinksMoney },
  { title: "AI & Tools", description: "Smart search, planning, creative tools, translation, and insights.", icon: Sparkles, links: quickLinksAI },
  { title: "Discover", description: "Trending pages, guides, promotions, roadmap, and local activity.", icon: Compass, links: quickLinksDiscover },
  { title: "Security & Trust", description: "Status, safety, scam reporting, compliance, and trust resources.", icon: Shield, links: quickLinksSecurity },
  { title: "Account & Support", description: "Preferences, privacy, devices, accessibility, and help channels.", icon: Settings, links: quickLinksAccount },
  { title: "Company & Legal", description: "About ZIVO, mission, careers, policies, developers, and press.", icon: Info, links: quickLinksCompany },
];

/* ============================================= */
/*  COMPONENT                                    */
/* ============================================= */
export default function MorePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { user, signOut, isAdmin } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [showPartnerSheet, setShowPartnerSheet] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const directorySearchRef = useRef<HTMLInputElement | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | "signout" | "switch">(null);

  // App version (from package.json via Vite define, falls back gracefully)
  const appVersion = (import.meta as any).env?.VITE_APP_VERSION || "1.0.6";

  // ===== Privacy mode (blurs sensitive numbers) =====
  const PRIVACY_KEY = "zivo:more:privacy";
  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(PRIVACY_KEY) === "1";
  });
  const togglePrivacy = () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    try { window.localStorage.setItem(PRIVACY_KEY, next ? "1" : "0"); } catch {}
    void logAccountHubActivity("more_preference_privacy", `${location.pathname}${location.search}#privacy-${next ? "on" : "off"}`);
    toast.message(next ? "Privacy mode on" : "Privacy mode off");
  };
  const blurClass = privacyMode ? "blur-sm select-none" : "";

  // ===== Help FAB sheet =====
  const [showHelpSheet, setShowHelpSheet] = useState(false);

  // ===== Quick share-profile dialog =====
  // Only the toggle state lives here; the URL + copy helper depend on `handle`,
  // which is computed further below — they're declared after `handle` to avoid
  // a temporal-dead-zone access via the useMemo deps array.
  const [showShareProfile, setShowShareProfile] = useState(false);

  // ===== Scroll-to-top button visibility =====
  const [showScrollTop, setShowScrollTop] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // ===== Device info (UA-based, lightweight) =====
  const deviceInfo = useMemo(() => {
    if (typeof navigator === "undefined") return { kind: "Web", platform: "Unknown" };
    const ua = navigator.userAgent;
    let kind = "Web";
    if (/iPhone|iPad|iPod/.test(ua)) kind = /iPad/.test(ua) ? "iPad" : "iPhone";
    else if (/Android/.test(ua)) kind = "Android";
    else if (/Mac/.test(ua)) kind = "Mac";
    else if (/Windows/.test(ua)) kind = "Windows";
    else if (/Linux/.test(ua)) kind = "Linux";
    let browser = "Browser";
    if (/Edg\//.test(ua)) browser = "Edge";
    else if (/Chrome\//.test(ua)) browser = "Chrome";
    else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
    else if (/Firefox\//.test(ua)) browser = "Firefox";
    return { kind, platform: browser };
  }, []);

  // ===== Region / Country switcher (localStorage) =====
  const REGION_KEY = "zivo:more:region";
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === "undefined") return "US";
    return window.localStorage.getItem(REGION_KEY) || "US";
  });
  const setRegionCode = (code: string) => {
    if (code === region) return;
    setRegion(code);
    try { window.localStorage.setItem(REGION_KEY, code); } catch {}
    const label = regions.find((r) => r.code === code)?.label ?? code;
    void logAccountHubActivity("more_preference_region", `${location.pathname}${location.search}#region-${code.toLowerCase()}`);
    toast.success(`Region set to ${label}`);
  };
  const regions = [
    { code: "US", flag: "🇺🇸", label: "United States" },
    { code: "GB", flag: "🇬🇧", label: "United Kingdom" },
    { code: "CA", flag: "🇨🇦", label: "Canada" },
    { code: "MX", flag: "🇲🇽", label: "Mexico" },
    { code: "BR", flag: "🇧🇷", label: "Brazil" },
    { code: "DE", flag: "🇩🇪", label: "Germany" },
    { code: "FR", flag: "🇫🇷", label: "France" },
    { code: "ES", flag: "🇪🇸", label: "Spain" },
    { code: "IT", flag: "🇮🇹", label: "Italy" },
    { code: "JP", flag: "🇯🇵", label: "Japan" },
    { code: "KR", flag: "🇰🇷", label: "South Korea" },
    { code: "IN", flag: "🇮🇳", label: "India" },
    { code: "AU", flag: "🇦🇺", label: "Australia" },
    { code: "SG", flag: "🇸🇬", label: "Singapore" },
  ];

  // ===== Voice search (Web Speech API) =====
  const [isListening, setIsListening] = useState(false);
  const speechRef = (typeof window !== "undefined"
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null);
  const startVoiceSearch = () => {
    if (!speechRef) {
      toggleVoiceFallback();
      return;
    }
    try {
      const rec = new speechRef();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onstart = () => setIsListening(true);
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      rec.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript ?? "";
        if (text) {
          setSearch(text);
          recordSearch(text);
        }
      };
      rec.start();
    } catch {
      setIsListening(false);
    }
  };
  const toggleVoiceFallback = () => {
    // No-op when speech is unavailable; would log telemetry in prod
  };

  // ===== PWA install prompt (beforeinstallprompt) =====
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [installDismissed, setInstallDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("zivo:more:install-dismissed") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const triggerInstall = async () => {
    if (!installPrompt) return;
    try {
      installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      const accepted = choice?.outcome === "accepted";
      void logAccountHubActivity(
        accepted ? "more_install_accepted" : "more_install_dismissed",
        `${location.pathname}${location.search}#install-app`,
      );
      toast[accepted ? "success" : "message"](accepted ? "ZIVO install started" : "Install dismissed");
      setInstallPrompt(null);
    } catch { /* user cancelled */ }
  };
  const dismissInstall = () => {
    setInstallDismissed(true);
    try { window.localStorage.setItem("zivo:more:install-dismissed", "1"); } catch {}
    void logAccountHubActivity("more_install_dismissed", `${location.pathname}${location.search}#install-dismissed`);
    toast.message("Install prompt hidden");
  };

  // ===== Recent searches (localStorage) =====
  const SEARCH_HISTORY_KEY = "zivo:more:searches";
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    return readStoredStringList(SEARCH_HISTORY_KEY, 5);
  });
  useEffect(() => {
    const cleaned = searchHistory.slice(0, 5);
    persistStoredStringList(SEARCH_HISTORY_KEY, cleaned, 5);
  }, [searchHistory]);
  const recordSearch = (q: string) => {
    const v = q.trim();
    if (v.length < 2) return;
    setSearchHistory((prev) => {
      const next = [v, ...prev.filter((s) => s.toLowerCase() !== v.toLowerCase())].slice(0, 5);
      persistStoredStringList(SEARCH_HISTORY_KEY, next, 5);
      return next;
    });
  };

  const clearDirectorySearch = useCallback(() => {
    setSearch("");
    requestAnimationFrame(() => directorySearchRef.current?.focus());
  }, []);

  // ===== Online / offline status =====
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const online = () => setIsOnline(true);
    const offline = () => setIsOnline(false);
    window.addEventListener("online", online);
    window.addEventListener("offline", offline);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // ===== Native share helper =====
  const shareApp = async () => {
    const url = (typeof window !== "undefined" ? window.location.origin : "https://zivo.app");
    const data = {
      title: "ZIVO",
      text: "ZIVO — travel, social, marketplace, all in one app",
      url,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(data);
        return;
      }
      await navigator.clipboard?.writeText(url);
    } catch { /* user cancelled */ }
  };

  // ===== Daily streak (localStorage) =====
  const STREAK_KEY = "zivo:more:streak";
  const streak = useMemo(() => {
    if (typeof window === "undefined") return { days: 1, lastDate: "" };
    try {
      const raw = window.localStorage.getItem(STREAK_KEY);
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
      if (!raw) {
        const init = { days: 1, lastDate: today };
        window.localStorage.setItem(STREAK_KEY, JSON.stringify(init));
        return init;
      }
      const parsed = JSON.parse(raw) as { days: number; lastDate: string };
      if (parsed.lastDate === today) return parsed;
      const next = {
        days: parsed.lastDate === yesterday ? parsed.days + 1 : 1,
        lastDate: today,
      };
      window.localStorage.setItem(STREAK_KEY, JSON.stringify(next));
      return next;
    } catch {
      return { days: 1, lastDate: "" };
    }
  }, []);

  // ===== Connected providers (from Supabase auth identities) =====
  const connectedProviders = useMemo(() => {
    const ids = ((user as any)?.identities ?? []) as Array<{ provider?: string }>;
    const set = new Set<string>();
    for (const id of ids) if (id.provider) set.add(id.provider);
    return Array.from(set);
  }, [user]);

  // ===== Quick toggles (localStorage) =====
  const DND_KEY = "zivo:more:dnd";
  const SOUND_KEY = "zivo:more:sound";
  const [dndOn, setDndOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(DND_KEY) === "1";
  });
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SOUND_KEY) !== "0";
  });
  const toggleDnd = () => {
    const next = !dndOn;
    setDndOn(next);
    try { window.localStorage.setItem(DND_KEY, next ? "1" : "0"); } catch {}
    void logAccountHubActivity("more_preference_dnd", `${location.pathname}${location.search}#dnd-${next ? "on" : "off"}`);
    toast.message(next ? "Do Not Disturb on" : "Do Not Disturb off");
  };
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try { window.localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch {}
    void logAccountHubActivity("more_preference_sound", `${location.pathname}${location.search}#sound-${next ? "on" : "off"}`);
    toast.message(next ? "App sounds on" : "App sounds muted");
  };

  // ===== Density preference (localStorage) =====
  const DENSITY_KEY = "zivo:more:density";
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    if (typeof window === "undefined") return "comfortable";
    try {
      const v = window.localStorage.getItem(DENSITY_KEY);
      return v === "compact" ? "compact" : "comfortable";
    } catch {
      return "comfortable";
    }
  });
  // ===== Recently Used (localStorage) =====
  const RECENT_KEY = "zivo:more:recent";
  const [recentHrefs, setRecentHrefs] = useState<string[]>(() => {
    return readStoredStringList(RECENT_KEY, 8);
  });
  const trackRecent = (href: string) => {
    const normalizedHref = normalizeInternalHref(href);
    if (!normalizedHref) return;
    setRecentHrefs((prev) => {
      const next = [normalizedHref, ...prev.filter((h) => h !== normalizedHref)].slice(0, 8);
      persistStoredStringList(RECENT_KEY, next, 8);
      return next;
    });
  };

  // ===== Pinned / Favorites (localStorage) =====
  const PIN_KEY = "zivo:more:pinned";
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(() => {
    return readStoredStringList(PIN_KEY, 12);
  });
  const togglePin = (href: string) => {
    const normalizedHref = normalizeInternalHref(href);
    if (!normalizedHref) return;
    setPinnedHrefs((prev) => {
      const next = prev.includes(normalizedHref)
        ? prev.filter((h) => h !== normalizedHref)
        : [normalizedHref, ...prev.filter((h) => h !== normalizedHref)].slice(0, 12);
      persistStoredStringList(PIN_KEY, next, 12);
      return next;
    });
  };

  // Time-based greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Still up";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Shared profile data — same source as /profile, so the name/badge stay in sync
  const { data: profile, isError: hasProfileError, isLoading: isProfileLoading } = useUserProfile();
  const { username: claimedUsername } = useUsername();
  const { balance: coinBalance } = useCoinBalance();
  const { isPlus, plan } = useZivoPlus();
  const { isOFMode: zivoOFMode } = useZivoOFMode();

  // Real post count — matches /profile
  const { data: postsCount = 0, isError: hasPostsCountError, isLoading: isPostsCountLoading } = useQuery({
    queryKey: ["more-posts", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("user_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Real friend count (accepted friendships) — matches /profile
  const { data: friendCount = 0, isError: hasFriendCountError, isLoading: isFriendCountLoading } = useQuery({
    queryKey: ["more-friends", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user!.id},friend_id.eq.${user!.id}`);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Unread notification count (lightweight count query)
  const { data: unreadNotifCount = 0, isError: hasUnreadNotifError, isLoading: isUnreadNotifLoading } = useQuery({
    queryKey: ["more-unread-notifs", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, title, body, action_url")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(100);
      return ((data || []) as MoreNotificationPreview[]).filter((notification) => !isMoreChatNotification(notification)).length;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Upcoming flight bookings count
  const { data: upcomingFlightCount = 0, isError: hasUpcomingFlightsError, isLoading: isUpcomingFlightsLoading } = useQuery({
    queryKey: ["more-upcoming-flights", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("flight_bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("departure_at", new Date().toISOString());
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Active grocery / eats orders count (in-progress)
  const { data: activeOrdersCount = 0, isError: hasActiveOrdersError, isLoading: isActiveOrdersLoading } = useQuery({
    queryKey: ["more-active-orders", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .in("status", ["pending", "confirmed", "preparing", "in_transit", "out_for_delivery"]);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Last 3 unread notifications (preview)
  const {
    data: notifPreview = [],
    isError: hasNotifPreviewError,
    isLoading: isNotifPreviewLoading,
  } = useQuery<MoreNotificationPreview[]>({
    queryKey: ["more-notif-preview", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, title, body, action_url, created_at")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(20);
      return ((data || []) as MoreNotificationPreview[])
        .filter((notification) => !isMoreChatNotification(notification))
        .slice(0, 3);
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Pending friend requests
  const { data: pendingRequestsCount = 0, isError: hasPendingRequestsError, isLoading: isPendingRequestsLoading } = useQuery({
    queryKey: ["more-pending-friends", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .eq("friend_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  // Build dynamic numeric badges by href
  const dynamicBadges = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    if (unreadNotifCount > 0) {
      const v = unreadNotifCount > 99 ? "99+" : String(unreadNotifCount);
      m["/notification-center"] = v;
      m["/account/notifications"] = v;
      m["/notifications"] = v;
    }
    if (pendingRequestsCount > 0) {
      const v = pendingRequestsCount > 99 ? "99+" : String(pendingRequestsCount);
      m["/notifications?tab=requests"] = v;
    }
    return m;
  }, [unreadNotifCount, pendingRequestsCount]);

  // Real follower count (people following this user)
  const { data: followerCount = 0, isError: hasFollowersError, isLoading: isFollowersLoading } = useQuery({
    queryKey: ["more-followers", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("user_followers")
        .select("id", { count: "exact", head: true })
        .eq("following_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  // Real following count (people this user follows)
  const { data: followingCount = 0, isError: hasFollowingError, isLoading: isFollowingLoading } = useQuery({
    queryKey: ["more-following", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("user_followers")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "User";
  const avatarUrl = profile?.avatar_url;
  const isVerified = profile?.is_verified;

  const handle = claimedUsername
    || (profile?.full_name?.trim() || user?.email?.split("@")[0] || "user")
        .toLowerCase()
        .replace(/\s+/g, "");

  // Profile-share URL + copy/share helpers — depend on `handle` above.
  const profileShareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const profileId = user?.id;
    return profileId
      ? `${window.location.origin}/user/${profileId}?from=more`
      : `${window.location.origin}/u/${handle}`;
  }, [handle, user?.id]);
  const logAccountHubActivity = useCallback(async (source = "more", pathOverride?: string) => {
    if (!user?.id || typeof window === "undefined") return;
    const path = pathOverride || `${location.pathname}${location.search}`;
    try {
      const { error } = await (supabase as any)
        .from("account_hub_activity")
        .insert({
          user_id: user.id,
          source,
          path,
          region_code: region,
          device_kind: deviceInfo.kind,
          platform: deviceInfo.platform,
        });
      if (error) return;
      void queryClient.invalidateQueries({ queryKey: ["more-account-hub-activity", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["activity-log", user.id] });
    } catch {
      /* activity tracking is best effort */
    }
  }, [deviceInfo.kind, deviceInfo.platform, location.pathname, location.search, queryClient, region, user?.id]);
  const copyProfileLink = async () => {
    try {
      await navigator.clipboard?.writeText(profileShareUrl);
      void logAccountHubActivity("more_profile_copy", `${location.pathname}${location.search}#copy-profile`);
      toast.success("Profile link copied");
    } catch {
      toast.error("Couldn't copy profile link");
    }
  };
  const shareProfile = async () => {
    const data = {
      title: `${displayName} on ZIVO`,
      text: `View ${displayName}'s ZIVO profile`,
      url: profileShareUrl,
    };
    try {
      if (typeof navigator !== "undefined" && (navigator as any).share) {
        await (navigator as any).share(data);
        void logAccountHubActivity("more_profile_share", `${location.pathname}${location.search}#share-profile`);
        return;
      }
      await navigator.clipboard?.writeText(profileShareUrl);
      void logAccountHubActivity("more_profile_share", `${location.pathname}${location.search}#share-profile`);
      toast.success("Profile link copied");
    } catch {
      /* user cancelled */
    }
  };

  useEffect(() => {
    if (!user?.id || typeof window === "undefined") return;

    const path = `${location.pathname}${location.search}`;
    const eventKey = `zivo:account-hub-open:${user.id}:${path}`;
    if (window.sessionStorage.getItem(eventKey)) return;
    window.sessionStorage.setItem(eventKey, "1");

    void logAccountHubActivity("more", path);
  }, [location.pathname, location.search, logAccountHubActivity, user?.id]);

  const {
    data: hubActivityResult = { rows: [], syncAvailable: true },
    isLoading: hubActivityLoading,
  } = useQuery<MoreActivityResult>({
    queryKey: ["more-account-hub-activity", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("account_hub_activity")
        .select("id, source, path, region_code, device_kind, platform, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) return { rows: [], syncAvailable: false };
      return { rows: (data || []) as MoreActivityRow[], syncAvailable: true };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
  const hubActivity = hubActivityResult.rows;
  const hubActivitySyncAvailable = hubActivityResult.syncAvailable;

  // Email verification status (Supabase auth user has email_confirmed_at)
  const isEmailVerified = !!(user as any)?.email_confirmed_at || !!(user as any)?.confirmed_at;

  // Profile completion meter — checks fields users care about filling in
  const completion = useMemo(() => {
    const checks = [
      !!profile?.avatar_url,
      !!profile?.full_name?.trim(),
      !!claimedUsername,
      !!isVerified,
      !!(profile as any)?.bio,
      !!(profile as any)?.phone,
    ];
    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }, [profile, claimedUsername, isVerified]);

  const hasAnyMoreData =
    Boolean(profile) ||
    notifPreview.length > 0 ||
    postsCount > 0 ||
    friendCount > 0 ||
    followerCount > 0 ||
    followingCount > 0 ||
    unreadNotifCount > 0 ||
    pendingRequestsCount > 0 ||
    upcomingFlightCount > 0 ||
    activeOrdersCount > 0;

  const hasAnyMoreError =
    hasProfileError ||
    hasPostsCountError ||
    hasFriendCountError ||
    hasUnreadNotifError ||
    hasUpcomingFlightsError ||
    hasActiveOrdersError ||
    hasNotifPreviewError ||
    hasPendingRequestsError ||
    hasFollowersError ||
    hasFollowingError;

  const hasAnyMoreLoading =
    isProfileLoading ||
    isPostsCountLoading ||
    isFriendCountLoading ||
    isUnreadNotifLoading ||
    isUpcomingFlightsLoading ||
    isActiveOrdersLoading ||
    isNotifPreviewLoading ||
    isPendingRequestsLoading ||
    isFollowersLoading ||
    isFollowingLoading;

  const hasMoreRefreshError = hasAnyMoreData && hasAnyMoreError;
  const shouldShowMoreRecovery = Boolean(user) && !hasAnyMoreData && !hasAnyMoreLoading && hasAnyMoreError;

  const retryMoreQueries = useCallback(() => {
    if (!user?.id) return;
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["userProfile", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-posts", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-friends", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-unread-notifs", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-upcoming-flights", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-active-orders", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-notif-preview", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-pending-friends", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-followers", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-following", user.id] }),
      queryClient.invalidateQueries({ queryKey: ["more-account-hub-activity", user.id] }),
    ]);
  }, [queryClient, user?.id]);

  const VerifiedCheck = ({ size = 18 }: { size?: number }) => (
    <VerifiedBadge size={size} />
  );

  const accountHubStats = [
    { label: "Followers", value: formatCount(followerCount) ?? "0" },
    { label: "Following", value: formatCount(followingCount) ?? "0" },
    { label: "Posts", value: formatCount(postsCount) ?? "0" },
    { label: "Friends", value: formatCount(friendCount) ?? "0" },
  ];

  const toggleThemePreference = () => {
    // Dark mode is force-disabled app-wide (App.tsx forcedTheme="light") until
    // the design-system tokens are reauthored. setTheme is a no-op here, so we
    // don't call it or claim a theme switched — we tell the truth instead.
    void logAccountHubActivity("more_preference_theme", `${location.pathname}${location.search}#theme-soon`);
    toast.message("Dark mode is coming soon");
  };

  const formatActivityTime = (createdAt: string) => {
    const timestamp = new Date(createdAt).getTime();
    if (!Number.isFinite(timestamp)) return "Recently";
    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  const formatActivityPath = (path: string | null) => {
    if (!path) return "Account hub";
    const cleanPath = path.split("?")[0];
    const labels: Record<string, string> = {
      "/more": "Account hub",
      "/profile": "Profile",
      "/account/activity-log": "Activity log",
      "/account/security": "Security center",
      "/account/settings": "Account settings",
    };
    if (labels[cleanPath]) return labels[cleanPath];
    return cleanPath
      .replace(/^\//, "")
      .split("/")
      .filter(Boolean)
      .map((part) => part.replace(/-/g, " "))
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" / ") || "Account hub";
  };
  const formatActivityEventLabel = (activity: MoreActivityRow) => {
    const labels: Record<string, string> = {
      more: "Opened account hub",
      more_profile_copy: "Profile link copied",
      more_profile_share: "Profile shared",
      more_install_accepted: "App install started",
      more_install_dismissed: "App install dismissed",
      more_preference_theme: "Theme changed",
      more_preference_dnd: "Alert preference changed",
      more_preference_sound: "Sound preference changed",
      more_preference_region: "Region changed",
      more_preference_privacy: "Privacy mode changed",
      more_preference_density: "Directory view changed",
    };
    return labels[activity.source || ""] || formatActivityPath(activity.path);
  };
  const getActivityEventMeta = (source: string | null) => {
    const meta = {
      more_profile_copy: { icon: ExternalLink, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
      more_profile_share: { icon: Share2, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
      more_install_accepted: { icon: Download, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
      more_install_dismissed: { icon: X, className: "bg-muted text-muted-foreground" },
      more_preference_theme: { icon: Palette, className: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
      more_preference_dnd: { icon: Bell, className: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
      more_preference_sound: { icon: Volume2, className: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
      more_preference_region: { icon: Globe, className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
      more_preference_privacy: { icon: Eye, className: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
      more_preference_density: { icon: Layers, className: "bg-violet-500/10 text-violet-600 dark:text-violet-400" },
      more: { icon: Clock, className: "bg-muted text-muted-foreground" },
    } as const;
    return meta[(source || "more") as keyof typeof meta] || meta.more;
  };
  const latestHubActivityLabel = hubActivity[0]?.created_at
    ? formatActivityTime(hubActivity[0].created_at)
    : null;
  /* --- Account Hub Card --- */
  const renderProfileCard = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      role="region"
      aria-labelledby="more-profile-card-title"
      className="mb-4 overflow-hidden rounded-[2rem] border border-border/60 bg-card shadow-sm"
    >
      <div className="bg-secondary/45 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Account hub
            </p>
            <h2 id="more-profile-card-title" className="truncate text-xl font-extrabold leading-tight">
              {greeting}, {displayName.split(" ")[0]}
            </h2>
          </div>
          <Link
            to="/account/settings"
            onClick={() => trackRecent("/account/settings")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/80 text-foreground shadow-sm active:scale-95 transition-transform"
            aria-label="Open account settings"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <Link to="/profile" aria-label={`Open ${displayName}'s profile`} onClick={() => trackRecent("/profile")} className="shrink-0">
            <Avatar className="h-16 w-16 ring-4 ring-background shadow-md">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-[17px] font-extrabold leading-tight">{displayName}</p>
              {isVerified && <VerifiedCheck size={18} />}
            </div>
            <p className="mt-0.5 truncate text-[12px] font-medium text-muted-foreground">@{handle}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-bold",
                isEmailVerified
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
              )}>
                {isEmailVerified ? "Email secured" : "Verify email"}
              </Badge>
              <Badge className="rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                {(profile as any)?.tier ?? "Explorer"}
              </Badge>
              {isPlus && (
                <Badge className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                  <Crown className="mr-1 h-2.5 w-2.5" /> ZIVO+ {plan === "annual" ? "Annual" : "Monthly"}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 rounded-2xl bg-muted/35 p-2">
          {accountHubStats.map((stat) => (
            <div key={stat.label} className="min-w-0 text-center">
              <p className={cn("truncate text-[13px] font-extrabold leading-tight", blurClass)}>{stat.value}</p>
              <p className="truncate text-[9px] font-semibold text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/profile"
            aria-label={`View ${displayName}'s profile`}
            onClick={() => trackRecent("/profile")}
            className="flex items-center justify-center gap-2 rounded-2xl bg-foreground px-3 py-3 text-[13px] font-bold text-background active:scale-[0.98] transition-transform"
          >
            <User className="h-4 w-4" />
            View profile
          </Link>
          <Link
            to="/account/profile-edit"
            aria-label={`Edit ${displayName}'s profile`}
            onClick={() => trackRecent("/account/profile-edit")}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-3 text-[13px] font-bold text-foreground active:scale-[0.98] transition-transform"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Link>
        </div>

        {!isEmailVerified && (
          <Link
            to="/account/contact"
            aria-label="Verify email to protect payments, bookings, and account recovery"
            onClick={() => trackRecent("/account/contact")}
            className="mt-3 flex items-center gap-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2.5 active:scale-[0.99] transition-transform"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-bold text-amber-600 dark:text-amber-400">Verify your email</p>
              <p className="truncate text-[10px] text-muted-foreground">Protect payments, bookings, and account recovery.</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-amber-500" />
          </Link>
        )}
      </div>
    </motion.div>
  );

  /* --- Quick Actions Row --- */
  const renderQuickActions = () => {
    const priorityActions = [
      quickActions.find((action) => action.href === "/wallet"),
      quickActions.find((action) => action.href === "/grocery/orders"),
      quickActions.find((action) => action.href === "/saved"),
      quickActions.find((action) => action.href === "/qr-profile"),
      quickActions.find((action) => action.href === "/account/activity-log?filter=account_hub"),
      quickActions.find((action) => action.href === "/support/tickets"),
    ].filter(Boolean) as typeof quickActions;

    const getActionBadge = (href: string) => {
      if (href === "/grocery/orders" && activeOrdersCount > 0) return activeOrdersCount > 99 ? "99+" : String(activeOrdersCount);
      if (href === "/account/activity-log?filter=account_hub" && latestHubActivityLabel) return latestHubActivityLabel;
      return dynamicBadges[href];
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        role="region"
        aria-labelledby="more-quick-actions-title"
        className="mb-4 rounded-2xl border border-border/50 bg-card/70 p-2.5"
      >
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <h2 id="more-quick-actions-title" className="text-[12px] font-extrabold">Quick actions</h2>
            <p className="text-[10px] font-medium text-muted-foreground">Common tasks.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {priorityActions.map((action, i) => {
            const badge = getActionBadge(action.href);
            return (
              <Link
                key={action.label}
                to={action.href}
                aria-label={badge ? `Open ${action.label}, ${badge}` : `Open ${action.label}`}
                onClick={() => trackRecent(action.href)}
                className="group relative rounded-xl bg-muted/35 p-2 active:scale-[0.97] transition-transform"
              >
                {badge && (
                  <span className="absolute right-1.5 top-1.5 max-w-[54px] truncate rounded-full bg-foreground px-1.5 py-0.5 text-center text-[9px] font-bold leading-none text-background">
                    {badge}
                  </span>
                )}
                <motion.div
                  initial={{ scale: 0.86, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.03, type: "spring", stiffness: 300, damping: 22 }}
                  className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: `${action.accent}14`, color: action.accent }}
                >
                  <action.icon className="h-4 w-4" />
                </motion.div>
                <span className="block truncate text-[10px] font-extrabold leading-tight">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    );
  };

  /* --- Link Row --- */
  const renderLink = (link: QuickLink, i: number) => {
    const isPartner = link.href === "#partner";
    const isSwitch = link.href === "#switch-account";
    const isTheme = link.href === "#theme-toggle";
    const isAction = isPartner || isSwitch || isTheme;
    const canPin = !isAction && !link.href.startsWith("#");
    const isPinned = canPin && pinnedHrefs.includes(link.href);
    const accent = getAccentClasses(link.accent);
    const isDestructive = /delete|report|scam|refund/i.test(`${link.label} ${link.description}`);

    const handleAction = () => {
      if (isPartner) setShowPartnerSheet(true);
      else if (isSwitch) setConfirmAction("switch");
      else if (isTheme) toggleThemePreference();
    };

    // Dynamic right-side content: theme row shows current theme label
    const rightSlot = isTheme ? (
      <span className="text-[11px] font-semibold text-muted-foreground capitalize mr-1">
        {resolvedTheme ?? theme ?? "system"}
      </span>
    ) : null;

    const inner = (
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.02, duration: 0.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={isAction ? handleAction : undefined}
        className={cn(
          "group relative flex cursor-pointer items-center overflow-hidden border border-border/45 bg-background/70 shadow-sm transition hover:border-border/80 hover:bg-card hover:shadow-md",
          density === "compact" ? "gap-2 rounded-2xl p-2" : "gap-3 rounded-[1.15rem] p-3",
        )}
      >
        <span
          className={cn(
            "absolute bottom-3 left-0 top-3 w-0.5 rounded-r-full opacity-70",
            isDestructive && "bg-rose-500",
          )}
          style={isDestructive ? undefined : { backgroundColor: link.accent }}
        />
        <div className={cn(
          "flex shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-background/60",
          density === "compact" ? "h-8 w-8" : "h-10 w-10",
          isDestructive ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : accent.text,
          isDestructive ? "" : accent.bg,
        )}>
          {isTheme ? (
            (resolvedTheme ?? theme) === "dark"
              ? <Moon className={cn("h-[18px] w-[18px]", isDestructive ? "text-rose-500" : accent.text)} />
              : <Sun className={cn("h-[18px] w-[18px]", isDestructive ? "text-rose-500" : accent.text)} />
          ) : (
            <link.icon className={cn("h-[18px] w-[18px]", isDestructive ? "text-rose-500" : accent.text)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn(
              "truncate font-bold leading-tight",
              density === "compact" ? "text-[12px]" : "text-[13px]",
              isDestructive && "text-rose-600 dark:text-rose-400",
            )}>
              {link.label}
            </p>
            {link.badge && (
              <span className="rounded-full bg-foreground px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-background">
                {link.badge}
              </span>
            )}
            {dynamicBadges[link.href] && (
              <span className="text-[9px] font-bold text-white bg-foreground rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {dynamicBadges[link.href]}
              </span>
            )}
          </div>
          {density !== "compact" && (
            <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{link.description}</p>
          )}
        </div>
        {rightSlot}
        {canPin && (
          <button
            type="button"
            aria-label={isPinned ? `Unpin ${link.label}` : `Pin ${link.label} to shortcuts`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!normalizeInternalHref(link.href)) return;
              togglePin(link.href);
              toast.success(isPinned ? `${link.label} removed from shortcuts` : `${link.label} pinned`);
            }}
            className={cn(
              "rounded-full p-1.5 active:scale-90 transition",
              isPinned ? "bg-amber-400/15" : "opacity-50 hover:bg-muted/70 group-hover:opacity-100",
            )}
          >
            <Star
              className={cn(
                "h-3.5 w-3.5",
                isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              )}
            />
          </button>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/25 transition-transform group-hover:translate-x-0.5" />
      </motion.div>
    );

    if (isAction) return <Fragment key={link.label}>{inner}</Fragment>;
    return (
      <Link
        key={link.label}
        to={link.href}
        className="contents"
        onClick={() => canPin && trackRecent(link.href)}
      >
        {inner}
      </Link>
    );
  };

  /* --- Collapsible Section --- */
  const renderSection = (section: typeof sections[0], si: number) => {
    const isOpen = expandedSection === "__all__" || expandedSection === section.title;
    const SectionIcon = section.icon;
    const sectionId = `more-section-${section.title.replace(/\s+/g, "-").toLowerCase()}`;
    const panelId = `${sectionId}-panel`;
    const pinnedInSection = section.links.filter((link) => pinnedHrefs.includes(link.href)).length;
    const previewLinks = section.links.slice(0, 3);
    const remainingPreviewCount = Math.max(0, section.links.length - previewLinks.length);

    return (
      <motion.div
        key={section.title}
        id={sectionId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: si * 0.04, duration: 0.3 }}
        className="mb-3 overflow-hidden rounded-[1.5rem] border border-border/55 bg-card/70 shadow-sm [scroll-margin-top:88px]"
      >
        <button type="button"
          onClick={() => setExpandedSection(isOpen ? null : section.title)}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className={cn(
            "w-full touch-manipulation px-3 py-3 text-left transition-colors",
            isOpen ? "bg-muted/30" : "hover:bg-muted/20",
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                isOpen ? "bg-foreground text-background" : "bg-muted text-foreground",
              )}>
                <SectionIcon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <h2 className="truncate text-[14px] font-extrabold leading-tight">{section.title}</h2>
                  {pinnedInSection > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                      {formatShortcutCount(pinnedInSection, "pinned")}
                    </span>
                  )}
                </div>
                <p className="truncate text-[10px] font-semibold text-muted-foreground">
                  {formatToolCount(section.links.length)} · {section.description}
                </p>
              </div>
            </div>
            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </motion.div>
          </div>
          {!isOpen && (
            <div className="mt-2 flex gap-1.5 overflow-hidden pl-11">
              {previewLinks.map((link) => (
                <span
                  key={link.href}
                  className="max-w-[32%] truncate rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-bold text-muted-foreground"
                >
                  {link.label}
                </span>
              ))}
              {remainingPreviewCount > 0 && (
                <span className="shrink-0 rounded-full bg-foreground/8 px-2 py-0.5 text-[10px] font-extrabold text-muted-foreground">
                  +{remainingPreviewCount}
                </span>
              )}
            </div>
          )}
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className={cn("px-2 pb-2 pt-2", density === "compact" ? "grid grid-cols-2 gap-1.5" : "space-y-1.5")}>
                {section.links.map((link, i) => renderLink(link, i))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  /* --- Total link count --- */
  const totalLinks = sections.reduce((sum, s) => sum + s.links.length, 0);

  const recentCatalogLinks = useMemo(() => {
    const sectionLinks = sections.flatMap((s) => s.links);
    const sectionHrefs = new Set(sectionLinks.map((link) => link.href));
    const quickActionOnlyLinks: QuickLink[] = quickActions
      .filter((action) => !sectionHrefs.has(action.href))
      .map((action) => ({
        icon: action.icon,
        label: action.label,
        href: action.href,
        description: "Quick action",
        accent: action.accent,
      }));
    const extras: QuickLink[] = [
      ...quickActionOnlyLinks,
      ...partnerOptions.map((opt) => ({ ...opt })),
      ...(isAdmin ? [{
        icon: Shield,
        label: "Admin dashboard",
        href: "/admin/god-view",
        description: "Moderation, reports, and system tools",
        accent: "hsl(var(--primary))",
      }] : []),
    ];
    const byHref = new Map<string, QuickLink>();
    [...sectionLinks, ...extras].forEach((link) => {
      const href = normalizeInternalHref(link.href);
      if (!href || byHref.has(href)) return;
      byHref.set(href, { ...link, href });
    });
    return Array.from(byHref.values());
  }, [isAdmin]);

  useEffect(() => {
    if (!recentHrefs.length || typeof window === "undefined") return;
    const validHrefs = new Set(recentCatalogLinks.map((link) => link.href));
    const cleaned = recentHrefs.filter((href) => validHrefs.has(href)).slice(0, 8);
    if (sameStringList(cleaned, recentHrefs)) return;
    setRecentHrefs(cleaned);
    persistStoredStringList(RECENT_KEY, cleaned, 8);
  }, [recentCatalogLinks, recentHrefs]);

  useEffect(() => {
    if (!pinnedHrefs.length || typeof window === "undefined") return;
    const validHrefs = new Set(recentCatalogLinks.map((link) => link.href));
    const cleaned = pinnedHrefs.filter((href) => validHrefs.has(href)).slice(0, 12);
    if (sameStringList(cleaned, pinnedHrefs)) return;
    setPinnedHrefs(cleaned);
    persistStoredStringList(PIN_KEY, cleaned, 12);
  }, [pinnedHrefs, recentCatalogLinks]);

  /* --- Pinned links resolved against all sections --- */
  const pinnedLinks = useMemo(() => {
    if (!pinnedHrefs.length) return [];
    const byHref = new Map<string, QuickLink>(recentCatalogLinks.map((l) => [l.href, l]));
    return pinnedHrefs.map((h) => byHref.get(h)).filter(Boolean) as QuickLink[];
  }, [pinnedHrefs, recentCatalogLinks]);

  /* --- Recent links (last 8 clicks, dedup against pinned) --- */
  const recentLinks = useMemo(() => {
    if (!recentHrefs.length) return [];
    const byHref = new Map<string, QuickLink>(recentCatalogLinks.map((l) => [l.href, l]));
    const pinnedSet = new Set(pinnedHrefs);
    return recentHrefs
      .filter((h) => !pinnedSet.has(h))
      .map((h) => byHref.get(h))
      .filter(Boolean)
      .slice(0, 6) as QuickLink[];
  }, [recentHrefs, pinnedHrefs, recentCatalogLinks]);

  const recommendedShortcutLinks = useMemo(() => {
    const wanted = ["/wallet", "/account/security", "/support/tickets", "/qr-profile", "/saved", "/my-trips"];
    return wanted
      .map((href) => recentCatalogLinks.find((link) => link.href === href))
      .filter(Boolean)
      .slice(0, 6) as QuickLink[];
  }, [recentCatalogLinks]);

  const shortcutLinks = useMemo(() => {
    const seen = new Set<string>();
    const combined = [...pinnedLinks, ...recentLinks].filter((link) => {
      if (seen.has(link.href)) return false;
      seen.add(link.href);
      return true;
    });
    return combined.length > 0 ? combined.slice(0, 6) : recommendedShortcutLinks;
  }, [pinnedLinks, recentLinks, recommendedShortcutLinks]);

  const hasSavedShortcuts = pinnedLinks.length > 0 || recentLinks.length > 0;
  const shortcutSourceLabel = (href: string) => {
    if (pinnedHrefs.includes(href)) return "Pinned";
    if (recentHrefs.includes(href)) return "Recent";
    return "Suggested";
  };

  /* --- Search across all sections with category context --- */
  const searchResults = useMemo<MoreSearchResult[] | null>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return sections.flatMap((section) =>
      section.links
        .filter(
          (link) =>
            link.label.toLowerCase().includes(q) ||
            link.description.toLowerCase().includes(q) ||
            section.title.toLowerCase().includes(q),
        )
        .map((link) => ({
          link,
          sectionTitle: section.title,
          sectionIcon: section.icon,
        })),
    );
  }, [search]);

  const searchResultGroups = useMemo(() => {
    if (!searchResults) return null;
    return sections
      .map((section) => ({
        title: section.title,
        icon: section.icon,
        results: searchResults.filter((result) => result.sectionTitle === section.title),
      }))
      .filter((group) => group.results.length > 0);
  }, [searchResults]);
  const searchSummary = searchResults
    ? `${formatMatchCount(searchResults.length)} for "${search.trim()}"${searchResultGroups?.length ? ` in ${formatSectionCount(searchResultGroups.length)}` : ""}`
    : "";

  const searchSuggestions = ["wallet", "orders", "support", "security", "travel", "business"];

  const openDirectoryResult = (link: QuickLink) => {
    if (link.href === "#partner") {
      setShowPartnerSheet(true);
      return;
    }
    if (link.href === "#switch-account") {
      setConfirmAction("switch");
      return;
    }
    if (link.href === "#theme-toggle") {
      toggleThemePreference();
      return;
    }
    trackRecent(link.href);
    navigate(link.href);
  };

  // Expand-all toggle: store array of expanded titles when "all" is chosen
  const [allExpanded, setAllExpanded] = useState(false);
  const toggleAll = () => {
    setAllExpanded((prev) => {
      const next = !prev;
      setExpandedSection(next ? "__all__" : null);
      return next;
    });
  };
  const isDirectoryChipActive = (title: string) => allExpanded || expandedSection === title;
  const activeDirectorySection = sections.find((section) => section.title === expandedSection);
  const activeDirectoryLabel = allExpanded
    ? `Showing all ${formatSectionCount(sections.length)}`
    : activeDirectorySection
      ? `Showing ${activeDirectorySection.title}`
      : "Choose a section";
  const activeDirectoryCount = allExpanded ? totalLinks : activeDirectorySection?.links.length ?? 0;

  const handleConfirm = () => {
    if (confirmAction === "switch") {
      signOut();
      navigate("/login?intent=switch");
    } else if (confirmAction === "signout") {
      signOut();
    }
    setConfirmAction(null);
  };
  const rawReturnTarget = new URLSearchParams(location.search).get("from") || "profile";
  const returnTarget = rawReturnTarget
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9/_-]/gi, "")
    .split("/")
    .filter(Boolean)
    .join("/") || "profile";
  const returnLabel = returnTarget.split("/").pop()!
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background safe-area-bottom">
      <SEOHead title="More – ZIVO" description="Quick access to all ZIVO features and settings." noIndex />

      <div className="hidden lg:block"><NavBar /></div>

      {/* Mobile sticky header */}
      <header
        className="zivo-pt-safe-sticky sticky top-0 z-30 flex items-center gap-3 border-b border-border/40 bg-background/90 px-3 pb-2 pt-safe backdrop-blur-xl lg:hidden"
      >
        <button type="button"
          onClick={() => {
            navigate(`/${returnTarget}`);
          }}
          aria-label={`Back to ${returnLabel}`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/55 text-foreground transition-transform hover:bg-muted active:scale-90"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[16px] font-extrabold leading-tight">Account hub</h1>
          <p className="truncate text-[10px] font-semibold text-muted-foreground">
            Tools, settings, support
          </p>
        </div>
        <button type="button"
          onClick={() => user ? setShowShareProfile(true) : shareApp()}
          aria-label={user ? "Share your profile" : "Share ZIVO"}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/55 text-foreground transition-transform hover:bg-muted active:scale-90"
        >
          <Share2 className="h-[18px] w-[18px]" />
        </button>
        <button type="button"
          onClick={() => setShowHelpSheet(true)}
          aria-label="Open More help"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform active:scale-90"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 lg:flex lg:pt-16">
        <FeedSidebar />

        <main
          className={cn(
            "flex-1 flex flex-col px-5 pb-28 pt-4 lg:pt-6 lg:pb-8 lg:max-w-3xl lg:mx-auto zivo-aurora",
          )}
        >
          {hasMoreRefreshError && (
            <DegradedDataBanner
              className="mb-3"
              message="Showing cached account data. Refresh failed."
              onRetry={retryMoreQueries}
              trackingContext="more"
            />
          )}

          {shouldShowMoreRecovery && (
            <LoadFailureCard
              className="mb-4"
              title="Account refresh failed"
              description="We couldn&apos;t load your account hub right now. Retry to restore your profile and shortcuts."
              onRetry={retryMoreQueries}
              onSecondary={() => navigate('/feed')}
              secondaryLabel="Go Feed"
              trackingContext="more"
            />
          )}

          {/* Profile Card */}
          {user && renderProfileCard()}

          {/* Guest empty state */}
          {!user && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              role="region"
              aria-labelledby="more-guest-title"
              className="zivo-card-organic p-5 mb-5 relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 id="more-guest-title" className="font-bold text-[18px] mb-1">Welcome to ZIVO</h2>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                  Sign in to access {totalLinks} features — book travel, earn coins, manage orders,
                  and more.
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    aria-label="Sign in to ZIVO"
                    className="flex-1 py-2.5 rounded-full bg-ig-gradient text-white font-bold text-[13px] text-center active:scale-95 transition-transform"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    aria-label="Create a ZIVO account"
                    className="flex-1 py-2.5 rounded-full border border-border bg-card text-foreground font-bold text-[13px] text-center active:scale-95 transition-transform"
                  >
                    Create account
                  </Link>
                </div>
                <Link
                  to="/install"
                  aria-label="Download the ZIVO app"
                  className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Or download the app
                </Link>
              </div>
            </motion.div>
          )}

          {/* Quick Actions */}
          {user && renderQuickActions()}

          {/* Preferences panel */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              role="region"
              aria-labelledby="more-preferences-title"
              className="mb-5 rounded-[1.75rem] border border-border/60 bg-card p-3 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="more-preferences-title" className="text-[15px] font-extrabold">Preferences</h2>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {deviceInfo.kind} • {deviceInfo.platform} • {regions.find((r) => r.code === region)?.label ?? region}
                  </p>
                </div>
                <Link
                  to="/account/preferences"
                  aria-label="Manage account preferences"
                  className="rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-bold text-foreground active:scale-95 transition-transform"
                >
                  Manage
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button type="button"
                  onClick={toggleThemePreference}
                  aria-label={`Theme is ${resolvedTheme ?? theme ?? "auto"}. Switch to ${(resolvedTheme ?? theme) === "dark" ? "light" : "dark"} theme`}
                  className="rounded-2xl bg-muted/45 px-3 py-3 text-left active:scale-[0.97] transition-transform"
                >
                  {(resolvedTheme ?? theme) === "dark"
                    ? <Moon className="mb-2 h-4 w-4 text-amber-400" />
                    : <Sun className="mb-2 h-4 w-4 text-amber-500" />}
                  <p className="truncate text-[11px] font-extrabold capitalize">{resolvedTheme ?? theme ?? "auto"}</p>
                  <p className="truncate text-[9px] font-medium text-muted-foreground">Theme</p>
                </button>
                <button type="button"
                  onClick={toggleDnd}
                  aria-pressed={dndOn}
                  aria-label={dndOn ? "Turn do not disturb off" : "Turn do not disturb on"}
                  className="rounded-2xl bg-muted/45 px-3 py-3 text-left active:scale-[0.97] transition-transform"
                >
                  <Bell className={cn("mb-2 h-4 w-4", dndOn ? "text-rose-500" : "text-emerald-500")} />
                  <p className="truncate text-[11px] font-extrabold">{dndOn ? "DnD on" : "DnD off"}</p>
                  <p className="truncate text-[9px] font-medium text-muted-foreground">Alerts</p>
                </button>
                <button type="button"
                  onClick={toggleSound}
                  aria-pressed={soundOn}
                  aria-label={soundOn ? "Mute app sounds" : "Turn app sounds on"}
                  className="rounded-2xl bg-muted/45 px-3 py-3 text-left active:scale-[0.97] transition-transform"
                >
                  <Volume2 className={cn("mb-2 h-4 w-4", soundOn ? "text-sky-500" : "text-muted-foreground")} />
                  <p className="truncate text-[11px] font-extrabold">{soundOn ? "Sound on" : "Muted"}</p>
                  <p className="truncate text-[9px] font-medium text-muted-foreground">Audio</p>
                </button>
              </div>

              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
                {regions.slice(0, 6).map((r) => (
                  <button type="button"
                    key={r.code}
                    onClick={() => setRegionCode(r.code)}
                    aria-pressed={region === r.code}
                    aria-current={region === r.code ? "true" : undefined}
                    aria-label={region === r.code ? `Current region ${r.label}` : `Switch to ${r.label}`}
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold transition active:scale-95",
                      region === r.code
                        ? "bg-foreground text-background"
                        : "bg-muted/60 text-muted-foreground",
                    )}
                  >
                    {r.flag} {r.code}
                  </button>
                ))}
              </div>
            </motion.div>
          )}


          {/* Shortcuts */}
          {!searchResults && shortcutLinks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              role="region"
              aria-labelledby="more-shortcuts-title"
              className="mb-4 rounded-[1.5rem] border border-border/55 bg-card/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    {hasSavedShortcuts ? (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                    ) : (
                      <Compass className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 id="more-shortcuts-title" className="truncate text-[14px] font-extrabold">
                      {hasSavedShortcuts ? "Your shortcuts" : "Recommended"}
                    </h2>
                    <p className="truncate text-[10px] font-semibold text-muted-foreground">
                      {hasSavedShortcuts ? "Pinned and recently used tools." : "Good places to start."}
                    </p>
                    {hasSavedShortcuts && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-extrabold text-amber-600 dark:text-amber-400">
                          {formatShortcutCount(pinnedLinks.length, "pinned")}
                        </span>
                        <span className="rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-600 dark:text-sky-400">
                          {formatShortcutCount(recentLinks.length, "recent")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {hasSavedShortcuts && (
                  <button type="button"
                    aria-label="Reset saved shortcuts"
                    onClick={() => {
                      setPinnedHrefs([]);
                      setRecentHrefs([]);
                      persistStoredStringList(PIN_KEY, [], 12);
                      persistStoredStringList(RECENT_KEY, [], 8);
                      toast.success("Shortcuts reset");
                    }}
                    className="shrink-0 rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground active:scale-95 transition-transform"
                  >
                    Reset
                  </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {shortcutLinks.map((link) => {
                  const Icon = link.icon;
                  const isPinnedShortcut = pinnedHrefs.includes(link.href);
                  const sourceLabel = shortcutSourceLabel(link.href);
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => trackRecent(link.href)}
                      aria-label={`Open ${link.label} shortcut, ${sourceLabel}`}
                      className="group relative rounded-2xl bg-muted/35 px-3 py-3 active:scale-[0.97] transition-transform hover:bg-muted/55"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className={cn("flex h-8 w-8 items-center justify-center rounded-xl", getAccentClasses(link.accent).bg)}>
                          <Icon className={cn("h-4 w-4", getAccentClasses(link.accent).text)} />
                        </div>
                        <span className={cn(
                          "rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide",
                          isPinnedShortcut
                            ? "bg-amber-400/15 text-amber-600 dark:text-amber-400"
                            : "bg-background/75 text-muted-foreground",
                        )}>
                          {sourceLabel}
                        </span>
                      </div>
                      <p className="truncate text-[11px] font-extrabold leading-tight">{link.label}</p>
                      <p className="mt-0.5 truncate text-[9px] font-medium text-muted-foreground">{link.description}</p>
                      {hasSavedShortcuts && (
                        <button
                          type="button"
                          aria-label={`Remove ${link.label} from shortcuts`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPinnedHrefs((prev) => {
                              const next = prev.filter((href) => href !== link.href);
                              persistStoredStringList(PIN_KEY, next, 12);
                              return next;
                            });
                            setRecentHrefs((prev) => {
                              const next = prev.filter((href) => href !== link.href);
                              persistStoredStringList(RECENT_KEY, next, 8);
                              return next;
                            });
                            toast.success(`${link.label} removed from shortcuts`);
                          }}
                          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/95 text-muted-foreground shadow-sm ring-1 ring-border/50 transition hover:text-foreground active:scale-90 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* All Sections OR categorized search results */}
          {searchResults ? (
            <div className="rounded-[1.5rem] border border-border/55 bg-card/70 p-2">
              <div className="flex items-center justify-between px-2 pb-2 pt-1">
                <div>
                  <h2 className="text-[14px] font-extrabold">Search results</h2>
                  <p aria-live="polite" className="text-[10px] font-semibold text-muted-foreground">
                    {searchSummary}
                  </p>
                  {searchResults.length === 1 && (
                    <p className="mt-0.5 text-[10px] font-bold text-primary">
                      Press Enter to open {searchResults[0].link.label}.
                    </p>
                  )}
                </div>
                {search && (
                  <button
                    type="button"
                    onClick={clearDirectorySearch}
                    aria-label={`Clear search for ${search}`}
                    className="rounded-full bg-muted/60 px-3 py-1.5 text-[11px] font-bold text-muted-foreground active:scale-95 transition-transform"
                  >
                    Clear
                  </button>
                )}
              </div>
              {searchResults.length === 0 ? (
                <div className="rounded-[1.25rem] bg-muted/35 px-4 py-7 text-center">
                  <Search className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-bold">No results</p>
                  <p className="mt-1 text-[12px] font-medium text-muted-foreground">
                    Try a different account, order, travel, or support keyword.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        aria-label={`Search for ${suggestion}`}
                        onClick={() => {
                          setSearch(suggestion);
                          recordSearch(suggestion);
                          requestAnimationFrame(() => directorySearchRef.current?.focus());
                        }}
                        className="rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-foreground shadow-sm active:scale-95 transition-transform"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResultGroups?.map((group, groupIndex) => {
                    const GroupIcon = group.icon;
                    return (
                      <div
                        key={group.title}
                        className="rounded-[1.25rem] border border-border/45 bg-background/55 p-2"
                      >
                        <div className="mb-2 flex items-center justify-between gap-3 px-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                              <GroupIcon className="h-3.5 w-3.5" />
                            </div>
                            <p className="truncate text-[12px] font-extrabold">{group.title}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            {group.results.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {group.results.map((result, resultIndex) =>
                            renderLink(result.link, groupIndex * 10 + resultIndex),
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            sections.map((section, si) => renderSection(section, si))
          )}

          {/* Account access */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              role="region"
              aria-labelledby="more-account-access-title"
              className="mt-5 rounded-[1.5rem] border border-border/55 bg-card/70 p-3"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="more-account-access-title" className="text-[14px] font-extrabold">Account access</h2>
                  <p className="truncate text-[10px] font-semibold text-muted-foreground">
                    Security, admin tools, and session controls.
                  </p>
                </div>
                <span
                  role="status"
                  aria-label={isEmailVerified ? "Account access protected" : "Email verification needed"}
                  className={cn(
                  "flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold",
                  isEmailVerified
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                )}>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isEmailVerified ? "bg-emerald-500" : "bg-amber-500",
                  )} />
                  {isEmailVerified ? "Protected" : "Verify email"}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="grid grid-cols-3 gap-2 pb-1">
                  {[
                    {
                      label: "Email",
                      value: isEmailVerified ? "Secured" : "Action",
                      icon: Mail,
                      href: "/account/contact",
                      ariaLabel: "Open email and phone settings",
                      className: isEmailVerified
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                    },
                    {
                      label: "Activity",
                      value: latestHubActivityLabel || "Ready",
                      icon: History,
                      href: "/account/activity-log?filter=account_hub",
                      ariaLabel: "Open account hub activity log",
                      className: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
                    },
                    {
                      label: "Device",
                      value: deviceInfo.kind,
                      icon: Smartphone,
                      href: "/account/security",
                      ariaLabel: "Open account security and devices",
                      className: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                    },
                  ].map((item) => (
                    <Link
                      key={item.label}
                      to={item.href}
                      aria-label={`${item.ariaLabel}: ${item.label} ${item.value}`}
                      onClick={() => trackRecent(item.href)}
                      className="min-w-0 rounded-2xl bg-muted/35 px-2.5 py-2.5 active:scale-[0.97] transition-transform hover:bg-muted/55"
                    >
                      <div className={cn("mb-1.5 flex h-7 w-7 items-center justify-center rounded-xl", item.className)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="truncate text-[11px] font-extrabold">{item.value}</p>
                      <p className="truncate text-[9px] font-semibold text-muted-foreground">{item.label}</p>
                    </Link>
                  ))}
                </div>

                <Link
                  to="/account/security"
                  aria-label="Open security center for password, devices, privacy, and recovery"
                  onClick={() => trackRecent("/account/security")}
                  className="flex items-center gap-3 rounded-[1.15rem] bg-muted/35 px-3 py-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold">Security center</p>
                    <p className="truncate text-[10px] font-medium text-muted-foreground">Password, devices, privacy, and recovery</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                </Link>

                <Link
                  to="/account/activity-log?filter=account_hub"
                  aria-label={latestHubActivityLabel ? `Open account activity log, latest hub activity ${latestHubActivityLabel}` : "Open account activity log"}
                  onClick={() => trackRecent("/account/activity-log?filter=account_hub")}
                  className="flex items-center gap-3 rounded-[1.15rem] bg-muted/35 px-3 py-3 active:scale-[0.98] transition-transform"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                    <History className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-[13px] font-bold">Activity log</p>
                      {latestHubActivityLabel && (
                        <span className="shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-extrabold text-sky-600 dark:text-sky-400">
                          {latestHubActivityLabel}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[10px] font-medium text-muted-foreground">
                      {latestHubActivityLabel
                        ? `Latest hub activity ${latestHubActivityLabel}`
                        : "Hub opens, security events, and account history"}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                </Link>

                {!isEmailVerified && (
                  <Link
                    to="/account/contact"
                    aria-label="Verify email to protect login, payouts, bookings, and recovery"
                    onClick={() => trackRecent("/account/contact")}
                    className="flex items-center gap-3 rounded-[1.15rem] border border-amber-500/20 bg-amber-500/10 px-3 py-3 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-amber-700 dark:text-amber-300">Verify email</p>
                      <p className="truncate text-[10px] font-medium text-muted-foreground">Protect login, payouts, bookings, and recovery</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-amber-500/70" />
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    to="/admin/god-view"
                    aria-label="Open admin dashboard for moderation, reports, and system tools"
                    onClick={() => trackRecent("/admin/god-view")}
                    className="flex items-center gap-3 rounded-[1.15rem] bg-primary/8 px-3 py-3 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold">Admin dashboard</p>
                      <p className="truncate text-[10px] font-medium text-muted-foreground">Moderation, reports, and system tools</p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button"
                    onClick={() => setConfirmAction("switch")}
                    aria-label="Switch account"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-border/55 bg-background px-3 py-3 text-[12px] font-bold active:scale-[0.98] transition-transform"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Switch
                  </button>
                  <button type="button"
                    onClick={() => setConfirmAction("signout")}
                    aria-label="Sign out of this account"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-3 text-[12px] font-bold text-rose-600 dark:text-rose-400 active:scale-[0.98] transition-transform"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Footer */}
          <div
            role="region"
            aria-labelledby="more-support-title"
            className="mt-8 rounded-[1.5rem] border border-border/50 bg-card/70 px-4 py-4"
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p id="more-support-title" className="text-[13px] font-extrabold">ZIVO support</p>
                <p className="text-[11px] font-medium text-muted-foreground">Help, safety, and account policies.</p>
              </div>
              <Link
                to="/support"
                aria-label="Open ZIVO support"
                onClick={() => trackRecent("/support")}
                className="rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold text-background active:scale-95 transition-transform"
              >
                Support
              </Link>
            </div>
            {installPrompt && !installDismissed && (
              <div className="mb-3 flex items-center gap-3 rounded-[1.15rem] border border-primary/15 bg-primary/8 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <Download className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-extrabold">Install ZIVO</p>
                  <p className="truncate text-[10px] font-medium text-muted-foreground">Add the app to your home screen.</p>
                </div>
                <button type="button"
                  onClick={triggerInstall}
                  aria-label="Install ZIVO app"
                  className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold text-background active:scale-95 transition-transform"
                >
                  Install
                </button>
                <button type="button"
                  onClick={dismissInstall}
                  aria-label="Dismiss install prompt"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:scale-90 transition-transform"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1.5">
              {[
                { label: "Terms", href: "/legal/terms" },
                { label: "Privacy", href: "/legal/privacy" },
                { label: "Cookies", href: "/legal/cookies" },
                { label: "Refunds", href: "/legal/refunds" },
                { label: "Safety", href: "/safety" },
                { label: "Status", href: "/status" },
                { label: "Contact", href: "/account/contact" },
              ].map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  aria-label={`Open ${l.label}`}
                  onClick={() => trackRecent(l.href)}
                  className="text-[11px] font-bold text-muted-foreground/80 hover:text-foreground transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold text-muted-foreground/45">
            <span>v{appVersion}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  isOnline ? "bg-emerald-500" : "bg-rose-500",
                )}
              />
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
        </main>
      </div>

      {/* Partner Sheet */}
      <Sheet open={showPartnerSheet} onOpenChange={setShowPartnerSheet}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[85dvh] overflow-auto border-border/60 bg-background px-4 pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left text-lg font-extrabold">Become a Partner</SheetTitle>
          </SheetHeader>
          <div className="mb-3 rounded-[1.5rem] border border-border/55 bg-card/70 p-4">
            <p className="text-[13px] font-bold">Build with ZIVO</p>
            <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
              Choose the partner path that matches your business.
            </p>
          </div>
          <div className="grid gap-2">
            {partnerOptions.map((opt) => (
              <Link
                key={opt.label}
                to={opt.href}
                aria-label={`Open ${opt.label}: ${opt.description}`}
                onClick={() => {
                  trackRecent(opt.href);
                  setShowPartnerSheet(false);
                }}
                className="flex items-center gap-3 rounded-[1.25rem] border border-border/50 bg-card/80 p-3 active:scale-[0.98] transition-transform"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", getAccentClasses(opt.accent).text, getAccentClasses(opt.accent).bg)}>
                  <opt.icon className={cn("h-5 w-5", getAccentClasses(opt.accent).text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-bold">{opt.label}</p>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{opt.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Sign Out / Switch Account confirm */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] rounded-[1.75rem] border-border/60 bg-background p-4 shadow-2xl sm:max-w-md">
          <AlertDialogHeader>
            <div className={cn(
              "mb-2 flex h-12 w-12 items-center justify-center rounded-2xl",
              confirmAction === "switch" ? "bg-sky-500/10 text-sky-600 dark:text-sky-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
            )}>
              {confirmAction === "switch" ? <RefreshCw className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
            </div>
            <AlertDialogTitle className="text-left text-[18px] font-extrabold">
              {confirmAction === "switch" ? "Switch account" : "Sign out"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left text-[13px] font-medium leading-relaxed text-muted-foreground">
              {confirmAction === "switch"
                ? "You'll be signed out and taken to the login screen so you can sign in with a different account."
                : "You'll need to sign in again to access your account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 grid grid-cols-2 gap-2 sm:flex">
            <AlertDialogCancel
              aria-label={confirmAction === "switch" ? "Cancel switching account" : "Cancel sign out"}
              className="mt-0 rounded-2xl border-border/60 bg-muted/45 px-4 py-3 text-[13px] font-bold"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              aria-label={confirmAction === "switch" ? "Confirm switch account" : "Confirm sign out"}
              className={cn(
                "rounded-2xl px-4 py-3 text-[13px] font-bold",
                confirmAction === "switch"
                  ? "bg-foreground text-background hover:bg-foreground/90"
                  : "bg-rose-600 text-white hover:bg-rose-700",
              )}
            >
              {confirmAction === "switch" ? "Switch" : "Sign out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scroll-to-top floating button (shown when scrolled) */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+10rem)] lg:bottom-24 right-5 z-30 w-10 h-10 rounded-full bg-card border border-border/60 shadow-md flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-foreground rotate-90" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Help FAB */}
      <button type="button"
        onClick={() => setShowHelpSheet(true)}
        aria-label="Open More help"
        className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+6rem)] lg:bottom-8 right-5 z-30 hidden w-12 h-12 rounded-full bg-gradient-to-br from-primary shadow-lg shadow-primary/30 lg:flex items-center justify-center active:scale-90 transition-transform"
      >
        <HelpCircle className="w-5 h-5 text-white" />
      </button>

      {/* Share profile sheet */}
      <Sheet open={showShareProfile} onOpenChange={setShowShareProfile}>
        <SheetContent side="bottom" className="rounded-t-[2rem] border-border/60 bg-background px-4 pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-left text-lg font-extrabold">
              <Share2 className="w-5 h-5 text-primary" />
              Share your profile
            </SheetTitle>
          </SheetHeader>
          <div className="mb-3 overflow-hidden rounded-[1.5rem] border border-border/55 bg-card/80">
            <div className="flex items-center gap-3 p-4">
              <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                <AvatarFallback className="bg-primary/10 font-bold text-primary">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate text-[14px] font-extrabold">{displayName}</p>
                <p className="truncate text-[11px] font-medium text-muted-foreground">@{handle}</p>
              </div>
            </div>
            <div className="border-t border-border/45 p-3">
              <div className="flex items-center gap-2 rounded-2xl bg-muted/45 px-3 py-2.5">
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                <p className="flex-1 truncate font-mono text-[12px] text-foreground/80">
                  {profileShareUrl}
                </p>
                <button type="button"
                  onClick={copyProfileLink}
                  aria-label="Copy profile link"
                  className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-[11px] font-bold text-background active:scale-95 transition-transform"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button"
              aria-label="Share profile with system share"
              onClick={() => {
                setShowShareProfile(false);
                shareProfile();
              }}
              className="flex flex-col items-center gap-1.5 rounded-[1.25rem] border border-border/55 bg-card/80 p-3 active:scale-[0.95] transition-transform"
            >
              <Share2 className="h-5 w-5 text-primary" />
              <span className="text-[11px] font-bold">System share</span>
            </button>
            <Link
              to="/qr-profile"
              aria-label="Open profile QR code"
              onClick={() => {
                trackRecent("/qr-profile");
                setShowShareProfile(false);
              }}
              className="flex flex-col items-center gap-1.5 rounded-[1.25rem] border border-border/55 bg-card/80 p-3 active:scale-[0.95] transition-transform"
            >
              <QrCode className="h-5 w-5 text-foreground" />
              <span className="text-[11px] font-bold">QR code</span>
            </Link>
            <button type="button"
              onClick={copyProfileLink}
              aria-label="Copy profile link"
              className="flex flex-col items-center gap-1.5 rounded-[1.25rem] border border-border/55 bg-card/80 p-3 active:scale-[0.95] transition-transform"
            >
              <ExternalLink className="h-5 w-5 text-emerald-500" />
              <span className="text-[11px] font-bold">Copy link</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Help sheet */}
      <Sheet open={showHelpSheet} onOpenChange={setShowHelpSheet}>
        <SheetContent side="bottom" className="rounded-t-[2rem] max-h-[80dvh] overflow-auto border-border/60 bg-background px-4 pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2 text-left text-lg font-extrabold">
              <HelpCircle className="w-5 h-5 text-primary" />
              How can we help?
            </SheetTitle>
          </SheetHeader>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Link
              to="/support"
              aria-label="Contact ZIVO support now"
              onClick={() => {
                trackRecent("/support");
                setShowHelpSheet(false);
              }}
              className="rounded-[1.25rem] bg-foreground px-4 py-3 text-background active:scale-[0.98] transition-transform"
            >
              <Headset className="mb-2 h-5 w-5" />
              <p className="text-[13px] font-extrabold">Contact support</p>
              <p className="text-[10px] font-medium text-background/70">Get help now</p>
            </Link>
            <Link
              to="/status"
              aria-label="Open ZIVO system status"
              onClick={() => {
                trackRecent("/status");
                setShowHelpSheet(false);
              }}
              className="rounded-[1.25rem] border border-border/55 bg-card/80 px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <Server className="mb-2 h-5 w-5 text-emerald-500" />
              <p className="text-[13px] font-extrabold">System status</p>
              <p className="text-[10px] font-medium text-muted-foreground">Check uptime</p>
            </Link>
          </div>
          <div className="grid gap-2">
            {[
              { icon: HelpCircle, label: "Help Center", desc: "Browse articles & guides", href: "/help-center", accent: "hsl(199 89% 48%)" },
              { icon: BookOpen, label: "FAQ", desc: "Common questions answered", href: "/faq", accent: "hsl(38 92% 50%)" },
              { icon: Ticket, label: "Open a ticket", desc: "Track your issue", href: "/support/tickets", accent: "hsl(38 92% 50%)" },
              { icon: Bug, label: "Report a problem", desc: "Bug or site issue", href: "/support/site-issues", accent: "hsl(0 84% 60%)" },
              { icon: Plane, label: "Travel booking help", desc: "Flight/hotel/car issues", href: "/support/travel-bookings", accent: "hsl(199 89% 48%)" },
              { icon: ShieldAlert, label: "Report a scam", desc: "Fraud / suspicious activity", href: "/security/scams", accent: "hsl(0 84% 60%)" },
              { icon: Lightbulb, label: "Send feedback", desc: "Ideas & suggestions", href: "/feedback", accent: "hsl(45 93% 58%)" },
            ].map((opt) => (
              <Link
                key={opt.label}
                to={opt.href}
                aria-label={`Open ${opt.label}: ${opt.desc}`}
                onClick={() => {
                  trackRecent(opt.href);
                  setShowHelpSheet(false);
                }}
                className="flex items-center gap-3 rounded-[1.15rem] border border-border/50 bg-card/80 p-3 active:scale-[0.98] transition-transform"
              >
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", getAccentClasses(opt.accent).text, getAccentClasses(opt.accent).bg)}>
                  <opt.icon className={cn("h-5 w-5", getAccentClasses(opt.accent).text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[13px] font-bold">{opt.label}</p>
                  <p className="truncate text-[11px] font-medium text-muted-foreground">{opt.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/30" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <ZivoMobileNav />
    </div>
  );
}
