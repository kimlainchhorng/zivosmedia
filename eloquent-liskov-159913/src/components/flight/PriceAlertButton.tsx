/**
 * PriceAlertButton — Bell icon to save a flight search as a price alert
 * Shows on the flight results sticky bar
 */

import { useState } from "react";
import { Bell, BellRing, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useHasAlert, useCreateFlightAlert, useDeleteFlightAlert } from "@/hooks/useFlightPriceAlerts";
import { cn } from "@/lib/utils";

interface PriceAlertButtonProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  currentLowestPrice: number;
  className?: string;
}

export default function PriceAlertButton({
  origin,
  destination,
  departureDate,
  returnDate,
  passengers,
  cabinClass,
  currentLowestPrice,
  className,
}: PriceAlertButtonProps) {
  const { user } = useAuth();
  const { data: existingAlertId, isLoading: checking } = useHasAlert(origin, destination, departureDate);
  const createAlert = useCreateFlightAlert();
  const deleteAlert = useDeleteFlightAlert();
  const [open, setOpen] = useState(false);
  const [targetPrice, setTargetPrice] = useState("");

  const hasAlert = !!existingAlertId;
  const isBusy = createAlert.isPending || deleteAlert.isPending || checking;

  const handleSave = () => {
    createAlert.mutate(
      {
        origin_iata: origin,
        destination_iata: destination,
        departure_date: departureDate,
        return_date: returnDate,
        passengers,
        cabin_class: cabinClass,
        target_price: targetPrice ? parseFloat(targetPrice) : undefined,
        current_price: currentLowestPrice > 0 ? currentLowestPrice : undefined,
      },
      { onSuccess: () => setOpen(false) }
    );
  };

  const handleRemove = () => {
    if (existingAlertId) {
      deleteAlert.mutate(existingAlertId);
    }
  };

  if (!user) return null;

  if (hasAlert) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn("w-8 h-8 text-[hsl(var(--flights))]", className)}
        onClick={handleRemove}
        disabled={isBusy}
        title="Remove price alert"
      >
        {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("w-8 h-8 text-muted-foreground hover:text-[hsl(var(--flights))]", className)}
          disabled={isBusy}
          title="Set price alert"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        <p className="text-xs font-semibold mb-2">Price Alert</p>
        <p className="text-[10px] text-muted-foreground mb-3">
          Get notified when {origin} → {destination} drops below your target price.
        </p>
        {currentLowestPrice > 0 && (
          <p className="text-[10px] text-muted-foreground mb-2">
            Current lowest: <span className="font-bold text-[hsl(var(--flights))]">${Math.round(currentLowestPrice)}</span>
          </p>
        )}
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder="Target $"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="h-8 text-xs flex-1"
          />
          <Button
            size="sm"
            className="h-8 px-3 text-xs bg-[hsl(var(--flights))] hover:bg-[hsl(var(--flights))]/90"
            onClick={handleSave}
            disabled={isBusy}
          >
            {createAlert.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </Button>
        </div>
        <p className="text-[8px] text-muted-foreground/60 mt-2">
          Leave blank to get notified on any price drop.
        </p>
      </PopoverContent>
    </Popover>
  );
}
