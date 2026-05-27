/**
 * TravelerDashboard Page
 * Premium 2026-era traveler profile with glassmorphism
 */
import { useState } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { withRedirectParam } from "@/lib/authRedirect";
import { useAuth } from "@/contexts/AuthContext";
import { TripTimeline, AIConciergeTrigger } from "@/components/profile";
import MobileBottomNav from "@/components/shared/MobileBottomNav";
import SEOHead from "@/components/SEOHead";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSavedSearches } from "@/hooks/useSavedSearches";
import { useBookingHistory } from "@/hooks/useBookingHistory";
import { format } from "date-fns";
import {
  Globe, MapPin, Plane, Star, Trophy, Bookmark, ChevronRight,
  Compass, Camera, Leaf, Award, TrendingUp, Heart, Package,
  Search, Bell, BellOff, Trash2, ExternalLink, Clock, History,
  Hotel, Car, Users,
} from "lucide-react";

export default function TravelerDashboard() {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const [showBucketList, setShowBucketList] = useState(false);
  const [showTravelMap, setShowTravelMap] = useState(false);
  const [showPackingHelper, setShowPackingHelper] = useState(false);
  const { searches, isLoading: searchesLoading, deleteSearch, toggleAlert } = useSavedSearches();
  const { bookings, isLoading: bookingsLoading } = useBookingHistory();

  if (!isLoading && !user) {
    const redirectTarget = `${location.pathname}${location.search ?? ""}`;
    return <Navigate to={withRedirectParam("/login", redirectTarget)} replace />;
  }

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || user?.email?.split("@")[0] || "Traveler";

  const travelAchievements = [
    { name: "Globe Trotter", desc: "Visited 5+ countries", icon: Globe, earned: true, color: "text-sky-500" },
    { name: "Early Bird", desc: "Booked 10+ flights", icon: Plane, earned: true, color: "text-amber-500" },
    { name: "Eco Traveler", desc: "5 carbon-neutral trips", icon: Leaf, earned: true, color: "text-emerald-500" },
    { name: "Adventurer", desc: "Visited 3 continents", icon: Compass, earned: false, color: "text-violet-500" },
    { name: "Snapshot", desc: "Shared 20 trip photos", icon: Camera, earned: false, color: "text-pink-500" },
    { name: "VIP Status", desc: "Reach Gold tier", icon: Award, earned: false, color: "text-amber-500" },
  ];

  const bucketList = [
    { dest: "Santorini", country: "Greece", flag: "🇬🇷", status: "planned", season: "Jun-Sep" },
    { dest: "Kyoto", country: "Japan", flag: "🇯🇵", status: "dreaming", season: "Mar-May" },
    { dest: "Patagonia", country: "Argentina", flag: "🇦🇷", status: "dreaming", season: "Nov-Mar" },
    { dest: "Amalfi Coast", country: "Italy", flag: "🇮🇹", status: "planned", season: "May-Oct" },
    { dest: "Maldives", country: "Maldives", flag: "🇲🇻", status: "dreaming", season: "Nov-Apr" },
  ];

  const travelJournal = [
    { trip: "Paris Weekend", date: "Feb 2026", rating: 5, highlight: "Eiffel Tower at sunset", emoji: "🗼" },
    { trip: "Tokyo Adventure", date: "Jan 2026", rating: 5, highlight: "Tsukiji market sushi", emoji: "🍣" },
    { trip: "Miami Beach", date: "Dec 2025", rating: 4, highlight: "Art Deco architecture", emoji: "🌴" },
  ];

  const packingChecklist = [
    { category: "Essentials", items: ["Passport", "Wallet", "Phone charger", "Medications"] },
    { category: "Clothing", items: ["Underwear (days+1)", "Comfortable shoes", "Weather layers", "Sleepwear"] },
    { category: "Tech", items: ["Adapter/converter", "Headphones", "Power bank", "Camera"] },
    { category: "Comfort", items: ["Neck pillow", "Eye mask", "Snacks", "Water bottle"] },
  ];

  return (
    <div className="min-h-screen bg-background pb-24 relative overflow-hidden safe-area-top">
      <SEOHead title="My Dashboard – ZIVO" description="View your travel overview, achievements, and upcoming trips on ZIVO." noIndex={true} />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,hsl(var(--primary)/0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="pt-20 px-4 sm:px-6 pb-32 relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-7xl mx-auto mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, <span className="text-primary">{firstName}</span></h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your travel overview.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 max-w-7xl mx-auto">
          <motion.div className="lg:col-span-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}>
            <TripTimeline />

            {/* === WAVE 6: Rich Traveler Content === */}
            <div className="space-y-6 mt-8">
              {/* Travel Achievements */}
              <div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-500" /> Achievements</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {travelAchievements.map(a => (
                    <Card key={a.name} className={cn("border-border/40 transition-all", a.earned ? "hover:border-primary/20" : "opacity-50")}>
                      <CardContent className="p-3 text-center">
                        <a.icon className={cn("w-6 h-6 mx-auto mb-1", a.earned ? a.color : "text-muted-foreground/40")} />
                        <p className="text-xs font-bold text-foreground">{a.name}</p>
                        <p className="text-[9px] text-muted-foreground">{a.desc}</p>
                        {a.earned && <Badge className="mt-1 bg-emerald-500/10 text-emerald-500 border-0 text-[8px]">Earned</Badge>}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Travel Journal */}
              <div>
                <h2 className="text-lg font-bold mb-3 flex items-center gap-2"><Camera className="w-5 h-5 text-foreground" /> Travel Journal</h2>
                <div className="space-y-2">
                  {travelJournal.map(j => (
                    <Card key={j.trip} className="border-border/40 hover:border-primary/20 transition-all">
                      <CardContent className="p-4 flex items-center gap-3">
                        <span className="text-2xl">{j.emoji}</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">{j.trip}</p>
                          <p className="text-[10px] text-muted-foreground">{j.date} · {j.highlight}</p>
                        </div>
                        <div className="flex gap-0.5">
                          {Array.from({ length: j.rating }).map((_, i) => <Star key={i} className="w-3 h-3 text-amber-500 fill-amber-500" />)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Bucket List */}
              <div>
                <button type="button" onClick={() => setShowBucketList(!showBucketList)} className="w-full flex items-center gap-2 text-lg font-bold mb-3">
                  <Heart className="w-5 h-5 text-destructive" /> Bucket List
                  <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showBucketList && "rotate-90")} />
                </button>
                {showBucketList && (
                  <div className="space-y-2">
                    {bucketList.map(b => (
                      <Card key={b.dest} className="border-border/40">
                        <CardContent className="p-3 flex items-center gap-3">
                          <span className="text-lg">{b.flag}</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-foreground">{b.dest}, {b.country}</p>
                            <p className="text-[10px] text-muted-foreground">Best: {b.season}</p>
                          </div>
                          <Badge className={cn("text-[8px] border-0", b.status === "planned" ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground")}>
                            {b.status}
                          </Badge>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Packing Helper */}
              <div>
                <button type="button" onClick={() => setShowPackingHelper(!showPackingHelper)} className="w-full flex items-center gap-2 text-lg font-bold mb-3">
                  <Package className="w-5 h-5 text-foreground" /> Smart Packing List
                  <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showPackingHelper && "rotate-90")} />
                </button>
                {showPackingHelper && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {packingChecklist.map(c => (
                      <Card key={c.category} className="border-border/40">
                        <CardContent className="p-3">
                          <p className="text-xs font-bold text-foreground mb-2">{c.category}</p>
                          <div className="space-y-1">
                            {c.items.map(item => (
                              <div key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                <div className="w-3.5 h-3.5 rounded border border-border/60 flex-shrink-0" />
                                {item}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Travel Stats Summary */}
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5 text-primary" /> Travel Score</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { val: "82", label: "Score", sub: "/100" },
                      { val: "8", label: "Countries", sub: "" },
                      { val: "28K", label: "Miles", sub: "" },
                      { val: "3/6", label: "Badges", sub: "" },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <p className="text-sm font-bold text-primary">{s.val}<span className="text-[9px] text-muted-foreground">{s.sub}</span></p>
                        <p className="text-[9px] text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div className="lg:col-span-4 space-y-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}>
            {/* Saved Searches */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Search className="w-5 h-5 text-primary" /> Saved Searches
              </h2>
              {searchesLoading ? (
                <Card className="border-border/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground animate-pulse">Loading…</p></CardContent></Card>
              ) : searches.length === 0 ? (
                <Card className="border-border/40 border-dashed">
                  <CardContent className="p-6 text-center">
                    <Bookmark className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No saved searches yet.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Save a search from the results page to track prices.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {searches.slice(0, 5).map(s => {
                    const serviceIcon = s.service_type === 'flights' ? Plane : s.service_type === 'hotels' ? Hotel : Car;
                    const ServiceIcon = serviceIcon;
                    return (
                      <Card key={s.id} className="border-border/40 hover:border-primary/20 transition-all group">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <ServiceIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{s.title}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {format(new Date(s.created_at), "MMM d, yyyy")}
                                {s.current_price && <span className="ml-1">· ${s.current_price}</span>}
                              </p>
                              {s.price_alert_enabled && (
                                <Badge className="mt-1 bg-primary/10 text-primary border-0 text-[8px]">
                                  <Bell className="w-2.5 h-2.5 mr-0.5" /> Alert on
                                  {s.target_price && ` ≤ $${s.target_price}`}
                                </Badge>
                              )}
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                aria-label={s.price_alert_enabled ? "Disable price alert" : "Enable price alert"}
                                onClick={() => toggleAlert({ id: s.id, enabled: !s.price_alert_enabled })}
                              >
                                {s.price_alert_enabled ? <BellOff className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive"
                                aria-label="Delete saved search"
                                onClick={() => deleteSearch(s.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Booking History */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" /> Recent Bookings
              </h2>
              {bookingsLoading ? (
                <Card className="border-border/40"><CardContent className="p-4"><p className="text-xs text-muted-foreground animate-pulse">Loading…</p></CardContent></Card>
              ) : bookings.length === 0 ? (
                <Card className="border-border/40 border-dashed">
                  <CardContent className="p-6 text-center">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">No bookings yet.</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Your travel bookings will appear here.</p>
                    <Button variant="outline" size="sm" className="mt-3 text-xs" asChild>
                      <Link to="/flights">Search Flights</Link>
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {bookings.slice(0, 5).map(b => {
                    const statusColor = b.status === 'confirmed' ? 'text-emerald-500 bg-emerald-500/10' :
                      b.status === 'pending' ? 'text-amber-500 bg-amber-500/10' :
                      'text-muted-foreground bg-muted/50';
                    const ServiceIcon = b.service_type === 'flight' ? Plane : b.service_type === 'hotel' ? Hotel : Car;
                    return (
                      <Card key={b.id} className="border-border/40 hover:border-primary/20 transition-all">
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <ServiceIcon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground capitalize">{b.service_type} Booking</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                {format(new Date(b.created_at), "MMM d, yyyy")}
                                {b.partner_booking_ref && <span className="ml-1">· Ref: {b.partner_booking_ref}</span>}
                              </p>
                            </div>
                            <Badge className={cn("text-[8px] border-0 capitalize", statusColor)}>
                              {b.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Compass className="w-5 h-5 text-primary" /> Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Search Flights", icon: Plane, to: "/flights" },
                  { label: "My Trips", icon: MapPin, to: "/trips" },
                  { label: "Travelers", icon: Users, to: "/account/travelers" },
                  { label: "Preferences", icon: Award, to: "/account/preferences" },
                ].map(a => (
                  <Button
                    key={a.label}
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1.5 text-xs border-border/40 hover:border-primary/20"
                    asChild
                  >
                    <Link to={a.to}>
                      <a.icon className="w-4 h-4 text-primary" />
                      {a.label}
                    </Link>
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <AIConciergeTrigger />
      <MobileBottomNav />
    </div>
  );
}
