/**
 * Sort Select Component
 * Unified sorting for all results pages
 * Premium design with consistent styling
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortOption = {
  value: string;
  label: string;
};

interface SortSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SortOption[];
  className?: string;
}

// Flights: Best Value default, then price/speed/stops options
export const flightSortOptions: SortOption[] = [
  { value: "best", label: "Best Value" },
  { value: "price", label: "Cheapest" },
  { value: "duration", label: "Fastest" },
  { value: "stops", label: "Fewest Stops" },
  { value: "departure", label: "Departure Time" },
];

// Hotels: Best Value default, then price/rating options
export const hotelSortOptions: SortOption[] = [
  { value: "best", label: "Best Value" },
  { value: "price", label: "Cheapest" },
  { value: "rating", label: "Guest Rating" },
  { value: "stars", label: "Star Rating" },
];

// Cars: Best Value default, then price/category options
export const carSortOptions: SortOption[] = [
  { value: "best", label: "Best Value" },
  { value: "price", label: "Cheapest" },
  { value: "category", label: "Car Category" },
  { value: "company", label: "Supplier A-Z" },
];

// Eats: Recommended default, then price/speed/rating options
export const eatsSortOptions: SortOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Price: Low to High" },
  { value: "eta", label: "Fastest Delivery" },
  { value: "rating", label: "Top Rated" },
  { value: "distance", label: "Nearest" },
];

// Rides: Recommended default, then price/speed options
export const rideSortOptions: SortOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Price: Low to High" },
  { value: "eta", label: "Fastest ETA" },
  { value: "rating", label: "Top Rated" },
];

// Delivery: Recommended default, then price/speed options
export const deliverySortOptions: SortOption[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Price: Low to High" },
  { value: "eta", label: "Fastest ETA" },
];

export function SortSelect({ value, onValueChange, options, className }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={cn("w-[160px] h-10 text-sm rounded-xl border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:bg-muted/30 active:scale-[0.98] touch-manipulation", className)}>
        <ArrowUpDown className="w-4 h-4 mr-2 text-muted-foreground" />
        <SelectValue placeholder="Sort by" />
      </SelectTrigger>
      <SelectContent align="end">
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-sm">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
