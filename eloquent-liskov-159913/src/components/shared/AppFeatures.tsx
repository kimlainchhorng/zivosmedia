import { Smartphone, Bell, Wallet, Map, Shield, Zap, Star, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Bell,
    title: "Price Alerts",
    description: "Get notified instantly when prices drop on your saved searches",
    color: "sky"
  },
  {
    icon: Wallet,
    title: "ZIVO Wallet",
    description: "Store credits, manage payments, and earn cashback rewards",
    color: "emerald"
  },
  {
    icon: Map,
    title: "Offline Maps",
    description: "Download maps and access your bookings without internet",
    color: "violet"
  },
  {
    icon: Shield,
    title: "Travel Protection",
    description: "Comprehensive insurance and 24/7 emergency support",
    color: "amber"
  },
  {
    icon: Zap,
    title: "Express Booking",
    description: "Save payment methods and book in under 30 seconds",
    color: "pink"
  },
  {
    icon: Star,
    title: "Loyalty Rewards",
    description: "Earn ZIVO Miles on every booking and unlock exclusive perks",
    color: "orange"
  },
];

const AppFeatures = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          {/* Phone Mockup */}
          <div className="relative flex justify-center">
            <div className="relative w-64 h-[500px] bg-gradient-to-b from-card to-muted rounded-[3rem] border-4 border-muted-foreground/20 shadow-2xl">
              {/* Screen */}
              <div className="absolute inset-3 bg-gradient-to-br from-primary/20 via-background to-teal-500/20 rounded-[2.5rem] overflow-hidden">
                <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-6 bg-muted-foreground/30 rounded-full" />
                
                {/* App Content Preview */}
                <div className="mt-16 p-4 space-y-3">
                  <div className="h-8 bg-muted/50 rounded-xl" />
                  <div className="h-24 bg-primary/20 rounded-xl" />
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-12 bg-muted/50 rounded-xl" />
                    ))}
                  </div>
                  <div className="h-32 bg-muted/50 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -left-4 p-3 bg-card rounded-xl border border-border/50 shadow-lg animate-float">
              <Bell className="w-6 h-6 text-foreground" />
            </div>
            <div className="absolute top-1/4 -right-8 p-3 bg-card rounded-xl border border-border/50 shadow-lg animate-float" style={{ animationDelay: "0.5s" }}>
              <Wallet className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="absolute bottom-1/4 -left-8 p-3 bg-card rounded-xl border border-border/50 shadow-lg animate-float" style={{ animationDelay: "1s" }}>
              <Star className="w-6 h-6 text-amber-400" />
            </div>
          </div>

          {/* Features */}
          <div>
            <Badge className="mb-3 bg-primary/20 text-primary border-primary/30">
              <Smartphone className="w-3 h-3 mr-1" /> Mobile App
            </Badge>
            <h2 className="text-2xl md:text-4xl font-display font-bold mb-4">
              Travel Smarter with ZIVO App
            </h2>
            <p className="text-muted-foreground mb-8">
              Everything you need to plan, book, and manage your travels - all in one place.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="flex items-start gap-3 p-4 bg-card/60 rounded-xl border border-border/50"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-${feature.color}-500/10 flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 text-${feature.color}-400`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm mb-1">{feature.title}</h3>
                      <p className="text-xs text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Download CTA */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-gradient-to-r from-primary to-teal-400">
                <Download className="w-4 h-4 mr-2" />
                Download the App
              </Button>
              <Button size="lg" variant="outline">
                Get Started
              </Button>
            </div>

            <p className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> 4.9 rating • 2M+ downloads • Free to use
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppFeatures;
