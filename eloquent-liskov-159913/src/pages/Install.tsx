/**
 * PWA Install Page
 * Guides users through installing ZIVO on their device
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { motion } from "framer-motion";
import { 
  Download, Smartphone, Share, Plus, Check, 
  Plane, Car, Utensils, BedDouble, ChevronRight,
  Zap, Wifi, Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      navigate("/", { replace: true });
      return;
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const features = [
    { icon: Plane, label: "Flights", desc: "Compare 300+ airlines" },
    { icon: BedDouble, label: "Hotels", desc: "1M+ properties" },
    { icon: Car, label: "Rides", desc: "Premium mobility" },
    { icon: Utensils, label: "Eats", desc: "Gourmet delivery" },
  ];

  const benefits = [
    { icon: Zap, label: "Instant Access", desc: "Launch from home screen" },
    { icon: Wifi, label: "Works Offline", desc: "Browse saved content" },
    { icon: Bell, label: "Push Alerts", desc: "Price drop notifications" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 text-center safe-area-top">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-2xl shadow-primary/30"
        >
          <span className="text-3xl font-black text-primary-foreground">Z</span>
        </motion.div>
        
        <h1 className="text-3xl font-bold mb-2">Get the ZIVO App</h1>
        <p className="text-muted-foreground">One app for every journey</p>
      </div>

      {/* Services Grid */}
      <div className="px-6 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <motion.div
              key={feature.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 rounded-2xl bg-muted/50 border border-border/50"
            >
              <feature.icon className="w-6 h-6 text-primary mb-2" />
              <div className="font-bold text-sm">{feature.label}</div>
              <div className="text-xs text-muted-foreground">{feature.desc}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Benefits */}
      <div className="px-6 pb-8">
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Why Install?</h2>
        <div className="space-y-3">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              className="flex items-center gap-4 p-4 rounded-2xl bg-muted/50 border border-border/50"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-bold text-sm">{benefit.label}</div>
                <div className="text-xs text-muted-foreground">{benefit.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Install Section */}
      <div className="px-6 pb-12">
        {isInstalled ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20"
          >
            <Check className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-bold text-lg mb-1">Already Installed!</h3>
            <p className="text-sm text-muted-foreground mb-4">ZIVO is ready on your home screen</p>
            <Button onClick={() => navigate("/")} className="w-full">
              Open App
            </Button>
          </motion.div>
        ) : deferredPrompt ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button 
              onClick={handleInstall}
              size="lg"
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-teal-400 hover:opacity-90"
            >
              <Download className="w-5 h-5 mr-2" />
              Install ZIVO
            </Button>
            <p className="text-center text-xs text-muted-foreground mt-3">Free • No app store needed</p>
          </motion.div>
        ) : isIOS ? (
          <div className="p-6 rounded-3xl bg-muted/50 border border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on iPhone
            </h3>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">1</div>
                <div>
                  <span className="font-medium">Tap the Share button</span>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Share className="w-4 h-4" /> at the bottom of Safari
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">2</div>
                <div>
                  <span className="font-medium">Scroll and tap "Add to Home Screen"</span>
                  <div className="flex items-center gap-2 mt-1 text-muted-foreground">
                    <Plus className="w-4 h-4" /> Add to Home Screen
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">3</div>
                <span className="font-medium">Tap "Add" to confirm</span>
              </li>
            </ol>
          </div>
        ) : (
          <div className="p-6 rounded-3xl bg-muted/50 border border-border/50">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-primary" />
              Install on Your Mobile Browser
            </h3>
            <ol className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">1</div>
                <span className="font-medium">Tap the menu (⋮) in your browser</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">2</div>
                <span className="font-medium">Tap "Install app" or "Add to Home Screen"</span>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">3</div>
                <span className="font-medium">Confirm the installation</span>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Skip Link */}
      <div className="px-6 pb-8 text-center">
        <button type="button" 
          onClick={() => navigate("/")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mx-auto"
        >
          Continue to website
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Install;