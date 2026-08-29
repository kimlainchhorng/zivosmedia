/**
 * CookieConsent - Cookie Consent Banner
 * Hidden on native Capacitor builds (Apple App Store guideline 5.1.2i)
 */

import { useState, useEffect } from "react";
import { useLocation , Link} from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Cookie, X, Settings, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { COOKIE_CONSENT_STORAGE_KEY } from "@/hooks/useCookiePrefs";

const COOKIE_CONSENT_DATE_STORAGE_KEY = "zivo_cookie_consent_date";
const COOKIE_CONSENT_UPDATED_EVENT = "zivo:cookie-consent-updated";

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CookieConsent = () => {
  const location = useLocation();
  const isRideHub = location.pathname.startsWith("/rides/hub");
  const isAuthRoute = [
    "/login",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/verify-otp",
    "/verify-new-device",
    "/setup",
  ].some((route) => location.pathname.startsWith(route));
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: true,
    analytics: false,
    marketing: false,
  });

  const notifyCookieConsentUpdated = () => {
    try {
      window.dispatchEvent(new Event(COOKIE_CONSENT_UPDATED_EVENT));
    } catch {
      // ignore environments without Event support
    }
  };

  useEffect(() => {
    // Never show cookie consent in native iOS/Android apps (App Store guideline 5.1.2i)
    // or on auth screens where it can block form fields on mobile.
    if (Capacitor.isNativePlatform() || isAuthRoute) {
      setIsVisible(false);
      setShowDetails(false);
      return;
    }

    const consent = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }

    setIsVisible(false);
    setShowDetails(false);
  }, [isAuthRoute]);

  const handleAcceptAll = () => {
    const allAccepted = { essential: true, functional: true, analytics: true, marketing: true };
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(allAccepted));
    localStorage.setItem(COOKIE_CONSENT_DATE_STORAGE_KEY, new Date().toISOString());
    notifyCookieConsentUpdated();
    window.__zivoLoadAnalytics?.();
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    const essentialOnly = { essential: true, functional: false, analytics: false, marketing: false };
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(essentialOnly));
    localStorage.setItem(COOKIE_CONSENT_DATE_STORAGE_KEY, new Date().toISOString());
    notifyCookieConsentUpdated();
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(preferences));
    localStorage.setItem(COOKIE_CONSENT_DATE_STORAGE_KEY, new Date().toISOString());
    notifyCookieConsentUpdated();
    if (preferences.analytics || preferences.marketing) {
      window.__zivoLoadAnalytics?.();
    }
    setIsVisible(false);
  };

  const cookieCategories = [
    {
      key: "essential" as keyof CookiePreferences,
      title: "Essential Cookies",
      description: "Required for basic functionality. Cannot be disabled.",
      required: true,
    },
    {
      key: "functional" as keyof CookiePreferences,
      title: "Functional Cookies",
      description: "Remember your preferences and enhance features.",
      required: false,
    },
    {
      key: "analytics" as keyof CookiePreferences,
      title: "Analytics Cookies",
      description: "Help us understand how you use our services.",
      required: false,
    },
    {
      key: "marketing" as keyof CookiePreferences,
      title: "Marketing & Advertising Cookies",
      description: "Measure campaigns and show relevant offers when you consent.",
      required: false,
    },
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          role="region"
          aria-label="Cookie consent"
          onKeyDown={(e) => {
            // Non-modal banner: Escape dismisses it the same way the X does
            // (reject non-essential). No focus trap — the page stays usable.
            if (e.key === "Escape") handleRejectAll();
          }}
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          /* Clears the fixed bottom nav, which is z-[1401] against this banner's
             z-[100] and so paints over it. The nav is hidden from lg up, not md,
             so md:bottom-0 pinned the consent buttons underneath it on tablets.
             4rem matches the .pb-nav allowance the rest of the app uses. */
          className="pointer-events-none fixed left-0 right-0 z-[100] p-3 bottom-[calc(4rem+12px+var(--zivo-safe-bottom,0px))] md:p-6 lg:bottom-0"
        >
          <Card className="pointer-events-auto max-w-xl mx-auto shadow-2xl border-0 bg-card/95 backdrop-blur-xl overflow-hidden max-h-[46vh] overflow-y-auto md:max-w-4xl md:max-h-none">
            {/* Top gradient line */}
            <div className="h-1 bg-gradient-to-r from-primary via-teal-400 to-eats" />
            
            <CardContent className="p-4 md:p-6">
              {!showDetails ? (
                isRideHub ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        We use cookies for core features and analytics.
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Reject all cookies"
                        className="h-8 w-8 rounded-lg"
                        onClick={handleRejectAll}
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={handleAcceptAll} className="min-h-[40px] rounded-lg text-xs font-semibold bg-gradient-to-r from-primary to-teal-400 text-primary-foreground touch-manipulation">
                        Accept All
                      </Button>
                      <Button variant="outline" onClick={handleRejectAll} className="min-h-[40px] rounded-lg text-xs font-semibold touch-manipulation">
                        Reject
                      </Button>
                      <Button variant="ghost" onClick={() => setShowDetails(true)} className="min-h-[40px] rounded-lg text-xs font-semibold touch-manipulation">
                        Customize
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3 md:gap-4">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 10 }}
                        className="hidden sm:flex p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 shadow-lg"
                      >
                        <Cookie className="h-7 w-7 text-primary" />
                      </motion.div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-base md:text-xl mb-1.5 md:mb-2 flex items-center gap-2">We Value Your Privacy <Cookie className="w-4 h-4 md:w-5 md:h-5 text-amber-500" /></h3>
                        <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-5 leading-relaxed">
                          We use cookies to enhance your experience, analyze site traffic, and for marketing purposes.{" "}
                          <span className="hidden sm:inline">By clicking "Accept All", you consent to our use of cookies. </span>
                          Read our{" "}
                          <Link to="/legal/privacy" className="inline-flex min-h-[40px] items-center px-1 -my-2 text-primary font-medium hover:underline touch-manipulation">Privacy Policy</Link>.
                        </p>
                        <div className="flex flex-wrap gap-2 md:gap-3">
                          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button onClick={handleAcceptAll} className="bg-gradient-to-r from-primary to-teal-400 text-primary-foreground font-semibold shadow-lg shadow-primary/30 rounded-xl touch-manipulation active:scale-[0.97] transition-all duration-200 min-h-[40px] md:min-h-[44px] px-3 md:px-4 text-xs md:text-sm">
                              Accept All
                            </Button>
                          </motion.div>
                          <Button variant="outline" onClick={handleRejectAll} className="font-semibold rounded-xl touch-manipulation active:scale-[0.97] transition-all duration-200 min-h-[40px] md:min-h-[44px] px-3 md:px-4 text-xs md:text-sm">
                            Reject All
                          </Button>
                          <Button variant="ghost" onClick={() => setShowDetails(true)} className="gap-1.5 md:gap-2 font-semibold rounded-xl touch-manipulation active:scale-[0.97] transition-all duration-200 min-h-[40px] md:min-h-[44px] px-3 md:px-4 text-xs md:text-sm">
                            <Settings className="h-3.5 w-3.5 md:h-4 md:w-4" />
                            Customize
                          </Button>
                        </div>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Reject all cookies"
                          className="shrink-0 min-h-[40px] min-w-[40px] rounded-xl hover:bg-destructive/10 active:scale-90 transition-all duration-200 touch-manipulation"
                          onClick={handleRejectAll}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </motion.div>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="font-display font-bold text-xl">Cookie Preferences</h3>
                    </div>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Button variant="ghost" size="icon" aria-label="Close cookie preferences" onClick={() => setShowDetails(false)} className="rounded-xl active:scale-90 transition-all duration-200 touch-manipulation">
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-5">
                    Manage your cookie preferences below. Your choices are saved for 12 months.
                  </p>

                  <div className="space-y-3 mb-6">
                    {cookieCategories.map((category, index) => (
                      <motion.div
                        key={category.key}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-gradient-to-br from-muted/30 to-muted/10 hover:border-primary/30 transition-all"
                      >
                        <div>
                          <p className="font-semibold">{category.title}</p>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                        <Switch
                          checked={preferences[category.key]}
                          onCheckedChange={(checked) =>
                            setPreferences((prev) => ({ ...prev, [category.key]: checked }))
                          }
                          disabled={category.required}
                          className="data-[state=checked]:bg-primary touch-manipulation"
                        />
                      </motion.div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                      <Button onClick={handleSavePreferences} className="w-full bg-gradient-to-r from-primary to-teal-400 text-primary-foreground font-semibold shadow-lg shadow-primary/30 rounded-xl touch-manipulation active:scale-[0.97] transition-all duration-200 min-h-[44px]">
                        Save Preferences
                      </Button>
                    </motion.div>
                    <Button variant="outline" onClick={handleAcceptAll} className="flex-1 font-semibold rounded-xl touch-manipulation active:scale-[0.97] transition-all duration-200 min-h-[44px]">
                      Accept All
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
