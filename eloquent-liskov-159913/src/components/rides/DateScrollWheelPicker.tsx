/**
 * DateScrollWheelPicker — 2026 iOS-style scroll wheel for Month / Day / Year
 */
import { useMemo } from "react";
import { motion } from "framer-motion";
import { ScrollWheelColumn } from "./ScrollWheelPicker";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface DateScrollWheelPickerProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  /** Minimum selectable date (default: today) */
  minDate?: Date;
  /** Maximum selectable date (default: today + 365 days) */
  maxDate?: Date;
  compact?: boolean;
}

export default function DateScrollWheelPicker({
  selectedDate,
  onDateChange,
  minDate,
  maxDate,
  compact = false,
}: DateScrollWheelPickerProps) {
  const itemHeight = compact ? 36 : 40;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const min = minDate ?? today;
  const max = maxDate ?? new Date(today.getFullYear() + 1, today.getMonth(), today.getDate());

  // Build year range
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = min.getFullYear(); y <= max.getFullYear(); y++) arr.push(y);
    return arr;
  }, [min, max]);

  // Build month labels (short)
  const monthLabels = MONTHS.map((m) => m.slice(0, 3));

  // Days in current selected month/year
  const daysInMonth = useMemo(() => {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
  }, [selectedDate]);

  const dayItems = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  const selectedMonthIdx = selectedDate.getMonth();
  const selectedDayIdx = selectedDate.getDate() - 1;
  const selectedYearIdx = years.indexOf(selectedDate.getFullYear());

  const clampDate = (year: number, month: number, day: number): Date => {
    const maxDay = new Date(year, month + 1, 0).getDate();
    const d = new Date(year, month, Math.min(day, maxDay));
    d.setHours(0, 0, 0, 0);
    // Clamp to min/max
    if (d < min) return new Date(min);
    if (d > max) return new Date(max);
    return d;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl bg-card/50 backdrop-blur-lg border border-border/30 overflow-hidden"
    >
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className={compact ? "flex gap-0 px-1 py-2" : "flex gap-0 px-2 py-3"}>
        {/* Month column */}
        <ScrollWheelColumn
          items={monthLabels}
          selectedIndex={selectedMonthIdx}
          onSelect={(i) => {
            onDateChange(clampDate(selectedDate.getFullYear(), i, selectedDate.getDate()));
          }}
          width="flex-[1.4]"
          itemHeight={itemHeight}
        />

        <div className="w-px bg-border/20 my-4 shrink-0" />

        {/* Day column */}
        <ScrollWheelColumn
          items={dayItems.map((d) => String(d))}
          selectedIndex={Math.min(selectedDayIdx, dayItems.length - 1)}
          onSelect={(i) => {
            onDateChange(clampDate(selectedDate.getFullYear(), selectedDate.getMonth(), dayItems[i]));
          }}
          width="flex-1"
          itemHeight={itemHeight}
        />

        <div className="w-px bg-border/20 my-4 shrink-0" />

        {/* Year column */}
        <ScrollWheelColumn
          items={years.map((y) => String(y))}
          selectedIndex={selectedYearIdx >= 0 ? selectedYearIdx : 0}
          onSelect={(i) => {
            onDateChange(clampDate(years[i], selectedDate.getMonth(), selectedDate.getDate()));
          }}
          width="flex-1"
          itemHeight={itemHeight}
        />
      </div>

      
    </motion.div>
  );
}
