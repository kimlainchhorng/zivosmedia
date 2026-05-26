/**
 * PerformanceDateRangePicker — preset tabs (7d/30d/90d) + custom range popover.
 */
import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { DateRange as DR } from "@/hooks/useUnifiedPerformance";

export interface CustomRange {
  from?: Date;
  to?: Date;
}

interface Props {
  preset: DR;
  custom: CustomRange;
  onPresetChange: (p: DR) => void;
  onCustomChange: (r: CustomRange) => void;
}

export default function PerformanceDateRangePicker({ preset, custom, onPresetChange, onCustomChange }: Props) {
  const [open, setOpen] = useState(false);
  const label =
    custom.from && custom.to
      ? `${format(custom.from, "MMM d")} – ${format(custom.to, "MMM d")}`
      : "Custom";

  return (
    <div className="flex items-center gap-2">
      <Tabs value={preset} onValueChange={(v) => onPresetChange(v as DR)}>
        <TabsList className="h-8">
          <TabsTrigger value="7d" className="h-7 text-xs">7d</TabsTrigger>
          <TabsTrigger value="30d" className="h-7 text-xs">30d</TabsTrigger>
          <TabsTrigger value="90d" className="h-7 text-xs">90d</TabsTrigger>
        </TabsList>
      </Tabs>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={preset === "custom" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs"
          >
            <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
            {preset === "custom" ? label : "Custom"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={{ from: custom.from, to: custom.to }}
            onSelect={(r) => {
              onCustomChange({ from: r?.from, to: r?.to });
              if (r?.from && r?.to) {
                onPresetChange("custom");
                setOpen(false);
              }
            }}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
