import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = false, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4 pointer-events-auto select-none", className)}
      classNames={{
        months: "flex flex-col sm:flex-row gap-6 relative",
        month: "flex flex-col gap-3 w-full",
        month_caption: "flex justify-center items-center h-10 relative",
        caption_label: "text-[15px] font-extrabold tracking-tight text-foreground",
        nav: "flex items-center absolute inset-x-0 top-0 justify-between pointer-events-none",
        button_previous: cn(
          "pointer-events-auto h-8 w-8 rounded-xl border border-border/60 bg-card/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all touch-manipulation",
        ),
        button_next: cn(
          "pointer-events-auto h-8 w-8 rounded-xl border border-border/60 bg-card/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-all touch-manipulation",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex mb-1",
        weekday:
          "flex-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground/60 py-1",
        weeks: "flex flex-col gap-0.5",
        week: "flex",
        day: cn(
          "flex-1 relative text-center p-0",
          "[&:has([aria-selected])]:bg-orange-500/12",
          "[&:has([aria-selected].day-range-start)]:rounded-l-full [&:has([aria-selected].day-range-start)]:bg-transparent",
          "[&:has([aria-selected].day-range-end)]:rounded-r-full [&:has([aria-selected].day-range-end)]:bg-transparent",
          "first:[&:has([aria-selected])]:rounded-l-full last:[&:has([aria-selected])]:rounded-r-full",
        ),
        day_button: cn(
          "relative mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-150 touch-manipulation",
          "hover:bg-muted active:scale-90",
          "aria-selected:font-black",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50",
          "disabled:opacity-30 disabled:pointer-events-none",
        ),
        range_start: "day-range-start",
        range_end: "day-range-end",
        selected: cn(
          "[&>button]:bg-gradient-to-br [&>button]:from-orange-500 [&>button]:to-rose-500",
          "[&>button]:text-white [&>button]:shadow-[0_4px_16px_rgba(249,115,22,0.4)]",
          "[&>button]:hover:from-orange-400 [&>button]:hover:to-rose-400",
          "[&>button]:scale-105",
        ),
        today: cn(
          "[&>button]:after:absolute [&>button]:after:bottom-[3px] [&>button]:after:left-1/2",
          "[&>button]:after:-translate-x-1/2 [&>button]:after:w-1 [&>button]:after:h-1",
          "[&>button]:after:rounded-full [&>button]:after:bg-orange-500",
          "[&>button]:after:content-['']",
        ),
        outside: "opacity-0 pointer-events-none",
        disabled: "opacity-30",
        range_middle: cn(
          "aria-selected:bg-orange-500/12 aria-selected:text-foreground",
          "[&>button]:hover:bg-orange-500/20",
        ),
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }: { orientation?: "left" | "right" | "up" | "down" }) =>
          orientation === "right" ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
