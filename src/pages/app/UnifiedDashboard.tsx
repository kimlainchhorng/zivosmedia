/**
 * Unified ZIVO Dashboard — Premium 2026
 * Super-App home with access to all services
 */

import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plane, Car, UtensilsCrossed, Package, MapPin, Hotel,
  Wallet, Clock, ChevronRight, HelpCircle, User, Settings,
  CarFront, CarTaxiFront, Building2, CreditCard, type LucideIcon,
  Globe, Zap, BarChart3, Leaf, AlertTriangle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useRecentActivity, useActiveTrips, type UnifiedTrip } from "@/hooks/useUnifiedTrips";
import { useWalletSummary, getServiceMeta } from "@/hooks/useZivoWallet";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const services = [
  { id: "ride", name: "Ride", icon: Car, gradient: "from-emerald-500 to-green-600", link: "/rides/hub", enabled: true },
  { id: "eats", name: "Eats", icon: UtensilsCrossed, gradient: "from-orange-500 to-red-500", link: "/eats", enabled: true },
  { id: "delivery", name: "Delivery", icon: Package, gradient: "from-muted to-muted", link: "/delivery", enabled: false },
  { id: "flights", name: "Flights", icon: Plane, gradient: "from-sky-500 to-blue-600", link: "/flights", enabled: true },
  { id: "hotels", name: "Hotels", icon: Hotel, gradient: "from-amber-500 to-orange-500", link: "/hotels", enabled: true },
  { id: "rentals", name: "Rentals", icon: Car, gradient: "from-teal-500 to-emerald-600", link: "/car-rental", enabled: true },
];

const tripIconMap: Record<string, LucideIcon> = {
  "plane": Plane, "car": Car, "car-front": CarFront, "car-taxi-front": CarTaxiFront,
  "utensils-crossed": UtensilsCrossed, "package": Package, "building-2": Building2,
  "target": MapPin, "credit-card": CreditCard,
};

function TripCard({ trip, index }: { trip: UnifiedTrip; index: number }) {
  const TripIcon = tripIconMap[trip.icon] || Plane;
  const detailPath = trip.detailPath;
  const cardContent = (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}>
      <Card className={cn("transition-all duration-300 border-border/40", detailPath && "hover:shadow-lg hover:border-primary/15")}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <TripIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{trip.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{trip.subtitle}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <Badge variant="outline" className="text-[9px] font-bold">{trip.status}</Badge>
                <span className="text-[10px] text-muted-foreground font-medium">${trip.amount.toFixed(2)}</span>
              </div>
            </div>
            {detailPath && <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  return detailPath ? (
    <Link to={detailPath} className="group block rounded-2xl transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {cardContent}
    </Link>
  ) : cardContent;
}

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const { data: recentActivity, isLoading: loadingRecent } = useRecentActivity();
  const { data: activeTrips } = useActiveTrips();
  const { data: walletSummary } = useWalletSummary();
  const firstName = user?.email?.split("@")[0] || "there";

  // === WAVE 5: Smart Dashboard Widgets ===
  const [showSpendingBreakdown, setShowSpendingBreakdown] = useState(false);
  const [showTravelStats, setShowTravelStats] = useState(false);
  const [showSafetyAlerts, setShowSafetyAlerts] = useState(false);
  const [showCarbonTracker, setShowCarbonTracker] = useState(false);

  const spendingByService = useMemo(() => {
    const byService = walletSummary?.spentByService ?? {};
    const entries = Object.entries(byService).sort(([, a], [, b]) => b - a).slice(0, 5);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const colorMap: Record<string, string> = {
      flights: "bg-sky-500", hotels: "bg-amber-500", rides: "bg-emerald-500",
      eats: "bg-orange-500", delivery: "bg-violet-500",
    };
    const labelMap: Record<string, string> = {
      flights: "Flights", hotels: "Hotels", rides: "Rides", eats: "Eats", delivery: "Delivery",
    };
    return entries.map(([svc, amt]) => ({
      service: labelMap[svc] ?? svc.charAt(0).toUpperCase() + svc.slice(1),
      amount: Math.round(amt),
      pct: Math.round((amt / total) * 100),
      color: colorMap[svc] ?? "bg-muted",
    }));
  }, [walletSummary]);

  const travelStats = useMemo(() => {
    const trips = recentActivity ?? [];
    return {
      totalTrips: trips.length,
      flightCount: trips.filter(t => t.service === "flights").length,
      hotelCount: trips.filter(t => t.service === "hotels").length,
      rideCount: trips.filter(t => t.service === "rides").length,
      eatCount: trips.filter(t => t.service === "eats").length,
      totalSpent: `$${(walletSummary?.totalSpent ?? 0).toFixed(0)}`,
    };
  }, [recentActivity, walletSummary]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur-xl border-b border-border/40">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{format(new Date(), "EEEE, MMMM d")}</p>
              <h1 className="text-xl font-bold">Hello, {firstName}</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" aria-label="Help" asChild className="rounded-xl"><Link to="/support"><HelpCircle className="w-5 h-5" /></Link></Button>
              <Button variant="ghost" size="icon" aria-label="Profile" asChild className="rounded-xl"><Link to="/profile"><User className="w-5 h-5" /></Link></Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* Wallet */}
        <Link to="/wallet" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}
            className="rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-emerald-500 text-primary-foreground p-5 relative overflow-hidden shadow-xl shadow-primary/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center"><Wallet className="w-5 h-5" /></div>
                <div><p className="text-xs opacity-80">ZIVO Wallet</p><p className="text-2xl font-bold">${walletSummary?.availableCredits?.toFixed(2) || "0.00"}</p></div>
              </div>
              <div className="text-right"><p className="text-[10px] opacity-60">Total Spent</p><p className="font-bold">${walletSummary?.totalSpent?.toFixed(2) || "0.00"}</p></div>
            </div>
          </motion.div>
        </Link>

        {/* Services Grid */}
        <div>
          <h2 className="font-bold text-sm mb-3">Services</h2>
          <div className="grid grid-cols-3 gap-3">
            {services.map((service, i) => (
              <motion.div key={service.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                {service.enabled ? (
                  <Link to={service.link} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <Card className="hover:shadow-lg transition-all duration-300 active:scale-95 border-border/40 hover:border-primary/15">
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center shadow-md`}>
                          <service.icon className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <span className="text-xs font-bold">{service.name}</span>
                      </CardContent>
                    </Card>
                  </Link>
                ) : (
                  <button type="button" className="w-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => toast.info(`${service.name} — coming soon!`)}>
                    <Card className="transition-all duration-300 active:scale-95 border-border/40 opacity-50">
                      <CardContent className="p-4 flex flex-col items-center gap-2">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${service.gradient} flex items-center justify-center`}>
                          <service.icon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{service.name}</span>
                      </CardContent>
                    </Card>
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* === WAVE 5: Smart Widgets === */}
        <div className="space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /> Intelligence</h2>

          {/* Spending Breakdown */}
          <button type="button" aria-expanded={showSpendingBreakdown} onClick={() => setShowSpendingBreakdown(!showSpendingBreakdown)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <BarChart3 className="w-3.5 h-3.5 text-foreground" /> Spending Breakdown
            <ChevronRight className={cn("w-3 h-3 ml-auto transition-transform", showSpendingBreakdown && "rotate-90")} />
          </button>
          {showSpendingBreakdown && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
              {spendingByService.map(s => (
                <div key={s.service} className="flex items-center gap-3">
                  <div className={cn("w-2 h-2 rounded-full", s.color)} />
                  <span className="text-xs text-muted-foreground w-16">{s.service}</span>
                  <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.8 }} className={cn("h-full rounded-full", s.color)} />
                  </div>
                  <span className="text-xs font-bold text-foreground w-14 text-right">${s.amount}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* Travel Stats */}
          <button type="button" aria-expanded={showTravelStats} onClick={() => setShowTravelStats(!showTravelStats)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Globe className="w-3.5 h-3.5 text-foreground" /> Travel Stats
            <Badge className="bg-secondary text-foreground border-0 text-[8px] ml-auto">{travelStats.totalTrips} trips</Badge>
            <ChevronRight className={cn("w-3 h-3 transition-transform", showTravelStats && "rotate-90")} />
          </button>
          {showTravelStats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: travelStats.totalTrips, label: "Total Trips" },
                { val: travelStats.flightCount, label: "Flights" },
                { val: travelStats.hotelCount, label: "Hotel Stays" },
                { val: travelStats.rideCount, label: "Rides" },
                { val: travelStats.eatCount, label: "Orders" },
                { val: travelStats.totalSpent, label: "Total Spent" },
              ].map(s => (
                <div key={s.label} className="text-center p-3 rounded-xl bg-card border border-border/40">
                  <p className="text-sm font-bold text-foreground">{s.val}</p><p className="text-[9px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Safety Alerts */}
          <button type="button" aria-expanded={showSafetyAlerts} onClick={() => setShowSafetyAlerts(!showSafetyAlerts)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Travel Safety Alerts
            <Badge variant="secondary" className="text-[8px] ml-auto">Unavailable</Badge>
            <ChevronRight className={cn("w-3 h-3 transition-transform", showSafetyAlerts && "rotate-90")} />
          </button>
          {showSafetyAlerts && (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Live safety alerts unavailable</p>
                <p className="text-[10px] leading-relaxed text-muted-foreground mt-1">ZIVO is not connected to a verified travel-advisory provider yet. Check official local authorities before you travel.</p>
              </div>
            </div>
          )}

          {/* Carbon Tracker */}
          <button type="button" aria-expanded={showCarbonTracker} onClick={() => setShowCarbonTracker(!showCarbonTracker)} className="w-full flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all touch-manipulation rounded-lg active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Leaf className="w-3.5 h-3.5 text-emerald-500" /> Carbon Footprint
            <Badge variant="secondary" className="text-[8px] ml-auto">Unavailable</Badge>
            <ChevronRight className={cn("w-3 h-3 transition-transform", showCarbonTracker && "rotate-90")} />
          </button>
          {showCarbonTracker && (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Carbon estimate unavailable</p>
                <p className="text-[10px] leading-relaxed text-muted-foreground mt-1">ZIVO needs verified trip distance and transport data before it can calculate your footprint.</p>
              </div>
            </div>
          )}
        </div>

        {/* Active Trips */}
        {activeTrips && activeTrips.length > 0 && (
          <div>
            <h2 className="font-bold text-sm mb-3 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />Active Now</h2>
            <div className="space-y-2">{activeTrips.slice(0, 3).map((trip, i) => <TripCard key={trip.id} trip={trip} index={i} />)}</div>
          </div>
        )}

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Recent Activity</h2>
            <Button variant="ghost" size="sm" asChild className="text-xs font-bold text-primary"><Link to="/my-trips">View All</Link></Button>
          </div>
          {loadingRecent ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-2xl" />)}</div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-2">{recentActivity.map((trip, i) => <TripCard key={trip.id} trip={trip} index={i} />)}</div>
          ) : (
            <Card className="border-border/30"><CardContent className="p-8 text-center"><p className="text-muted-foreground text-sm">No recent activity</p><p className="text-xs text-muted-foreground mt-1">Book a service to get started!</p></CardContent></Card>
          )}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="font-bold text-sm mb-3">Quick Links</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: "/my-trips", icon: Clock, label: "My Trips" },
              { to: "/wallet", icon: Wallet, label: "Wallet" },
              { to: "/support", icon: HelpCircle, label: "Support" },
              { to: "/account/settings", icon: Settings, label: "Settings" },
            ].map((link) => (
              <Button key={link.to} variant="outline" asChild className="justify-start rounded-xl border-border/40 hover:border-primary/15 font-bold">
                <Link to={link.to}><link.icon className="w-4 h-4 mr-2" />{link.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
