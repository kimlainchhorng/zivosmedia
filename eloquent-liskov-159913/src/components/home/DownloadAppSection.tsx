/**
 * Download App Section - Premium phone mockup with token-based colors
 */
import { motion } from "framer-motion";
import Plane from "lucide-react/dist/esm/icons/plane";
import Bell from "lucide-react/dist/esm/icons/bell";
import Shield from "lucide-react/dist/esm/icons/shield";
import Star from "lucide-react/dist/esm/icons/star";
import Download from "lucide-react/dist/esm/icons/download";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";

const features = [
  { icon: Plane, text: "Book flights, hotels & cars on the go", colorVar: "--flights" },
  { icon: Bell, text: "Real-time price alerts & notifications", colorVar: "--primary" },
  { icon: Shield, text: "Secure checkout with biometric auth", colorVar: "--rides" },
  { icon: Star, text: "Exclusive app-only deals & rewards", colorVar: "--hotels" },
];

const APP_STORE_URL = "https://apps.apple.com/us/app/zivo-customer/id6759480121";

export default function DownloadAppSection() {

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden" aria-label="Download ZIVO app">
      {/* Background gradient accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle,hsl(var(--primary)/0.04)_0%,transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Download className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Download Now</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-5 tracking-tight">
              Your world. <span className="text-primary">One app.</span>
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-8 max-w-md leading-relaxed">
              Download the ZIVO app for the fastest way to search, compare, and book travel — anywhere, anytime.
            </p>

            <div className="space-y-4 mb-8">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.text}
                  initial={{ opacity: 0, x: -15 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: i * 0.08 }}
                  className="flex items-center gap-3 p-2 -ml-2 rounded-xl hover:bg-muted/40 transition-colors duration-200"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `hsl(var(${feat.colorVar}) / 0.1)`,
                      borderColor: `hsl(var(${feat.colorVar}) / 0.2)`,
                    }}
                  >
                    <feat.icon className="w-[18px] h-[18px]" style={{ color: `hsl(var(${feat.colorVar}))` }} />
                  </div>
                  <span className="text-sm font-medium text-foreground/80">{feat.text}</span>
                </motion.div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-6 py-3.5 rounded-xl bg-foreground text-background font-semibold text-sm hover:opacity-90 active:scale-[0.97] transition-all touch-manipulation min-h-[48px]"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                App Store
              </a>
            </div>
          </motion.div>

          {/* Right: Premium Phone mockup */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex justify-center"
          >
            <div className="relative">
              {/* Glow ring behind phone */}
              <div className="absolute inset-0 scale-110 rounded-[3rem] bg-gradient-to-br from-primary/10 via-transparent to-[hsl(var(--flights)/0.1)] blur-2xl" />

              <div className="w-[260px] h-[520px] rounded-[2.5rem] bg-card border-2 border-border/60 shadow-xl overflow-hidden relative">
                <div className="absolute inset-3 rounded-[2rem] overflow-hidden bg-background">
                  {/* Status bar */}
                  <div className="h-10 bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary tracking-[0.2em]">ZIVO</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="h-7 rounded-xl bg-muted/50 w-3/4" />
                    <div className="h-5 rounded-xl bg-muted/30 w-1/2" />
                    {/* Mini search card */}
                    <div className="h-28 rounded-2xl bg-primary/5 border border-primary/10 mt-3 flex items-center justify-center">
                      <Plane className="w-8 h-8 text-primary/30" />
                    </div>
                    {/* Service icons */}
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {[
                        { icon: Plane, colorVar: "--flights" },
                        { icon: Hotel, colorVar: "--hotels" },
                        { icon: CarFront, colorVar: "--cars" },
                        { icon: UtensilsCrossed, colorVar: "--eats" },
                      ].map((s, i) => (
                        <div key={i} className="h-14 rounded-xl bg-muted/30 flex items-center justify-center">
                          <s.icon className="w-5 h-5 opacity-50" style={{ color: `hsl(var(${s.colorVar}))` }} />
                        </div>
                      ))}
                    </div>
                    <div className="h-10 rounded-xl bg-primary/15 mt-2 flex items-center justify-center">
                      <span className="text-xs font-semibold text-primary">Search Flights</span>
                    </div>
                  </div>
                </div>
                {/* Notch */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-card rounded-full" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
