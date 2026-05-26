/**
 * RideTravelIntegration — Multi-day trips, hotel pickups, airport transfers, itinerary sync
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plane, Hotel, Calendar, MapPin, Clock, ArrowRight, CheckCircle, Plus, Briefcase, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const upcomingTrips = [
  {
    id: 1,
    name: "NYC Business Trip",
    dates: "Mar 15–18",
    transfers: [
      { type: "Airport Pickup", time: "Mar 15, 2:30 PM", from: "JFK Terminal 4", to: "Marriott Midtown", status: "confirmed" },
      { type: "Hotel → Meeting", time: "Mar 16, 9:00 AM", from: "Marriott Midtown", to: "WeWork Bryant Park", status: "scheduled" },
      { type: "Airport Drop-off", time: "Mar 18, 11:00 AM", from: "Marriott Midtown", to: "JFK Terminal 4", status: "scheduled" },
    ],
  },
  {
    id: 2,
    name: "Miami Vacation",
    dates: "Apr 2–7",
    transfers: [
      { type: "Airport Pickup", time: "Apr 2, 4:00 PM", from: "MIA Airport", to: "South Beach Hotel", status: "pending" },
      { type: "Airport Drop-off", time: "Apr 7, 10:00 AM", from: "South Beach Hotel", to: "MIA Airport", status: "pending" },
    ],
  },
];

const airportServices = [
  { id: "meet-greet", name: "Meet & Greet", desc: "Driver waits at arrivals with name sign", price: "+$15", popular: true },
  { id: "flight-track", name: "Flight Tracking", desc: "Auto-adjusts pickup for delays", price: "Free", popular: true },
  { id: "luggage", name: "Extra Luggage", desc: "SUV for 4+ bags", price: "+$10", popular: false },
  { id: "child-seat", name: "Child Seat", desc: "Pre-installed car seat", price: "+$8", popular: false },
];

type View = "trips" | "airport" | "sync";

const SYNC_KEY = "zivo_travel_synced";

export default function RideTravelIntegration() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("trips");
  const [selectedServices, setSelectedServices] = useState<string[]>(["flight-track"]);
  const [connectedSources, setConnectedSources] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SYNC_KEY) || '["ZIVO Flights","ZIVO Hotels"]'); } catch { return ["ZIVO Flights", "ZIVO Hotels"]; }
  });

  const views: { id: View; label: string; icon: typeof Plane }[] = [
    { id: "trips", label: "My Trips", icon: Briefcase },
    { id: "airport", label: "Airport", icon: Plane },
    { id: "sync", label: "Sync", icon: Calendar },
  ];

  const toggleService = (id: string) => {
    setSelectedServices((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleSource = (name: string) => {
    setConnectedSources(prev => {
      const next = prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name];
      localStorage.setItem(SYNC_KEY, JSON.stringify(next));
      toast.success(prev.includes(name) ? `${name} disconnected` : `${name} connected!`);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/30 rounded-xl p-1">
        {views.map((v) => {
          const Icon = v.icon;
          return (
            <button type="button"
              key={v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all",
                view === v.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {v.label}
            </button>
          );
        })}
      </div>

      {view === "trips" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {upcomingTrips.map((trip) => (
            <div key={trip.id} className="bg-card rounded-xl border border-border/30 overflow-hidden">
              <div className="p-4 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{trip.name}</p>
                  <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{trip.dates}</span>
                </div>
              </div>
              <div className="divide-y divide-border/20">
                {trip.transfers.map((transfer, i) => (
                  <div key={i} className="p-3 flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                      transfer.status === "confirmed" ? "bg-green-500/15" : transfer.status === "scheduled" ? "bg-primary/15" : "bg-muted/40"
                    )}>
                      {transfer.type.includes("Airport") ? (
                        <Plane className="w-4 h-4 text-primary" />
                      ) : (
                        <Navigation className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-foreground">{transfer.type}</p>
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-bold",
                          transfer.status === "confirmed" ? "bg-green-500/15 text-green-600" :
                          transfer.status === "scheduled" ? "bg-primary/15 text-primary" :
                          "bg-muted text-muted-foreground"
                        )}>{transfer.status}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{transfer.time}</p>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{transfer.from}</span>
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        <span className="truncate">{transfer.to}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button type="button"
            onClick={() => navigate("/rides/hub", { state: { planTrip: true } })}
            className="w-full py-2.5 bg-primary/10 rounded-xl text-sm font-bold text-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Plan New Trip Transfers
          </button>
        </motion.div>
      )}

      {view === "airport" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-sm font-bold text-foreground">Airport Transfer Services</p>
          {airportServices.map((svc) => {
            const selected = selectedServices.includes(svc.id);
            return (
              <motion.button
                key={svc.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleService(svc.id)}
                className={cn(
                  "w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3",
                  selected ? "bg-primary/10 border-primary/30" : "bg-card border-border/30"
                )}
              >
                <div className={cn("w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "bg-primary border-primary" : "border-muted-foreground/30")}>
                  {selected && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-foreground">{svc.name}</p>
                    {svc.popular && <span className="text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">Popular</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{svc.desc}</p>
                </div>
                <span className="text-xs font-bold text-foreground">{svc.price}</span>
              </motion.button>
            );
          })}
        </motion.div>
      )}

      {view === "sync" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="bg-card rounded-xl p-4 border border-border/30 space-y-3">
            <p className="text-sm font-bold text-foreground">Itinerary Sync</p>
            <p className="text-xs text-muted-foreground">Connect your travel bookings to auto-schedule ride transfers</p>
            {[
              { name: "ZIVO Flights", connected: true, icon: Plane },
              { name: "ZIVO Hotels", connected: true, icon: Hotel },
              { name: "Google Calendar", connected: false, icon: Calendar },
            ].map((source) => {
              const Icon = source.icon;
              return (
                <div key={source.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{source.name}</span>
                  </div>
                  <button type="button"
                    onClick={() => toggleSource(source.name)}
                    className={cn(
                      "text-xs font-bold px-3 py-1 rounded-lg",
                      connectedSources.includes(source.name) ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"
                    )}
                  >
                    {connectedSources.includes(source.name) ? "Connected ✓" : "Connect"}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="bg-muted/20 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-bold text-foreground">Auto-Schedule:</span> When you book a flight or hotel on ZIVO, ride transfers are automatically suggested based on your check-in/out times.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
