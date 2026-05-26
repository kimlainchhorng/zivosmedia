import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Crown, Zap, Bell, Star, Shield, Headphones, Check, ArrowRight, Percent, Loader2, CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NavBar from "@/components/home/NavBar";
import Footer from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const benefits = [
  {
    icon: Zap,
    title: "Early Access to Deals",
    description: "Get exclusive flash deals 24 hours before they go public",
    highlight: true,
  },
  {
    icon: Bell,
    title: "Priority Price Alerts",
    description: "Instant notifications when prices drop on your saved routes",
  },
  {
    icon: Star,
    title: "2x ZIVO Miles",
    description: "Earn double miles on every booking you make",
    highlight: true,
  },
  {
    icon: Shield,
    title: "Ad-Free Experience",
    description: "Browse and book without any promotional interruptions",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "Priority access to our travel concierge team",
  },
  {
    icon: Percent,
    title: "Member Discounts",
    description: "5% off on select hotels and car rentals",
  },
];

const testimonials = [
  {
    name: "Sarah M.",
    role: "Frequent Traveler",
    content: "The early access to deals alone has saved me over $500 this year!",
    avatar: "SM",
  },
  {
    name: "James K.",
    role: "Business Traveler",
    content: "Priority support is a game-changer when you need quick rebooking.",
    avatar: "JK",
  },
  {
    name: "Emily R.",
    role: "Family Vacation Planner",
    content: "Double miles add up fast. Already redeemed a free hotel night!",
    avatar: "ER",
  },
];

const ZivoPlus = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const [joining, setJoining] = useState(false);

  const monthlyPrice = 9.99;
  const annualPrice = 79.99;
  const annualSavings = Math.round((monthlyPrice * 12 - annualPrice) / (monthlyPrice * 12) * 100);

  const { data: subscription, refetch: refetchSub } = useQuery({
    queryKey: ["zivo-plus-status", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("zivo_subscriptions")
        .select("id, status, billing_cycle, current_period_end")
        .eq("user_id", user!.id)
        .neq("status", "cancelled")
        .maybeSingle();
      return data as { id: string; status: string; billing_cycle: string; current_period_end: string } | null;
    },
    enabled: !!user,
  });

  const { data: plan } = useQuery({
    queryKey: ["zivo-plus-plan"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("zivo_subscription_plans")
        .select("id, name, price_monthly, price_yearly, slug")
        .eq("slug", "zivo-plus")
        .eq("is_active", true)
        .maybeSingle();
      return data as { id: string; name: string; price_monthly: number; price_yearly: number | null; slug: string } | null;
    },
  });

  const isActive = subscription?.status === "active";
  const isPending = subscription?.status === "pending";

  const handleJoin = async () => {
    if (!user) {
      navigate("/login?redirect=/zivo-plus");
      return;
    }
    if (isActive) {
      navigate("/account/subscriptions");
      return;
    }
    if (isPending) {
      toast.info("Your subscription is being processed. Check your email for the payment link.");
      return;
    }
    if (!plan) {
      toast.error("Unable to start subscription. Please try again or contact support.");
      return;
    }
    setJoining(true);
    try {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + (isAnnual ? 12 : 1));

      const { error } = await (supabase as any).from("zivo_subscriptions").insert({
        user_id: user.id,
        plan_id: plan.id,
        status: "pending",
        billing_cycle: isAnnual ? "annual" : "monthly",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      });

      if (error) throw error;
      await refetchSub();
      toast.success("Welcome to ZIVO Plus! Check your email to complete payment.", { duration: 6000 });
    } catch {
      toast.error("Failed to start subscription. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavBar />
      
      <main className="pt-24 pb-16">
        {/* Hero */}
        <section className="container mx-auto px-4 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-6">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">Premium Membership</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              ZIVO Plus
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Travel smarter with exclusive perks
            </p>
            <p className="text-base text-foreground font-medium">
              Get exclusive deals, priority support, and more miles on every trip.
            </p>
          </motion.div>
        </section>

        {/* Pricing Toggle */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-md mx-auto">
            <Card className="border-border bg-secondary">
              <CardContent className="p-8">
                {/* Toggle */}
                <div className="flex items-center justify-center gap-4 mb-8">
                  <span className={cn("text-sm font-medium", !isAnnual && "text-foreground", isAnnual && "text-muted-foreground")}>
                    Monthly
                  </span>
                  <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
                  <span className={cn("text-sm font-medium flex items-center gap-2", isAnnual && "text-foreground", !isAnnual && "text-muted-foreground")}>
                    Annual
                    <Badge variant="secondary" className="text-xs rounded-full">
                      Save {annualSavings}%
                    </Badge>
                  </span>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">
                      ${isAnnual ? annualPrice : monthlyPrice}
                    </span>
                    <span className="text-muted-foreground">
                      /{isAnnual ? "year" : "month"}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-sm text-muted-foreground mt-2">
                      That's just ${(annualPrice / 12).toFixed(2)}/month
                    </p>
                  )}
                </div>

                {/* CTA */}
                {isActive ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-emerald-500 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      You're a ZIVO Plus member!
                    </div>
                    <Button
                      variant="outline"
                      className="w-full h-12 rounded-xl"
                      onClick={() => navigate("/account/subscriptions")}
                    >
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full h-14 text-lg gap-2"
                  >
                    {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Crown className="w-5 h-5" />}
                    {joining ? "Processing…" : isPending ? "Check Your Email" : !user ? "Sign In to Join" : "Join ZIVO Plus"}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Cancel anytime. No commitment required.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className="container mx-auto px-4 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">Member Benefits</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={cn(
                  "h-full transition-all duration-200 hover:border-foreground/30 hover:-translate-y-0.5",
                  benefit.highlight && "border-border bg-secondary"
                )}>
                  <CardContent className="p-5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center mb-3 border border-border",
                      benefit.highlight ? "bg-background" : "bg-muted"
                    )}>
                      <benefit.icon className={cn(
                        "w-5 h-5",
                        benefit.highlight ? "text-amber-500" : "text-muted-foreground"
                      )} />
                    </div>
                    <h3 className="font-semibold mb-1">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature Comparison */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
            
            <Card>
              <CardContent className="p-0">
                <div className="grid grid-cols-3 gap-4 p-4 border-b border-border">
                  <div className="font-medium">Feature</div>
                  <div className="text-center text-muted-foreground">Free</div>
                  <div className="text-center text-amber-500 font-medium">Plus</div>
                </div>
                
                {[
                  ["Search & Compare", true, true],
                  ["Basic Price Alerts", true, true],
                  ["Early Deal Access", false, true],
                  ["Priority Alerts", false, true],
                  ["2x Miles Earning", false, true],
                  ["Ad-Free Experience", false, true],
                  ["Dedicated Support", false, true],
                  ["Member Discounts", false, true],
                ].map(([feature, free, plus], index) => (
                  <div key={index} className="grid grid-cols-3 gap-4 p-4 border-b border-border/50 last:border-0">
                    <div className="text-sm">{feature}</div>
                    <div className="text-center">
                      {free ? (
                        <Check className="w-5 h-5 text-muted-foreground mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                    <div className="text-center">
                      {plus ? (
                        <Check className="w-5 h-5 text-amber-500 mx-auto" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Testimonials */}
        <section className="container mx-auto px-4 mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">What Members Say</h2>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:border-foreground/30 hover:-translate-y-0.5 transition-all duration-300">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-secondary border border-border flex items-center justify-center text-sm font-bold text-foreground">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      "{testimonial.content}"
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* === WAVE 13: Rich ZivoPlus Content === */}

        {/* Member Savings Calculator */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">How Much Can You Save?</h2>
            <Card className="border-border bg-secondary">
              <CardContent className="p-6">
                <div className="grid sm:grid-cols-3 gap-4 text-center">
                  {[
                    { trips: "2 trips/mo", monthly: "$18", yearly: "$216", emoji: "🧳" },
                    { trips: "4 trips/mo", monthly: "$42", yearly: "$504", emoji: "✈️" },
                    { trips: "8+ trips/mo", monthly: "$95", yearly: "$1,140", emoji: "🌍" },
                  ].map(s => (
                    <div key={s.trips} className="p-4 rounded-xl border border-border bg-background">
                      <span className="text-2xl">{s.emoji}</span>
                      <p className="text-xs font-bold mt-2">{s.trips}</p>
                      <p className="text-lg font-bold text-foreground mt-1">{s.monthly}/mo</p>
                      <p className="text-[10px] text-muted-foreground">{s.yearly}/year saved</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Plus Exclusive Deals */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">This Week's Plus Exclusives</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { deal: "35% off Miami flights", normal: "$289", plus: "$188", tag: "Flights", emoji: "🏖️" },
                { deal: "Free room upgrade — Hilton", normal: "N/A", plus: "Free", tag: "Hotels", emoji: "🏨" },
                { deal: "Extra driver free on rentals", normal: "$15/day", plus: "$0", tag: "Cars", emoji: "🚗" },
                { deal: "3x miles on Tokyo routes", normal: "1x", plus: "3x miles", tag: "Miles", emoji: "🎌" },
              ].map(d => (
                <Card key={d.deal} className="border-border hover:border-foreground/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span>{d.emoji}</span>
                      <span className="text-xs font-bold">{d.deal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px]">
                        <span className="text-muted-foreground line-through mr-2">{d.normal}</span>
                        <span className="text-foreground font-bold">{d.plus}</span>
                      </div>
                      <Badge variant="secondary" className="text-[8px] rounded-full">{d.tag}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Plus FAQ */}
        <section className="container mx-auto px-4 mb-16">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-6">Frequently Asked Questions</h2>
            <div className="space-y-2">
              {[
                { q: "Can I cancel anytime?", a: "Yes. Cancel with one click. No cancellation fees, ever." },
                { q: "Do my miles expire?", a: "No. ZIVO miles never expire as long as your account is active." },
                { q: "Is Plus available worldwide?", a: "Yes. Benefits apply to all bookings globally." },
                { q: "Can I share with family?", a: "Currently per-account. Family plan support is on our roadmap." },
              ].map(f => (
                <Card key={f.q} className="border-border hover:border-foreground/30 transition-colors">
                  <CardContent className="p-4">
                    <p className="text-sm font-bold">{f.q}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-border bg-secondary">
            <CardContent className="p-8 text-center">
              <Crown className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">Ready to travel smarter?</h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of members saving more on every trip.
              </p>
              {isActive ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2 text-foreground font-bold text-lg">
                    <CheckCircle2 className="w-6 h-6" />
                    You're already a member!
                  </div>
                  <Button size="lg" variant="outline" onClick={() => navigate("/account/subscriptions")}>
                    Manage Subscription
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={handleJoin}
                  disabled={joining}
                  className="gap-2"
                >
                  {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  {joining ? "Processing…" : isPending ? "Check Your Email" : "Get ZIVO Plus Now"}
                  {!joining && !isPending && <ArrowRight className="w-4 h-4" />}
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default ZivoPlus;
