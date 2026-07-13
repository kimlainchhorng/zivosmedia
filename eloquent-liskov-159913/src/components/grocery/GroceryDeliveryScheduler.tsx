/**
 * GroceryDeliveryScheduler - Time slot picker, priority delivery, and gift options
 * Instacart-style delivery scheduling for checkout
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, Zap, Gift, CalendarDays, Check, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type DeliverySpeed = "standard" | "priority" | "scheduled";

interface TimeSlot {
  id: string;
  label: string;
  sublabel: string;
  available: boolean;
}

const TODAY_SLOTS: TimeSlot[] = (() => {
  const now = new Date();
  const hour = now.getHours();
  const slots: TimeSlot[] = [];
  
  for (let h = Math.max(hour + 1, 8); h <= 21; h += 2) {
    const start = h > 12 ? `${h - 12}` : `${h}`;
    const end = (h + 2) > 12 ? `${h + 2 - 12}` : `${h + 2}`;
    const startSuf = h >= 12 ? "pm" : "am";
    const endSuf = (h + 2) >= 12 ? "pm" : "am";
    slots.push({
      id: `today-${h}`,
      label: `${start}${startSuf}–${end}${endSuf}`,
      sublabel: "Today",
      available: true,
    });
  }
  return slots.slice(0, 4);
})();

const TOMORROW_SLOTS: TimeSlot[] = [
  { id: "tmr-8", label: "8am–10am", sublabel: "Tomorrow", available: true },
  { id: "tmr-10", label: "10am–12pm", sublabel: "Tomorrow", available: true },
  { id: "tmr-12", label: "12pm–2pm", sublabel: "Tomorrow", available: true },
  { id: "tmr-14", label: "2pm–4pm", sublabel: "Tomorrow", available: true },
];

export interface SchedulerState {
  speed: DeliverySpeed;
  selectedSlot: string | null;
  isGift: boolean;
  giftMessage: string;
  giftRecipientName: string;
  itemNotes: Record<string, string>;
}

export const DEFAULT_SCHEDULER: SchedulerState = {
  speed: "standard",
  selectedSlot: null,
  isGift: false,
  giftMessage: "",
  giftRecipientName: "",
  itemNotes: {},
};

const PRIORITY_FEE = 2.99;

export function getPriorityFee(speed: DeliverySpeed): number {
  return speed === "priority" ? PRIORITY_FEE : 0;
}

export function GroceryDeliveryScheduler({
  state,
  onChange,
  baseEta,
}: {
  state: SchedulerState;
  onChange: (s: SchedulerState) => void;
  baseEta: number;
}) {
  const speeds: { value: DeliverySpeed; icon: typeof Clock; label: string; desc: string; extra?: string }[] = [
    { value: "standard", icon: Clock, label: "Standard", desc: `${baseEta}–${baseEta + 15} min`, extra: "Free" },
    { value: "priority", icon: Zap, label: "Priority", desc: `${Math.max(20, baseEta - 15)}–${baseEta} min`, extra: `+$${PRIORITY_FEE}` },
    { value: "scheduled", icon: CalendarDays, label: "Schedule", desc: "Pick a time", extra: "Free" },
  ];

  return (
    <div className="space-y-4">
      {/* Delivery speed selection */}
      <div>
        <h3 className="text-[13px] font-bold flex items-center gap-2 mb-2.5">
          <Clock className="h-3.5 w-3.5 text-primary" />
          Delivery Window
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {speeds.map(({ value, icon: Icon, label, desc, extra }) => (
            <motion.button
              key={value}
              whileTap={{ scale: 0.95 }}
              onClick={() => onChange({ ...state, speed: value, selectedSlot: value === "scheduled" ? state.selectedSlot : null })}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                state.speed === value
                  ? "bg-primary/5 border-primary/25 shadow-sm"
                  : "bg-muted/10 border-border/15 hover:bg-muted/20"
              }`}
            >
              <Icon className={`h-4 w-4 mx-auto mb-1 ${state.speed === value ? "text-primary" : "text-muted-foreground/50"}`} />
              <p className={`text-[10px] font-bold ${state.speed === value ? "text-primary" : "text-foreground/70"}`}>{label}</p>
              <p className="text-[8px] text-muted-foreground mt-0.5">{desc}</p>
              {extra && (
                <span className={`text-[8px] font-bold mt-0.5 ${value === "priority" ? "text-amber-500" : "text-emerald-500"}`}>
                  {extra}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Time slot picker */}
      {state.speed === "scheduled" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <p className="text-[11px] font-semibold text-foreground/70 mb-2">Today</p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {TODAY_SLOTS.map((slot) => (
              <motion.button
                key={slot.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange({ ...state, selectedSlot: slot.id })}
                disabled={!slot.available}
                className={`p-2 rounded-xl border text-center transition-all ${
                  state.selectedSlot === slot.id
                    ? "bg-primary/10 border-primary/25"
                    : slot.available
                    ? "bg-muted/10 border-border/15 hover:bg-muted/20"
                    : "bg-muted/5 border-border/10 opacity-40"
                }`}
              >
                <span className={`text-[11px] font-semibold ${state.selectedSlot === slot.id ? "text-primary" : "text-foreground/70"}`}>
                  {slot.label}
                </span>
                {state.selectedSlot === slot.id && <Check className="h-3 w-3 text-primary mx-auto mt-0.5" />}
              </motion.button>
            ))}
          </div>

          <p className="text-[11px] font-semibold text-foreground/70 mb-2">Tomorrow</p>
          <div className="grid grid-cols-2 gap-1.5">
            {TOMORROW_SLOTS.map((slot) => (
              <motion.button
                key={slot.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChange({ ...state, selectedSlot: slot.id })}
                className={`p-2 rounded-xl border text-center transition-all ${
                  state.selectedSlot === slot.id
                    ? "bg-primary/10 border-primary/25"
                    : "bg-muted/10 border-border/15 hover:bg-muted/20"
                }`}
              >
                <span className={`text-[11px] font-semibold ${state.selectedSlot === slot.id ? "text-primary" : "text-foreground/70"}`}>
                  {slot.label}
                </span>
                {state.selectedSlot === slot.id && <Check className="h-3 w-3 text-primary mx-auto mt-0.5" />}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Gift option */}
      <div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => onChange({ ...state, isGift: !state.isGift })}
          className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
            state.isGift ? "bg-pink-500/5 border-pink-500/20" : "bg-muted/10 border-border/15"
          }`}
        >
          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${
            state.isGift ? "bg-pink-500 border-pink-500" : "border-muted-foreground/30"
          }`}>
            {state.isGift && <Check className="h-3 w-3 text-white" />}
          </div>
          <Gift className={`h-4 w-4 ${state.isGift ? "text-pink-500" : "text-muted-foreground"}`} />
          <div className="text-left">
            <span className="text-[12px] font-medium">Send as a gift</span>
            <p className="text-[9px] text-muted-foreground">Add a personal message & hide prices</p>
          </div>
        </motion.button>

        {state.isGift && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-2.5 space-y-2"
          >
            <Input
              value={state.giftRecipientName}
              onChange={(e) => onChange({ ...state, giftRecipientName: e.target.value })}
              placeholder="Recipient's name"
              className="rounded-xl h-10 bg-muted/15 border-border/15 text-[12px]"
            />
            <Textarea
              value={state.giftMessage}
              onChange={(e) => onChange({ ...state, giftMessage: e.target.value })}
              placeholder="Add a gift message (optional)"
              className="rounded-xl bg-muted/15 border-border/15 text-[12px] min-h-[60px] resize-none"
              rows={2}
              maxLength={200}
            />
            <p className="text-[9px] text-muted-foreground text-right">{state.giftMessage.length}/200</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
