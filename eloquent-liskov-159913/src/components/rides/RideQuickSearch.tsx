/**
 * RideQuickSearch — Enhanced booking with address autocomplete, vehicle selection, fare breakdown
 */
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search, Clock, Star, Navigation, ArrowRight, Home, Building2, Plane, ChevronRight, Sparkles, History, Zap, Car, Crown, Users, Shield, ChevronDown, Route, DollarSign, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const savedPlaces = [
  { id: "home", name: "Home", address: "123 Main St, Apt 4B", icon: Home, color: "text-emerald-500" },
  { id: "work", name: "Work", address: "400 Tech Blvd, Floor 12", icon: Building2, color: "text-sky-500" },
  { id: "airport", name: "Airport", address: "JFK Terminal 4", icon: Plane, color: "text-violet-500" },
];

const autocompleteResults = [
  { id: "a1", primary: "Downtown Convention Center", secondary: "100 Convention Way, Downtown" },
  { id: "a2", primary: "Downtown Gym & Fitness", secondary: "55 Fitness Ave, Downtown" },
  { id: "a3", primary: "Downtown Medical Center", secondary: "200 Health Blvd, Suite 300" },
  { id: "a4", primary: "Downtown Public Library", secondary: "77 Knowledge St" },
];

const recentDestinations = [
  { id: "1", address: "Downtown Gym, 55 Fitness Ave", time: "Yesterday, 6:30 PM", rides: 8 },
  { id: "2", address: "Grand Hotel, 200 Park Ave", time: "3 days ago", rides: 2 },
  { id: "3", address: "Central Mall, 88 Shopping Dr", time: "Last week", rides: 5 },
];

const vehicleOptions = [
  { id: "economy", name: "Economy", desc: "Affordable everyday rides", eta: "3 min", price: "$8-12", icon: Car, surge: false, capacity: 4, color: "text-foreground" },
  { id: "premium", name: "Premium", desc: "Extra comfort & space", eta: "5 min", price: "$15-22", icon: Crown, surge: false, capacity: 4, color: "text-amber-500" },
  { id: "xl", name: "XL", desc: "Fits up to 6 passengers", eta: "7 min", price: "$18-28", icon: Users, surge: false, capacity: 6, color: "text-sky-500" },
  { id: "elite", name: "Elite", desc: "Luxury vehicles", eta: "8 min", price: "$35-55", icon: Shield, surge: true, capacity: 4, color: "text-violet-500" },
];

type BookingStep = "search" | "vehicle" | "confirm";

export default function RideQuickSearch() {
  const [step, setStep] = useState<BookingStep>("search");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [focusedInput, setFocusedInput] = useState<"pickup" | "destination" | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState("economy");
  const [searchQuery, setSearchQuery] = useState("");

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const filteredSuggestions = autocompleteResults.filter(r =>
    r.primary.toLowerCase().includes((focusedInput === "pickup" ? pickup : destination).toLowerCase())
  );

  const selectAddress = (address: string) => {
    if (focusedInput === "pickup") setPickup(address);
    else setDestination(address);
    setFocusedInput(null);
  };

  const proceedToVehicle = () => {
    if (!pickup || !destination) { toast.error("Enter pickup and destination"); return; }
    setStep("vehicle");
  };

  const proceedToConfirm = () => setStep("confirm");

  const currentVehicle = vehicleOptions.find(v => v.id === selectedVehicle)!;

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        {step === "search" && (
          <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="text-lg font-black text-foreground">{greeting} 👋</h2>
              <p className="text-xs text-muted-foreground">Where are you heading?</p>
            </div>

            {/* Route inputs */}
            <div className="rounded-2xl bg-card border border-border/40 p-3 space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-500/30" />
                  <div className="w-0.5 h-8 bg-border/60" />
                  <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-500/30" />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Pickup location"
                    value={pickup}
                    onChange={e => setPickup(e.target.value)}
                    onFocus={() => setFocusedInput("pickup")}
                    className="h-11 rounded-xl text-sm font-medium bg-muted/20 border-0 focus:bg-muted/40"
                  />
                  <Input
                    placeholder="Where to?"
                    value={destination}
                    onChange={e => setDestination(e.target.value)}
                    onFocus={() => setFocusedInput("destination")}
                    className="h-11 rounded-xl text-sm font-medium bg-muted/20 border-0 focus:bg-muted/40"
                  />
                </div>
              </div>
            </div>

            {/* Autocomplete dropdown */}
            <AnimatePresence>
              {focusedInput && (pickup || destination) && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="rounded-2xl bg-card border border-border/40 overflow-hidden shadow-lg">
                  {filteredSuggestions.map((s, i) => (
                    <button type="button" key={s.id} onClick={() => selectAddress(s.primary)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors border-b border-border/20 last:border-0">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-foreground">{s.primary}</p>
                        <p className="text-[10px] text-muted-foreground">{s.secondary}</p>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved places */}
            {!focusedInput && (
              <>
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Saved Places</h3>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
                    {savedPlaces.map(place => {
                      const Icon = place.icon;
                      return (
                        <button type="button" key={place.id} onClick={() => { setDestination(place.address); toast.success(`Destination: ${place.name}`); }} className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-card border border-border/40 shrink-0 active:scale-[0.97] transition-transform">
                          <Icon className={cn("w-4 h-4", place.color)} />
                          <div className="text-left">
                            <p className="text-xs font-bold text-foreground">{place.name}</p>
                            <p className="text-[9px] text-muted-foreground truncate max-w-[120px]">{place.address}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recent */}
                <div className="space-y-2">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-1">
                    <History className="w-3 h-3" /> Recent
                  </h3>
                  {recentDestinations.map(dest => (
                    <button type="button" key={dest.id} onClick={() => { setDestination(dest.address.split(",")[0]); toast.success(`Destination: ${dest.address.split(",")[0]}`); }} className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40 text-left hover:border-primary/20 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{dest.address}</p>
                        <p className="text-[10px] text-muted-foreground">{dest.time} · {dest.rides} trips</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Continue button */}
            {pickup && destination && !focusedInput && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Button className="w-full h-12 rounded-2xl text-sm font-bold gap-2" onClick={proceedToVehicle}>
                  <Route className="w-4 h-4" /> Choose Your Ride
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}

        {step === "vehicle" && (
          <motion.div key="vehicle" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            {/* Route summary */}
            <div className="rounded-2xl bg-card border border-border/40 p-3">
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="w-0.5 h-5 bg-border/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{pickup}</p>
                  <p className="text-xs text-muted-foreground truncate">{destination}</p>
                </div>
                <button type="button" onClick={() => setStep("search")} className="text-[10px] text-primary font-bold">Edit</button>
              </div>
            </div>

            {/* Vehicle selection */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Choose a ride</h3>
              {vehicleOptions.map((v, i) => {
                const Icon = v.icon;
                const selected = selectedVehicle === v.id;
                return (
                  <motion.button
                    key={v.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => setSelectedVehicle(v.id)}
                    className={cn("w-full flex items-center gap-3 p-3.5 rounded-2xl border text-left transition-all", selected ? "border-primary/40 bg-primary/5 shadow-md" : "border-border/40 bg-card hover:border-primary/20")}
                  >
                    <motion.div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", selected ? "bg-primary/15" : "bg-muted/30")} animate={selected ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.3 }}>
                      <Icon className={cn("w-6 h-6", selected ? "text-primary" : v.color)} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">{v.name}</span>
                        {v.surge && <Badge className="bg-amber-500/10 text-amber-500 border-0 text-[8px] font-bold">SURGE</Badge>}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{v.desc} · {v.capacity} seats</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-foreground">{v.price}</p>
                      <p className="text-[10px] text-muted-foreground">{v.eta} away</p>
                    </div>
                    {selected && <CheckCircle className="w-5 h-5 text-primary shrink-0" />}
                  </motion.button>
                );
              })}
            </div>

            <Button className="w-full h-12 rounded-2xl text-sm font-bold gap-2" onClick={proceedToConfirm}>
              <DollarSign className="w-4 h-4" /> Review Fare
            </Button>
          </motion.div>
        )}

        {step === "confirm" && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {/* Fare breakdown */}
            <div className="rounded-2xl bg-card border border-border/40 p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Fare Breakdown</h3>

              <div className="space-y-2">
                {[
                  { label: "Base fare", value: "$3.00" },
                  { label: "Distance (4.2 mi)", value: "$6.30" },
                  { label: "Time (12 min)", value: "$2.40" },
                  { label: "Platform fee", value: "$1.50" },
                  ...(currentVehicle.surge ? [{ label: "Surge (1.3x)", value: "$3.95" }] : []),
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className="text-xs font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
                <div className="border-t border-border/40 pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground">Estimated Total</span>
                  <span className="text-lg font-black text-primary">{currentVehicle.price.split("-")[0]}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/20 border border-border/30">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[10px] text-muted-foreground">Final price confirmed when trip ends. No hidden fees.</span>
              </div>
            </div>

            {/* Route + vehicle summary */}
            <div className="rounded-2xl bg-muted/20 border border-border/30 p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-foreground font-medium truncate">{pickup}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-foreground font-medium truncate">{destination}</span>
              </div>
              <div className="flex items-center gap-2 text-xs pt-1 border-t border-border/30 mt-1">
                <currentVehicle.icon className={cn("w-4 h-4", currentVehicle.color)} />
                <span className="font-bold text-foreground">{currentVehicle.name}</span>
                <span className="text-muted-foreground">· {currentVehicle.eta} away</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-12 rounded-2xl text-sm font-bold" onClick={() => setStep("vehicle")}>Back</Button>
              <Button className="flex-1 h-12 rounded-2xl text-sm font-bold gap-2" onClick={() => { toast.success("Ride confirmed! Finding your driver..."); setTimeout(() => setStep("search"), 2000); }}>
                <Zap className="w-4 h-4" /> Confirm Ride
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
