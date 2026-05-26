/**
 * RideHubPage - Central hub for all ride features
 */
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, Crown, Search, Receipt, Star, Car, Calendar, Route,
  MessageSquare, Shield, MapPin, Users, DollarSign, Accessibility,
  Navigation, Wallet, User, Share2, Award, PieChart, Zap, History,
  Map as MapIcon, CalendarDays, Bell, Settings, Leaf, Briefcase,
  ThumbsUp, Dog, Music, Gift, TrendingUp, Trophy, Building2, Heart,
  Brain, ShieldCheck, Plane, UserPlus, Gem, Gavel, Camera, Grid3x3,
  ChevronLeft,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import SEOHead from "@/components/SEOHead";
import BundleProgressBanner from "@/components/shared/BundleProgressBanner";
import HeartedDestinationsRail from "@/components/rides/HeartedDestinationsRail";
import LocalSavedPlacesRow from "@/components/rides/LocalSavedPlacesRow";
import RideBookingHome from "@/components/rides/RideBookingHome";
import React from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/hooks/useI18n";

const RideHistoryInsights = React.lazy(() => import("@/components/rides/RideHistoryInsights"));
const RidePassPlans = React.lazy(() => import("@/components/rides/RidePassPlans"));
const LostItemReport = React.lazy(() => import("@/components/rides/LostItemReport"));
const RideReceiptCard = React.lazy(() => import("@/components/rides/RideReceiptCard"));
const RateAndTipFlow = React.lazy(() => import("@/components/rides/RateAndTipFlow"));
const SurgePricingMap = React.lazy(() => import("@/components/rides/SurgePricingMap"));
const ScheduleRideSheet = React.lazy(() => import("@/components/rides/ScheduleRideSheet"));
const MultiStopRoute = React.lazy(() => import("@/components/rides/MultiStopRoute"));
const InRideChat = React.lazy(() => import("@/components/rides/InRideChat"));
const SmartSavedPlaces = React.lazy(() => import("@/components/rides/SmartSavedPlaces"));
const GroupRidePlanner = React.lazy(() => import("@/components/rides/GroupRidePlanner"));
const FareComparisonTool = React.lazy(() => import("@/components/rides/FareComparisonTool"));
const AccessibilityHub = React.lazy(() => import("@/components/rides/AccessibilityHub"));
const RideBookingConfirmation = React.lazy(() => import("@/components/rides/RideBookingConfirmation"));
const LiveTripTracker = React.lazy(() => import("@/components/rides/LiveTripTracker"));
const RideWallet = React.lazy(() => import("@/components/rides/RideWallet"));
const DriverProfileCard = React.lazy(() => import("@/components/rides/DriverProfileCard"));
const RideSocialHub = React.lazy(() => import("@/components/rides/RideSocialHub"));
const RideLoyaltyCard = React.lazy(() => import("@/components/rides/RideLoyaltyCard"));
const RideSpendingAnalytics = React.lazy(() => import("@/components/rides/RideSpendingAnalytics"));
const RideTripHistory = React.lazy(() => import("@/components/rides/RideTripHistory"));
const RideScheduleCalendar = React.lazy(() => import("@/components/rides/RideScheduleCalendar"));
const RideDriverMatch = React.lazy(() => import("@/components/rides/RideDriverMatch"));
const RideSafetyCenter = React.lazy(() => import("@/components/rides/RideSafetyCenter"));
const RideNotificationCenter = React.lazy(() => import("@/components/rides/RideNotificationCenter"));
const RidePreferences = React.lazy(() => import("@/components/rides/RidePreferences"));
const RideEcoTracker = React.lazy(() => import("@/components/rides/RideEcoTracker"));
const RideBusinessManager = React.lazy(() => import("@/components/rides/RideBusinessManager"));
const RideFeedbackCenter = React.lazy(() => import("@/components/rides/RideFeedbackCenter"));
const RideSpecialtyModes = React.lazy(() => import("@/components/rides/RideSpecialtyModes"));
const RideSmartAnalytics = React.lazy(() => import("@/components/rides/RideSmartAnalytics"));
const RideEntertainment = React.lazy(() => import("@/components/rides/RideEntertainment"));
const RideGifting = React.lazy(() => import("@/components/rides/RideGifting"));
const RideRewardsGamification = React.lazy(() => import("@/components/rides/RideRewardsGamification"));
const RideCorporateFleet = React.lazy(() => import("@/components/rides/RideCorporateFleet"));
const RideAccessibilityPlus = React.lazy(() => import("@/components/rides/RideAccessibilityPlus"));
const RideRouteIntelligence = React.lazy(() => import("@/components/rides/RideRouteIntelligence"));
const RideAdvancedSafety = React.lazy(() => import("@/components/rides/RideAdvancedSafety"));
const RideTravelIntegration = React.lazy(() => import("@/components/rides/RideTravelIntegration"));
const RideFamilyAccounts = React.lazy(() => import("@/components/rides/RideFamilyAccounts"));
const RideSubscriptionHub = React.lazy(() => import("@/components/rides/RideSubscriptionHub"));
const RideSmartPricing = React.lazy(() => import("@/components/rides/RideSmartPricing"));
const RideDriverComm = React.lazy(() => import("@/components/rides/RideDriverComm"));
const RideSocialFeatures = React.lazy(() => import("@/components/rides/RideSocialFeatures"));
const RideAnalyticsDashboard = React.lazy(() => import("@/components/rides/RideAnalyticsDashboard"));
const RideMarketplace = React.lazy(() => import("@/components/rides/RideMarketplace"));
const RideWellnessComfort = React.lazy(() => import("@/components/rides/RideWellnessComfort"));
const RidePaymentsAdvanced = React.lazy(() => import("@/components/rides/RidePaymentsAdvanced"));
const RideAIAssistant = React.lazy(() => import("@/components/rides/RideAIAssistant"));
const RideSchedulingRecurring = React.lazy(() => import("@/components/rides/RideSchedulingRecurring"));
const RideSafetyAdvanced = React.lazy(() => import("@/components/rides/RideSafetyAdvanced"));
const RideLoyaltyRewards = React.lazy(() => import("@/components/rides/RideLoyaltyRewards"));
const RideAccessibilityAdvanced = React.lazy(() => import("@/components/rides/RideAccessibilityAdvanced"));
const ZivoReserve = React.lazy(() => import("@/components/rides/ZivoReserve"));

function RideFeatureFallback() {
  return (
    <div className="flex min-h-[220px] items-center justify-center p-4">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}

/* ─── Primary tabs always visible in nav bar ─── */
const PRIMARY_TAB_IDS = ["book", "reserve", "tracking", "history", "wallet", "safety", "pass", "features"];

/* ─── Feature categories grid ─── */
interface FeatureItem { id: string; label: string; icon: React.ElementType }
interface FeatureCategory { title: string; iconClass: string; bgClass: string; icon: React.ElementType; items: FeatureItem[] }

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: "Ride Tools",
    icon: MapIcon,
    iconClass: "text-primary",
    bgClass: "bg-primary/10",
    items: [
      { id: "map", label: "Demand Map", icon: MapIcon },
      { id: "compare", label: "Compare Fares", icon: DollarSign },
      { id: "schedule", label: "Schedule", icon: Calendar },
      { id: "multi", label: "Multi-Stop", icon: Route },
      { id: "group", label: "Group Ride", icon: Users },
      { id: "places", label: "Saved Places", icon: MapPin },
      { id: "calendar", label: "Calendar", icon: CalendarDays },
      { id: "ai-assist", label: "AI Assistant", icon: Brain },
    ],
  },
  {
    title: "Your Driver",
    icon: Car,
    iconClass: "text-blue-500",
    bgClass: "bg-blue-500/10",
    items: [
      { id: "match", label: "Driver Match", icon: Car },
      { id: "driver", label: "Driver Profile", icon: User },
      { id: "chat", label: "In-Ride Chat", icon: MessageSquare },
      { id: "rate", label: "Rate & Tip", icon: Star },
      { id: "receipt", label: "Receipt", icon: Receipt },
      { id: "driver-comm", label: "Driver Comms", icon: MessageSquare },
      { id: "confirm", label: "Confirmation", icon: Star },
    ],
  },
  {
    title: "Rewards & Pay",
    icon: Trophy,
    iconClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
    items: [
      { id: "loyalty", label: "Loyalty Card", icon: Award },
      { id: "loyalty-rwd", label: "Loyalty+", icon: Trophy },
      { id: "rewards", label: "Rewards", icon: Trophy },
      { id: "gifting", label: "Gifting", icon: Gift },
      { id: "spending", label: "Spending", icon: PieChart },
      { id: "pay-adv", label: "Payments+", icon: Wallet },
      { id: "smart-price", label: "Smart Pricing", icon: DollarSign },
      { id: "subscribe", label: "Subscriptions", icon: Gem },
      { id: "marketplace", label: "Marketplace", icon: Gavel },
    ],
  },
  {
    title: "Safety & Access",
    icon: Shield,
    iconClass: "text-red-500",
    bgClass: "bg-red-500/10",
    items: [
      { id: "a11y", label: "Accessibility", icon: Accessibility },
      { id: "inclusive", label: "Inclusive+", icon: Heart },
      { id: "a11y-adv", label: "A11y Adv.", icon: Accessibility },
      { id: "adv-safety", label: "Safety+", icon: ShieldCheck },
      { id: "safety-adv2", label: "Dashcam", icon: Camera },
      { id: "lost", label: "Lost Item", icon: Search },
      { id: "alerts", label: "Notifications", icon: Bell },
      { id: "prefs", label: "Ride Prefs", icon: Settings },
    ],
  },
  {
    title: "Analytics",
    icon: BarChart3,
    iconClass: "text-violet-500",
    bgClass: "bg-violet-500/10",
    items: [
      { id: "insights", label: "Trip Insights", icon: BarChart3 },
      { id: "analytics", label: "Smart Analytics", icon: TrendingUp },
      { id: "ride-analytics", label: "Dashboard", icon: PieChart },
      { id: "eco", label: "Eco Tracker", icon: Leaf },
      { id: "routes", label: "Route Intel", icon: Brain },
      { id: "surge", label: "Surge Zones", icon: MapIcon },
    ],
  },
  {
    title: "Social & Lifestyle",
    icon: Share2,
    iconClass: "text-pink-500",
    bgClass: "bg-pink-500/10",
    items: [
      { id: "social", label: "Social Hub", icon: Share2 },
      { id: "social-feat", label: "Community", icon: Users },
      { id: "entertain", label: "In-Ride Music", icon: Music },
      { id: "wellness", label: "Wellness", icon: Heart },
    ],
  },
  {
    title: "Business & More",
    icon: Briefcase,
    iconClass: "text-emerald-500",
    bgClass: "bg-emerald-500/10",
    items: [
      { id: "business", label: "Business", icon: Briefcase },
      { id: "corporate", label: "Fleet", icon: Building2 },
      { id: "travel", label: "Travel", icon: Plane },
      { id: "family", label: "Family", icon: UserPlus },
      { id: "specialty", label: "Specialty", icon: Dog },
      { id: "feedback", label: "Feedback", icon: ThumbsUp },
      { id: "scheduling", label: "Recurring", icon: CalendarDays },
    ],
  },
];

type TabCategory = "book" | "trip" | "money" | "safety" | "comfort" | "rewards" | "business";

export default function RideHubPage() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();

  const submitRateAndTip = async (data: { rating: number; tip: number; feedback: string; tags: string[] }) => {
    try {
      // Find the most recent completed ride that hasn't been rated yet so the
      // edge function can charge the tip against the right card-on-file and
      // credit the right driver. Without this, the tip used to be a UI lie —
      // amount written as plain text into feedback_submissions, never charged.
      const { data: ride } = await supabase
        .from("ride_requests")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .is("rated_at", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const tipCents = Math.max(0, Math.round((data.tip || 0) * 100));
      let tipResult: { charged: boolean; tip_cents: number; error?: string } | null = null;

      if (ride?.id) {
        const { data: tipResp, error: tipErr } = await supabase.functions.invoke("capture-ride-tip", {
          body: {
            ride_request_id: ride.id,
            tip_cents: tipCents,
            rating: data.rating,
            feedback: data.feedback || null,
          },
        });
        if (tipErr) {
          tipResult = { charged: false, tip_cents: 0, error: tipErr.message || "Tip charge failed" };
        } else if ((tipResp as any)?.error) {
          tipResult = { charged: false, tip_cents: 0, error: (tipResp as any).error };
        } else {
          tipResult = tipResp as any;
        }
      }

      // Always log the qualitative feedback even if there's no recent ride
      // (e.g. user tapped Rate from a generic CTA). This keeps the existing
      // feedback table populated and lets ops see ratings even if the tip
      // path can't run.
      await supabase.from("feedback_submissions").insert({
        category: "ride_rating",
        subject: `Ride rating: ${data.rating} stars`,
        message: `Rating: ${data.rating}/5\nTip: $${data.tip.toFixed(2)} ${tipResult?.charged ? "✓ charged" : tipResult?.error ? `✗ ${tipResult.error}` : "(no recent ride)"}\nTags: ${data.tags.join(", ") || "none"}\n\nFeedback: ${data.feedback || "(no comment)"}`,
        rating: data.rating,
        user_id: user?.id ?? null,
      });

      if (tipResult?.charged) {
        toast.success(`Tip of $${data.tip.toFixed(2)} charged. Thanks!`);
      } else if (tipResult?.error) {
        toast.error(`Rating saved but tip couldn't be charged: ${tipResult.error}`);
      } else if (tipCents > 0 && !ride?.id) {
        toast.message("Rating saved", {
          description: "We couldn't find a recent ride to attach the tip to. Please tip from your trip history.",
        });
      } else {
        toast.success("Thanks for the feedback!");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not submit rating. Please try again.");
    }
  };

  const submitLostItem = async (data: { category: string; description: string }) => {
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "lost_item_report",
        subject: `Lost ${data.category}`,
        message: data.description,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      toast.success("Lost item reported. We'll be in touch.");
    } catch (e: any) {
      toast.error(e?.message || "Could not submit report. Please try again.");
    }
  };
  const tabs: { id: string; label: string; icon: typeof Zap; category: TabCategory }[] = [
    { id: "book", label: t("ride.tab_book"), icon: Zap, category: "book" },
    { id: "reserve", label: t("ride.tab_reserve"), icon: CalendarDays, category: "book" },
    { id: "schedule", label: "Schedule", icon: Calendar, category: "book" },
    { id: "scheduling", label: "Scheduling", icon: CalendarDays, category: "book" },
    { id: "calendar", label: t("ride.tab_calendar"), icon: CalendarDays, category: "book" },
    { id: "multi", label: "Multi-Stop", icon: Route, category: "book" },
    { id: "group", label: "Group", icon: Users, category: "book" },
    { id: "places", label: "Places", icon: MapPin, category: "book" },
    { id: "search", label: t("ride.tab_search"), icon: Search, category: "book" },
    { id: "map", label: t("ride.tab_map"), icon: MapIcon, category: "trip" },
    { id: "tracking", label: t("ride.tab_live"), icon: Navigation, category: "trip" },
    { id: "match", label: "Match", icon: Car, category: "trip" },
    { id: "confirm", label: t("ride.confirm"), icon: Star, category: "trip" },
    { id: "history", label: t("ride.tab_history"), icon: History, category: "trip" },
    { id: "chat", label: "Chat", icon: MessageSquare, category: "trip" },
    { id: "driver", label: "Driver", icon: User, category: "trip" },
    { id: "driver-comm", label: "Comms", icon: MessageSquare, category: "trip" },
    { id: "routes", label: "Routes", icon: Brain, category: "trip" },
    { id: "rate", label: "Rate", icon: Star, category: "trip" },
    { id: "lost", label: "Lost Item", icon: Search, category: "trip" },
    { id: "feedback", label: "Feedback", icon: ThumbsUp, category: "trip" },
    { id: "wallet", label: t("ride.tab_wallet"), icon: Wallet, category: "money" },
    { id: "pay-adv", label: "Pay+", icon: Wallet, category: "money" },
    { id: "pass", label: t("ride.tab_pass"), icon: Crown, category: "money" },
    { id: "subscribe", label: "Subscribe", icon: Gem, category: "money" },
    { id: "spending", label: "Spending", icon: PieChart, category: "money" },
    { id: "receipt", label: "Receipt", icon: Receipt, category: "money" },
    { id: "compare", label: "Compare", icon: DollarSign, category: "money" },
    { id: "smart-price", label: "Pricing", icon: DollarSign, category: "money" },
    { id: "surge", label: "Demand", icon: Car, category: "money" },
    { id: "marketplace", label: "Marketplace", icon: Gavel, category: "money" },
    { id: "gifting", label: "Gifting", icon: Gift, category: "money" },
    { id: "safety", label: t("ride.tab_safety"), icon: Shield, category: "safety" },
    { id: "adv-safety", label: t("ride.tab_safety") + "+", icon: ShieldCheck, category: "safety" },
    { id: "safety-adv2", label: "Dashcam", icon: Camera, category: "safety" },
    { id: "alerts", label: t("ride.tab_alerts"), icon: Bell, category: "safety" },
    { id: "a11y", label: t("ride.accessible"), icon: Accessibility, category: "comfort" },
    { id: "a11y-adv", label: "A11y+", icon: Accessibility, category: "comfort" },
    { id: "inclusive", label: "Inclusive", icon: Heart, category: "comfort" },
    { id: "prefs", label: "Prefs", icon: Settings, category: "comfort" },
    { id: "eco", label: "Eco", icon: Leaf, category: "comfort" },
    { id: "specialty", label: "Special", icon: Dog, category: "comfort" },
    { id: "entertain", label: "Music", icon: Music, category: "comfort" },
    { id: "wellness", label: "Wellness", icon: Heart, category: "comfort" },
    { id: "ai-assist", label: "AI", icon: Brain, category: "comfort" },
    { id: "loyalty", label: "Loyalty", icon: Award, category: "rewards" },
    { id: "loyalty-rwd", label: "Loyalty+", icon: Trophy, category: "rewards" },
    { id: "rewards", label: "Rewards", icon: Trophy, category: "rewards" },
    { id: "social", label: "Social", icon: Share2, category: "rewards" },
    { id: "social-feat", label: "Community", icon: Users, category: "rewards" },
    { id: "insights", label: t("ride.tab_insights"), icon: BarChart3, category: "rewards" },
    { id: "analytics", label: "Analytics", icon: TrendingUp, category: "rewards" },
    { id: "ride-analytics", label: "Dashboard", icon: PieChart, category: "rewards" },
    { id: "business", label: "Business", icon: Briefcase, category: "business" },
    { id: "corporate", label: "Corporate", icon: Building2, category: "business" },
    { id: "family", label: "Family", icon: UserPlus, category: "business" },
    { id: "travel", label: "Travel", icon: Plane, category: "business" },
  ];

  const primaryTabs = [
    { id: "book",     label: t("ride.tab_book"),    icon: Zap },
    { id: "reserve",  label: t("ride.tab_reserve"),  icon: CalendarDays },
    { id: "tracking", label: t("ride.tab_live"),     icon: Navigation },
    { id: "history",  label: t("ride.tab_history"),  icon: History },
    { id: "wallet",   label: t("ride.tab_wallet"),   icon: Wallet },
    { id: "safety",   label: t("ride.tab_safety"),   icon: Shield },
    { id: "pass",     label: t("ride.tab_pass"),     icon: Crown },
    { id: "features", label: "Features",             icon: Grid3x3 },
  ];

  const categories: { id: TabCategory | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "book", label: "Book" },
    { id: "trip", label: "Trip" },
    { id: "money", label: "Money" },
    { id: "safety", label: "Safety" },
    { id: "comfort", label: "Comfort" },
    { id: "rewards", label: "Rewards" },
    { id: "business", label: "Business" },
  ];
  const [activeCategory, setActiveCategory] = useState<TabCategory | "all">("all");
  const [tabFilter, setTabFilter] = useState("");
  const visibleTabs = tabs.filter(tb => {
    if (activeCategory !== "all" && tb.category !== activeCategory) return false;
    if (tabFilter.trim() && !tb.label.toLowerCase().includes(tabFilter.trim().toLowerCase())) return false;
    return true;
  });
  const [searchParams, setSearchParams] = useSearchParams();
  const validTabIds = tabs.map(t => t.id);
  const requestedTab = searchParams.get("tab");
  const initialTab = requestedTab && validTabIds.includes(requestedTab) ? requestedTab : "book";
  const initialDestination = searchParams.get("destination") || undefined;
  const initialDestLat = searchParams.get("destLat") ? parseFloat(searchParams.get("destLat")!) : undefined;
  const initialDestLng = searchParams.get("destLng") ? parseFloat(searchParams.get("destLng")!) : undefined;

  const [activeTab, setActiveTab] = useState(initialTab);
  const [bookWithSchedule, setBookWithSchedule] = useState(false);
  // Rebook prefill state
  const [rebookDest, setRebookDest] = useState<{ address: string; lat?: number; lng?: number } | null>(null);
  // Track which tab to return to when back is pressed from a feature tab
  const [featureReturnTab, setFeatureReturnTab] = useState<string>("features");

  useEffect(() => {
    const next = searchParams.get("tab");
    if (next && validTabIds.includes(next) && next !== activeTab) setActiveTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectTab = (id: string) => {
    setActiveTab(id);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id === "book") next.delete("tab");
      else next.set("tab", id);
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [activeTab]);

  const isFullScreen = activeTab === "book" || activeTab === "reserve";
  const isPrimary = PRIMARY_TAB_IDS.includes(activeTab);

  // Navigate from features grid to a feature tab
  const goToFeature = (id: string) => {
    setFeatureReturnTab("features");
    setActiveTab(id);
  };

  // Handle rebook from trip history → prefill book tab
  const handleRebook = (dropoffAddress: string, dropoffLat?: number, dropoffLng?: number) => {
    setRebookDest({ address: dropoffAddress, lat: dropoffLat, lng: dropoffLng });
    setActiveTab("book");
    toast.success("Route loaded — set your pickup and go!");
  };

  // Handle back button: feature tabs go back to features grid, others go to home
  const handleBack = () => {
    if (!isPrimary) {
      setActiveTab(featureReturnTab);
    } else {
      navigate("/");
    }
  };

  return (
    <>
    <SEOHead
      title="ZIVO Ride – Book Rides, Reserve Trips & Track Drivers"
      description="Book a ride, reserve a trip, track drivers, manage ride passes, and use ZIVO's ride tools from one hub."
      canonical="/rides/hub"
      noIndex
    />
    <AppLayout
      title={t("ride.title")}
      showBack
      onBack={handleBack}
      fixedHeight={isFullScreen}
      hideHeader={activeTab === "book"}
      hideNav={activeTab === "book"}
      className={cn(
        // Cap width on tablet+/desktop so 57 horizontal tabs + content stay
        // readable as a clean centered panel instead of stretching full-screen.
        activeTab !== "book" && !isFullScreen && "md:max-w-3xl lg:max-w-4xl xl:max-w-5xl mx-auto",
        activeTab === "book" ? "overflow-hidden !pb-0" : isFullScreen ? "overflow-hidden" : "",
      )}
    >
      <BundleProgressBanner step="ride" />
      {/* Hearted destinations rail — only shown in non-fullscreen tab views */}
      {activeTab !== "book" && (
        <div className="px-4 pt-3 pb-1 space-y-2">
          <LocalSavedPlacesRow />
          <HeartedDestinationsRail />
        </div>
      )}
      {/* Tab bar — hidden when in full-screen book mode */}
      {activeTab !== "book" && (
        <div className={cn("z-20 bg-background/95 backdrop-blur-lg border-b border-border/30 shrink-0", isFullScreen ? "" : "sticky top-14")}>
          {/* Category filter chips */}
          <div className="flex overflow-x-auto gap-1.5 px-4 pt-2 scrollbar-none">
            {categories.map(cat => {
              const isActive = activeCategory === cat.id;
              const count = cat.id === "all" ? tabs.length : tabs.filter(tb => tb.category === cat.id).length;
              return (
                <button type="button"
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={cn(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-all shrink-0",
                    isActive ? "bg-foreground text-background" : "bg-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {cat.label}
                  <span className={cn("text-[9px] px-1 rounded", isActive ? "bg-background/20" : "bg-muted/40")}>{count}</span>
                </button>
              );
            })}
          </div>
          {/* Filter search input */}
          <div className="px-4 pt-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={tabFilter}
                onChange={e => setTabFilter(e.target.value)}
                placeholder="Filter tabs…"
                className="w-full h-8 pl-8 pr-3 rounded-full bg-muted/30 border border-border/30 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>
          {/* Tab pills */}
          <div className="flex overflow-x-auto gap-1 px-4 py-2 scrollbar-none">
            {visibleTabs.length === 0 && (
              <p className="text-xs text-muted-foreground py-1.5">No tabs match.</p>
            )}
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              // "features" tab is active when we're on any non-primary tab
              const active = activeTab === tab.id || (tab.id === "features" && !isPrimary);
              return (
                <button type="button"
                  key={tab.id}
                  onClick={() => selectTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0",
                    active
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      <div className={cn(isFullScreen ? "h-full min-h-0 flex flex-col" : "pb-6")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className={cn(isFullScreen && "h-full min-h-0 flex flex-col flex-1")}
          >
            <Suspense fallback={<RideFeatureFallback />}>
            {/* ── Book ── */}
            {activeTab === "book" && (
              <RideBookingHome
                initialSchedule={bookWithSchedule}
                initialDestinationAddress={rebookDest?.address ?? initialDestination}
                initialDestLat={rebookDest?.lat ?? initialDestLat}
                initialDestLng={rebookDest?.lng ?? initialDestLng}
              />
            )}

            {/* ── Reserve ── */}
            {activeTab === "reserve" && (
              <div className="flex-1 min-h-0 overflow-hidden">
                <ZivoReserve onReserve={() => { setBookWithSchedule(true); setActiveTab("book"); }} />
              </div>
            )}

            {/* ── Trip History ── */}
            {activeTab === "history" && (
              <div className="p-4">
                <RideTripHistory onRebook={handleRebook} />
              </div>
            )}

            {/* ── Live Tracker ── */}
            {activeTab === "tracking" && <div className="p-4"><LiveTripTracker /></div>}

            {/* ── Wallet ── */}
            {activeTab === "wallet" && <div className="p-4"><RideWallet /></div>}

            {/* ── Safety ── */}
            {activeTab === "safety" && <div className="p-4"><RideSafetyCenter /></div>}

            {/* ── Pass ── */}
            {activeTab === "pass" && (
              <div className="pt-4">
                <RidePassPlans onSubscribe={(id) => toast.success(`Starting ${id} subscription...`)} />
              </div>
            )}

            {/* ── Features grid ── */}
            {activeTab === "features" && (
              <div className="p-4 space-y-5 pb-10">
                <div>
                  <h2 className="text-lg font-black text-foreground">All Features</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Everything ZIVO Rides has to offer
                  </p>
                </div>

                {FEATURE_CATEGORIES.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.title}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", group.bgClass)}>
                          <GroupIcon className={cn("w-3.5 h-3.5", group.iconClass)} />
                        </div>
                        <h3 className="text-sm font-bold text-foreground">{group.title}</h3>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;
                          return (
                            <button type="button"
                              key={item.id}
                              onClick={() => goToFeature(item.id)}
                              className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/40 hover:border-primary/30 hover:bg-primary/5 active:scale-95 transition-all"
                            >
                              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", group.bgClass)}>
                                <ItemIcon className={cn("w-4 h-4", group.iconClass)} />
                              </div>
                              <span className="text-[9px] font-bold text-muted-foreground text-center leading-tight">
                                {item.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── All other feature tabs ── */}
            {activeTab === "calendar"      && <div className="p-4"><RideScheduleCalendar /></div>}
            {activeTab === "insights"      && <div className="pt-4"><RideHistoryInsights /></div>}
            {activeTab === "match"         && <div className="p-4"><RideDriverMatch /></div>}
            {activeTab === "confirm"       && (
              <div className="p-4">
                <RideBookingConfirmation
                  onTrackRide={() => setActiveTab("tracking")}
                  onAddToCalendar={() => toast.success("Added to calendar!")}
                />
              </div>
            )}
            {activeTab === "loyalty"       && <div className="p-4"><RideLoyaltyCard /></div>}
            {activeTab === "spending"      && <div className="p-4"><RideSpendingAnalytics /></div>}
            {activeTab === "social"        && <div className="p-4"><RideSocialHub /></div>}
            {activeTab === "driver"        && <div className="p-4"><DriverProfileCard /></div>}
            {activeTab === "surge"         && <div className="p-4"><SurgePricingMap /></div>}
            {activeTab === "map"           && <div className="p-4"><SurgePricingMap /></div>}
            {activeTab === "compare"       && <div className="p-4"><FareComparisonTool /></div>}
            {activeTab === "schedule"      && <div className="p-4"><ScheduleRideSheet /></div>}
            {activeTab === "multi"         && <div className="p-4"><MultiStopRoute /></div>}
            {activeTab === "group"         && <div className="p-4"><GroupRidePlanner /></div>}
            {activeTab === "places"        && <div className="p-4"><SmartSavedPlaces /></div>}
            {activeTab === "chat"          && <div className="p-4"><InRideChat onCall={() => toast.info("Calling driver...")} /></div>}
            {activeTab === "alerts"        && <div className="p-4"><RideNotificationCenter /></div>}
            {activeTab === "receipt"       && <div className="p-4"><RideReceiptCard /></div>}
            {activeTab === "rate"          && <div className="p-4"><RateAndTipFlow onSubmit={submitRateAndTip} onSkip={() => toast.info("Skipped")} /></div>}
            {activeTab === "lost"          && <div className="p-4"><LostItemReport onSubmit={submitLostItem} onContactDriver={() => toast.info("Calling...")} /></div>}
            {activeTab === "a11y"          && <div className="p-4"><AccessibilityHub /></div>}
            {activeTab === "prefs"         && <div className="p-4"><RidePreferences /></div>}
            {activeTab === "eco"           && <div className="p-4"><RideEcoTracker /></div>}
            {activeTab === "business"      && <div className="p-4"><RideBusinessManager /></div>}
            {activeTab === "feedback"      && <div className="p-4"><RideFeedbackCenter /></div>}
            {activeTab === "specialty"     && <div className="p-4"><RideSpecialtyModes /></div>}
            {activeTab === "analytics"     && <div className="p-4"><RideSmartAnalytics /></div>}
            {activeTab === "entertain"     && <div className="p-4"><RideEntertainment /></div>}
            {activeTab === "gifting"       && <div className="p-4"><RideGifting /></div>}
            {activeTab === "rewards"       && <div className="p-4"><RideRewardsGamification /></div>}
            {activeTab === "corporate"     && <div className="p-4"><RideCorporateFleet /></div>}
            {activeTab === "inclusive"     && <div className="p-4"><RideAccessibilityPlus /></div>}
            {activeTab === "routes"        && <div className="p-4"><RideRouteIntelligence /></div>}
            {activeTab === "adv-safety"    && <div className="p-4"><RideAdvancedSafety /></div>}
            {activeTab === "travel"        && <div className="p-4"><RideTravelIntegration /></div>}
            {activeTab === "family"        && <div className="p-4"><RideFamilyAccounts /></div>}
            {activeTab === "subscribe"     && <div className="p-4"><RideSubscriptionHub /></div>}
            {activeTab === "smart-price"   && <div className="p-4"><RideSmartPricing /></div>}
            {activeTab === "driver-comm"   && <div className="p-4"><RideDriverComm /></div>}
            {activeTab === "social-feat"   && <div className="p-4"><RideSocialFeatures /></div>}
            {activeTab === "ride-analytics"&& <div className="p-4"><RideAnalyticsDashboard /></div>}
            {activeTab === "marketplace"   && <div className="p-4"><RideMarketplace /></div>}
            {activeTab === "wellness"      && <div className="p-4"><RideWellnessComfort /></div>}
            {activeTab === "pay-adv"       && <div className="p-4"><RidePaymentsAdvanced /></div>}
            {activeTab === "ai-assist"     && <div className="p-4"><RideAIAssistant /></div>}
            {activeTab === "scheduling"    && <div className="p-4"><RideSchedulingRecurring /></div>}
            {activeTab === "safety-adv2"   && <div className="p-4"><RideSafetyAdvanced /></div>}
            {activeTab === "loyalty-rwd"   && <div className="p-4"><RideLoyaltyRewards /></div>}
            {activeTab === "a11y-adv"      && <div className="p-4"><RideAccessibilityAdvanced /></div>}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    </AppLayout>
    </>
  );
}
