/**
 * MorePage — ZIVO Signature Design (2026)
 * Full hub with real user profile, quick actions, 70+ links, and organic design.
 */
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
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
  Camera, Video, Megaphone, Gift, Crown, Zap, Star, Calendar, MessageCircle,
  BookOpen, Plane, Coffee, Radio, BadgeCheck, Smartphone, Download,
  TrendingUp, Target, Lightbulb, PenTool, Share2, Compass, ArrowRight,
  Gem, Rocket, Layers, CircleDot, User, CreditCard, Map, Package,
  Clock, Receipt, Ticket, ShieldCheck, Flame, AlertCircle, Inbox,
  Search, Vote, Clapperboard, GraduationCap, Trophy, Banknote, ArrowLeft,
  Sun, Moon, Trash2, X, Phone, Hash, Tv, Mic, Activity, Dumbbell, Brain,
  Languages, Database, KeyRound, UserPlus, Film, MessageSquare, Hotel,
  Hammer, Sliders, FileSignature, Cookie, BookMarked, Stethoscope,
  ClipboardList, Building, Tag, ScrollText, History, ArrowDownToLine,
  Fingerprint, Pin, AtSign, Image as ImageIcon, MicVocal, Volume2,
  Mailbox, ExternalLink, Boxes, Hourglass, Pencil, ListChecks,
  Headset, MessagesSquare, BarChart, Cpu, GanttChart, Network, Pill,
  Info, Newspaper, MapPinned, Bug, Code, Server, ShieldAlert, Ban,
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

/* ============================================= */
/*  DAILY CHALLENGES (gamification)               */
/* ============================================= */
const dailyChallenges: { id: string; icon: any; label: string; href: string; reward: number }[] = [
  { id: "visit_explore", icon: Compass, label: "Browse Explore", href: "/explore", reward: 5 },
  { id: "watch_reel", icon: Camera, label: "Watch a reel", href: "/reels", reward: 5 },
  { id: "send_message", icon: MessageCircle, label: "Send a message", href: "/chat", reward: 10 },
  { id: "check_deals", icon: Flame, label: "View today's deals", href: "/deals", reward: 5 },
];

/* ============================================= */
/*  WHAT'S NEW (release notes for the dialog)     */
/* ============================================= */
const whatsNew: { date: string; title: string; items: string[] }[] = [
  {
    date: "May 2026",
    title: "More page redesign",
    items: [
      "12 quick actions, 11 spotlight cards, 14 sections (306 features)",
      "Pinned favorites with localStorage",
      "Recently used row + section jump-chips",
      "Density toggle (compact 2-col grid view)",
      "Surprise me discovery button",
      "Profile completion meter",
    ],
  },
  {
    date: "Apr 2026",
    title: "AI Tools section",
    items: [
      "AI Trip Planner & Smart Search",
      "AI Content Studio + AI Creative for shops",
      "Auto-translate, AI Telehealth, Mindfulness AI",
      "Boost Engine for sellers (auto-promote posts)",
    ],
  },
  {
    date: "Mar 2026",
    title: "Money Hub",
    items: [
      "Wallet, Coins, Rewards centralized",
      "Driver & Shop earnings + payouts",
      "Tax reports, Pay stubs, Invoices",
      "Gift cards, Promo codes, Refer & earn",
    ],
  },
  {
    date: "Feb 2026",
    title: "Security & Trust",
    items: [
      "Service Status, Trust Hub, Scam Center",
      "Zero Trust architecture page",
      "Vulnerability Disclosure Program",
      "Compliance Center (SOC 2, GDPR, CCPA)",
    ],
  },
];

const formatNotificationText = (text: string | null | undefined) =>
  (text ?? "").replace(/\$(\d+(?:,\d{3})*)\.(\d{2})0{3,}\b/g, "$$$1.$2");

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
  { icon: Gift, label: "Invite", href: "/referrals", accent: "hsl(199 89% 48%)" },
  { icon: Plane, label: "Trips", href: "/my-trips", accent: "hsl(199 89% 48%)" },
  { icon: Bell, label: "Alerts", href: "/notification-center", accent: "hsl(45 93% 58%)" },
  { icon: MessageCircle, label: "Chat", href: "/chat", accent: "hsl(221 83% 53%)" },
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

const quickLinksMain: QuickLink[] = [
  { icon: User, label: "My Profile", href: "/profile", description: "View & edit", accent: "hsl(199 89% 48%)" },
  { icon: Gift, label: "Refer a Friend", href: "/referrals", description: "Earn rewards", accent: "hsl(142 71% 45%)", badge: "Earn" },
  { icon: Clock, label: "Activity Log", href: "/activity", description: "Recent actions", accent: "hsl(198 93% 59%)" },
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
  { icon: Hash, label: "Channels", href: "/channels", description: "Build your channel", accent: "hsl(221 83% 53%)" },
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
  { icon: Map, label: "City Guides", href: "/guides", description: "Expert tips", accent: "hsl(172 66% 50%)" },
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
  { icon: Map, label: "Multi-City Builder", href: "/multi-city-builder", description: "Plan multi-stop trip", accent: "hsl(199 89% 48%)" },
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
  { icon: MessageCircle, label: "Chat Hub", href: "/chat", description: "Messages", accent: "hsl(221 83% 53%)" },
  { icon: Share2, label: "Share Profile", href: "/qr-profile", description: "QR & link", accent: "hsl(142 71% 45%)" },
  { icon: Megaphone, label: "Events", href: "/events", description: "Upcoming", accent: "hsl(38 92% 50%)" },
  { icon: Star, label: "Leaderboard", href: "/leaderboard", description: "Top creators", accent: "hsl(45 93% 58%)" },
  { icon: Clapperboard, label: "Watch Party", href: "/watch-party", description: "Watch together", accent: "hsl(199 89% 48%)" },
  { icon: Bookmark, label: "Bookmarks", href: "/saved", description: "Saved posts", accent: "hsl(25 95% 53%)" },
  { icon: Heart, label: "Dating", href: "/dating", description: "Find connections", accent: "hsl(340 75% 55%)" },
  { icon: UserPlus, label: "Find Contacts", href: "/chat/find-contacts", description: "Add friends", accent: "hsl(142 71% 45%)" },
  { icon: Phone, label: "Group Calls", href: "/chat/contacts", description: "Voice & video", accent: "hsl(199 89% 48%)" },
  { icon: MapPin, label: "Nearby Chat", href: "/chat/nearby", description: "People around you", accent: "hsl(38 92% 50%)" },
  { icon: Lock, label: "Secret Chats", href: "/chat/contacts", description: "Encrypted", accent: "hsl(142 71% 45%)" },
  { icon: Mailbox, label: "Broadcasts", href: "/chat/broadcasts", description: "Send to many", accent: "hsl(45 93% 58%)" },
  { icon: Search, label: "Smart Search", href: "/smart-search", description: "AI search", accent: "hsl(263 70% 58%)", badge: "AI" },
  { icon: Pencil, label: "Whiteboard", href: "/whiteboard", description: "Collaborate", accent: "hsl(199 89% 48%)" },
  { icon: Tv, label: "Live Stream", href: "/live", description: "Watch live", accent: "hsl(0 84% 60%)" },
  { icon: ListChecks, label: "Chat Folders", href: "/chat/folders", description: "Organize chats", accent: "hsl(263 70% 58%)" },
  { icon: Search, label: "Search Chats", href: "/chat/search", description: "Find messages", accent: "hsl(199 89% 48%)" },
  { icon: UserPlus, label: "Contact Requests", href: "/chat/contacts/requests", description: "Pending invites", accent: "hsl(45 93% 58%)" },
  { icon: Ban, label: "Blocked Contacts", href: "/chat/blocked", description: "Manage blocks", accent: "hsl(0 84% 60%)" },
  { icon: Hash, label: "Create Channel", href: "/channels/new", description: "Build community", accent: "hsl(221 83% 53%)" },
  { icon: Mailbox, label: "New Broadcast", href: "/chat/broadcasts/new", description: "Announce updates", accent: "hsl(45 93% 58%)" },
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
  { icon: Map, label: "Driver Map", href: "/driver/map", description: "Live trip map", accent: "hsl(221 83% 53%)" },
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
  { icon: History, label: "Activity Log", href: "/account/activity-log", description: "Detailed history", accent: "hsl(215 16% 47%)" },
  { icon: ArrowDownToLine, label: "Export Data", href: "/account/export", description: "Download your data", accent: "hsl(199 89% 48%)" },
  { icon: Database, label: "Storage", href: "/chat/settings/storage", description: "Manage space", accent: "hsl(263 70% 58%)" },
  { icon: KeyRound, label: "Passcode", href: "/chat/settings/passcode", description: "Lock app", accent: "hsl(142 71% 45%)" },
  { icon: Fingerprint, label: "Biometrics", href: "/account/security", description: "Face & fingerprint", accent: "hsl(263 70% 58%)" },
  { icon: Bell, label: "Login Alerts", href: "/chat/settings/login-alerts", description: "New device alerts", accent: "hsl(45 93% 58%)" },
  { icon: Shield, label: "Privacy Hub", href: "/chat/settings/privacy-hub", description: "All controls", accent: "hsl(199 89% 48%)" },
  { icon: ShieldCheck, label: "Two-Step Setup", href: "/chat/settings/two-step", description: "Enable 2FA", accent: "hsl(142 71% 45%)" },
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
  { icon: Hash, label: "Channels Directory", href: "/channels", description: "Discover channels", accent: "hsl(221 83% 53%)" },
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
  { icon: AlertCircle, label: "Refunds", href: "/refunds", description: "Request refund", accent: "hsl(0 84% 60%)" },
  { icon: FileBadge, label: "Refund Policy", href: "/refund-policy", description: "Money-back rules", accent: "hsl(215 16% 47%)" },
];

const quickLinksDiscover: QuickLink[] = [
  { icon: Flame, label: "Trending", href: "/trending", description: "What's hot now", accent: "hsl(0 84% 60%)", badge: "Hot" },
  { icon: Search, label: "Universal Search", href: "/search", description: "Search everything", accent: "hsl(263 70% 58%)" },
  { icon: Compass, label: "Explore", href: "/explore", description: "Discover content", accent: "hsl(172 66% 50%)" },
  { icon: History, label: "View History", href: "/history", description: "Recently viewed", accent: "hsl(215 16% 47%)" },
  { icon: Bell, label: "Alerts", href: "/alerts", description: "Price & deal drops", accent: "hsl(45 93% 58%)" },
  { icon: Activity, label: "Activities", href: "/activities", description: "Local events", accent: "hsl(199 89% 48%)" },
  { icon: Map, label: "City Guides", href: "/guides", description: "Travel tips", accent: "hsl(172 66% 50%)" },
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
  { icon: FileText, label: "Terms of Service", href: "/terms", description: "Legal terms", accent: "hsl(215 16% 47%)" },
  { icon: Lock, label: "Privacy Policy", href: "/privacy", description: "How we handle data", accent: "hsl(263 70% 58%)" },
  { icon: Cookie, label: "Cookies Policy", href: "/cookies", description: "Tracking notice", accent: "hsl(38 92% 50%)" },
  { icon: Banknote, label: "Refund Policy", href: "/refund-policy", description: "Money back rules", accent: "hsl(142 71% 45%)" },
  { icon: AlertCircle, label: "Cancellation Policy", href: "/cancellation-policy", description: "Cancel rules", accent: "hsl(0 84% 60%)" },
  { icon: Mail, label: "Unsubscribe", href: "/unsubscribe", description: "Stop emails", accent: "hsl(215 16% 47%)" },
];

const sections = [
  { title: "Essentials", icon: Layers, links: quickLinksMain },
  { title: "Creator Studio", icon: Sparkles, links: quickLinksCreator },
  { title: "Travel & Orders", icon: Plane, links: quickLinksTravel },
  { title: "Social", icon: Users, links: quickLinksSocial },
  { title: "Live & Streaming", icon: Tv, links: quickLinksLive },
  { title: "Workplace & Jobs", icon: Briefcase, links: quickLinksJobs },
  { title: "Business", icon: Building2, links: quickLinksBusiness },
  { title: "Health & Wellness", icon: Heart, links: quickLinksWellness },
  { title: "Money & Earnings", icon: Wallet, links: quickLinksMoney },
  { title: "AI & Tools", icon: Sparkles, links: quickLinksAI },
  { title: "Discover", icon: Compass, links: quickLinksDiscover },
  { title: "Security & Trust", icon: Shield, links: quickLinksSecurity },
  { title: "Account & Support", icon: Settings, links: quickLinksAccount },
  { title: "Company & Legal", icon: Info, links: quickLinksCompany },
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [showPartnerSheet, setShowPartnerSheet] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>("Essentials");
  const [search, setSearch] = useState("");
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
    setPrivacyMode((p) => {
      const n = !p;
      try { window.localStorage.setItem(PRIVACY_KEY, n ? "1" : "0"); } catch {}
      return n;
    });
  };
  const blurClass = privacyMode ? "blur-sm select-none" : "";

  // ===== Help FAB sheet =====
  const [showHelpSheet, setShowHelpSheet] = useState(false);

  // ===== Quick share-profile dialog =====
  // Only the toggle state lives here; the URL + copy helper depend on `handle`,
  // which is computed further below — they're declared after `handle` to avoid
  // a temporal-dead-zone access via the useMemo deps array.
  const [showShareProfile, setShowShareProfile] = useState(false);

  // Today's date (YYYY-MM-DD) — used by daily challenges and daily check-in,
  // both of which read it from useState initializers on first render.
  const todayStr = new Date().toISOString().slice(0, 10);

  // ===== Daily challenges (localStorage, resets per day) =====
  const CHALLENGES_KEY = "zivo:more:challenges";
  const [completedChallenges, setCompletedChallenges] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(CHALLENGES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as { date: string; ids: string[] };
      return parsed.date === todayStr ? parsed.ids : [];
    } catch {
      return [];
    }
  });
  const completeChallenge = (id: string) => {
    if (completedChallenges.includes(id)) return;
    const next = [...completedChallenges, id];
    setCompletedChallenges(next);
    try {
      window.localStorage.setItem(CHALLENGES_KEY, JSON.stringify({ date: todayStr, ids: next }));
    } catch {}
  };
  const challengeProgress = Math.round((completedChallenges.length / dailyChallenges.length) * 100);

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

  // ===== Beta / Labs opt-in =====
  const BETA_KEY = "zivo:more:beta";
  const [betaOptIn, setBetaOptIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(BETA_KEY) === "1";
  });
  const toggleBeta = () => {
    setBetaOptIn((p) => {
      const n = !p;
      try { window.localStorage.setItem(BETA_KEY, n ? "1" : "0"); } catch {}
      return n;
    });
  };
  const betaFeatures = [
    { icon: Sparkles, label: "AI Smart Search v2" },
    { icon: Brain, label: "Context-aware suggestions" },
    { icon: Camera, label: "AR Reels recorder" },
    { icon: Mic, label: "Voice commands" },
    { icon: Map, label: "3D city maps" },
  ];

  // ===== Region / Country switcher (localStorage) =====
  const REGION_KEY = "zivo:more:region";
  const [region, setRegion] = useState<string>(() => {
    if (typeof window === "undefined") return "US";
    return window.localStorage.getItem(REGION_KEY) || "US";
  });
  const setRegionCode = (code: string) => {
    setRegion(code);
    try { window.localStorage.setItem(REGION_KEY, code); } catch {}
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
      await installPrompt.userChoice;
      setInstallPrompt(null);
    } catch { /* user cancelled */ }
  };
  const dismissInstall = () => {
    setInstallDismissed(true);
    try { window.localStorage.setItem("zivo:more:install-dismissed", "1"); } catch {}
  };

  // ===== Daily check-in (localStorage) =====
  const CHECKIN_KEY = "zivo:more:checkin";
  const [checkinDate, setCheckinDate] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(CHECKIN_KEY) || "";
  });
  const claimedToday = checkinDate === todayStr;
  const claimCheckin = () => {
    setCheckinDate(todayStr);
    try { window.localStorage.setItem(CHECKIN_KEY, todayStr); } catch {}
  };

  // ===== Recent searches (localStorage) =====
  const SEARCH_HISTORY_KEY = "zivo:more:searches";
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const recordSearch = (q: string) => {
    const v = q.trim();
    if (v.length < 2) return;
    setSearchHistory((prev) => {
      const next = [v, ...prev.filter((s) => s.toLowerCase() !== v.toLowerCase())].slice(0, 5);
      try { window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
    setDndOn((p) => {
      const n = !p;
      try { window.localStorage.setItem(DND_KEY, n ? "1" : "0"); } catch {}
      return n;
    });
  };
  const toggleSound = () => {
    setSoundOn((p) => {
      const n = !p;
      try { window.localStorage.setItem(SOUND_KEY, n ? "1" : "0"); } catch {}
      return n;
    });
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
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const trackRecent = (href: string) => {
    setRecentHrefs((prev) => {
      const next = [href, ...prev.filter((h) => h !== href)].slice(0, 8);
      try { window.localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  // ===== Pinned / Favorites (localStorage) =====
  const PIN_KEY = "zivo:more:pinned";
  const [pinnedHrefs, setPinnedHrefs] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(PIN_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });
  const togglePin = (href: string) => {
    setPinnedHrefs((prev) => {
      const next = prev.includes(href) ? prev.filter((h) => h !== href) : [href, ...prev].slice(0, 12);
      try { window.localStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch {}
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
      const { count } = await (supabase as any)
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_read", false);
      return count || 0;
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
  } = useQuery<Array<{ id: string; title: string; body: string; action_url: string | null; created_at: string }>>({
    queryKey: ["more-notif-preview", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("id, title, body, action_url, created_at")
        .eq("user_id", user!.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
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
      m["/chat/contacts/requests"] = v;
    }
    return m;
  }, [unreadNotifCount, pendingRequestsCount]);

  // Real follower count (people following this user)
  const { data: followerCount = 0, isError: hasFollowersError, isLoading: isFollowersLoading } = useQuery({
    queryKey: ["more-followers", user?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("followers")
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
        .from("followers")
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

  // Profile-share URL + copy helper — depend on `handle` above.
  const profileShareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/c/${handle}`;
  }, [handle]);
  const copyProfileLink = async () => {
    try { await navigator.clipboard?.writeText(profileShareUrl); } catch {}
  };

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
    ]);
  }, [queryClient, user?.id]);

  // ===== Suggested next action (computed from user state) =====
  // Declared here (not earlier) because it depends on isEmailVerified,
  // completion, claimedToday, streak, isPlus, and pinnedHrefs — all defined above.
  const suggestedAction = useMemo(() => {
    if (!user) return null;
    if (!isEmailVerified) {
      return { icon: Mail, title: "Verify your email", desc: "Secure your account in 30s", href: "/account/contact", accent: "hsl(45 93% 58%)" };
    }
    if (completion < 50) {
      return { icon: User, title: "Complete your profile", desc: "Add photo, bio, and more", href: "/account/profile-edit", accent: "hsl(263 70% 58%)" };
    }
    if (!claimedToday) {
      return { icon: Gift, title: "Claim your daily 10 coins", desc: `${streak.days} day streak active`, href: "#checkin", accent: "hsl(38 92% 50%)" };
    }
    if (!isPlus) {
      return { icon: Crown, title: "Try ZIVO Plus free for 30 days", desc: "Unlock 2× coins & more", href: "/zivo-plus", accent: "hsl(45 93% 58%)" };
    }
    if (pinnedHrefs.length === 0) {
      return { icon: Pin, title: "Pin your favorites", desc: "Tap the ★ next to any link", href: "#", accent: "hsl(263 70% 58%)" };
    }
    return { icon: Sparkles, title: "Try the AI Trip Planner", desc: "Plan a full itinerary in 30s", href: "/ai-trip-planner", accent: "hsl(199 89% 48%)" };
  }, [user, isEmailVerified, completion, claimedToday, streak.days, isPlus, pinnedHrefs.length]);

  const VerifiedCheck = ({ size = 18 }: { size?: number }) => (
    <VerifiedBadge size={size} />
  );

  /* --- Profile Card --- */
  const renderProfileCard = () => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="zivo-card-organic p-4 mb-3"
    >
      {/* Email verification banner */}
      {!isEmailVerified && (
        <Link
          to="/account/contact"
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 active:scale-[0.99] transition-transform"
        >
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-amber-600 dark:text-amber-400 truncate">
              Verify your email
            </p>
            <p className="text-[10px] text-muted-foreground truncate">
              Secure your account & unlock all features
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-500 shrink-0" />
        </Link>
      )}
      <p className="text-[11px] text-muted-foreground/80 font-medium mb-2">
        {greeting}, <span className="text-foreground/80 font-semibold">{displayName.split(" ")[0]}</span> 👋
      </p>
      <div className="flex items-center gap-3.5">
        <Link to="/profile" className="shrink-0">
          <Avatar className="h-14 w-14 ring-2 ring-primary/20">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <Link to="/profile" className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-bold text-[15px] truncate">{displayName}</p>
            {isVerified && <VerifiedCheck size={18} />}
          </div>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">@{handle}</p>
          {isPlus && (
            <Badge className="mt-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-500 border-amber-500/30 font-semibold rounded-full px-2 py-0.5 text-[10px] w-fit">
              <Crown className="w-2.5 h-2.5 mr-1" /> ZIVO+ {plan === "annual" ? "Annual" : "Monthly"}
            </Badge>
          )}
          <div className="flex gap-4 mt-1.5">
            <div className="text-center">
              <p className={cn("text-xs font-bold", blurClass)}>{formatCount(followerCount) ?? "0"}</p>
              <p className="text-[9px] text-muted-foreground">Followers</p>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-bold", blurClass)}>{formatCount(followingCount) ?? "0"}</p>
              <p className="text-[9px] text-muted-foreground">Following</p>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-bold", blurClass)}>{formatCount(postsCount) ?? "0"}</p>
              <p className="text-[9px] text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className={cn("text-xs font-bold", blurClass)}>{formatCount(friendCount) ?? "0"}</p>
              <p className="text-[9px] text-muted-foreground">Friends</p>
            </div>
          </div>
        </Link>
        <div className="flex flex-col gap-1.5 shrink-0">
          <Link
            to="/account/profile-edit"
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full bg-primary/10 text-primary active:scale-95 transition-transform text-center"
          >
            Edit profile
          </Link>
          <Link
            to="/profile"
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full border border-border/50 text-muted-foreground active:scale-95 transition-transform text-center"
          >
            View
          </Link>
        </div>
      </div>

      {/* Mini stats strip — hidden in OF mode (gamification not relevant) */}
      {!zivoOFMode && (
        <div className="flex items-center gap-3 mt-3 text-[11px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400" />
            <span className={cn("font-semibold text-foreground/80", blurClass)}>{formatCount(coinBalance) || "0"}</span>
            <span>coins</span>
          </div>
          <span className="text-muted-foreground/30">•</span>
          <div className="flex items-center gap-1">
            <Award className="w-3 h-3 text-primary" />
            <span className="font-semibold text-foreground/80 capitalize">{(profile as any)?.tier ?? "Explorer"}</span>
            <span>tier</span>
          </div>
          <span className="text-muted-foreground/30">•</span>
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-orange-500" />
            <span className="font-semibold text-foreground/80">{streak.days}</span>
            <span>day streak</span>
          </div>
          {pinnedHrefs.length > 0 && (
            <>
              <span className="text-muted-foreground/30">•</span>
              <div className="flex items-center gap-1">
                <Pin className="w-3 h-3 text-foreground" />
                <span className="font-semibold text-foreground/80">{pinnedHrefs.length}</span>
                <span>pinned</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Connected providers strip */}
      {connectedProviders.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          <span className="text-[10px] font-medium text-muted-foreground">Signed in via</span>
          {connectedProviders.map((p) => (
            <span
              key={p}
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {p}
            </span>
          ))}
        </div>
      )}

      {/* Profile completion meter + checklist — hidden in OF mode */}
      {!zivoOFMode && completion < 100 && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
              <ListChecks className="h-3 w-3" /> Profile {completion}% complete
            </p>
          </div>
          <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden mb-2.5">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70"
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: "Profile photo", done: !!profile?.avatar_url, href: "/account/profile-edit" },
              { label: "Display name", done: !!profile?.full_name?.trim(), href: "/account/profile-edit" },
              { label: "Username", done: !!claimedUsername, href: "/account/username" },
              { label: "Verified", done: !!isVerified, href: "/account/verification" },
              { label: "Bio", done: !!(profile as any)?.bio, href: "/account/profile-edit" },
              { label: "Phone", done: !!(profile as any)?.phone, href: "/account/contact" },
            ].map(({ label, done, href }) => (
              <Link key={label} to={done ? "#" : href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10.5px] font-medium border transition-colors",
                  done
                    ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 pointer-events-none"
                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60"
                )}>
                <span className={cn("w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0",
                  done ? "border-emerald-500 bg-emerald-500" : "border-muted-foreground/40"
                )}>
                  {done && <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </span>
                {label}
                {!done && <ArrowRight className="h-2.5 w-2.5 ml-auto opacity-50" />}
              </Link>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );

  /* --- Account Status Strip (verified / membership / wallet) --- */
  const renderAccountStatus = () => (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="grid grid-cols-2 gap-2 mb-5"
    >
      <Link
        to={isVerified ? "/profile" : "/account/verification"}
        className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
      >
        <VerifiedCheck size={20} />
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight truncate">
            {isVerified ? "Verified" : "Get verified"}
          </p>
          <p className="text-[9px] text-muted-foreground truncate">Account</p>
        </div>
      </Link>
      <Link
        to="/membership"
        className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
      >
        <Crown className="w-4 h-4 text-amber-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight truncate capitalize">{(profile as any)?.tier ?? "Explorer"}</p>
          <p className="text-[9px] text-muted-foreground truncate">Membership tier</p>
        </div>
      </Link>
      <Link
        to="/wallet"
        className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
      >
        <Wallet className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] font-bold leading-tight truncate">Wallet</p>
          <p className="text-[9px] text-muted-foreground truncate">View balance</p>
        </div>
      </Link>
      {zivoOFMode ? (
        <Link
          to="/monetization"
          className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
        >
          <Crown className="w-4 h-4 text-[#00AEEF] shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold leading-tight truncate">Subscribers</p>
            <p className="text-[9px] text-muted-foreground truncate">ZIVO OF</p>
          </div>
        </Link>
      ) : (
        <Link
          to="/rewards"
          className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
        >
          <Star className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="min-w-0">
            <p className={cn("text-[11px] font-bold leading-tight truncate", blurClass)}>{coinBalance > 0 ? formatCount(coinBalance) : "0"} coins</p>
            <p className="text-[9px] text-muted-foreground truncate">ZIVO coins</p>
          </div>
        </Link>
      )}
    </motion.div>
  );

  /* --- Quick Actions Row --- */
  const renderQuickActions = () => (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 mb-5"
    >
      {quickActions.map((action, i) => (
        <Link key={action.label} to={action.href} className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 22 }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center active:scale-90 transition-transform touch-manipulation"
            style={{ background: `${action.accent}12`, color: action.accent }}
          >
            <action.icon className="w-5 h-5" />
          </motion.div>
          <span className="text-[10px] font-medium text-muted-foreground text-center leading-tight w-14">{action.label}</span>
        </Link>
      ))}
    </motion.div>
  );

  /* --- Link Row --- */
  const renderLink = (link: QuickLink, i: number) => {
    const isPartner = link.href === "#partner";
    const isSwitch = link.href === "#switch-account";
    const isTheme = link.href === "#theme-toggle";
    const isAction = isPartner || isSwitch || isTheme;
    const canPin = !isAction && !link.href.startsWith("#");
    const isPinned = canPin && pinnedHrefs.includes(link.href);

    const handleAction = () => {
      if (isPartner) setShowPartnerSheet(true);
      else if (isSwitch) setConfirmAction("switch");
      else if (isTheme) {
        const next = (resolvedTheme ?? theme) === "dark" ? "light" : "dark";
        setTheme(next);
      }
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
          "zivo-card-organic flex items-center cursor-pointer",
          density === "compact" ? "gap-2 p-2" : "gap-3.5 p-3",
        )}
      >
          <div className={cn("zivo-icon-pill", getAccentClasses(link.accent).text, getAccentClasses(link.accent).bg)}>
          {isTheme ? (
            (resolvedTheme ?? theme) === "dark"
              ? <Moon className={cn("w-[18px] h-[18px]", getAccentClasses(link.accent).text)} />
              : <Sun className={cn("w-[18px] h-[18px]", getAccentClasses(link.accent).text)} />
          ) : (
            <link.icon className={cn("w-[18px] h-[18px]", getAccentClasses(link.accent).text)} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={cn("font-semibold leading-tight truncate", density === "compact" ? "text-[12px]" : "text-[13px]")}>{link.label}</p>
            {link.badge && <span className="zivo-badge">{link.badge}</span>}
            {dynamicBadges[link.href] && (
              <span className="text-[9px] font-bold text-white bg-foreground rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {dynamicBadges[link.href]}
              </span>
            )}
          </div>
          {density !== "compact" && (
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{link.description}</p>
          )}
        </div>
        {rightSlot}
        {canPin && (
          <button
            type="button"
            aria-label={isPinned ? "Unpin" : "Pin to favorites"}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); togglePin(link.href); }}
            className="p-1 -mr-1 rounded-full hover:bg-muted/60 active:scale-90 transition-transform shrink-0"
          >
            <Star
              className={cn(
                "w-4 h-4",
                isPinned ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
              )}
            />
          </button>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
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

    return (
      <motion.div
        key={section.title}
        id={sectionId}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: si * 0.04, duration: 0.3 }}
        className="[scroll-margin-top:88px]"
      >
        <button type="button"
          onClick={() => setExpandedSection(isOpen ? null : section.title)}
          className="w-full flex items-center justify-between py-3 touch-manipulation"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary/8 flex items-center justify-center">
              <SectionIcon className="w-3.5 h-3.5 text-primary" />
            </div>
            <h2 className="font-bold text-[15px]">{section.title}</h2>
            <span className="text-[10px] text-muted-foreground/60 font-medium bg-muted/40 px-1.5 py-0.5 rounded-full">{section.links.length}</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
          </motion.div>
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              <div className={cn("pb-2", density === "compact" ? "grid grid-cols-2 gap-1.5" : "space-y-1.5")}>
                {section.links.map((link, i) => renderLink(link, i))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {si < sections.length - 1 && <div className="h-px bg-border/30 my-1" />}
      </motion.div>
    );
  };

  /* --- Total link count --- */
  const totalLinks = sections.reduce((sum, s) => sum + s.links.length, 0);

  /* --- Pinned links resolved against all sections --- */
  const pinnedLinks = useMemo(() => {
    if (!pinnedHrefs.length) return [];
    const all = sections.flatMap((s) => s.links);
    const byHref: Map<string, QuickLink> = new (globalThis as any).Map(all.map((l) => [l.href, l]));
    return pinnedHrefs.map((h) => byHref.get(h)).filter(Boolean) as QuickLink[];
  }, [pinnedHrefs]);

  /* --- Recent links (last 8 clicks, dedup against pinned) --- */
  const recentLinks = useMemo(() => {
    if (!recentHrefs.length) return [];
    const all = sections.flatMap((s) => s.links);
    const byHref: Map<string, QuickLink> = new (globalThis as any).Map(all.map((l) => [l.href, l]));
    const pinnedSet = new Set(pinnedHrefs);
    return recentHrefs
      .filter((h) => !pinnedSet.has(h))
      .map((h) => byHref.get(h))
      .filter(Boolean)
      .slice(0, 6) as QuickLink[];
  }, [recentHrefs, pinnedHrefs]);

  /* --- Flat search across all sections --- */
  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const all = sections.flatMap((s) => s.links);
    return all.filter(
      (l) =>
        l.label.toLowerCase().includes(q) ||
        l.description.toLowerCase().includes(q),
    );
  }, [search]);

  // Expand-all toggle: store array of expanded titles when "all" is chosen
  const [allExpanded, setAllExpanded] = useState(false);
  const toggleAll = () => {
    setAllExpanded((prev) => {
      const next = !prev;
      setExpandedSection(next ? "__all__" : "Essentials");
      return next;
    });
  };

  const handleConfirm = () => {
    if (confirmAction === "switch") {
      signOut();
      navigate("/login?intent=switch");
    } else if (confirmAction === "signout") {
      signOut();
    }
    setConfirmAction(null);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background safe-area-bottom">
      <SEOHead title="More – ZIVO" description="Quick access to all ZIVO features and settings." noIndex />

      <div className="hidden lg:block"><NavBar /></div>

      {/* Mobile sticky header with back button (or scroll-aware search) */}
      <header
        className="zivo-pt-safe-sticky lg:hidden sticky top-0 z-30 bg-background/85 backdrop-blur-xl border-b border-border/40 flex items-center gap-2 px-3 pb-2 pt-safe"
      >
        <button type="button"
          onClick={() => {
            const params = new URLSearchParams(location.search);
            const from = params.get("from");
            if (from) navigate(`/${from}`);
            else navigate("/profile");
          }}
          aria-label="Go back"
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        {/* Always show title — the labeled "Search account, settings, links…"
            field below is the canonical search. Previously this swapped to a
            second search bar after 400px of scroll, which left two visually
            competing search inputs on screen at the same time. */}
        <h1 className="font-bold text-[17px] flex-1">More</h1>
        <button type="button"
          onClick={() => setShowHelpSheet(true)}
          aria-label="Open help"
          className="h-10 w-10 flex items-center justify-center rounded-full hover:bg-muted/60 active:scale-90 transition-transform text-foreground"
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
              className="zivo-card-organic p-5 mb-5 relative overflow-hidden"
            >
              <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="font-bold text-[18px] mb-1">Welcome to ZIVO</h2>
                <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed">
                  Sign in to access {totalLinks} features — book travel, earn coins, manage orders,
                  and more.
                </p>
                <div className="flex gap-2">
                  <Link
                    to="/login"
                    className="flex-1 py-2.5 rounded-full bg-primary text-primary-foreground font-bold text-[13px] text-center active:scale-95 transition-transform"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    className="flex-1 py-2.5 rounded-full border border-border bg-card text-foreground font-bold text-[13px] text-center active:scale-95 transition-transform"
                  >
                    Create account
                  </Link>
                </div>
                <Link
                  to="/install"
                  className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Or download the app
                </Link>
              </div>
            </motion.div>
          )}

          {/* Suggested next action (logged-in only) — hidden in OF mode */}
          {user && suggestedAction && !zivoOFMode && (
            <Link
              to={suggestedAction.href.startsWith("/") ? suggestedAction.href : "#"}
              className="block mb-4"
              onClick={(e) => {
                if (suggestedAction.href === "#checkin" && !claimedToday) {
                  e.preventDefault();
                  claimCheckin();
                } else if (suggestedAction.href === "#") {
                  e.preventDefault();
                }
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileTap={{ scale: 0.98 }}
                className={cn("zivo-card-organic flex items-center gap-3 p-3 active:scale-[0.99] transition-transform border-l-4", getAccentClasses(suggestedAction.accent).border)}
              >
                <div
                  className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", getAccentClasses(suggestedAction.accent).bg, getAccentClasses(suggestedAction.accent).text)}
                >
                  <suggestedAction.icon className={cn("w-5 h-5", getAccentClasses(suggestedAction.accent).text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Suggested next
                  </p>
                  <p className="font-bold text-[14px] truncate">{suggestedAction.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{suggestedAction.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />
              </motion.div>
            </Link>
          )}

          {/* Active trips & orders widget */}
          {user && (upcomingFlightCount > 0 || activeOrdersCount > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-2 gap-2 mb-4"
            >
              <Link
                to="/my-trips"
                className="zivo-card-organic p-3 active:scale-[0.97] transition-transform border-border bg-secondary"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Plane className="w-4 h-4 text-foreground" />
                  <p className="text-[10px] font-bold text-foreground uppercase tracking-wider">Trips</p>
                </div>
                <p className="text-2xl font-extrabold leading-none">{upcomingFlightCount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Upcoming • Tap to view
                </p>
              </Link>
              <Link
                to="/grocery/orders"
                className="zivo-card-organic p-3 active:scale-[0.97] transition-transform bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-amber-500" />
                  <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Orders</p>
                </div>
                <p className="text-2xl font-extrabold leading-none">{activeOrdersCount}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  In progress • Tap to track
                </p>
              </Link>
            </motion.div>
          )}

          {/* Daily Challenges — hidden in OF mode (gamification not relevant) */}
          {user && !zivoOFMode && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="zivo-card-organic p-3.5 mb-4"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Trophy className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-[13px]">Daily challenges</p>
                    <p className="text-[10px] text-muted-foreground">
                      {completedChallenges.length}/{dailyChallenges.length} done • +{dailyChallenges.reduce((s, c) => s + c.reward, 0)} coins
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-primary">{challengeProgress}%</span>
              </div>
              <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden mb-2.5">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${challengeProgress}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {dailyChallenges.map((c) => {
                  const done = completedChallenges.includes(c.id);
                  return (
                    <Link
                      key={c.id}
                      to={c.href}
                      onClick={() => { completeChallenge(c.id); trackRecent(c.href); }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-xl border transition active:scale-[0.97]",
                        done
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-muted/40 border-border/50 hover:bg-muted/60",
                      )}
                    >
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                        done ? "bg-emerald-500/20" : "bg-primary/15",
                      )}>
                        {done
                          ? <BadgeCheck className="w-3.5 h-3.5 text-emerald-500" />
                          : <c.icon className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-[11px] font-semibold leading-tight truncate",
                          done && "line-through text-muted-foreground",
                        )}>
                          {c.label}
                        </p>
                        <p className="text-[9px] text-amber-500 font-bold">+{c.reward} coins</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Account Status Strip (verified / tier / wallet) */}
          {user && renderAccountStatus()}

          {/* Quick Actions */}
          {user && renderQuickActions()}

          {/* Quick Toggles row */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 gap-2 mb-5"
            >
              <button type="button"
                onClick={() => {
                  const next = (resolvedTheme ?? theme) === "dark" ? "light" : "dark";
                  setTheme(next);
                }}
                className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
              >
                {(resolvedTheme ?? theme) === "dark"
                  ? <Moon className="w-4 h-4 text-amber-400 shrink-0" />
                  : <Sun className="w-4 h-4 text-amber-500 shrink-0" />}
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate capitalize">
                    {resolvedTheme ?? theme ?? "auto"}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">Theme</p>
                </div>
              </button>
              <button type="button"
                onClick={toggleDnd}
                className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
              >
                <Bell className={cn("w-4 h-4 shrink-0", dndOn ? "text-rose-500" : "text-emerald-500")} />
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate">
                    {dndOn ? "DnD on" : "DnD off"}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">Notifications</p>
                </div>
              </button>
              <button type="button"
                onClick={toggleSound}
                className="zivo-card-organic flex items-center gap-2 px-3 py-2.5 active:scale-[0.97] transition-transform"
              >
                <Volume2 className={cn("w-4 h-4 shrink-0", soundOn ? "text-sky-500" : "text-muted-foreground")} />
                <div className="text-left min-w-0">
                  <p className="text-[11px] font-bold leading-tight truncate">
                    {soundOn ? "Sound on" : "Muted"}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">App sounds</p>
                </div>
              </button>
            </motion.div>
          )}

          {/* Country / Region switcher chips */}
          {user && (
            <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-hide -mx-1 px-1">
              <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-wider shrink-0">
                <Globe className="w-3 h-3 inline mr-1 -mt-0.5" />
                Region
              </span>
              {regions.map((r) => (
                <button type="button"
                  key={r.code}
                  onClick={() => setRegionCode(r.code)}
                  className={cn(
                    "shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold transition active:scale-95",
                    region === r.code
                      ? "bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30"
                      : "bg-muted/50 text-foreground/70 hover:bg-muted",
                  )}
                  aria-label={`Switch to ${r.label}`}
                >
                  <span className="text-base leading-none">{r.flag}</span>
                  <span>{r.code}</span>
                </button>
              ))}
            </div>
          )}

          {/* PWA install banner (only when installable & not dismissed) */}
          {installPrompt && !installDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="zivo-card-organic flex items-center gap-3 p-3 mb-4 bg-gradient-to-r from-primary/10 border-primary/20"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[13px]">Install ZIVO</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  Add to home screen for instant access
                </p>
              </div>
              <button type="button"
                onClick={triggerInstall}
                className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground font-bold text-[11px] active:scale-95 transition-transform"
              >
                Install
              </button>
              <button type="button"
                onClick={dismissInstall}
                aria-label="Dismiss"
                className="p-1 -mr-1 rounded-full hover:bg-muted/60 active:scale-90 transition-transform"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </motion.div>
          )}

          {/* Notifications preview (last 3 unread) */}
          {user && notifPreview.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5"
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Bell className="w-3.5 h-3.5 text-foreground" strokeWidth={1.8} />
                  </div>
                  <h2 className="font-bold text-[15px]">Latest alerts</h2>
                  <span className="text-[10px] text-muted-foreground/60 font-medium bg-muted/40 px-1.5 py-0.5 rounded-full">
                    {unreadNotifCount > 99 ? "99+" : unreadNotifCount}
                  </span>
                </div>
                <Link to="/notification-center" className="text-[11px] font-semibold text-primary">
                  See all
                </Link>
              </div>
              <div className="space-y-1.5">
                {notifPreview.map((n) => (
                  <Link
                    key={n.id}
                    to={n.action_url || "/notification-center"}
                    className="zivo-card-organic flex items-start gap-2.5 p-3 active:scale-[0.98] transition-transform"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-foreground mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[12px] leading-tight truncate">{n.title}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {formatNotificationText(n.body)}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                  </Link>
                ))}
              </div>
            </motion.div>
          )}

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search account, settings, links…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onBlur={() => recordSearch(search)}
              onKeyDown={(e) => { if (e.key === "Enter") recordSearch(search); }}
              className="pl-9 pr-16 h-10 rounded-xl bg-muted/50 border-border/40 text-sm"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {search && (
                <button type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="p-1 rounded-full hover:bg-muted active:scale-90 transition-transform"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              {speechRef && (
                <button type="button"
                  onClick={startVoiceSearch}
                  aria-label="Voice search"
                  className={cn(
                    "p-1.5 rounded-full active:scale-90 transition-transform",
                    isListening ? "bg-rose-500/15" : "hover:bg-muted",
                  )}
                >
                  <Mic className={cn(
                    "h-4 w-4",
                    isListening ? "text-rose-500 animate-pulse" : "text-muted-foreground",
                  )} />
                </button>
              )}
            </div>
          </div>

          {/* Recent searches chips */}
          {!search && searchHistory.length > 0 && (
            <div className="flex items-center gap-1.5 mb-4 flex-wrap">
              <span className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
                Recent:
              </span>
              {searchHistory.map((q) => (
                <button type="button"
                  key={q}
                  onClick={() => setSearch(q)}
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted/60 hover:bg-muted text-foreground/80 active:scale-95 transition"
                >
                  {q}
                </button>
              ))}
              <button type="button"
                onClick={() => {
                  setSearchHistory([]);
                  try { window.localStorage.removeItem(SEARCH_HISTORY_KEY); } catch {}
                }}
                aria-label="Clear search history"
                className="text-[10px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors ml-1"
              >
                Clear
              </button>
            </div>
          )}
          {!search && searchHistory.length === 0 && <div className="mb-2" />}

          {/* Section jump-chips */}
          {!searchResults && (
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1 mb-3">
              {sections.map((s) => (
                <button type="button"
                  key={s.title}
                  onClick={() => {
                    setExpandedSection(s.title);
                    setAllExpanded(false);
                    requestAnimationFrame(() => {
                      const el = document.getElementById(`more-section-${s.title.replace(/\s+/g, "-").toLowerCase()}`);
                      el?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  }}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted active:scale-95 transition text-[11px] font-semibold text-foreground/80"
                >
                  <s.icon className="w-3 h-3" />
                  {s.title}
                </button>
              ))}
            </div>
          )}

          {/* Toolbar: Expand all + Privacy + Share */}
          {!searchResults && (
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={toggleAll}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  {allExpanded ? "Collapse all" : "Expand all"}
                </button>
                <button type="button"
                  onClick={togglePrivacy}
                  className={cn(
                    "flex items-center gap-1.5 text-[12px] font-semibold transition-colors",
                    privacyMode ? "text-rose-500" : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-label="Toggle privacy mode"
                  title={privacyMode ? "Privacy mode enabled" : "Privacy mode disabled"}
                >
                  <Eye className="w-3.5 h-3.5" />
                  {privacyMode ? "Private" : "Privacy"}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button type="button"
                  onClick={() => user ? setShowShareProfile(true) : shareApp()}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Share
                </button>
              </div>
            </div>
          )}

          {/* Recently Used (only when search empty and we have items) */}
          {!searchResults && recentLinks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="flex items-center justify-between mb-2 mt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center">
                    <Clock className="w-3.5 h-3.5 text-foreground" />
                  </div>
                  <h2 className="font-bold text-[15px]">Recently Used</h2>
                  <span className="text-[10px] text-muted-foreground/60 font-medium bg-muted/40 px-1.5 py-0.5 rounded-full">
                    {recentLinks.length}
                  </span>
                </div>
                <button type="button"
                  onClick={() => {
                    setRecentHrefs([]);
                    try { window.localStorage.removeItem(RECENT_KEY); } catch {}
                  }}
                  className="text-[11px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
                {recentLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => trackRecent(link.href)}
                    className="zivo-card-organic flex items-center gap-2 px-3 py-2 shrink-0 active:scale-[0.97] transition-transform"
                  >
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", getAccentClasses(link.accent).bg, getAccentClasses(link.accent).text)}>
                      <link.icon className={cn("w-3.5 h-3.5", getAccentClasses(link.accent).text)} />
                    </div>
                    <p className="text-[12px] font-semibold whitespace-nowrap">{link.label}</p>
                  </Link>
                ))}
              </div>
              <div className="h-px bg-border/30 my-3" />
            </motion.div>
          )}

          {/* Pinned (only when search empty) */}
          {!searchResults && pinnedLinks.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4"
            >
              <div className="flex items-center justify-between mb-2 mt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-400/15 flex items-center justify-center">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  </div>
                  <h2 className="font-bold text-[15px]">Pinned</h2>
                  <span className="text-[10px] text-muted-foreground/60 font-medium bg-muted/40 px-1.5 py-0.5 rounded-full">
                    {pinnedLinks.length}
                  </span>
                </div>
                <button type="button"
                  onClick={() => {
                    setPinnedHrefs([]);
                    try { window.localStorage.removeItem(PIN_KEY); } catch {}
                  }}
                  className="text-[11px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1.5">
                {pinnedLinks.map((link, i) => renderLink(link, i))}
              </div>
              <div className="h-px bg-border/30 my-3" />
            </motion.div>
          )}

          {/* All Sections OR flat search results */}
          {searchResults ? (
            <div className="space-y-1.5">
              {searchResults.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No results for "{search}"
                </p>
              ) : (
                searchResults.map((link, i) => renderLink(link, i))
              )}
            </div>
          ) : (
            sections.map((section, si) => renderSection(section, si))
          )}

          {/* Current device info */}
          {user && !searchResults && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 zivo-card-organic p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[13px]">{deviceInfo.kind}</p>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Active
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">
                  This session • {deviceInfo.platform}
                </p>
              </div>
              <Link
                to="/account/security"
                className="text-[11px] font-semibold text-primary px-3 py-1.5 rounded-full bg-primary/10 active:scale-95 transition-transform"
              >
                Manage
              </Link>
            </motion.div>
          )}

          {/* Beta / Labs opt-in */}
          {user && !searchResults && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-5 zivo-card-organic p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Cpu className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-[14px]">ZIVO Labs</p>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-secondary text-foreground">
                      Beta
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3">
                    Try experimental features early. Things may break — that's the fun.
                  </p>
                  {betaOptIn && (
                    <ul className="space-y-1 mb-3">
                      {betaFeatures.map((f) => (
                        <li key={f.label} className="flex items-center gap-2 text-[11px] text-foreground/80">
                          <f.icon className="w-3 h-3 text-foreground" />
                          {f.label}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button type="button"
                    onClick={toggleBeta}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-[11px] font-bold active:scale-95 transition-transform",
                      betaOptIn
                        ? "bg-fuchsia-500/15 text-fuchsia-500 border border-fuchsia-500/30"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {betaOptIn ? "✓ Enrolled — opt out" : "Join the beta"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Admin */}
          {isAdmin && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
              <Link to="/admin/god-view" className="contents">
                <div className="w-full py-3 rounded-2xl zivo-ribbon bg-primary/5 border border-primary/15 text-primary font-bold text-sm touch-manipulation active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                  <Shield className="w-4 h-4" />
                  Admin Dashboard
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            </motion.div>
          )}

          {/* Sign Out */}
          {user && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-4">
              <button type="button"
                onClick={() => setConfirmAction("signout")}
                className="w-full py-3 rounded-2xl border border-border/50 bg-card text-foreground font-semibold text-sm touch-manipulation active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </motion.div>
          )}

          {/* Footer: legal mini-links + app links */}
          <div className="mt-8 pt-6 border-t border-border/30">
            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mb-4">
              {[
                { label: "Terms", href: "/terms" },
                { label: "Privacy", href: "/privacy" },
                { label: "Cookies", href: "/cookies" },
                { label: "Refund", href: "/refund-policy" },
                { label: "Cancellation", href: "/cancellation-policy" },
                { label: "Safety", href: "/safety" },
                { label: "Status", href: "/status" },
                { label: "Help", href: "/help" },
                { label: "About", href: "/about" },
                { label: "Careers", href: "/careers" },
                { label: "Press", href: "/press" },
                { label: "Contact", href: "/account/contact" },
              ].map((l) => (
                <Link
                  key={l.href}
                  to={l.href}
                  className="text-[11px] font-medium text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* App store CTAs */}
            <div className="flex justify-center gap-2 mb-3">
              <Link
                to="/install"
                className="zivo-card-organic flex items-center gap-2 px-3 py-2 active:scale-[0.97] transition-transform"
              >
                <Smartphone className="w-4 h-4 text-foreground/80" />
                <div className="text-left">
                  <p className="text-[8px] text-muted-foreground leading-none">Get the</p>
                  <p className="text-[12px] font-bold leading-tight">iOS app</p>
                </div>
              </Link>
              <Link
                to="/install"
                className="zivo-card-organic flex items-center gap-2 px-3 py-2 active:scale-[0.97] transition-transform"
              >
                <Smartphone className="w-4 h-4 text-foreground/80" />
                <div className="text-left">
                  <p className="text-[8px] text-muted-foreground leading-none">Get on</p>
                  <p className="text-[12px] font-bold leading-tight">Google Play</p>
                </div>
              </Link>
            </div>

            {/* Social row */}
            <div className="flex justify-center gap-2 mb-3">
              <button type="button"
                onClick={shareApp}
                aria-label="Share ZIVO"
                className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center active:scale-90 transition-transform"
              >
                <Share2 className="w-4 h-4 text-foreground/70" />
              </button>
              <Link
                to="/qr-profile"
                aria-label="Show QR"
                className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center active:scale-90 transition-transform"
              >
                <QrCode className="w-4 h-4 text-foreground/70" />
              </Link>
              <Link
                to="/feedback"
                aria-label="Send feedback"
                className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center active:scale-90 transition-transform"
              >
                <Lightbulb className="w-4 h-4 text-foreground/70" />
              </Link>
              <Link
                to="/support"
                aria-label="Contact support"
                className="w-9 h-9 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center active:scale-90 transition-transform"
              >
                <Headset className="w-4 h-4 text-foreground/70" />
              </Link>
            </div>
          </div>

          {/* ZIVO Watermark */}
          <div className="relative mt-2 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground/30 font-semibold tracking-widest uppercase">ZIVO • 2026</span>
            <span className="text-[9px] text-muted-foreground/20">{totalLinks} features across {sections.length} sections</span>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground/20">v{appVersion}</span>
              <span className="text-muted-foreground/20">•</span>
              <span className="flex items-center gap-1 text-[9px] text-muted-foreground/40">
                <span
                  className={cn(
                    "inline-block w-1.5 h-1.5 rounded-full",
                    isOnline ? "bg-emerald-500 animate-pulse" : "bg-rose-500",
                  )}
                />
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>
            <button type="button"
              onClick={() => setShowWhatsNew(true)}
              className="mt-1 text-[10px] font-semibold text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
            >
              <Sparkle className="w-3 h-3" />
              What's new
            </button>
          </div>
        </main>
      </div>

      {/* Partner Sheet */}
      <Sheet open={showPartnerSheet} onOpenChange={setShowPartnerSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] overflow-auto pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold">Become a Partner</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {partnerOptions.map((opt) => (
              <Link
                key={opt.label}
                to={opt.href}
                onClick={() => setShowPartnerSheet(false)}
                className="zivo-card-organic flex items-center gap-3 p-3 touch-manipulation"
              >
                <div className={cn("zivo-icon-pill", getAccentClasses(opt.accent).text, getAccentClasses(opt.accent).bg)}>
                  <opt.icon className={cn("w-5 h-5", getAccentClasses(opt.accent).text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* What's New sheet */}
      <Sheet open={showWhatsNew} onOpenChange={setShowWhatsNew}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] overflow-auto pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkle className="w-5 h-5 text-primary" />
              What's new in ZIVO
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-5">
            {whatsNew.map((release) => (
              <div key={release.date} className="zivo-card-organic p-4">
                <div className="flex items-baseline justify-between mb-2">
                  <h3 className="font-bold text-[15px]">{release.title}</h3>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {release.date}
                  </span>
                </div>
                <ul className="space-y-1.5">
                  {release.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[12px] text-muted-foreground">
                      <CircleDot className="w-3 h-3 text-primary mt-0.5 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Link
              to="/roadmap"
              onClick={() => setShowWhatsNew(false)}
              className="zivo-card-organic flex items-center justify-between p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <GitBranch className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-[14px]">See full roadmap</p>
                  <p className="text-[11px] text-muted-foreground">What's coming next</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
            </Link>
          </div>
        </SheetContent>
      </Sheet>

      {/* Sign Out / Switch Account confirm */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction === "switch" ? "Switch account?" : "Sign out?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "switch"
                ? "You'll be signed out and taken to the login screen so you can sign in with a different account."
                : "You'll need to sign in again to access your account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
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
        aria-label="Open help"
        className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+6rem)] lg:bottom-8 right-5 z-30 hidden w-12 h-12 rounded-full bg-gradient-to-br from-primary shadow-lg shadow-primary/30 lg:flex items-center justify-center active:scale-90 transition-transform"
      >
        <HelpCircle className="w-5 h-5 text-white" />
      </button>

      {/* Share profile sheet */}
      <Sheet open={showShareProfile} onOpenChange={setShowShareProfile}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Share2 className="w-5 h-5 text-primary" />
              Share your profile
            </SheetTitle>
          </SheetHeader>
          <div className="zivo-card-organic p-4 mb-3 flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20 shrink-0">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[14px] truncate">{displayName}</p>
              <p className="text-[11px] text-muted-foreground truncate">@{handle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3 px-3 py-2.5 bg-muted/50 rounded-xl">
            <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
            <p className="flex-1 text-[12px] font-mono text-foreground/80 truncate">
              {profileShareUrl}
            </p>
            <button type="button"
              onClick={copyProfileLink}
              className="text-[11px] font-bold text-primary px-2 py-1 rounded-lg bg-primary/10 active:scale-95 transition-transform shrink-0"
            >
              Copy
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button"
              onClick={() => {
                setShowShareProfile(false);
                shareApp();
              }}
              className="zivo-card-organic flex flex-col items-center gap-1.5 p-3 active:scale-[0.95] transition-transform"
            >
              <Share2 className="w-5 h-5 text-primary" />
              <span className="text-[11px] font-bold">System share</span>
            </button>
            <Link
              to="/qr-profile"
              onClick={() => setShowShareProfile(false)}
              className="zivo-card-organic flex flex-col items-center gap-1.5 p-3 active:scale-[0.95] transition-transform"
            >
              <QrCode className="w-5 h-5 text-foreground" />
              <span className="text-[11px] font-bold">QR code</span>
            </Link>
            <button type="button"
              onClick={copyProfileLink}
              className="zivo-card-organic flex flex-col items-center gap-1.5 p-3 active:scale-[0.95] transition-transform"
            >
              <ExternalLink className="w-5 h-5 text-emerald-500" />
              <span className="text-[11px] font-bold">Copy link</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Help sheet */}
      <Sheet open={showHelpSheet} onOpenChange={setShowHelpSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[80dvh] overflow-auto pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              How can we help?
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {[
              { icon: HelpCircle, label: "Help Center", desc: "Browse articles & guides", href: "/help-center", accent: "hsl(199 89% 48%)" },
              { icon: BookOpen, label: "FAQ", desc: "Common questions answered", href: "/faq", accent: "hsl(38 92% 50%)" },
              { icon: Headset, label: "Live chat support", desc: "Talk to a real human", href: "/support", accent: "hsl(221 83% 53%)" },
              { icon: Ticket, label: "Open a ticket", desc: "Track your issue", href: "/support/tickets", accent: "hsl(38 92% 50%)" },
              { icon: Bug, label: "Report a problem", desc: "Bug or site issue", href: "/support/site-issues", accent: "hsl(0 84% 60%)" },
              { icon: Plane, label: "Travel booking help", desc: "Flight/hotel/car issues", href: "/support/travel-bookings", accent: "hsl(199 89% 48%)" },
              { icon: ShieldAlert, label: "Report a scam", desc: "Fraud / suspicious activity", href: "/security/scams", accent: "hsl(0 84% 60%)" },
              { icon: Lightbulb, label: "Send feedback", desc: "Ideas & suggestions", href: "/feedback", accent: "hsl(45 93% 58%)" },
              { icon: Server, label: "Service status", desc: "System health & uptime", href: "/status", accent: "hsl(142 71% 45%)" },
            ].map((opt) => (
              <Link
                key={opt.label}
                to={opt.href}
                onClick={() => setShowHelpSheet(false)}
                className="zivo-card-organic flex items-center gap-3 p-3 active:scale-[0.98] transition-transform"
              >
                <div className={cn("zivo-icon-pill", getAccentClasses(opt.accent).text, getAccentClasses(opt.accent).bg)}>
                  <opt.icon className={cn("w-5 h-5", getAccentClasses(opt.accent).text)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <ZivoMobileNav />
    </div>
  );
}
