/**
 * Full-screen interstitial shown when users visit via in-app browsers
 * (Facebook, Instagram, TikTok, etc.) to prompt app download.
 * Shows once per session; can be dismissed.
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { detectInAppBrowser } from "@/lib/isInAppBrowser";
import { X, Smartphone, Zap, Bell, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import zivoLogo from "@/assets/ZIVO_LOGO.png";

const APP_STORE_URL = "https://apps.apple.com/us/app/zivo-customer/id6759480121";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.hizovo.app";

const SESSION_KEY = "zivo_iab_dismissed";

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const features = [
  { icon: Zap, text: "Faster & smoother experience" },
  { icon: Bell, text: "Real-time price alerts" },
  { icon: Shield, text: "Secure biometric login" },
];

export default function InAppBrowserInterstitial() {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<string | null>(null);

  const authRoutes = ["/login", "/signup", "/verify-email", "/verify-otp", "/verify-new-device", "/forgot-password", "/reset-password", "/setup"];
  const onAuthRoute = authRoutes.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    if (onAuthRoute) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const detected = detectInAppBrowser();
    if (detected) {
      setPlatform(detected);
      setVisible(true);
    }
  }, [onAuthRoute]);

  if (onAuthRoute) return null;

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setVisible(false);
  };

  const storeUrl = isIOS() ? APP_STORE_URL : PLAY_STORE_URL;
  const storeName = isIOS() ? "App Store" : "Google Play";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-6"
        >
          {/* Close button */}
          <button type="button"
            onClick={dismiss}
            className="absolute top-4 right-4 p-2.5 rounded-full bg-muted hover:bg-muted/80 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-foreground" />
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="max-w-sm w-full text-center space-y-8"
          >
            {/* Logo */}
            <div className="w-24 h-24 mx-auto bg-black rounded-[22%] overflow-hidden shadow-2xl flex items-center justify-center">
              <img
	                src={zivoLogo}
	                alt="ZIVO"
	                className="w-full h-full object-cover"
	                loading="lazy"
	                decoding="async"
	              />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2 text-foreground">Get the ZIVO App</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                You're browsing from {platform}. Open ZIVO in our app for the best experience.
              </p>
            </div>

            {/* Feature cards */}
            <div className="space-y-3">
              {features.map((feat, i) => (
                <motion.div
                  key={feat.text}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border/40 text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <feat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{feat.text}</span>
                </motion.div>
              ))}
            </div>

            {/* CTA — uses <a> tag for reliability in in-app browsers */}
            <div className="space-y-3 pt-1">
              <a
                href={storeUrl}
                className="flex items-center justify-center gap-2.5 w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-[15px] shadow-lg active:scale-[0.97] transition-transform touch-manipulation"
              >
                <Smartphone className="w-5 h-5" />
                Download on {storeName}
              </a>

              <button type="button"
                onClick={dismiss}
                className="w-full py-3 text-sm text-muted-foreground font-medium underline underline-offset-4 decoration-muted-foreground/30"
              >
                Continue on web
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
