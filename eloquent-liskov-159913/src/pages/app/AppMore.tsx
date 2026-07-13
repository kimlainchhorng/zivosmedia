/**
 * App More Screen — Quick Access only
 */
import { Fragment, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ChevronRight, Settings, ShoppingBag, Wallet, MapPin, Handshake,
  Sparkles, Car, UtensilsCrossed, Store, Wrench, Building2, Truck, Shield,
  Copy, Share2, QrCode, Check, User, Plane, Hotel, DollarSign,
  Scissors, Hand, Heart, Dumbbell, GraduationCap, Stethoscope, PawPrint,
  Briefcase, Camera, Music, Crown,
  AlertCircle, CheckCircle2, BarChart3,
} from "lucide-react";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import TranslateButton from "@/components/common/TranslateButton";
import { toast } from "sonner";
import AppLayout from "@/components/app/AppLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useUserAccess } from "@/hooks/useUserAccess";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { getPublicOrigin, getProfileShareUrl } from "@/lib/getPublicOrigin";
import { useOwnerStores } from "@/hooks/useOwnerStoreProfile";
import { resolveBusinessDashboardRoute } from "@/lib/business/dashboardRoute";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import DriverAppDownloadSheet from "@/components/partner/DriverAppDownloadSheet";

const partnerOptions = [
  { icon: Car, label: "Become a Driver", description: "Earn money driving with ZIVO", href: "/partner-with-zivo?type=driver", color: "from-blue-500 to-blue-600" },
  { icon: UtensilsCrossed, label: "Become a Restaurant Partner", description: "List your restaurant on ZIVO", href: "/partner-with-zivo?type=restaurant", color: "from-orange-500 to-amber-500" },
  { icon: Store, label: "Become a Shop Partner", description: "Sell products through ZIVO", href: "/partner-with-zivo?type=store", color: "from-emerald-500 to-green-500" },
  { icon: Wrench, label: "Become an Auto Repair Partner", description: "Offer repair services on ZIVO", href: "/partner-with-zivo?type=auto-repair", color: "from-slate-500 to-slate-600" },
  { icon: Car, label: "Become an Auto Dealership", description: "Sell new & used vehicles", href: "/partner-with-zivo?type=auto-dealership", color: "from-zinc-600 to-zinc-800" },
  { icon: Building2, label: "Become a Hotel Partner", description: "List your property on ZIVO", href: "/partner-with-zivo?type=hotel", color: "from-purple-500 to-purple-600" },
  
  { icon: Scissors, label: "Become a Salon Partner", description: "Hair & beauty bookings", href: "/partner-with-zivo?type=salon", color: "from-pink-500 to-fuchsia-500" },
  { icon: Hand, label: "Become a Nail Salon Partner", description: "Manicure & pedicure services", href: "/partner-with-zivo?type=nail-salon", color: "from-fuchsia-500 to-rose-500" },
  { icon: Heart, label: "Become a Spa Partner", description: "Massage & wellness", href: "/partner-with-zivo?type=spa", color: "from-teal-400 to-cyan-500" },
  { icon: Dumbbell, label: "Become a Fitness Partner", description: "Gym & personal trainers", href: "/partner-with-zivo?type=fitness", color: "from-amber-500 to-orange-600" },
  { icon: GraduationCap, label: "Become a Tutor Partner", description: "Offer lessons & courses", href: "/partner-with-zivo?type=tutor", color: "from-indigo-500 to-blue-600" },
  { icon: Stethoscope, label: "Become a Clinic Partner", description: "Health & medical services", href: "/partner-with-zivo?type=clinic", color: "from-red-500 to-rose-600" },
  { icon: PawPrint, label: "Become a Pet Care Partner", description: "Grooming, vets & pet sitting", href: "/partner-with-zivo?type=pet-care", color: "from-yellow-500 to-amber-600" },
  { icon: Briefcase, label: "Become a Service Pro", description: "Cleaning, plumbing, handyman", href: "/partner-with-zivo?type=service-pro", color: "from-stone-500 to-stone-700" },
  { icon: Camera, label: "Become a Photographer", description: "Events, portraits & weddings", href: "/partner-with-zivo?type=photographer", color: "from-violet-500 to-purple-600" },
  { icon: Music, label: "Become an Event Partner", description: "DJs, venues & entertainment", href: "/partner-with-zivo?type=event", color: "from-cyan-500 to-blue-500" },
];

const quickLinks = [
  { icon: Settings, label: "Settings", href: "/account/settings", description: "App settings & preferences", iconColor: "text-muted-foreground", iconBg: "bg-muted/60" },
  { icon: ShoppingBag, label: "My Orders", href: "/grocery/orders", description: "Order history & tracking", iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
  { icon: Store, label: "Shop", href: "/store-map", description: "Browse nearby stores", iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
  { icon: Wrench, label: "Auto Repair", href: "/auto-repair", description: "Book trusted mechanics", iconColor: "text-slate-600", iconBg: "bg-slate-500/10" },
  { icon: UtensilsCrossed, label: "Eats", href: "/eats", description: "Food delivery & dining", iconColor: "text-orange-500", iconBg: "bg-orange-500/10" },
  { icon: Car, label: "Rides", href: "/rides/hub", description: "Book a ride anywhere", iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
  { icon: Plane, label: "Flights", href: "/flights", description: "Search & book flights", iconColor: "text-sky-500", iconBg: "bg-sky-500/10" },
  { icon: Hotel, label: "Hotels", href: "/hotels", description: "Find a place to stay", iconColor: "text-purple-500", iconBg: "bg-purple-500/10" },
  { icon: Car, label: "Car Rental", href: "/car-rental", description: "Rent a car for your trip", iconColor: "text-teal-500", iconBg: "bg-teal-500/10" },
  { icon: Wallet, label: "Wallet", href: "/wallet", description: "Balance & transactions", iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
  { icon: Sparkles, label: "Loyalty", href: "/account/loyalty", description: "Points & tier perks", iconColor: "text-amber-500", iconBg: "bg-amber-500/10" },
  { icon: MapPin, label: "Saved Addresses", href: "/account/addresses", description: "Delivery addresses", iconColor: "text-rose-500", iconBg: "bg-rose-500/10" },
  { icon: DollarSign, label: "Monetization", href: "/monetization", description: "Earn & grow revenue", iconColor: "text-primary", iconBg: "bg-primary/10" },
  { icon: Handshake, label: "Become Partner", href: "#partner", description: "Join ZIVO as partner", iconColor: "text-violet-500", iconBg: "bg-violet-500/10" },
];

const AppMore = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();
  const { data: access } = useUserAccess(user?.id);
  const { data: ownerStores = [] } = useOwnerStores();
  const { isPlus } = useZivoPlus();
  const [showPartnerSheet, setShowPartnerSheet] = useState(false);
  const [showDriverDownloadSheet, setShowDriverDownloadSheet] = useState(false);
  const [showSwitchSheet, setShowSwitchSheet] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null; avatar_url: string | null; share_code: string | null; display_brand_name?: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const ADMIN_EMAIL = "chhorngkimlain1@gmail.com";
  const isDesignatedAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL;
  const profileBrandName = (profile as { display_brand_name?: string | null } | null)?.display_brand_name;
  const hasBrandShopIdentity = Boolean(profileBrandName && profileBrandName.trim().toLowerCase() !== "zivo");
  const hasShopDashboard = Boolean(user) || Boolean(access?.isStoreOwner) || ownerStores.length > 0 || hasBrandShopIdentity;
  const primaryOwnerStore = ownerStores[0];
  const shopDashboardPath = primaryOwnerStore
    ? resolveBusinessDashboardRoute(primaryOwnerStore.category, primaryOwnerStore.id).path
    : "/shop-dashboard";

  // Build role options dynamically
  const roleOptions = (() => {
    const options: { icon: typeof Shield; label: string; description: string; href: string; color: string }[] = [];
    options.push({ icon: Briefcase, label: "Workplace", description: "Clock in, jobs & schedule", href: "/personal-dashboard", color: "from-primary to-primary/80" });
    if (isDesignatedAdmin) {
      options.push({ icon: Shield, label: "Admin Dashboard", description: "Manage the platform", href: "/admin/analytics", color: "from-red-500 to-red-600" });
    }
    if (access?.isDriver) {
      options.push({ icon: Car, label: "Driver Dashboard", description: "Manage your rides", href: "/driver", color: "from-blue-500 to-blue-600" });
    }
    if (access?.isRestaurantOwner) {
      options.push({ icon: UtensilsCrossed, label: "Restaurant Dashboard", description: "Manage your restaurant", href: "/eats/restaurant-dashboard", color: "from-orange-500 to-amber-500" });
    }
    if (access?.isCarRentalOwner) {
      options.push({ icon: Car, label: "Car Rental Dashboard", description: "Manage your rentals", href: "/car-rental-dashboard", color: "from-emerald-500 to-green-500" });
    }
    if (access?.isHotelOwner) {
      options.push({ icon: Hotel, label: "Hotel Dashboard", description: "Manage your hotel", href: "/hotel-dashboard", color: "from-purple-500 to-purple-600" });
    }
    if (hasShopDashboard) {
      options.push({ icon: Store, label: "Shop Dashboard", description: "Manage your shop", href: shopDashboardPath, color: "from-emerald-500 to-green-500" });
    }
    return options;
  })();

  const profileUrl = profile?.share_code
    ? getProfileShareUrl(profile.share_code)
    : `${getPublicOrigin()}/user/${user?.id ?? ""}`;

  const copyProfileLink = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Profile link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareProfile = async () => {
    const name = profile?.full_name || user?.email?.split("@")[0] || "User";
    if (navigator.share) {
      try {
        await navigator.share({ title: `${name} on ZIVO`, text: `Check out ${name}'s profile on ZIVO`, url: profileUrl });
      } catch (err: any) {
        if (err.name !== "AbortError") copyProfileLink();
      }
    } else {
      copyProfileLink();
    }
  };

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data: byId } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, share_code, display_brand_name")
        .eq("id", user.id)
        .maybeSingle();

      if (byId) {
        setProfile(byId as any);
        return;
      }

      const { data: byUserId } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, share_code, display_brand_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (byUserId) setProfile(byUserId as any);
    };

    void loadProfile();
  }, [user]);

  const { data: latestApp } = useQuery({
    queryKey: ["partner-app-status", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("partner_applications")
        .select("id, partner_kind, status, submitted_at")
        .eq("user_id", user!.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  const completionItems = [
    { label: "Profile photo", done: !!(profile?.avatar_url) },
    { label: "Full name", done: !!(profile?.full_name?.trim()) },
    { label: "Email", done: !!user?.email },
    { label: "Linked work profile", done: !!access?.isDriver || !!access?.isStoreOwner || !!access?.isRestaurantOwner },
  ];
  const completionScore = Math.round((completionItems.filter(i => i.done).length / completionItems.length) * 100);

  return (
    <AppLayout title="More" hideHeader>
      <div className="flex flex-col px-5 py-6 min-h-[70dvh]">
        {/* Account Card */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 flex items-center gap-3"
          >
            <Avatar className="w-12 h-12 border-2 border-primary/20">
              <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/25 to-primary/10 text-primary font-bold text-lg">
                {(profile?.full_name?.[0] || user.email?.[0] || "Z").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{profile?.full_name || user.user_metadata?.full_name || user.email?.split("@")[0]}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <button
                type="button"
                onClick={() => setShowSwitchSheet(true)}
                className="px-3.5 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-bold touch-manipulation active:scale-95 transition-transform"
              >
                Switch Account
              </button>
              {latestApp && (
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  latestApp.status === "approved" ? "bg-emerald-500/15 text-emerald-600" :
                  latestApp.status === "submitted" ? "bg-amber-500/15 text-amber-600" :
                  "bg-muted/60 text-muted-foreground"
                }`}>
                  {latestApp.partner_kind} · {latestApp.status}
                </span>
              )}
            </div>
          </motion.div>
        )}

        {user && completionScore < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mb-4 rounded-2xl border border-border/40 bg-card p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="text-[12px] font-bold">Profile {completionScore}% complete</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{completionItems.filter(i => i.done).length}/{completionItems.length}</span>
            </div>
            <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden mb-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${completionScore}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {completionItems.filter(i => !i.done).map(item => (
                <span key={item.label} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                  <AlertCircle className="w-2.5 h-2.5 text-amber-500" /> {item.label}
                </span>
              ))}
              {completionItems.filter(i => i.done).map(item => (
                <span key={item.label} className="flex items-center gap-1 text-[10px] text-emerald-600 bg-emerald-500/10 rounded-full px-2 py-0.5">
                  <CheckCircle2 className="w-2.5 h-2.5" /> {item.label}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Profile Share Actions */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="mb-5 flex gap-2"
          >
            <button type="button"
              onClick={copyProfileLink}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
            <button type="button"
              onClick={shareProfile}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-border/40 bg-card text-sm font-semibold touch-manipulation active:scale-[0.97] transition-all shadow-sm"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
              Share
            </button>
            <button type="button"
              onClick={() => navigate("/qr-profile")}
              className="w-11 flex items-center justify-center rounded-2xl border border-border/40 bg-card touch-manipulation active:scale-[0.97] transition-all shadow-sm"
            >
              <QrCode className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}

        <div className="mb-4">
          <TranslateButton />
        </div>

        {/* My Dashboards — expose role tiles directly so the user can tap without the Switch dialog */}
        {roleOptions.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-4"
          >
            <h2 className="font-bold text-[13px] mb-2 text-muted-foreground uppercase tracking-wide">My Dashboards</h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {roleOptions.map((opt) => (
                <button type="button"
                  key={opt.label}
                  onClick={() => navigate(opt.href)}
                  className="flex-shrink-0 flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl border border-border/40 bg-card shadow-sm min-w-[80px] touch-manipulation active:scale-[0.96] transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-md`}>
                    <opt.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-foreground text-center leading-tight max-w-[72px] line-clamp-2">{opt.label.replace("Dashboard", "").replace("Become a", "").trim()}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {!isPlus && (
          <Link to="/zivo-plus" className="block mb-4">
            <motion.div whileTap={{ scale: 0.98 }} className="flex items-center justify-between gap-2 rounded-2xl border border-primary/15 bg-card px-3 py-3 shadow-sm">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Crown className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">Upgrade to ZIVO+</p>
                  <p className="truncate text-xs text-muted-foreground">No service fees, priority delivery</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </motion.div>
          </Link>
        )}

        <h2 className="font-bold text-lg mb-4 text-ig-gradient">Quick Access</h2>

        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link, i) => {
            const isPartner = link.href === "#partner";
            const card = (
              <motion.div
                key={link.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                whileTap={{ scale: 0.96 }}
                onClick={isPartner ? () => setShowPartnerSheet(true) : undefined}
                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation cursor-pointer active:bg-muted/30 transition-colors"
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0", link.iconBg)}>
                  <link.icon className={cn("w-5 h-5", link.iconColor)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] leading-tight">{link.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{link.description}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 ml-auto" />
              </motion.div>
            );

            if (isPartner) return <Fragment key={link.label}>{card}</Fragment>;
            return <Link key={link.label} to={link.href} className="contents">{card}</Link>;
          })}
        </div>

        {access?.isStoreOwner && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4">
            <h3 className="text-sm font-bold mb-2 text-ig-gradient">Super App Add-ons</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => navigate("/shop-dashboard/employees")}
                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-secondary">
                  <Truck className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] leading-tight">Driver / Truck Mode</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Inventory + Offline Sales</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => navigate("/shop-dashboard/payroll")}
                className="rounded-2xl bg-card border border-border/40 shadow-sm p-3 flex items-center gap-2.5 touch-manipulation active:bg-muted/30 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-emerald-500/10">
                  <Wallet className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] leading-tight">Payroll + ROI</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Commission & Ad Return</p>
                </div>
              </button>
            </div>
          </motion.div>
        )}

        {/* Admin Button */}
        {isAdmin && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="mt-4">
            <Link to="/admin/analytics" className="contents">
              <div className="w-full py-3.5 rounded-2xl border border-primary/20 bg-primary/5 text-primary font-bold text-sm touch-manipulation active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </div>
            </Link>
          </motion.div>
        )}

        {/* Sign Out */}
        {user && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-6">
            <button
              type="button"
              onClick={() => signOut()}
              className="w-full py-3.5 rounded-2xl border border-border/60 bg-card text-foreground font-bold text-sm touch-manipulation active:scale-[0.98] transition-all shadow-sm"
            >
              Sign out
            </button>
          </motion.div>
        )}

        {/* Close */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-3 text-center">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-muted-foreground text-sm font-medium touch-manipulation"
          >
            Close
          </button>
        </motion.div>
      </div>

      {/* Partner Sheet */}
      <Sheet open={showPartnerSheet} onOpenChange={setShowPartnerSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl max-h-[85dvh] overflow-auto pb-10">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-lg font-display">Become a Partner</SheetTitle>
          </SheetHeader>
          <div className="space-y-2">
            {partnerOptions.map((opt) => {
              const isDriver = opt.label === "Become a Driver";
              const commonInner = (
                <>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-lg`}>
                    <opt.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </>
              );
              if (isDriver) {
                return (
                  <button
                    type="button"
                    key={opt.label}
                    onClick={() => {
                      setShowPartnerSheet(false);
                      setShowDriverDownloadSheet(true);
                    }}
                    className="w-full text-left flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/90 transition-colors touch-manipulation active:scale-[0.98]"
                  >
                    {commonInner}
                  </button>
                );
              }
              return (
                <Link
                  key={opt.label}
                  to={opt.href}
                  onClick={() => setShowPartnerSheet(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/90 transition-colors touch-manipulation active:scale-[0.98]"
                >
                  {commonInner}
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
      {/* Switch Account Dialog */}
      <Dialog open={showSwitchSheet} onOpenChange={setShowSwitchSheet}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-display">Switch Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {roleOptions.map((opt) => (
              <button
                type="button"
                key={opt.label}
                onClick={() => {
                  setShowSwitchSheet(false);
                  navigate(opt.href);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/90 transition-colors touch-manipulation active:scale-[0.98] text-left"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${opt.color} flex items-center justify-center shadow-lg`}>
                  <opt.icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Driver App Download Sheet */}
      <DriverAppDownloadSheet
        open={showDriverDownloadSheet}
        onOpenChange={setShowDriverDownloadSheet}
      />
    </AppLayout>
  );
};

export default AppMore;
