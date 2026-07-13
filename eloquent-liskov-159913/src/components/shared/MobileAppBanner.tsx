import { Smartphone, Star, Check, Apple, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const appFeatures = [
  "Exclusive app-only deals",
  "Mobile boarding passes",
  "Real-time notifications",
  "Offline access to bookings",
  "24/7 in-app support",
];

const MobileAppBanner = () => {
  return (
    <section className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card/50 border border-primary/20 rounded-3xl p-8 md:p-12">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-secondary blur-3xl rounded-full" />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-primary/20 text-primary border-primary/30">
                <Smartphone className="w-3 h-3 mr-1" /> Mobile App
              </Badge>
              <h2 className="text-2xl md:text-4xl font-display font-bold mb-4">
                Travel Smarter with Our App
              </h2>
              <p className="text-muted-foreground mb-6">
                Download the ZIVO app and unlock exclusive features, mobile-only deals, and seamless booking on the go.
              </p>

              <ul className="space-y-3 mb-8">
                {appFeatures.map((feature) => (
                  <li key={feature} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-black text-primary-foreground hover:bg-black/80 rounded-xl h-12 px-6 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 touch-manipulation">
                  <a href="https://apps.apple.com/us/app/zivo-customer/id6759480121" target="_blank" rel="noopener noreferrer">
                    <Apple className="w-5 h-5 mr-2" />
                    App Store
                  </a>
                </Button>
              </div>

              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">4.9/5 from 50K+ reviews</span>
              </div>
            </div>

            <div className="relative flex justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 rounded-[3rem] blur-3xl" />
              <div className="relative w-64 h-[500px] bg-gradient-to-br from-card to-background rounded-[3rem] p-3 shadow-2xl border border-border">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 via-card rounded-[2.5rem] flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 flex items-center justify-center"><Sparkles className="w-8 h-8 text-primary" /></div>
                    <p className="font-bold text-lg">ZIVO</p>
                    <p className="text-xs text-muted-foreground">Travel Made Easy</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MobileAppBanner;
