/**
 * DriverAppDownloadSheet — Bottom sheet promoting the Zivo Driver app.
 * Triggered when users tap "Become a Driver" from the partner sheet.
 *
 * Includes:
 *  - App Store deep link (iOS)
 *  - zivodriver.com website link
 *  - Highlights (earn money, flexible hours, weekly payouts)
 */
import { motion } from "framer-motion";
import {
  Globe, Car, DollarSign, Clock, Zap, Star, ArrowRight, X,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

/** Official Apple logo (filled) for the App Store badge. */
const AppleLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 384 512"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
  </svg>
);

const APP_STORE_URL =
  "https://apps.apple.com/us/app/zivo-customer/id6759480121";
const DRIVER_WEBSITE_URL = "https://zivodriver.com";

const HIGHLIGHTS = [
  { icon: DollarSign, label: "Keep up to 75%", sub: "Industry-leading earnings", color: "hsl(142 71% 45%)" },
  { icon: Clock, label: "Drive on your time", sub: "Online whenever you want", color: "hsl(221 83% 53%)" },
  { icon: Zap, label: "Instant payouts", sub: "Cash out anytime to your wallet", color: "hsl(263 70% 58%)" },
  { icon: Star, label: "Weekly bonuses", sub: "Earn more with peak rewards", color: "hsl(38 92% 50%)" },
];

interface DriverAppDownloadSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DriverAppDownloadSheet({
  open,
  onOpenChange,
}: DriverAppDownloadSheetProps) {
  const openExternal = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[92dvh] overflow-auto p-0 border-0"
      >
        {/* Hero gradient */}
        <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 px-6 pt-7 pb-8 text-white overflow-hidden">
          <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 rounded-full bg-secondary blur-2xl" />

          {/* Close button */}
          <button type="button"
            onClick={() => onOpenChange(false)}
            className="absolute top-3 right-3 h-10 w-10 rounded-full bg-white/15 backdrop-blur hover:bg-white/25 active:scale-95 flex items-center justify-center transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-xl"
            >
              <Car className="w-8 h-8 text-white" />
            </motion.div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              Drive with ZIVO
            </h2>
            <p className="text-white/85 text-[13px] mt-1 max-w-[280px] leading-relaxed">
              Earn money on your schedule. Get the Zivo Driver app to start
              accepting rides and deliveries.
            </p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Highlights */}
          <div className="grid grid-cols-2 gap-2.5">
            {HIGHLIGHTS.map((h, i) => (
              <motion.div
                key={h.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-border/50 bg-card p-3"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
                  style={{ background: `${h.color}18` }}
                >
                  <h.icon className="w-4 h-4" style={{ color: h.color }} />
                </div>
                <p className="font-extrabold text-[12.5px] leading-tight">
                  {h.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                  {h.sub}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Download CTA */}
          <div className="space-y-2.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
              Get the app
            </p>

            {/* App Store */}
            <button type="button"
              onClick={() => openExternal(APP_STORE_URL)}
              className="w-full h-16 rounded-2xl bg-foreground text-background flex items-center gap-3 px-4 active:scale-[0.98] transition shadow-lg"
            >
              <AppleLogo className="w-7 h-7" />
              <div className="flex-1 text-left">
                <p className="text-[10px] opacity-80 leading-none">
                  Download on the
                </p>
                <p className="text-lg font-extrabold leading-tight mt-0.5">
                  App Store
                </p>
              </div>
              <ArrowRight className="w-5 h-5 opacity-60" />
            </button>

            {/* Website */}
            <button type="button"
              onClick={() => openExternal(DRIVER_WEBSITE_URL)}
              className="w-full h-16 rounded-2xl border-2 border-border bg-card flex items-center gap-3 px-4 active:scale-[0.98] transition hover:border-primary/40"
            >
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Globe className="w-4.5 h-4.5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-[10px] text-muted-foreground leading-none font-medium">
                  Visit our website
                </p>
                <p className="text-base font-extrabold leading-tight mt-0.5">
                  zivodriver.com
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground/60" />
            </button>
          </div>

          {/* Footer note */}
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed pt-1">
            Sign up takes ~5 minutes. You'll need a valid driver's license,
            vehicle registration, and insurance.
          </p>

          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full h-11 rounded-2xl text-sm font-semibold text-muted-foreground"
          >
            Maybe later
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
