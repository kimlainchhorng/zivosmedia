/**
 * RideScheduleCalendar — Calendar view for scheduled rides with management
 */
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Repeat, MapPin, Trash2, Edit3, ChevronLeft, ChevronRight, Bell, Car, Plus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format, addDays, startOfWeek, isSameDay, isToday, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from "date-fns";

interface ScheduledRide {
  id: string;
  date: Date;
  time: string;
  pickup: string;
  dropoff: string;
  recurring?: "daily" | "weekdays" | "weekly" | null;
  reminder: boolean;
  vehicle: string;
  estimatedPrice: string;
}

const scheduledRides: ScheduledRide[] = [
  { id: "1", date: new Date(), time: "8:00 AM", pickup: "Home", dropoff: "400 Tech Blvd", recurring: "weekdays", reminder: true, vehicle: "Economy", estimatedPrice: "$11-14" },
  { id: "2", date: addDays(new Date(), 1), time: "6:30 PM", pickup: "400 Tech Blvd", dropoff: "Downtown Gym", recurring: "weekly", reminder: true, vehicle: "Economy", estimatedPrice: "$7-9" },
  { id: "3", date: addDays(new Date(), 3), time: "5:00 AM", pickup: "Home", dropoff: "JFK Airport", recurring: null, reminder: true, vehicle: "Premium", estimatedPrice: "$38-45" },
  { id: "4", date: addDays(new Date(), 5), time: "9:00 PM", pickup: "Restaurant Row", dropoff: "Home", recurring: null, reminder: false, vehicle: "Economy", estimatedPrice: "$12-15" },
];

export default function RideScheduleCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [rides, setRides] = useState(scheduledRides);
  const [editingRideId, setEditingRideId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ time: string; pickup: string; dropoff: string; vehicle: string }>({ time: "", pickup: "", dropoff: "", vehicle: "" });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0=Sun

  const ridesForDate = useMemo(() =>
    rides.filter(r => isSameDay(r.date, selectedDate)),
    [rides, selectedDate]
  );

  const datesWithRides = useMemo(() =>
    new Set(rides.map(r => format(r.date, "yyyy-MM-dd"))),
    [rides]
  );

  const handleDelete = (id: string) => {
    setRides(prev => prev.filter(r => r.id !== id));
    toast.success("Scheduled ride cancelled");
  };

  const handleToggleReminder = (id: string) => {
    setRides(prev => prev.map(r => r.id === id ? { ...r, reminder: !r.reminder } : r));
    toast.success("Reminder updated");
  };

  const startEdit = (ride: ScheduledRide) => {
    setEditingRideId(ride.id);
    setEditDraft({ time: ride.time, pickup: ride.pickup, dropoff: ride.dropoff, vehicle: ride.vehicle });
  };

  const saveEdit = (id: string) => {
    setRides(prev => prev.map(r => r.id === id ? { ...r, ...editDraft } : r));
    setEditingRideId(null);
    toast.success("Ride updated");
  };

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted/30 min-w-[36px] min-h-[36px]">
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-bold text-foreground">{format(currentMonth, "MMMM yyyy")}</h3>
        <button type="button" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-9 h-9 rounded-lg flex items-center justify-center hover:bg-muted/30 min-w-[36px] min-h-[36px]">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl bg-card border border-border/40 p-3">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i} className="text-center text-[9px] font-bold text-muted-foreground py-1">{d}</div>
          ))}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for start offset */}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {calendarDays.map(day => {
            const dayStr = format(day, "yyyy-MM-dd");
            const hasRide = datesWithRides.has(dayStr);
            const isSelected = isSameDay(day, selectedDate);
            const today = isToday(day);
            return (
              <button type="button"
                key={dayStr}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative w-full aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-all min-h-[36px]",
                  isSelected ? "bg-primary text-primary-foreground font-bold" :
                    today ? "bg-primary/10 text-primary font-bold" :
                    "text-foreground hover:bg-muted/30"
                )}
              >
                {format(day, "d")}
                {hasRide && !isSelected && (
                  <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary" />
                )}
                {hasRide && isSelected && (
                  <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-primary-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date rides */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-foreground">
            {isToday(selectedDate) ? "Today" : format(selectedDate, "EEE, MMM d")}
            {ridesForDate.length > 0 && <span className="text-muted-foreground ml-1">· {ridesForDate.length} ride{ridesForDate.length > 1 ? "s" : ""}</span>}
          </h3>
        </div>

        {ridesForDate.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/40 p-6 text-center">
            <Calendar className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No rides scheduled</p>
            <Button variant="outline" size="sm" className="mt-3 h-8 rounded-lg text-[10px] font-bold gap-1">
              <Plus className="w-3 h-3" /> Schedule a Ride
            </Button>
          </div>
        ) : (
          ridesForDate.map(ride => (
            <motion.div key={ride.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card border border-border/40 p-4 space-y-3">
              {/* Time + recurring */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/10 text-primary border-0 text-xs font-bold gap-1">
                    <Clock className="w-3 h-3" /> {ride.time}
                  </Badge>
                  {ride.recurring && (
                    <Badge variant="outline" className="text-[9px] font-bold gap-1 text-muted-foreground">
                      <Repeat className="w-2.5 h-2.5" /> {ride.recurring}
                    </Badge>
                  )}
                </div>
                <Badge variant="outline" className="text-[9px] font-bold">{ride.vehicle}</Badge>
              </div>

              {/* Route */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div className="w-0.5 h-5 bg-border/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <p className="text-xs font-medium text-foreground">{ride.pickup}</p>
                  <p className="text-xs font-medium text-foreground">{ride.dropoff}</p>
                </div>
                <span className="text-sm font-bold text-foreground">{ride.estimatedPrice}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 h-8 rounded-lg text-[10px] font-bold gap-1" onClick={() => handleToggleReminder(ride.id)}>
                  <Bell className={cn("w-3 h-3", ride.reminder ? "text-primary" : "text-muted-foreground")} />
                  {ride.reminder ? "Reminder On" : "Reminder Off"}
                </Button>
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold px-3" onClick={() => editingRideId === ride.id ? setEditingRideId(null) : startEdit(ride)}>
                  <Edit3 className="w-3 h-3" />
                </Button>
                <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-bold px-3 border-red-500/20 text-red-500 hover:bg-red-500/5" onClick={() => handleDelete(ride.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Inline edit form */}
              <AnimatePresence>
                {editingRideId === ride.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden border-t border-border/30 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold mb-1">TIME</p>
                        <Input value={editDraft.time} onChange={e => setEditDraft(d => ({ ...d, time: e.target.value }))} className="h-8 text-xs rounded-lg" placeholder="8:00 AM" />
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground font-bold mb-1">VEHICLE</p>
                        <div className="flex gap-1">
                          {["Economy", "Premium", "SUV"].map(v => (
                            <button type="button" key={v} onClick={() => setEditDraft(d => ({ ...d, vehicle: v }))} className={cn("flex-1 h-8 rounded-lg text-[9px] font-bold border transition-all", editDraft.vehicle === v ? "bg-primary text-primary-foreground border-primary" : "bg-muted/20 border-border/40")}>
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold mb-1">PICKUP</p>
                      <Input value={editDraft.pickup} onChange={e => setEditDraft(d => ({ ...d, pickup: e.target.value }))} className="h-8 text-xs rounded-lg" />
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground font-bold mb-1">DROPOFF</p>
                      <Input value={editDraft.dropoff} onChange={e => setEditDraft(d => ({ ...d, dropoff: e.target.value }))} className="h-8 text-xs rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 rounded-lg text-[10px] font-bold gap-1" onClick={() => saveEdit(ride.id)}>
                        <Check className="w-3 h-3" /> Save Changes
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold px-3" onClick={() => setEditingRideId(null)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>

      {/* Upcoming summary */}
      <div className="rounded-2xl bg-muted/20 border border-border/30 p-4">
        <h3 className="text-xs font-bold text-foreground mb-2">Upcoming This Week</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center rounded-xl bg-card border border-border/40 p-2.5">
            <p className="text-lg font-black text-foreground">{rides.length}</p>
            <p className="text-[9px] text-muted-foreground font-bold">Scheduled</p>
          </div>
          <div className="text-center rounded-xl bg-card border border-border/40 p-2.5">
            <p className="text-lg font-black text-foreground">{rides.filter(r => r.recurring).length}</p>
            <p className="text-[9px] text-muted-foreground font-bold">Recurring</p>
          </div>
        </div>
      </div>
    </div>
  );
}
