import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Bell, Zap, Download, Star, ArrowRight, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

const appFeatures = [
  { icon: Bell, text: "Instant price alerts" },
  { icon: Zap, text: "Faster booking" },
  { icon: Star, text: "Exclusive app deals" },
];

const FlightMobileAppPromo = () => {
  return (
    <section className="py-12 sm:py-16 lg:py-20 relative overflow-hidden">
      <div className="absolute inset-0 to-transparent bg-secondary" />
      <div className="absolute top-1/4 right-0 w-[300px] h-[300px] bg-gradient-radial to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-[200px] h-[200px] bg-gradient-radial from-blue-500/15 to-transparent rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left: Phone mockup */}
          <div className="relative flex justify-center animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="relative">
              {/* Phone frame */}
              <div className="w-64 sm:w-72 h-[500px] sm:h-[550px] rounded-[40px] bg-gradient-to-br from-gray-800 to-gray-900 p-3 shadow-2xl">
                <div className="w-full h-full rounded-[32px] flex flex-col items-center justify-center overflow-hidden bg-secondary">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 mx-auto bg-secondary">
                    <Plane className="w-10 h-10 text-foreground" />
                  </div>
                  <h3 className="font-display font-bold text-xl text-primary-foreground mb-2">ZIVO Flights</h3>
                  <p className="text-sm text-primary-foreground/70 text-center px-6 mb-4">Your next adventure starts here</p>
                  <div className="flex gap-2">
                    <Badge className="bg-white/20 text-primary-foreground text-xs">4.9</Badge>
                    <Badge className="bg-white/20 text-primary-foreground text-xs">10M+ Downloads</Badge>
                  </div>
                </div>
              </div>
              
              {/* Floating badges */}
              <div className="absolute -top-4 -right-4 px-3 py-2 rounded-xl bg-green-500 text-primary-foreground text-xs font-bold shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
                Save $50 Today!
              </div>
              <div className="absolute -bottom-4 -left-4 px-3 py-2 rounded-xl bg-foreground text-primary-foreground text-xs font-bold shadow-lg">
                <Bell className="w-3 h-3 inline mr-1" /> Price Drop Alert
              </div>
            </div>
          </div>

          {/* Right: Content */}
          <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-primary-foreground text-sm font-bold mb-6 shadow-lg bg-foreground">
              <Smartphone className="w-4 h-4" />
              Get the App
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Book Faster,
              <br />
              <span className="text-accent-foreground">Save More</span>
            </h2>
            <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
              Download the ZIVO app for exclusive mobile-only deals, instant price alerts, and seamless booking on the go.
            </p>

            <div className="space-y-4 mb-8">
              {appFeatures.map((feature, index) => (
                <div
                  key={feature.text}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50",
                    "animate-in fade-in slide-in-from-left-4"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary">
                    <feature.icon className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-gradient-to-r from-gray-800 to-black hover:from-gray-700 hover:to-gray-900 text-primary-foreground">
                <Download className="w-4 h-4 mr-2" />
                App Store
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FlightMobileAppPromo;
