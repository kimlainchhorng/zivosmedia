/**
 * MessageScheduler — Pick a date/time to schedule a message
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Clock from "lucide-react/dist/esm/icons/clock";
import Send from "lucide-react/dist/esm/icons/send";
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
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25 }}
            className="zivo-chat-popover-glass fixed bottom-0 left-0 right-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-[1.75rem] border-t border-white/10 shadow-2xl"
            style={{ paddingBottom: "max(var(--zivo-safe-bottom,0px), 1rem)" }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-1 w-11 rounded-full bg-foreground/20" />
            </div>

            <div className="px-4 pb-4">
              {/* Header */}
              <div className="zivo-chat-header-glass -mx-4 mb-4 flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="zivo-chat-avatar-ring flex h-10 w-10 items-center justify-center rounded-2xl">
                    <Clock className="h-5 w-5 text-primary" />
                  </span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Send later</p>
                    <h3 className="text-base font-black">Schedule Message</h3>
                  </div>
                </div>
                <button type="button" onClick={onClose} className="zivo-chat-icon-button flex h-9 w-9 items-center justify-center" aria-label="Close scheduler">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Message preview */}
              {message && (
                <div className="zivo-chat-card mb-4 px-3 py-2">
                  <p className="mb-0.5 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Message</p>
                  <p className="truncate text-sm font-semibold text-foreground">{message}</p>
                </div>
              )}

              {/* Quick options */}
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Quick schedule</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {QUICK_OPTIONS.map((opt) => {
                  const date = opt.getDate();
                  return (
                    <button type="button"
                      key={opt.label}
                      onClick={() => onSchedule(date)}
                      className="zivo-chat-row flex flex-col items-start gap-0.5 p-3 text-left active:scale-[0.97]"
                    >
                      <span className="text-sm font-black text-foreground">{opt.label}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground">{format(date, "MMM d, h:mm a")}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom date/time */}
              <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">Custom time</p>
              <div className="flex gap-2 mb-3">
                <div className="flex-1">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => setCustomDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="time"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="zivo-chat-search h-10 w-full px-3 text-sm text-foreground"
                  />
                </div>
              </div>

              <Button
                onClick={handleCustomSchedule}
                disabled={!customDate || !customTime}
                className="zivo-chat-chip-active h-11 w-full font-black"
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
