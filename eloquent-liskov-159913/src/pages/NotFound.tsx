import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { Home, Search, Compass, Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  const goBack = () => {
    // history.length is 2 on a fresh tab (initial blank + first navigation),
    // so anything > 2 means we have somewhere meaningful to go back to.
    if (typeof window !== "undefined" && window.history.length > 2) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background safe-area-top safe-area-bottom">
      <SEOHead
        title="Page Not Found | ZIVO"
        description="The page you're looking for doesn't exist. Explore flights, hotels, and car rentals on ZIVO."
        noIndex
      />

      {/* Sticky top bar with explicit Back arrow — was the #1 missing affordance */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 h-12 bg-background/85 backdrop-blur-md border-b border-border/50">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Go back"
          onClick={goBack}
          className="h-9 w-9 rounded-full -ml-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <p className="text-[13px] font-semibold text-muted-foreground">Not found</p>
      </header>

      <main className="flex flex-1 items-center justify-center pb-24 lg:pb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center px-4 max-w-md w-full"
        >
          {/* Bold 404 — IG-mono */}
          <h1 className="font-display text-[88px] sm:text-[112px] font-black leading-none tracking-tight text-foreground mb-2">
            404
          </h1>

          {/* Compass tile — clean secondary bg with hairline border */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-secondary border border-border flex items-center justify-center">
              <Compass className="w-7 h-7 text-foreground" />
            </div>
          </div>

          {/* Message */}
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
            Lost in the <span className="text-accent-foreground">journey?</span>
          </h2>
          <p className="text-base text-muted-foreground mb-2">
            The page you're looking for has taken a detour. Let's get you back on track.
          </p>

          {/* Show the broken URL so users know what they tried — was missing before */}
          <p className="text-[12px] font-mono text-muted-foreground/70 mb-7 truncate" title={location.pathname}>
            {location.pathname}
          </p>

          {/* Three primary actions: Back, Home, Help */}
          <div className="flex flex-col sm:flex-row gap-2.5 justify-center mb-10">
            <Button
              onClick={goBack}
              size="lg"
              className="h-12 px-6 text-base font-bold rounded-full gap-2 touch-manipulation active:scale-[0.98]"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base font-bold rounded-full gap-2 touch-manipulation active:scale-[0.98]"
            >
              <Link to="/">
                <Home className="w-4 h-4" />
                Home
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 px-6 text-base font-bold rounded-full gap-2 touch-manipulation active:scale-[0.98]"
            >
              <Link to="/help">
                <Search className="w-4 h-4" />
                Help
              </Link>
            </Button>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Popular destinations
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: "Feed", href: "/feed" },
                { label: "Reels", href: "/reels" },
                { label: "Find Flights", href: "/flights" },
                { label: "Hotels", href: "/hotels" },
                { label: "Rent a Car", href: "/cars" },
                { label: "Eats", href: "/eats" },
                { label: "Help Center", href: "/help" },
              ].map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="px-3.5 py-1.5 rounded-full bg-secondary border border-border text-[13px] font-medium text-foreground hover:bg-muted transition-colors touch-manipulation active:scale-95"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Mobile bottom nav — keeps the user inside the app instead of feeling stranded */}
      <ZivoMobileNav />
    </div>
  );
};

export default NotFound;
