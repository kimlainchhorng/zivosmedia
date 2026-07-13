/**
 * LodgingAvailabilityWidget - check-in / check-out / guests selector.
 */
import { useState } from "react";
import { CalendarDays, Minus, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

export interface AvailabilityValue {
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
}

interface Props {
  initial?: Partial<AvailabilityValue>;
  onSearch: (v: AvailabilityValue) => void;
}

export function LodgingAvailabilityWidget({ initial, onSearch }: Props) {
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86400000);
  const [checkIn, setCheckIn] = useState(initial?.checkIn || ymd(today));
  const [checkOut, setCheckOut] = useState(initial?.checkOut || ymd(tomorrow));
  const [adults, setAdults] = useState(initial?.adults ?? 2);
  const [children, setChildren] = useState(initial?.children ?? 0);

  const Step = ({ label, v, set, min = 0 }: { label: string; v: number; set: (n: number) => void; min?: number }) => (
    <div className="flex items-center justify-between gap-2 flex-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => set(Math.max(min, v - 1))} className="h-7 w-7 rounded-full border bg-background flex items-center justify-center"><Minus className="h-3 w-3" /></button>
        <span className="w-5 text-center text-sm font-bold">{v}</span>
        <button type="button" onClick={() => set(v + 1)} className="h-7 w-7 rounded-full border bg-background flex items-center justify-center"><Plus className="h-3 w-3" /></button>
      </div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 shadow-sm">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-primary" />
        <p className="font-bold text-sm">Check Availability</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check-in</span>
          <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Check-out</span>
          <input type="date" value={checkOut} min={checkIn} onChange={e => setCheckOut(e.target.value)} className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm" />
        </label>
      </div>
      <div className="flex gap-3">
        <Step label="Adults" v={adults} set={setAdults} min={1} />
        <Step label="Children" v={children} set={setChildren} />
      </div>
      <Button onClick={() => onSearch({ checkIn, checkOut, adults, children })} className="w-full h-10 gap-2 font-bold">
        <Search className="h-4 w-4" /> Search Rooms
      </Button>
    </div>
  );
}
