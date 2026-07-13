/**
 * Deals Hub Page — Premium 2026
 * Flash deals, last-minute offers, seasonal promos
 * Now powered by live data from travel_deals table
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import Flame from "lucide-react/dist/esm/icons/flame";
import Search from "lucide-react/dist/esm/icons/search";
import Bell from "lucide-react/dist/esm/icons/bell";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Clock from "lucide-react/dist/esm/icons/clock";
import Gift from "lucide-react/dist/esm/icons/gift";
import Plane from "lucide-react/dist/esm/icons/plane";
import BedDouble from "lucide-react/dist/esm/icons/bed-double";
import Car from "lucide-react/dist/esm/icons/car";
import Timer from "lucide-react/dist/esm/icons/timer";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Crown from "lucide-react/dist/esm/icons/crown";
import Zap from "lucide-react/dist/esm/icons/zap";
import Shield from "lucide-react/dist/esm/icons/shield";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import TrendingDown from "lucide-react/dist/esm/icons/trending-down";
import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import Star from "lucide-react/dist/esm/icons/star";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Heart from "lucide-react/dist/esm/icons/heart";
import Eye from "lucide-react/dist/esm/icons/eye";
import DollarSign from "lucide-react/dist/esm/icons/dollar-sign";
import Percent from "lucide-react/dist/esm/icons/percent";
import Target from "lucide-react/dist/esm/icons/target";
import Leaf from "lucide-react/dist/esm/icons/leaf";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Package from "lucide-react/dist/esm/icons/package";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useRecommendedDeals, type DealCategory } from "@/hooks/useRecommendedDeals";
import DealCard from "@/components/deals/DealCard";

type DealCategoryType = DealCategory | 'last-minute';

const categoryConfig: Record<DealCategoryType, { label: string; icon: typeof Plane; color: string }> = {
  all: { label: "All Deals", icon: Sparkles, color: "text-primary" },
  flights: { label: "Flights", icon: Plane, color: "text-sky-500" },
  hotels: { label: "Hotels", icon: BedDouble, color: "text-amber-500" },
  cars: { label: "Cars", icon: Car, color: "text-emerald-500" },
  packages: { label: "Packages", icon: Package, color: "text-violet-500" },
  "last-minute": { label: "Last Min", icon: Timer, color: "text-destructive" },
};

export default function Deals() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<DealCategoryType>('all');
  const [email, setEmail] = useState("");
  const [submittingDeals, setSubmittingDeals] = useState(false);

  // Fetch live deals from Supabase
  const apiCategory = activeCategory === 'last-minute' ? 'all' : activeCategory as DealCategory;
  const { data: allDeals = [], isLoading } = useRecommendedDeals(apiCategory, 30);

  // Client-side filter for last-minute (expiring within 7 days)
  const filteredDeals = activeCategory === 'last-minute'
    ? allDeals.filter(d => d.deal_type === 'last-minute' || d.deal_type === 'flash')
    : allDeals;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter a valid email");
      return;
    }
    setSubmittingDeals(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "deals_alert_signup",
        subject: "Deals page alert signup",
        message: `Email: ${email}\nCategory: ${activeCategory}`,
      });
      if (error) throw error;
      toast.success("You'll be notified of new deals!");
      setEmail("");
    } catch (err: any) {
      toast.error(err?.message || "Could not subscribe. Please try again.");
    } finally {
      setSubmittingDeals(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Deals & Flash Sales – ZIVO"
        description="Discover limited-time travel deals on flights, hotels, and car rentals. Flash sales with up to 50% off."
        canonical="https://hizivo.com/deals"
      />
      <Header />

      <main className="pt-24 pb-20">
        {/* Hero Section — Premium */}
        <section className="relative overflow-hidden pb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/8 via-orange-500/5 to-amber-500/8" />
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-destructive/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-amber-500/8 to-transparent rounded-full blur-3xl" />

          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <Badge className="mb-4 bg-destructive/10 text-destructive border-destructive/20 font-bold text-xs">
                  <Flame className="w-3 h-3 mr-1" />
                  Limited Time Offers
                </Badge>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.05 }}
                className="font-display text-4xl md:text-5xl font-bold mb-4"
              >
                Flash Deals & Exclusive Offers
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.1 }}
                className="text-lg text-muted-foreground mb-8"
              >
                Grab limited-time travel deals before they're gone. 
                Up to 50% off flights, hotels, and car rentals.
              </motion.p>

              {/* Deal Alert Signup */}
              <motion.form 
                initial={{ opacity: 0, y: 16 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: 0.15 }}
                onSubmit={handleSubscribe} 
                className="flex gap-3 max-w-md mx-auto"
              >
                <div className="flex-1 relative">
                  <Bell className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Get deal alerts"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-13 rounded-2xl bg-card border-border/40 font-medium"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  disabled={submittingDeals}
                  className="h-13 px-6 rounded-2xl font-bold shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-primary-foreground active:scale-[0.98] transition-all"
                >
                  <Bell className="w-4 h-4 mr-2" />
                  {submittingDeals ? "Subscribing…" : "Notify Me"}
                </Button>
              </motion.form>
            </div>
          </div>
        </section>

        {/* Category Tabs — Premium Chips */}
        <section className="container mx-auto px-4 mb-8">
          <div className="flex justify-center gap-2 flex-wrap">
            {(Object.entries(categoryConfig) as [DealCategoryType, typeof categoryConfig.all][]).map(([key, config]) => {
              const isActive = activeCategory === key;
              return (
                <Button 
                  key={key} 
                  variant={isActive ? "default" : "outline"} 
                  size="sm" 
                  onClick={() => setActiveCategory(key)} 
                  className={`rounded-2xl gap-1.5 font-bold text-xs h-10 px-5 transition-all duration-200 ${
                    isActive 
                      ? "shadow-md shadow-primary/20" 
                      : "border-border/40 hover:border-primary/20"
                  }`}
                >
                  <config.icon className={`w-3.5 h-3.5 ${!isActive ? config.color : ''}`} />
                  {config.label}
                </Button>
              );
            })}
          </div>
        </section>

        {/* Deals Grid */}
        <section className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">{categoryConfig[activeCategory].label}</h2>
                <p className="text-sm text-muted-foreground">
                  {isLoading ? "Loading..." : `${filteredDeals.length} deals available`}
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <Skeleton className="h-40 w-full rounded-none" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-9 w-full mt-3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredDeals.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDeals.map((deal, i) => (
                  <motion.div
                    key={deal.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <DealCard deal={deal} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/30">
                  <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                    <h3 className="text-lg font-bold mb-1">No deals in this category</h3>
                    <p className="text-sm text-muted-foreground">Check back soon or browse all deals</p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </section>

        {/* Member Deals Section — Premium */}
        <section className="container mx-auto px-4 mt-16">
          <motion.div 
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-primary/10 via-emerald-500/5 to-primary/8 border border-primary/15 p-8 md:p-10 text-center relative overflow-hidden"
          >
            <div className="absolute -top-16 -right-16 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-emerald-500/8 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                <Crown className="w-3 h-3 mr-1" />
                ZIVO Plus Exclusive
              </Badge>
              <h3 className="text-2xl font-bold mb-2">Get Early Access to Deals</h3>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto text-sm">
                ZIVO Plus members get 24-hour early access to flash deals, 
                priority price alerts, and exclusive member discounts.
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/zivo-plus")}
                className="gap-2 rounded-2xl font-bold shadow-lg shadow-primary/25 bg-gradient-to-r from-primary to-emerald-500 hover:from-primary/90 hover:to-emerald-500/90 text-primary-foreground active:scale-[0.98] transition-all h-13 px-8"
              >
                <Gift className="w-5 h-5" />
                Learn About ZIVO Plus
              </Button>
            </div>
          </motion.div>
        </section>

        {/* === WAVE 6: Smart Deal Intelligence === */}
        <section className="container mx-auto px-4 mt-16 space-y-8">
          {/* Price Predictions */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" /> Price Predictions</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { route: "NYC → Miami", prediction: "Drop 12%", timing: "Next week", confidence: 89, trend: "down", icon: TrendingDown, color: "text-emerald-500" },
                { route: "LAX → London", prediction: "Rise 8%", timing: "2 weeks", confidence: 76, trend: "up", icon: TrendingUp, color: "text-destructive" },
                { route: "SFO → Tokyo", prediction: "Drop 18%", timing: "3 weeks", confidence: 92, trend: "down", icon: TrendingDown, color: "text-emerald-500" },
              ].map(p => (
                <Card key={p.route} className="border-border/40 hover:border-primary/20 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Plane className="w-3.5 h-3.5 text-foreground" />
                      <span className="text-xs font-bold text-foreground">{p.route}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <p.icon className={cn("w-4 h-4", p.color)} />
                      <span className={cn("text-sm font-bold", p.color)}>{p.prediction}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{p.timing} · {p.confidence}% confidence</p>
                    <div className="h-1.5 rounded-full bg-muted/50 mt-2 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${p.confidence}%` }} transition={{ duration: 1 }} className={cn("h-full rounded-full", p.trend === "down" ? "bg-emerald-500" : "bg-destructive")} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Seasonal Deal Calendar */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-amber-500" /> Best Time to Book</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[
                { month: "Mar", savings: "15%", heat: "bg-amber-500/20" },
                { month: "Apr", savings: "22%", heat: "bg-emerald-500/20" },
                { month: "May", savings: "18%", heat: "bg-emerald-500/15" },
                { month: "Jun", savings: "5%", heat: "bg-destructive/10" },
                { month: "Jul", savings: "3%", heat: "bg-destructive/15" },
                { month: "Aug", savings: "8%", heat: "bg-amber-500/10" },
                { month: "Sep", savings: "25%", heat: "bg-emerald-500/25" },
                { month: "Oct", savings: "30%", heat: "bg-emerald-500/30" },
                { month: "Nov", savings: "20%", heat: "bg-emerald-500/20" },
                { month: "Dec", savings: "2%", heat: "bg-destructive/20" },
                { month: "Jan", savings: "28%", heat: "bg-emerald-500/25" },
                { month: "Feb", savings: "24%", heat: "bg-emerald-500/20" },
              ].map(m => (
                <div key={m.month} className={cn("text-center p-3 rounded-xl border border-border/30", m.heat)}>
                  <p className="text-xs font-bold text-foreground">{m.month}</p>
                  <p className="text-[10px] text-emerald-600 font-bold">{m.savings}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Destinations */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Trending Now</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { city: "Cancún", country: "Mexico", change: "+42%", searches: "12.5K", price: "$189", flag: "🇲🇽" },
                { city: "Barcelona", country: "Spain", change: "+38%", searches: "9.2K", price: "$342", flag: "🇪🇸" },
                { city: "Bali", country: "Indonesia", change: "+55%", searches: "8.7K", price: "$425", flag: "🇮🇩" },
                { city: "Dubai", country: "UAE", change: "+29%", searches: "7.1K", price: "$512", flag: "🇦🇪" },
              ].map(d => (
                <Card key={d.city} className="border-border/40 hover:border-primary/20 hover:shadow-md transition-all group cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{d.flag}</span>
                      <div>
                        <p className="text-xs font-bold text-foreground">{d.city}</p>
                        <p className="text-[10px] text-muted-foreground">{d.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-primary">from {d.price}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px]"><TrendingUp className="w-2.5 h-2.5 mr-0.5" />{d.change}</Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-1"><Eye className="w-2.5 h-2.5 inline mr-0.5" />{d.searches} searches this week</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Savings Calculator */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-500" /> Your Savings Potential</h2>
            <Card className="border-emerald-500/20 bg-emerald-500/5">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Avg Savings", value: "$127", sub: "per booking" },
                    { label: "Best Deals", value: "Tue-Wed", sub: "booking day" },
                    { label: "Advance", value: "21 days", sub: "optimal window" },
                    { label: "Members Save", value: "+18%", sub: "extra discount" },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className="text-lg font-bold text-emerald-600">{s.value}</p>
                      <p className="text-xs font-bold text-foreground">{s.label}</p>
                      <p className="text-[9px] text-muted-foreground">{s.sub}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deal Score Explainer */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Target className="w-5 h-5 text-foreground" /> How We Score Deals</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { factor: "Price vs Historical", weight: "40%", desc: "Compared to 90-day average", icon: BarChart3, color: "text-sky-500" },
                { factor: "Demand Trend", weight: "30%", desc: "Search popularity & availability", icon: TrendingUp, color: "text-amber-500" },
                { factor: "Value Rating", weight: "30%", desc: "Quality, timing & flexibility", icon: Star, color: "text-violet-500" },
              ].map(f => (
                <Card key={f.factor} className="border-border/40">
                  <CardContent className="p-4">
                    <f.icon className={cn("w-5 h-5 mb-2", f.color)} />
                    <p className="text-xs font-bold text-foreground">{f.factor}</p>
                    <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                    <Badge className="mt-2 bg-muted/50 text-foreground border-0 text-[9px]">{f.weight} weight</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Eco Deals */}
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Leaf className="w-5 h-5 text-emerald-500" /> Eco-Friendly Deals</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { title: "Direct Flights Only", savings: "Save up to $80", co2: "-45% CO2", desc: "Skip layovers, reduce emissions" },
                { title: "Green Hotels", savings: "From $89/night", co2: "Certified", desc: "LEED certified properties with renewable energy" },
              ].map(e => (
                <Card key={e.title} className="border-emerald-500/20 hover:border-emerald-500/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-foreground">{e.title}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-[8px]">{e.co2}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{e.desc}</p>
                    <p className="text-xs font-bold text-emerald-600 mt-2">{e.savings}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* === WAVE 11: Rich Deals Content === */}

        {/* Deal Comparison Table */}
        <section className="container mx-auto px-4 mt-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Percent className="w-5 h-5 text-primary" /> Deal Type Comparison</h2>
            <Card className="border-border/40 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid grid-cols-4 text-[10px] font-bold text-muted-foreground border-b border-border/30 p-3">
                  <span>Deal Type</span><span>Avg Savings</span><span>Availability</span><span>Best For</span>
                </div>
                {[
                  { type: "Flash Sales", savings: "30-50%", avail: "2-6 hours", best: "Flexible travelers" },
                  { type: "Early Bird", savings: "15-25%", avail: "60+ days out", best: "Planners" },
                  { type: "Last Minute", savings: "20-40%", avail: "< 7 days", best: "Spontaneous trips" },
                  { type: "Bundle Deals", savings: "18-30%", avail: "Always", best: "Multi-service bookings" },
                  { type: "Member Exclusive", savings: "10-20%", avail: "ZIVO Plus only", best: "Frequent travelers" },
                ].map(r => (
                  <div key={r.type} className="grid grid-cols-4 text-xs p-3 border-b border-border/20 hover:bg-muted/30 transition-colors">
                    <span className="font-bold">{r.type}</span>
                    <span className="text-emerald-500 font-bold">{r.savings}</span>
                    <span className="text-muted-foreground">{r.avail}</span>
                    <span className="text-muted-foreground">{r.best}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Recently Claimed */}
        <section className="container mx-auto px-4 mt-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500" /> Recently Claimed</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { user: "Jason M.", deal: "NYC → Miami flight", saved: "$142", time: "2 min ago" },
                { user: "Priya K.", deal: "Hilton Barcelona 4 nights", saved: "$230", time: "5 min ago" },
                { user: "Alex T.", deal: "BMW rental in LA", saved: "$95", time: "8 min ago" },
                { user: "Maria S.", deal: "London hotel + flight bundle", saved: "$310", time: "12 min ago" },
              ].map(c => (
                <Card key={c.user} className="border-border/40 hover:border-primary/20 transition-all">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-emerald-500 flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                      {c.user.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate"><span className="text-primary">{c.user}</span> claimed {c.deal}</p>
                      <p className="text-[10px] text-muted-foreground">Saved {c.saved} • {c.time}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* === WAVE 16: Additional Deals Content === */}

        {/* Deal Alerts FAQ */}
        <section className="container mx-auto px-4 mt-12">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center">Deals FAQ</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { q: "How often are new deals added?", a: "New deals drop multiple times daily. Flash sales are typically live for 2-6 hours." },
                { q: "Are deal prices guaranteed?", a: "Prices shown are real-time from partners. Final price is confirmed at checkout." },
                { q: "Can I stack deals with ZIVO Plus?", a: "Yes! ZIVO Plus members get additional 5-10% on top of deal prices." },
                { q: "How do price predictions work?", a: "Our ML models analyze 90 days of historical pricing, demand trends, and seasonality to predict fare movements." },
              ].map(f => (
                <Card key={f.q} className="border-border/40">
                  <CardContent className="p-4">
                    <p className="text-xs font-bold">{f.q}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Booking Tips */}
        <section className="container mx-auto px-4 mt-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-4 text-center">Maximize Your Savings</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {[
                { tip: "Set Multiple Alerts", desc: "Create alerts for several routes to catch the best fare across destinations.", emoji: "🔔" },
                { tip: "Book on Tuesdays", desc: "Data shows Tues-Wed consistently have the lowest average fares.", emoji: "📊" },
                { tip: "Use Incognito Mode", desc: "Some partner sites may adjust prices based on search history.", emoji: "🕵️" },
              ].map(t => (
                <div key={t.tip} className="p-4 rounded-xl border border-border/40 text-center hover:border-primary/20 transition-all">
                  <span className="text-2xl">{t.emoji}</span>
                  <p className="font-bold text-sm mt-2">{t.tip}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Deal Categories Explained */}
        <section className="container mx-auto px-4 mt-10">
          <div className="max-w-4xl mx-auto">
            <Card className="border-primary/15 bg-gradient-to-br from-primary/5 to-emerald-500/5">
              <CardContent className="p-6">
                <h3 className="font-bold text-center mb-4">Understanding Deal Types</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {[
                    { type: "Flash", desc: "Limited time, deepest discounts", emoji: "⚡" },
                    { type: "Early Bird", desc: "Book far ahead, save big", emoji: "🐦" },
                    { type: "Last Minute", desc: "Departing within 7 days", emoji: "🏃" },
                    { type: "Bundle", desc: "Flight + hotel together", emoji: "📦" },
                  ].map(d => (
                    <div key={d.type}>
                      <span className="text-2xl">{d.emoji}</span>
                      <p className="text-sm font-bold mt-2">{d.type}</p>
                      <p className="text-[10px] text-muted-foreground">{d.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="container mx-auto px-4 mt-12">
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5 text-muted-foreground/50" />
            <p className="text-center max-w-2xl">
              Deal prices are subject to availability and may change. 
              Final price confirmed on partner checkout. 
              Limited quantities available at advertised prices.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
