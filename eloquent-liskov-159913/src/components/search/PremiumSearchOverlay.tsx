/**
 * Premium Search Overlay
 * 
 * Immersive full-screen search overlay with glassmorphism effects,
 * framer-motion animations, and unified search across Flights/Hotels/Cars.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Plane, Hotel, CarFront, Search, MapPin, 
  Calendar as CalendarIcon, Users, Clock, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

type SearchTab = "flights" | "hotels" | "cars";

interface RecentSearch {
  type: SearchTab;
  query: string;
  params: Record<string, string>;
  timestamp: number;
}

interface PremiumSearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: SearchTab;
  onSearch?: (params: URLSearchParams) => void;
}

const RECENT_SEARCHES_KEY = "zivo_recent_searches";
const MAX_RECENT_SEARCHES = 5;

// Animation variants
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" as const }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const }
  }
};

const cardVariants = {
  hidden: { 
    y: 60, 
    scale: 0.95, 
    opacity: 0 
  },
  visible: { 
    y: 0, 
    scale: 1, 
    opacity: 1,
    transition: { 
      duration: 0.4, 
      ease: [0.22, 1, 0.36, 1] as const,
      delay: 0.1
    }
  },
  exit: { 
    y: 30, 
    scale: 0.98, 
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" as const }
  }
};

const tabVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05 + 0.2, duration: 0.3 }
  })
};

const tabs: { id: SearchTab; label: string; icon: typeof Plane; color: string; bgColor: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, color: "text-flights", bgColor: "bg-flights" },
  { id: "hotels", label: "Hotels", icon: Hotel, color: "text-hotels", bgColor: "bg-hotels" },
  { id: "cars", label: "Cars", icon: CarFront, color: "text-cars", bgColor: "bg-cars" },
];

export default function PremiumSearchOverlay({
  isOpen,
  onClose,
  defaultTab = "flights",
  onSearch,
}: PremiumSearchOverlayProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<SearchTab>(defaultTab);
  const [destination, setDestination] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  
  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load recent searches:", e);
    }
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => inputRef.current?.focus(), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Save recent search
  const saveRecentSearch = useCallback((search: RecentSearch) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s.query !== search.query);
      const updated = [search, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save recent searches:", e);
      }
      return updated;
    });
  }, []);

  // Handle search submission
  const handleSearch = useCallback(() => {
    if (!destination.trim()) return;

    const displayQuery = destination.trim();
    let targetPath = "";
    const params = new URLSearchParams();

    // Build query based on tab
    switch (activeTab) {
      case "flights":
        // Navigate to flights page - user will refine there
        params.set("dest", displayQuery);
        params.set("depart", format(addDays(new Date(), 7), "yyyy-MM-dd"));
        targetPath = `/flights?${params.toString()}`;
        break;
      case "hotels":
        params.set("city", displayQuery.toLowerCase().replace(/\s+/g, "-"));
        params.set("checkin", format(addDays(new Date(), 7), "yyyy-MM-dd"));
        params.set("checkout", format(addDays(new Date(), 9), "yyyy-MM-dd"));
        targetPath = `/hotels?${params.toString()}`;
        break;
      case "cars":
        params.set("pickup", displayQuery);
        params.set("pickup_date", format(addDays(new Date(), 7), "yyyy-MM-dd"));
        params.set("dropoff_date", format(addDays(new Date(), 10), "yyyy-MM-dd"));
        targetPath = `/rent-car?${params.toString()}`;
        break;
    }

    // Save to recent searches
    saveRecentSearch({
      type: activeTab,
      query: displayQuery,
      params: Object.fromEntries(params),
      timestamp: Date.now(),
    });

    if (onSearch) {
      onSearch(params);
    }

    onClose();
    navigate(targetPath);
  }, [activeTab, destination, navigate, onClose, onSearch, saveRecentSearch]);

  // Handle recent search click
  const handleRecentClick = useCallback((search: RecentSearch) => {
    setActiveTab(search.type);
    setDestination(search.query);
    
    // Navigate directly
    const params = new URLSearchParams(search.params);
    let targetPath = "";
    
    switch (search.type) {
      case "flights":
        targetPath = `/flights?${params.toString()}`;
        break;
      case "hotels":
        targetPath = `/hotels?${params.toString()}`;
        break;
      case "cars":
        targetPath = `/rent-car?${params.toString()}`;
        break;
    }

    onClose();
    navigate(targetPath);
  }, [navigate, onClose]);

  // Get placeholder based on active tab
  const getPlaceholder = () => {
    switch (activeTab) {
      case "flights":
        return "City, airport, or destination";
      case "hotels":
        return "City, hotel, or landmark";
      case "cars":
        return "Airport or city for pickup";
      default:
        return "Where to?";
    }
  };

  // Get icon for recent search
  const getRecentIcon = (type: SearchTab) => {
    switch (type) {
      case "flights":
        return Plane;
      case "hotels":
        return Hotel;
      case "cars":
        return CarFront;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-start pt-16 sm:justify-center sm:pt-0 p-4 sm:p-6"
          initial="hidden"
          animate="visible"
          exit="exit"
          role="dialog"
          aria-modal="true"
          aria-label="Search overlay"
        >
          {/* Backdrop with blur */}
          <motion.div
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            variants={backdropVariants}
            onClick={onClose}
          />

          {/* Main Card */}
          <motion.div
            className="relative w-full max-w-2xl bg-card/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden"
            variants={cardVariants}
          >
            {/* Gradient accent bar */}
            <div className="h-1 bg-gradient-to-r from-flights via-hotels to-cars" />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                Where to next?
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full hover:bg-muted/80 active:scale-90 transition-all duration-200 touch-manipulation min-w-[44px] min-h-[44px]"
                aria-label="Close search"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Tab Selector */}
            <div className="px-6">
              <div className="flex gap-2 p-1 bg-muted/60 rounded-xl">
                {tabs.map((tab, i) => (
                  <motion.button
                    key={tab.id}
                    custom={i}
                    variants={tabVariants}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all duration-200 touch-manipulation active:scale-[0.97] min-h-[44px]",
                      activeTab === tab.id
                        ? `${tab.bgColor} text-primary-foreground shadow-lg`
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                    )}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div className="p-6 space-y-4">
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <MapPin className={cn(
                    "w-5 h-5",
                    tabs.find(t => t.id === activeTab)?.color
                  )} />
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder={getPlaceholder()}
                  className={cn(
                    "w-full h-14 pl-12 pr-4 rounded-xl bg-muted/50 border-2 border-transparent",
                    "text-lg font-medium placeholder:text-muted-foreground/60",
                    "focus:outline-none focus:border-primary/50 focus:bg-muted/80",
                    "transition-all duration-200"
                  )}
                />
              </div>

              {/* Quick Date/Traveler Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4" />
                  <span>Flexible dates</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>1 traveler</span>
                </div>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                disabled={!destination.trim()}
                className={cn(
                  "w-full h-14 rounded-xl text-lg font-bold transition-all duration-200",
                  "bg-gradient-to-r shadow-lg text-primary-foreground",
                  activeTab === "flights" && "from-flights to-sky-600 shadow-flights/30 hover:shadow-flights/50",
                  activeTab === "hotels" && "from-hotels to-amber-600 shadow-hotels/30 hover:shadow-hotels/50",
                  activeTab === "cars" && "from-cars to-teal-600 shadow-cars/30 hover:shadow-cars/50",
                  "hover:scale-[1.02] active:scale-[0.98]",
                  !destination.trim() && "opacity-60 cursor-not-allowed"
                )}
              >
                <Search className="w-5 h-5 mr-2" />
                Search ZIVO
              </Button>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="px-6 pb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">Recent searches</span>
                </div>
                <div className="space-y-2">
                  {recentSearches.slice(0, 3).map((search, i) => {
                    const Icon = getRecentIcon(search.type);
                    const tabInfo = tabs.find(t => t.id === search.type);
                    return (
                      <motion.button
                        key={`${search.query}-${search.timestamp}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 + 0.3 }}
                        onClick={() => handleRecentClick(search)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors text-left group"
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          tabInfo?.bgColor
                        )}>
                          <Icon className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{search.query}</p>
                          <p className="text-xs text-muted-foreground capitalize">{search.type}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Popular Destinations (when no recent searches) */}
            {recentSearches.length === 0 && (
              <div className="px-6 pb-6">
                <p className="text-sm font-medium text-muted-foreground mb-3">Popular destinations</p>
                <div className="flex flex-wrap gap-2">
                  {["New York", "Miami", "Los Angeles", "London", "Paris", "Tokyo"].map((city) => (
                    <button type="button"
                      key={city}
                      onClick={() => setDestination(city)}
                      className="px-4 py-2 rounded-full bg-muted/40 hover:bg-muted/60 text-sm font-medium transition-all duration-200 touch-manipulation active:scale-[0.95] min-h-[36px]"
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
