/**
 * MessageScheduler — Pick a date/time to schedule a message
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Clock from "lucide-react/dist/esm/icons/clock";
import Send from "lucide-react/dist/esm/icons/send";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import { Button } from "@/components/ui/button";
import { format, addHours, addMinutes, setHours, setMinutes, startOfTomorrow } from "date-fns";

interface MessageSchedulerProps {
  open: boolean;
  onClose: () => void;
  onSchedule: (scheduledAt: Date) => void;
  message: string;
}

const QUICK_OPTIONS = [
  { label: "In 1 hour", getDate: () => addHours(new Date(), 1) },
  { label: "In 3 hours", getDate: () => addHours(new Date(), 3) },
  { label: "Tomorrow 9 AM", getDate: () => setMinutes(setHours(startOfTomorrow(), 9), 0) },
  { label: "Tomorrow 6 PM", getDate: () => setMinutes(setHours(startOfTomorrow(), 18), 0) },
];

export default function MessageScheduler({ open, onClose, onSchedule, message }: MessageSchedulerProps) {
  const [customDate, setCustomDate] = useState("");
  const [customTime, setCustomTime] = useState("");

  const handleCustomSchedule = () => {
    if (!customDate || !customTime) return;
    const [year, month, day] = customDate.split("-").map(Number);
    const [hours, minutes] = customTime.split(":").map(Number);
    const scheduled = new Date(year, month - 1, day, hours, minutes);
    if (scheduled <= new Date()) return;
    onSchedule(scheduled);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl border-t border-border/50 max-h-[70vh] overflow-y-auto"
            style={{ paddingBottom: "max(var(--zivo-safe-bottom,0px), 1rem)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="w-8 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            <div className="px-4 pb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <h3 className="text-base font-semibold">Schedule Message</h3>
                </div>
                <button type="button" onClick={onClose} className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message preview */}
              {message && (
                <div className="bg-primary/10 rounded-xl px-3 py-2 mb-4">
                  <p className="text-xs text-muted-foreground mb-0.5">Message</p>
                  <p className="text-sm text-foreground truncate">{message}</p>
                </div>
              )}

              {/* Quick options */}
              <p className="text-xs font-medium text-muted-foreground mb-2">Quick schedule</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {QUICK_OPTIONS.map((opt) => {
                  const date = opt.getDate();
                  return (
                    <button type="button"
                      key={opt.label}
                      onClick={() => onSchedule(date)}
                      className="flex flex-col items-start gap-0.5 p-3 rounded-xl bg-muted/50 border border-border/40 hover:bg-accent/50 transition-colors text-left active:scale-[0.97]"
                    >
                      <span className="text-sm font-medium text-foreground">{opt.label}</span>
                      <span className="text-[10px] text-muted-foreground">{format(date, "MMM d, h:mm a")}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom date/time */}
              <p className="text-xs font-medium text-muted-foreground mb-2">Custom time</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border/40 text-sm text-foreground"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-muted/50 border border-border/40 text-sm text-foreground"
                  />
                </div>
              </div>

              <Button
                onClick={handleCustomSchedule}
                disabled={!customDate || !customTime}
                className="w-full rounded-xl"
              >
                <Send className="h-4 w-4 mr-2" />
                Schedule Send
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
