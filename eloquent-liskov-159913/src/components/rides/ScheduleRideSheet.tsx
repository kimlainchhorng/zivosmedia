/**
 * ScheduleRideSheet - Schedule rides for future dates/times with recurring options
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, Repeat, ChevronRight, Check, Bell, MapPin, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import DateScrollWheelPicker from "./DateScrollWheelPicker";

interface ScheduledRide {
  id: string;
  date: Date;
  time: string;
  pickup: string;
  dropoff: string;
  recurring?: string;
}

const timeSlots = [
  "6:00 AM", "6:30 AM", "7:00 AM", "7:30 AM", "8:00 AM", "8:30 AM", "9:00 AM",
  "9:30 AM", "10:00 AM", "12:00 PM", "1:00 PM", "3:00 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM",
];

const recurringOptions = [
  { id: "none", label: "One-time" },
  { id: "weekdays", label: "Weekdays" },
  { id: "daily", label: "Every day" },
  { id: "weekly", label: "Weekly" },
  { id: "custom", label: "Custom days" },
];

const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ScheduleRideSheetProps {
  pickup?: string;
  dropoff?: string;
  onSchedule?: (data: { date: Date; time: string; recurring: string; customDays?: string[] }) => void;
  onClose?: () => void;
}

export default function ScheduleRideSheet({
  pickup = "Current location",
  dropoff = "",
  onSchedule,
  onClose,
}: ScheduleRideSheetProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [recurring, setRecurring] = useState("none");
  const [customDays, setCustomDays] = useState<string[]>([]);
  const [reminder, setReminder] = useState(true);
  const [showTimes, setShowTimes] = useState(false);

  const toggleDay = (day: string) => {
    setCustomDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleSchedule = () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
      return;
    }
    onSchedule?.({ date: selectedDate, time: selectedTime, recurring, customDays });
    toast.success(`Ride scheduled for ${format(selectedDate, "MMM d")} at ${selectedTime}`);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/40 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-bold text-foreground">Schedule Ride</h3>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="p-1.5 rounded-full hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Route preview */}
      <div className="px-4 py-3 bg-muted/10">
        <div className="flex items-start gap-2 mb-2">
          <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center mt-0.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <span className="text-xs text-foreground">{pickup}</span>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500/10 flex items-center justify-center mt-0.5 shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          </div>
          <span className="text-xs text-foreground">{dropoff || "Select destination"}</span>
        </div>
      </div>

      {/* Date picker — 2026 scroll wheel */}
      <div className="px-4 py-3">
        <span className="text-xs font-bold text-foreground mb-2 block">Select Date</span>
        <DateScrollWheelPicker
          selectedDate={selectedDate ?? new Date()}
          onDateChange={(d) => setSelectedDate(d)}
          compact
        />
      </div>

      {/* Time picker */}
      <div className="px-4 pb-3">
        <button type="button"
          onClick={() => setShowTimes(!showTimes)}
          className={cn(
            "w-full flex items-center justify-between h-11 px-3 rounded-lg border text-sm transition-all",
            selectedTime ? "border-primary/30 bg-primary/5" : "border-border/40"
          )}
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className={selectedTime ? "text-foreground font-medium" : "text-muted-foreground"}>
              {selectedTime || "Select time"}
            </span>
          </div>
          <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", showTimes && "rotate-90")} />
        </button>

        <AnimatePresence>
          {showTimes && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto">
                {timeSlots.map((time) => (
                  <button type="button"
                    key={time}
                    onClick={() => { setSelectedTime(time); setShowTimes(false); }}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                      selectedTime === time
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Recurring */}
      <div className="px-4 pb-3">
        <span className="text-xs font-bold text-foreground mb-2 block flex items-center gap-1.5">
          <Repeat className="w-3.5 h-3.5 text-primary" /> Repeat
        </span>
        <div className="flex flex-wrap gap-1.5">
          {recurringOptions.map((opt) => (
            <button type="button"
              key={opt.id}
              onClick={() => setRecurring(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all",
                recurring === opt.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom days */}
        {recurring === "custom" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-1.5 mt-2">
            {weekDays.map((day) => (
              <button type="button"
                key={day}
                onClick={() => toggleDay(day)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-bold transition-all",
                  customDays.includes(day)
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground"
                )}
              >
                {day}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Reminder toggle */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <div>
              <span className="text-xs font-bold text-foreground">Departure reminder</span>
              <p className="text-[10px] text-muted-foreground">Notify 15 min before</p>
            </div>
          </div>
          <Switch checked={reminder} onCheckedChange={setReminder} />
        </div>
      </div>

      {/* Schedule CTA */}
      <div className="px-4 pb-4">
        <Button
          onClick={handleSchedule}
          disabled={!selectedDate || !selectedTime}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold shadow-lg shadow-primary/25"
        >
          <Calendar className="w-4 h-4 mr-2" />
          Schedule Ride
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
        {recurring !== "none" && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Repeats {recurring === "custom" ? customDays.join(", ") : recurring}
          </p>
        )}
      </div>
    </div>
  );
}
