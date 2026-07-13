import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Plane, Hotel, CarFront, Search, Calendar, Users, MapPin, ArrowRight,
  Shield, Building2, Car, Star, Loader2,
} from "lucide-react";
import AppLayout from "@/components/app/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TravelTab = "flights" | "hotels" | "cars";

const tabs: { id: TravelTab; label: string; icon: typeof Plane; gradient: string; color: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, gradient: "from-muted to-muted", color: "text-sky-500" },
  { id: "hotels", label: "Hotels", icon: Hotel, gradient: "from-amber-500 to-orange-500", color: "text-amber-500" },
  { id: "cars", label: "Cars", icon: CarFront, gradient: "from-emerald-500 to-teal-600", color: "text-emerald-500" },
];

interface FlightResult { id: string; airline: string; from: string; to: string; price: number; duration: string; flightNumber: string }
interface HotelResult { id: string; name: string; rating: number | null; price: number | null; city: string; country: string }
interface CarResult { id: string; category: string; model: string; make: string; price: number; seats: number }

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

const AppTravel = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TravelTab>("flights");
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  // Flight form state
  const [flightFrom, setFlightFrom] = useState("");
  const [flightTo, setFlightTo] = useState("");

  // Hotel form state
  const [hotelDest, setHotelDest] = useState("");

  // Car form state
  const [carCity, setCarCity] = useState("");

  // Results
  const [flightResults, setFlightResults] = useState<FlightResult[]>([]);
  const [hotelResults, setHotelResults] = useState<HotelResult[]>([]);
  const [carResults, setCarResults] = useState<CarResult[]>([]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && ["flights", "hotels", "cars"].includes(tab)) {
      setActiveTab(tab as TravelTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TravelTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setHasSearched(false);
  };

  const handleSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    try {
      if (activeTab === "flights") {
        let q = (supabase as any)
          .from("flights")
          .select("id, flight_number, airline_id, departure_airport, departure_city, arrival_airport, arrival_city, economy_price, duration_minutes, airlines(name, code)")
          .eq("is_active", true)
          .limit(6);
        if (flightFrom.trim()) q = q.ilike("departure_city", `%${flightFrom.trim()}%`);
        if (flightTo.trim()) q = q.ilike("arrival_city", `%${flightTo.trim()}%`);
        const { data, error } = await q.order("economy_price");
        if (error) throw error;
        setFlightResults(
          (data || []).map((r: any) => ({
            id: r.id,
            airline: r.airlines?.name ?? r.airlines?.code ?? "Unknown",
            from: r.departure_airport || r.departure_city,
            to: r.arrival_airport || r.arrival_city,
            price: r.economy_price,
            duration: fmtDuration(r.duration_minutes),
            flightNumber: r.flight_number,
          }))
        );
      } else if (activeTab === "hotels") {
        let q = (supabase as any)
          .from("hotels")
          .select("id, name, city, country, rating, star_rating")
          .limit(6);
        if (hotelDest.trim()) q = q.ilike("city", `%${hotelDest.trim()}%`);
        const { data, error } = await q.order("rating", { ascending: false });
        if (error) throw error;
        setHotelResults(
          (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            rating: r.rating ?? r.star_rating,
            price: null,
            city: r.city,
            country: r.country,
          }))
        );
      } else {
        let q = (supabase as any)
          .from("rental_cars")
          .select("id, make, model, category, daily_rate, seats, rating")
          .eq("is_available", true)
          .limit(6);
        if (carCity.trim()) q = q.ilike("location_address", `%${carCity.trim()}%`);
        const { data, error } = await q.order("daily_rate");
        if (error) throw error;
        setCarResults(
          (data || []).map((r: any) => ({
            id: r.id,
            category: r.category,
            model: r.model,
            make: r.make,
            price: r.daily_rate,
            seats: r.seats,
          }))
        );
      }
    } catch {
      toast.error("Search failed — please try again");
    }
    setLoading(false);
  };

  const handleBookNow = () => {
    import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe("https://www.skyscanner.com"));
  };

  const activeTabConfig = tabs.find(t => t.id === activeTab)!;

  const noResults =
    hasSearched && !loading &&
    ((activeTab === "flights" && flightResults.length === 0) ||
     (activeTab === "hotels" && hotelResults.length === 0) ||
     (activeTab === "cars" && carResults.length === 0));

  return (
    <AppLayout title="Travel">
      <div className="pb-4">
        {/* Tab Switcher */}
        <div className="px-4 pt-3 pb-2 sticky top-14 bg-background/95 backdrop-blur-xl z-10">
          <div className="flex gap-1.5 bg-muted/50 rounded-xl p-1">
            {tabs.map((tab) => (
              <button type="button"
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl transition-all duration-200 touch-manipulation",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Form */}
        <div className="p-4 space-y-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {activeTab === "flights" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        value={flightFrom}
                        onChange={(e) => setFlightFrom(e.target.value)}
                        placeholder="From city"
                        className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium"
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground" />
                      <Input
                        value={flightTo}
                        onChange={(e) => setFlightTo(e.target.value)}
                        placeholder="To city"
                        className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Departure" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Return" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" />
                    </div>
                  </div>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Passengers" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" defaultValue="1 Adult, Economy" />
                  </div>
                </>
              )}

              {activeTab === "hotels" && (
                <>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                    <Input
                      value={hotelDest}
                      onChange={(e) => setHotelDest(e.target.value)}
                      placeholder="Destination city"
                      className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Check-in" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Check-out" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" />
                    </div>
                  </div>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Guests & Rooms" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" defaultValue="2 Guests, 1 Room" />
                  </div>
                </>
              )}

              {activeTab === "cars" && (
                <>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                    <Input
                      value={carCity}
                      onChange={(e) => setCarCity(e.target.value)}
                      placeholder="Pickup city or address"
                      className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Pickup" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" />
                    </div>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input placeholder="Return" className="pl-9 h-12 rounded-xl bg-card border-border/40 font-medium" />
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <Button
            onClick={handleSearch}
            disabled={loading}
            className="w-full h-13 rounded-xl font-bold gap-2 text-base shadow-lg bg-ig-gradient text-white hover:opacity-90 border-0 transition-all duration-200"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            {loading ? "Searching…" : `Search ${activeTabConfig.label}`}
          </Button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="px-4 space-y-4"
            >
              {loading && (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {noResults && (
                <div className="py-10 text-center">
                  <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground">No results found</p>
                  <p className="text-xs text-muted-foreground mt-1">Try a different city or leave fields blank to see all available options.</p>
                </div>
              )}

              {!loading && (
                <>
                  {/* Partner disclosure */}
                  {(flightResults.length > 0 || hotelResults.length > 0 || carResults.length > 0) && (
                    <div className="py-2.5 px-4 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                      <p className="text-[11px] text-muted-foreground">
                        You'll be redirected to our trusted travel partner for booking.
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {activeTab === "flights" && flightResults.map((flight, i) => (
                      <motion.div
                        key={flight.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-2xl bg-card border border-border/40 space-y-3 hover:border-border hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-secondary">
                            <Plane className="w-5 h-5 text-foreground" />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{flight.airline}</p>
                            <p className="text-[11px] text-muted-foreground">{flight.flightNumber} · {flight.duration}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-bold">{flight.from}</span>
                          <div className="flex-1 mx-3 border-t border-dashed border-border relative">
                            <Plane className="w-3.5 h-3.5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card text-muted-foreground" />
                          </div>
                          <span className="font-bold">{flight.to}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-xl text-foreground">${flight.price}</p>
                          <Button size="sm" className="rounded-xl gap-1 text-primary-foreground shadow-md font-bold bg-foreground" onClick={handleBookNow}>
                            View Deal <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}

                    {activeTab === "hotels" && hotelResults.map((hotel, i) => (
                      <motion.div
                        key={hotel.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-2xl bg-card border border-border/40 space-y-3 hover:border-amber-500/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="flex gap-3">
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-8 h-8 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm truncate">{hotel.name}</h3>
                            <p className="text-[11px] text-muted-foreground">{hotel.city}, {hotel.country}</p>
                            {hotel.rating != null && (
                              <div className="flex items-center gap-0.5 mt-1">
                                {Array.from({ length: Math.min(5, Math.floor(hotel.rating)) }).map((_, j) => (
                                  <Star key={j} className="w-3 h-3 text-amber-400 fill-amber-400" />
                                ))}
                                <span className="text-xs font-bold ml-1">{hotel.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            {hotel.price != null ? (
                              <>
                                <p className="font-bold text-xl text-amber-500">${hotel.price}</p>
                                <p className="text-[10px] text-muted-foreground">per night</p>
                              </>
                            ) : (
                              <p className="text-sm text-muted-foreground">Contact for rates</p>
                            )}
                          </div>
                          <Button size="sm" className="rounded-xl gap-1 bg-ig-gradient text-white shadow-md font-bold border-0 hover:opacity-90" onClick={handleBookNow}>
                            View Deal <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}

                    {activeTab === "cars" && carResults.map((car, i) => (
                      <motion.div
                        key={car.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-2xl bg-card border border-border/40 space-y-3 hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
                      >
                        <div className="flex gap-3">
                          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10 flex items-center justify-center shrink-0">
                            <Car className="w-8 h-8 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">{car.category}</p>
                            <h3 className="font-bold text-sm">{car.make} {car.model}</h3>
                            <p className="text-[11px] text-muted-foreground">{car.seats} seats · Automatic</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <p className="font-bold text-xl text-emerald-500">${car.price}</p>
                            <p className="text-[10px] text-muted-foreground">per day</p>
                          </div>
                          <Button size="sm" className="rounded-xl gap-1 bg-ig-gradient text-white shadow-md font-bold border-0 hover:opacity-90" onClick={handleBookNow}>
                            View Deal <ArrowRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default AppTravel;
