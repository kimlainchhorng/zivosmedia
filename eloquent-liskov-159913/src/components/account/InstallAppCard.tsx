/**
 * InstallAppCard — Smart install card for the ZIVO mobile app.
 *
 * Features:
 *  - Detects iOS / Android / Desktop and platform-specific install paths
 *  - Triggers the native PWA "beforeinstallprompt" when available
 *  - Shows iOS Share → Add to Home Screen instructions in a sheet
 *  - Real App Store + Google Play badges (link out to stores)
 *  - Auto-hides when running inside an installed PWA / Capacitor shell
 *  - Remembers dismissal in localStorage
 */
import { useEffect, useMemo, useState } from "react";
import { Apple, Phone, Share, Plus, X, Check, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

const APP_STORE_URL = "https://apps.apple.com/app/id6759480121";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.zivollc.app";
const DISMISS_KEY = "zivo_install_card_dismissed";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // PWA standalone
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari home-screen
  if ((window.navigator as any).standalone === true) return true;
  // Capacitor native shell
  if ((window as any).Capacitor?.isNativePlatform?.()) return true;
  return false;
}

export default function InstallAppCard() {
  const platform = useMemo(detectPlatform, []);
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());
  const [dismissed, setDismissed] = useState<boolean>(
    () => typeof window !== "undefined" && !!localStorage.getItem(DISMISS_KEY)
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [iosSheetOpen, setIosSheetOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  // Capture beforeinstallprompt for Chromium-based browsers (Android + Desktop)
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || dismissed) return null;

  const handleInstall = async () => {
    if (platform === "ios") {
      setIosSheetOpen(true);
      return;
    }
    if (deferredPrompt) {
      try {
        setInstalling(true);
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice?.outcome === "accepted") setInstalled(true);
        setDeferredPrompt(null);
      } finally {
        setInstalling(false);
      }
      return;
    }
    // Fallback: open Play Store on Android, generic store hub on desktop
    if (platform === "android") {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    } else {
      window.open(PLAY_STORE_URL, "_blank", "noopener,noreferrer");
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <>
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 overflow-hidden relative">
        <button type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-background/60 text-muted-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold">Get the hiZIVO App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Install for instant alerts, faster loading, and a smoother experience on your phone.
              </p>

              {/* Primary install action */}
              <Button
                size="sm"
                className="mt-3 w-full sm:w-auto"
                onClick={handleInstall}
                disabled={installing}
              >
                {platform === "ios" && (<><Share className="w-3.5 h-3.5 mr-1.5" /> How to install on iPhone</>)}
                {platform === "android" && (<><Plus className="w-3.5 h-3.5 mr-1.5" /> {deferredPrompt ? "Install app" : "Get on Play Store"}</>)}
                {platform === "desktop" && (<><Plus className="w-3.5 h-3.5 mr-1.5" /> {deferredPrompt ? "Install app" : "Get the app"}</>)}
              </Button>

              {/* Store badges */}
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <Apple className="w-4 h-4" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] opacity-80">Download on the</span>
                    <span className="text-xs font-semibold">App Store</span>
                  </div>
                </a>
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
                >
                  <PlayBadgeIcon className="w-4 h-4" />
                  <div className="flex flex-col leading-tight">
                    <span className="text-[9px] opacity-80">Get it on</span>
                    <span className="text-xs font-semibold">Google Play</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* iOS install instructions */}
      <Sheet open={iosSheetOpen} onOpenChange={setIosSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              <Apple className="w-5 h-5" /> Add hiZIVO to your Home Screen
            </SheetTitle>
            <SheetDescription>
              iPhone & iPad users — follow these 3 quick steps in Safari.
            </SheetDescription>
          </SheetHeader>

          <ol className="mt-4 space-y-3">
            <li className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40">
              <Step n={1} />
              <div className="flex-1 text-sm">
                Tap the <strong>Share</strong> button
                <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-background border align-middle">
                  <Share className="w-3 h-3" />
                </span>
                {" "}at the bottom of Safari.
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40">
              <Step n={2} />
              <div className="flex-1 text-sm">
                Scroll down and tap <strong>Add to Home Screen</strong>
                <span className="inline-flex items-center gap-1 ml-1 px-1.5 py-0.5 rounded bg-background border align-middle">
                  <Plus className="w-3 h-3" />
                </span>.
              </div>
            </li>
            <li className="flex items-start gap-3 p-3 rounded-2xl bg-muted/40">
              <Step n={3} />
              <div className="flex-1 text-sm">
                Tap <strong>Add</strong> in the top-right. Done — open hiZIVO from your home screen.
                <Check className="w-3.5 h-3.5 inline ml-1 text-primary" />
              </div>
            </li>
          </ol>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground mb-2">Prefer the native app?</p>
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-foreground text-background"
            >
              <Apple className="w-4 h-4" />
              <span className="text-sm font-semibold">Open App Store</span>
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Step({ n }: { n: number }) {
  return (
    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
      {n}
    </div>
  );
}

function PlayBadgeIcon({ className }: { className?: string }) {
  // Simple Play triangle glyph (avoids external assets)
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M5 3.5v17a1 1 0 0 0 1.5.87l14.5-8.5a1 1 0 0 0 0-1.74L6.5 2.63A1 1 0 0 0 5 3.5z" />
    </svg>
  );
}
