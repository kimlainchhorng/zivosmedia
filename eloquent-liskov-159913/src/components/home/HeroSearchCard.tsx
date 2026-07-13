/**
 * HeroSearchCard - 3D Spatial floating tabbed search card
 */
import { useState } from "react";
import Plane from "lucide-react/dist/esm/icons/plane";
import Hotel from "lucide-react/dist/esm/icons/hotel";
import CarFront from "lucide-react/dist/esm/icons/car-front";
import Car from "lucide-react/dist/esm/icons/car";
import UtensilsCrossed from "lucide-react/dist/esm/icons/utensils-crossed";
import Search from "lucide-react/dist/esm/icons/search";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Users from "lucide-react/dist/esm/icons/users";
import Clock from "lucide-react/dist/esm/icons/clock";
import ArrowLeftRight from "lucide-react/dist/esm/icons/arrow-left-right";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import tabFlightsBg from "@/assets/tab-flights-bg.jpg";
import tabHotelsBg from "@/assets/tab-hotels-bg.jpg";
import tabCarsBg from "@/assets/tab-cars-bg.jpg";
import tabRidesBg from "@/assets/tab-rides-bg.jpg";
import tabEatsBg from "@/assets/tab-eats-bg.jpg";

const tabs = [
  { id: "flights", label: "Flights", icon: Plane, color: "text-[hsl(var(--flights))]", cssVar: "var(--flights)", bg: tabFlightsBg },
  { id: "hotels", label: "Hotels", icon: Hotel, color: "text-[hsl(var(--hotels))]", cssVar: "var(--hotels)", bg: tabHotelsBg },
  { id: "cars", label: "Cars", icon: CarFront, color: "text-[hsl(var(--cars))]", cssVar: "var(--cars)", bg: tabCarsBg },
  { id: "rides", label: "Rides", icon: Car, color: "text-[hsl(var(--rides))]", cssVar: "var(--rides)", bg: tabRidesBg },
  { id: "eats", label: "Eats", icon: UtensilsCrossed, color: "text-[hsl(var(--eats))]", cssVar: "var(--eats)", bg: tabEatsBg },
];

export default function HeroSearchCard() {
  const [activeTab, setActiveTab] = useState("flights");
  const [tripType, setTripType] = useState<"round" | "oneway">("round");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (activeTab === "flights") { navigate("/flights"); return; }
    const routes: Record<string, string> = { hotels: "/hotels", cars: "/rent-car", rides: "/rides/hub", eats: "/eats" };
    toast.success(`Searching ${activeTab}...`, { duration: 1500 });
    navigate(routes[activeTab] || "/");
  };

  return (
    <section id="hero-search-card" className="relative z-20 -mt-8 sm:-mt-12 pb-8 sm:pb-12" aria-label="Search flights, hotels, cars, rides, and restaurants">
      <div className="container mx-auto px-4" style={{ perspective: "1200px" }}>
        <motion.div
          initial={{ opacity: 0, y: 30, rotateX: -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="max-w-4xl mx-auto rounded-3xl overflow-hidden relative"
          style={{
            transformStyle: "preserve-3d",
            background: "hsl(var(--card) / 0.75)",
            backdropFilter: "blur(40px) saturate(1.5)",
            border: "1px solid hsl(var(--border) / 0.3)",
            boxShadow: [
              "0 30px 80px -20px hsl(var(--foreground) / 0.12)",
              "0 8px 24px -4px hsl(var(--primary) / 0.06)",
              "inset 0 1px 1px hsl(var(--background) / 0.6)",
              "inset 0 -1px 2px hsl(var(--foreground) / 0.03)",
            ].join(", "),
          }}
        >
          {/* Holographic top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[3px]"
            style={{
              background: "linear-gradient(90deg, hsl(var(--flights)), hsl(var(--hotels)), hsl(var(--cars)), hsl(var(--rides)), hsl(var(--eats)))",
              opacity: 0.7,
            }}
          />

          {/* Glass shine overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, hsl(var(--background) / 0.15) 0%, transparent 40%, transparent 60%, hsl(var(--background) / 0.08) 100%)",
            }}
          />

          {/* Tabs — 3D raised */}
          <div className="flex border-b border-border/30 overflow-x-auto scrollbar-hide relative" role="tablist" aria-label="Service type">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`search-panel-${tab.id}`}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  className={cn(
                    "flex items-center gap-2 px-5 py-4 text-sm font-semibold whitespace-nowrap transition-all duration-300 flex-1 justify-center min-w-0 relative touch-manipulation min-h-[48px] overflow-hidden rounded-xl m-1",
                    !isActive && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {/* Background image */}
                  <img
                    src={tab.bg}
                    alt=""
                    width={120}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-cover rounded-xl"
                    style={{
                      opacity: isActive ? 0.7 : 0.15,
                      transition: "opacity 0.3s ease",
                    }}
                  />
                  {/* Color overlay */}
                  <span
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, hsl(${tab.cssVar} / 0.5), hsl(${tab.cssVar} / 0.3))`
                        : "transparent",
                      transition: "background 0.3s ease",
                    }}
                  />
                  {/* Border */}
                  <span
                    className="absolute inset-0 rounded-xl pointer-events-none"
                    style={{
                      border: `1.5px solid hsl(${tab.cssVar} / ${isActive ? "0.5" : "0.15"})`,
                      boxShadow: isActive
                        ? `0 4px 12px -2px hsl(${tab.cssVar} / 0.3), inset 0 1px 2px rgba(255,255,255,0.15)`
                        : "none",
                    }}
                  />
                  <motion.div
                    className="relative z-10"
                    animate={{
                      scale: isActive ? 1.15 : 1,
                      rotate: isActive ? -8 : 0,
                      y: isActive ? -1 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <tab.icon
                      className="w-4 h-4 shrink-0"
                      style={{
                        color: isActive ? "white" : `hsl(${tab.cssVar})`,
                        filter: isActive ? "drop-shadow(0 1px 3px rgba(0,0,0,0.4))" : "none",
                      }}
                    />
                  </motion.div>
                  <span
                    className="hidden sm:inline relative z-10"
                    style={{
                      color: isActive ? "white" : undefined,
                      textShadow: isActive ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                    }}
                  >
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* Search Forms — 3D inner */}
          <div id={`search-panel-${activeTab}`} role="tabpanel" aria-label={`${activeTab} search`} className="p-5 sm:p-6">
            {activeTab === "flights" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {(["round", "oneway"] as const).map((type) => (
                    <motion.button
                      key={type}
                      onClick={() => setTripType(type)}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        tripType === type ? "chip-active" : "chip-inactive",
                        "text-xs px-4 py-1.5 touch-manipulation min-h-[36px] rounded-full transition-all duration-200"
                      )}
                      style={tripType === type ? {
                        boxShadow: "0 2px 8px -2px hsl(var(--primary) / 0.3), inset 0 1px 1px hsl(var(--background) / 0.15)",
                      } : {}}
                    >
                      {type === "round" ? "Round Trip" : "One Way"}
                    </motion.button>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <InputField icon={MapPin} placeholder="Where from?" />
                  <div className="relative">
                    <InputField icon={MapPin} placeholder="Where to?" />
                    <button type="button"
                      className="absolute -left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-card border border-border/40 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 hover:rotate-180 transition-all duration-300 z-10 hidden sm:flex hover:scale-110"
                      style={{ boxShadow: "0 2px 8px -2px hsl(var(--foreground) / 0.08)" }}
                      aria-label="Swap origin and destination"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <InputField icon={Calendar} placeholder="Dates" />
                  <InputField icon={Users} placeholder="Passengers" />
                  <SearchButton onClick={handleSearch} />
                </div>
              </div>
            )}
            {activeTab === "hotels" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <InputField icon={MapPin} placeholder="City, hotel, or destination" />
                <InputField icon={Calendar} placeholder="Check-in / Check-out" />
                <InputField icon={Users} placeholder="Guests & rooms" />
                <SearchButton onClick={handleSearch} />
              </div>
            )}
            {activeTab === "cars" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <InputField icon={MapPin} placeholder="Pickup location" />
                <InputField icon={Calendar} placeholder="Pickup date" />
                <InputField icon={Clock} placeholder="Return date" />
                <SearchButton onClick={handleSearch} />
              </div>
            )}
            {activeTab === "rides" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InputField icon={MapPin} placeholder="Where are you?" iconClass="text-primary" />
                <InputField icon={MapPin} placeholder="Where are you going?" iconClass="text-destructive" />
                <SearchButton onClick={handleSearch} />
              </div>
            )}
            {activeTab === "eats" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <InputField icon={MapPin} placeholder="Enter your delivery address" />
                </div>
                <SearchButton onClick={handleSearch} />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function InputField({ icon: Icon, placeholder, iconClass }: { icon: any; placeholder: string; iconClass?: string }) {
  return (
    <div className="relative group">
      <Icon className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary", iconClass)} />
      <Input
        placeholder={placeholder}
        className="pl-10 h-12 rounded-xl border-border/40 transition-all duration-300 focus:border-primary/40"
        style={{
          background: "hsl(var(--muted) / 0.25)",
          boxShadow: "inset 0 1px 3px hsl(var(--foreground) / 0.03)",
        }}
      />
    </div>
  );
}

function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.div whileHover={{ y: -2, scale: 1.02 }} whileTap={{ scale: 0.97 }}>
      <Button
        onClick={onClick}
        className="h-12 w-full rounded-xl font-bold gap-2 text-base transition-all duration-300"
        style={{
          boxShadow: "0 4px 16px -2px hsl(var(--primary) / 0.35), inset 0 1px 1px hsl(var(--background) / 0.15)",
        }}
      >
        <Search className="w-4 h-4" /> Search
      </Button>
    </motion.div>
  );
}
