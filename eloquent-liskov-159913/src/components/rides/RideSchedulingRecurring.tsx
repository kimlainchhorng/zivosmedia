/**
 * RideSchedulingRecurring — Scheduled rides, recurring commutes, calendar sync, multi-stop planning
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Repeat, MapPin, Plus, Trash2, Bell, CheckCircle, CalendarDays, ArrowRight, RotateCcw, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ScheduledRide {
  id: string;
  label: string;
  from: string;
  to: string;
  time: string;
  days: string[];
  isRecurring: boolean;
  isActive: boolean;
  nextRide: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  synced: boolean;
  rideLinked: boolean;
}

const SYNCED_CALS_KEY = "zivo_synced_calendars";

export default function RideSchedulingRecurring() {
  const navigate = useNavigate();
  const [section, setSection] = useState<"schedule" | "recurring" | "calendar" | "multi">("schedule");
  const [syncedCals, setSyncedCals] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(SYNCED_CALS_KEY) || '["Google"]'); } catch { return ["Google"]; }
  });

  const toggleCalSync = (cal: string) => {
    setSyncedCals(prev => {
      const next = prev.includes(cal) ? prev.filter(c => c !== cal) : [...prev, cal];
      localStorage.setItem(SYNCED_CALS_KEY, JSON.stringify(next));
      toast.success(prev.includes(cal) ? `${cal} Calendar disconnected` : `${cal} Calendar synced!`);
      return next;
    });
  };

  const [scheduledRides, setScheduledRides] = useState<ScheduledRide[]>([
    { id: "1", label: "Morning Commute", from: "Home", to: "Office — 5th Ave", time: "8:15 AM", days: ["Mon", "Tue", "Wed", "Thu", "Fri"], isRecurring: true, isActive: true, nextRide: "Tomorrow, 8:15 AM" },
    { id: "2", label: "Gym Pickup", from: "FitLife Gym", to: "Home", time: "7:00 PM", days: ["Mon", "Wed", "Fri"], isRecurring: true, isActive: true, nextRide: "Mon, 7:00 PM" },
    { id: "3", label: "Airport Transfer", from: "Home", to: "JFK Terminal 4", time: "5:30 AM", days: [], isRecurring: false, isActive: true, nextRide: "Mar 15, 5:30 AM" },
  ]);

  const [calendarEvents] = useState<CalendarEvent[]>([
    { id: "1", title: "Team Standup", date: "Mar 10", time: "9:00 AM", synced: true, rideLinked: true },
    { id: "2", title: "Dentist Appointment", date: "Mar 12", time: "2:30 PM", synced: true, rideLinked: false },
    { id: "3", title: "Flight to Miami", date: "Mar 15", time: "8:00 AM", synced: true, rideLinked: true },
    { id: "4", title: "Dinner Reservation", date: "Mar 16", time: "7:00 PM", synced: false, rideLinked: false },
  ]);

  const [multiStops, setMultiStops] = useState([
    { id: "1", address: "Home — 123 Main St", type: "pickup" },
    { id: "2", address: "Coffee Shop — Elm St", type: "stop" },
    { id: "3", address: "Office — 5th Ave", type: "dropoff" },
  ]);

  const sections = [
    { id: "schedule" as const, label: "Schedule", icon: Clock },
    { id: "recurring" as const, label: "Recurring", icon: Repeat },
    { id: "calendar" as const, label: "Calendar", icon: CalendarDays },
    { id: "multi" as const, label: "Multi-Stop", icon: Navigation },
  ];

  const toggleRide = (id: string) => {
    setScheduledRides(prev => prev.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
    toast.success("Ride schedule updated");
  };

  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-4">
      {/* Section tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted/30">
        {sections.map(s => {
          const Icon = s.icon;
          return (
            <button type="button" key={s.id} onClick={() => setSection(s.id)} className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all", section === s.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <Icon className="w-3.5 h-3.5" /> {s.label}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={section} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}>

          {/* Schedule a Ride */}
          {section === "schedule" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-4">
                <h3 className="text-sm font-bold text-foreground">Schedule a Ride</h3>
                <p className="text-xs text-muted-foreground">Book rides ahead of time — never be late</p>

                {/* Quick schedule options */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Tomorrow AM", time: "8:00 AM", icon: "🌅" },
                    { label: "Tomorrow PM", time: "6:00 PM", icon: "🌆" },
                    { label: "This Weekend", time: "10:00 AM", icon: "📅" },
                    { label: "Custom Time", time: "Pick", icon: "⏰" },
                  ].map(opt => (
                    <button type="button" key={opt.label} onClick={() => navigate("/rides/hub", { state: { scheduledTime: opt.time, label: opt.label } })} className="flex items-center gap-2.5 p-3 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 transition-colors active:scale-[0.98]">
                      <span className="text-lg">{opt.icon}</span>
                      <div className="text-left">
                        <p className="text-xs font-bold text-foreground">{opt.label}</p>
                        <p className="text-[10px] text-muted-foreground">{opt.time}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Upcoming scheduled rides */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Upcoming</h4>
                {scheduledRides.filter(r => r.isActive).map(ride => (
                  <div key={ride.id} className="rounded-2xl bg-card border border-border/40 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-bold text-foreground">{ride.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{ride.nextRide}</p>
                      </div>
                      {ride.isRecurring && <Badge variant="secondary" className="text-[8px] font-bold gap-0.5"><Repeat className="w-2.5 h-2.5" /> Recurring</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 text-primary" />
                      <span>{ride.from}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span>{ride.to}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-bold text-foreground">{ride.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recurring Commutes */}
          {section === "recurring" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 p-4 text-center">
                <Repeat className="w-8 h-8 text-primary mx-auto mb-2" />
                <h3 className="text-sm font-bold text-foreground">Recurring Rides</h3>
                <p className="text-xs text-muted-foreground mt-1">Set it and forget it — auto-scheduled rides</p>
              </div>

              {scheduledRides.filter(r => r.isRecurring).map(ride => (
                <div key={ride.id} className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{ride.label}</p>
                      <p className="text-[10px] text-muted-foreground">{ride.from} → {ride.to}</p>
                    </div>
                    <Switch checked={ride.isActive} onCheckedChange={() => toggleRide(ride.id)} />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-bold text-foreground">{ride.time}</span>
                  </div>

                  {/* Day selector */}
                  <div className="flex gap-1">
                    {allDays.map(day => (
                      <div key={day} className={cn("flex-1 text-center py-1.5 rounded-lg text-[9px] font-bold transition-colors", ride.days.includes(day) ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground")}>
                        {day.slice(0, 1)}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Bell className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground">Reminder 15 min before</span>
                  </div>
                </div>
              ))}

              <Button className="w-full h-11 rounded-xl text-sm font-bold gap-2" variant="outline" onClick={() => navigate("/rides/hub", { state: { recurring: true } })}>
                <Plus className="w-4 h-4" /> Add Recurring Ride
              </Button>
            </div>
          )}

          {/* Calendar Sync */}
          {section === "calendar" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground">Calendar Sync</h3>
                  <Badge variant="default" className="text-[8px] font-bold gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Connected</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Auto-suggest rides based on your calendar events</p>

                <div className="flex gap-2">
                  {["Google", "Apple", "Outlook"].map(cal => (
                    <button type="button" key={cal} onClick={() => toggleCalSync(cal)} className={cn("flex-1 py-2 rounded-xl text-xs font-bold border transition-colors", syncedCals.includes(cal) ? "border-primary bg-primary/5 text-primary" : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40")}>
                      {cal}{syncedCals.includes(cal) ? " ✓" : ""}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar events */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Upcoming Events</h4>
                {calendarEvents.map(evt => (
                  <div key={evt.id} className="rounded-2xl bg-card border border-border/40 p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-bold text-foreground">{evt.title}</p>
                        <p className="text-[10px] text-muted-foreground">{evt.date} at {evt.time}</p>
                      </div>
                      {evt.rideLinked ? (
                        <Badge className="text-[8px] font-bold gap-0.5"><CheckCircle className="w-2.5 h-2.5" /> Ride Set</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold rounded-lg gap-1" onClick={() => navigate("/rides/hub", { state: { scheduledTime: evt.time, label: evt.title } })}>
                          <Plus className="w-3 h-3" /> Add Ride
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Stop Planning */}
          {section === "multi" && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
                <h3 className="text-sm font-bold text-foreground">Multi-Stop Route</h3>
                <p className="text-xs text-muted-foreground">Plan rides with multiple stops along the way</p>

                <div className="space-y-2">
                  {multiStops.map((stop, i) => (
                    <div key={stop.id} className="flex items-center gap-3">
                      {/* Timeline dot */}
                      <div className="flex flex-col items-center">
                        <div className={cn("w-3 h-3 rounded-full border-2", stop.type === "pickup" ? "border-primary bg-primary/20" : stop.type === "dropoff" ? "border-destructive bg-destructive/20" : "border-accent bg-accent/20")} />
                        {i < multiStops.length - 1 && <div className="w-0.5 h-8 bg-border/50 mt-0.5" />}
                      </div>

                      <div className="flex-1 flex items-center gap-2 p-3 rounded-xl bg-muted/20 border border-border/30">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-bold text-foreground">{stop.address}</p>
                          <p className="text-[9px] text-muted-foreground capitalize">{stop.type}</p>
                        </div>
                        {stop.type === "stop" && (
                          <button type="button" onClick={() => { setMultiStops(prev => prev.filter(s => s.id !== stop.id)); toast.info("Stop removed"); }} className="p-1 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <Button className="w-full h-10 rounded-xl text-xs font-bold gap-2" variant="outline" onClick={() => { setMultiStops(prev => [...prev.slice(0, -1), { id: Date.now().toString(), address: "New Stop", type: "stop" }, prev[prev.length - 1]]); toast.success("Stop added"); }}>
                  <Plus className="w-3.5 h-3.5" /> Add Stop
                </Button>
              </div>

              {/* Route summary */}
              <div className="rounded-2xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-black text-foreground">3</p>
                    <p className="text-[9px] text-muted-foreground font-bold">Stops</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">8.2 mi</p>
                    <p className="text-[9px] text-muted-foreground font-bold">Total Distance</p>
                  </div>
                  <div>
                    <p className="text-lg font-black text-foreground">~24 min</p>
                    <p className="text-[9px] text-muted-foreground font-bold">Est. Time</p>
                  </div>
                </div>
              </div>

              <Button className="w-full h-12 rounded-xl text-sm font-bold gap-2" onClick={() => navigate("/rides/hub", { state: { multiStop: multiStops } })}>
                <CheckCircle className="w-4 h-4" /> Book Multi-Stop Ride — $18.50
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
