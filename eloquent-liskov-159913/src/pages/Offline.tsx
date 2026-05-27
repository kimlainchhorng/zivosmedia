/**
 * Offline Fallback Page
 * Shown when PWA is offline and page is not cached
 */
import { motion } from "framer-motion";
import { WifiOff, RefreshCw, Home, Plane, Hotel, Car, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Offline = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background orb */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Offline Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200 }}
        className="w-24 h-24 rounded-full bg-muted/50 flex items-center justify-center mb-6 relative z-10"
      >
        <WifiOff className="w-12 h-12 text-muted-foreground" />
      </motion.div>

      {/* Message */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative z-10">
        <h1 className="text-2xl font-bold mb-2">You're Offline</h1>
        <p className="text-muted-foreground mb-8 max-w-sm">
          It looks like you've lost your internet connection. Some features may not be available.
        </p>
      </motion.div>

      {/* Retry Button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }} className="relative z-10">
        <Button onClick={handleRetry} className="gap-2 rounded-xl mb-6">
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </motion.div>

      {/* Cached Pages Hint */}
      <div className="bg-muted/30 rounded-2xl p-6 max-w-sm">
        <p className="text-sm font-medium mb-4">Previously visited pages may still be available:</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button variant="ghost" size="sm" className="flex-col h-auto py-3 px-4 rounded-xl" onClick={() => navigate("/")}>
            <Home className="w-5 h-5 mb-1" />
            <span className="text-xs">Home</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-3 px-4 rounded-xl" onClick={() => navigate("/rides/hub")}>
            <Car className="w-5 h-5 mb-1 text-rides" />
            <span className="text-xs">Rides</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-3 px-4 rounded-xl" onClick={() => navigate("/eats")}>
            <UtensilsCrossed className="w-5 h-5 mb-1 text-eats" />
            <span className="text-xs">Eats</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-3 px-4 rounded-xl" onClick={() => navigate("/flights")}>
            <Plane className="w-5 h-5 mb-1 text-flights" />
            <span className="text-xs">Flights</span>
          </Button>
          <Button variant="ghost" size="sm" className="flex-col h-auto py-3 px-4 rounded-xl" onClick={() => navigate("/hotels")}>
            <Hotel className="w-5 h-5 mb-1 text-hotels" />
            <span className="text-xs">Hotels</span>
          </Button>
        </div>
      </div>

      {/* Disclosure */}
      <p className="text-xs text-muted-foreground mt-8 max-w-sm">
        Hizovo is not the merchant of record. Travel bookings are fulfilled by licensed third-party providers.
      </p>
    </div>
  );
};

export default Offline;
