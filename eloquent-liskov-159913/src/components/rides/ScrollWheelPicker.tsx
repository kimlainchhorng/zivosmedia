/**
 * ScrollWheelPicker — 2026 iOS-style scroll wheel time/date picker
 * Premium glassmorphic design with haptic-feel snap scrolling
 */
import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ScrollWheelColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: string;
  itemHeight?: number;
}

function ScrollWheelColumn({
  items,
  selectedIndex,
  onSelect,
  width = "flex-1",
  itemHeight = 48,
}: ScrollWheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleCount = 3;
  const containerHeight = itemHeight * visibleCount;
  const padItems = Math.floor(visibleCount / 2);

  // Scroll to selected on mount and when selected changes programmatically
  useEffect(() => {
    if (!isUserScrolling.current && containerRef.current) {
      containerRef.current.scrollTo({
        top: selectedIndex * itemHeight,
        behavior: "smooth",
      });
    }
  }, [selectedIndex, itemHeight]);

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    isUserScrolling.current = true;

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const idx = Math.round(scrollTop / itemHeight);
      const clamped = Math.max(0, Math.min(items.length - 1, idx));

      // Snap to position
      containerRef.current.scrollTo({
        top: clamped * itemHeight,
        behavior: "smooth",
      });

      if (clamped !== selectedIndex) {
        onSelect(clamped);
      }
      isUserScrolling.current = false;
    }, 80);
  }, [items.length, itemHeight, selectedIndex, onSelect]);

  return (
    <div className={cn("relative overflow-hidden", width)} style={{ height: containerHeight }}>
      {/* Top fade */}
      <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-background via-background/80 to-transparent z-20 pointer-events-none" />
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-[40%] bg-gradient-to-t from-background via-background/80 to-transparent z-20 pointer-events-none" />

      {/* Selection highlight — glassmorphic band */}
      <div
        className="absolute inset-x-1 z-10 pointer-events-none rounded-xl border border-primary/20 bg-primary/[0.06] backdrop-blur-sm"
        style={{
          top: padItems * itemHeight,
          height: itemHeight,
        }}
      />

      {/* Scrollable list */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory relative z-10 overscroll-contain"
        style={{
          paddingTop: padItems * itemHeight,
          paddingBottom: padItems * itemHeight,
        }}
      >
        {items.map((item, i) => {
          const isSelected = i === selectedIndex;
          const distance = Math.abs(i - selectedIndex);

          return (
            <button type="button"
              key={`${item}-${i}`}
              onClick={() => onSelect(i)}
              className={cn(
                "w-full flex items-center justify-center snap-center transition-all duration-150 touch-manipulation",
                isSelected
                  ? "text-foreground font-black scale-105"
                  : distance === 1
                    ? "text-muted-foreground/60 font-semibold"
                    : "text-muted-foreground/25 font-medium"
              )}
              style={{
                height: itemHeight,
                fontSize: isSelected ? "17px" : distance === 1 ? "13px" : "11px",
                transform: isSelected ? "scale(1.05)" : `scale(${1 - distance * 0.05})`,
              }}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Full Date+Time Wheel Picker ─── */
interface ScrollWheelPickerProps {
  days?: { label: string }[];
  selectedDayIdx?: number;
  onDayChange?: (idx: number) => void;
  hours: number[];
  selectedHourIdx: number;
  onHourChange: (idx: number) => void;
  minutes: number[];
  selectedMinIdx: number;
  onMinChange: (idx: number) => void;
  amPm: "AM" | "PM";
  onAmPmChange: (val: "AM" | "PM") => void;
  compact?: boolean;
  hideDays?: boolean;
}

export default function ScrollWheelPicker({
  days,
  selectedDayIdx = 0,
  onDayChange,
  hours,
  selectedHourIdx,
  onHourChange,
  minutes,
  selectedMinIdx,
  onMinChange,
  amPm,
  onAmPmChange,
  compact = false,
  hideDays = false,
}: ScrollWheelPickerProps) {
  const itemHeight = compact ? 36 : 40;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl bg-card/50 backdrop-blur-lg border border-border/30 overflow-hidden"
    >
      {/* Subtle header line */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className={cn("flex", compact ? "gap-0 px-1 py-2" : "gap-0 px-2 py-3")}>
        {/* Day column */}
        {!hideDays && days && onDayChange && (
          <>
            <ScrollWheelColumn
              items={days.map((d) => d.label)}
              selectedIndex={selectedDayIdx}
              onSelect={onDayChange}
              width="flex-[2.2]"
              itemHeight={itemHeight}
            />
            <div className="w-px bg-border/20 my-4 shrink-0" />
          </>
        )}

        {/* Hour column */}
        <ScrollWheelColumn
          items={hours.map((h) => String(h))}
          selectedIndex={selectedHourIdx}
          onSelect={onHourChange}
          width="flex-1"
          itemHeight={itemHeight}
        />

        {/* Colon separator */}
        <div className="flex items-center justify-center w-4 shrink-0">
          <span className="text-lg font-black text-foreground/40">:</span>
        </div>

        {/* Minute column */}
        <ScrollWheelColumn
          items={minutes.map((m) => String(m).padStart(2, "0"))}
          selectedIndex={selectedMinIdx}
          onSelect={onMinChange}
          width="flex-1"
          itemHeight={itemHeight}
        />

        {/* Separator */}
        <div className="w-px bg-border/20 my-4 shrink-0" />

        {/* AM/PM column */}
        <ScrollWheelColumn
          items={["AM", "PM"]}
          selectedIndex={amPm === "AM" ? 0 : 1}
          onSelect={(i) => onAmPmChange(i === 0 ? "AM" : "PM")}
          width="w-16"
          itemHeight={itemHeight}
        />
      </div>

    </motion.div>
  );
}

export { ScrollWheelColumn };
