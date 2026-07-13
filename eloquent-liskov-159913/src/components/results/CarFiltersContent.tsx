/**
 * Car Filters Content
 * Reusable filter controls for car rentals
 */

import { Car, DollarSign, Users, Briefcase, Settings, Fuel, ShieldCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { CarFiltersState } from "@/hooks/useResultsFilters";

interface CarFiltersContentProps {
  filters: CarFiltersState;
  onFilterChange: (filters: Partial<CarFiltersState>) => void;
  availableSuppliers?: { id: string; name: string; count: number }[];
}

const categoryOptions = [
  { id: "Economy", label: "Economy" },
  { id: "Compact", label: "Compact" },
  { id: "Midsize", label: "Midsize" },
  { id: "SUV", label: "SUV" },
  { id: "Luxury", label: "Luxury" },
  { id: "Van", label: "Van" },
];

const seatOptions = [
  { value: 4, label: "4+ seats" },
  { value: 5, label: "5+ seats" },
  { value: 7, label: "7+ seats" },
];

const bagOptions = [
  { value: 2, label: "2+ bags" },
  { value: 3, label: "3+ bags" },
];

const fuelTypeOptions = [
  { id: "Gasoline", label: "Gasoline" },
  { id: "Diesel", label: "Diesel" },
  { id: "Electric", label: "Electric" },
  { id: "Hybrid", label: "Hybrid" },
];

const transmissionOptions = [
  { id: "Automatic", label: "Automatic" },
  { id: "Manual", label: "Manual" },
];

export function CarFiltersContent({
  filters,
  onFilterChange,
  availableSuppliers = [],
}: CarFiltersContentProps) {
  const toggleCategory = (id: string) => {
    const newCategories = filters.categories.includes(id)
      ? filters.categories.filter((c) => c !== id)
      : [...filters.categories, id];
    onFilterChange({ categories: newCategories });
  };

  const toggleTransmission = (id: string) => {
    const newTransmission = filters.transmission.includes(id)
      ? filters.transmission.filter((t) => t !== id)
      : [...filters.transmission, id];
    onFilterChange({ transmission: newTransmission });
  };

  const toggleFuelType = (id: string) => {
    const next = (filters.fuelType || []).includes(id)
      ? (filters.fuelType || []).filter((f) => f !== id)
      : [...(filters.fuelType || []), id];
    onFilterChange({ fuelType: next });
  };

  const toggleSupplier = (id: string) => {
    const newSuppliers = filters.suppliers.includes(id)
      ? filters.suppliers.filter((s) => s !== id)
      : [...filters.suppliers, id];
    onFilterChange({ suppliers: newSuppliers });
  };

  return (
    <div className="space-y-6">
      {/* Price Range */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-emerald-500" />
          Max Price: ${filters.maxPrice}/day
        </Label>
        <div className="px-1">
          <Slider
            value={[filters.maxPrice]}
            onValueChange={(v) => onFilterChange({ maxPrice: v[0] })}
            min={20}
            max={500}
            step={10}
            className="py-2"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$20</span>
            <span>$500</span>
          </div>
        </div>
      </div>

      {/* Car Category */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Car className="w-4 h-4 text-foreground" />
          Car Category
        </Label>
        <div className="space-y-2">
          {categoryOptions.map((cat) => (
            <label key={cat.id} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.categories.includes(cat.id)}
                onCheckedChange={() => toggleCategory(cat.id)}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {cat.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Seats */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Seats
        </Label>
        <div className="space-y-2">
          {seatOptions.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.seats === opt.value}
                onCheckedChange={(checked) => onFilterChange({ seats: checked ? opt.value : null })}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Bags */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-muted-foreground" />
          Luggage
        </Label>
        <div className="space-y-2">
          {bagOptions.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.bags === opt.value}
                onCheckedChange={(checked) => onFilterChange({ bags: checked ? opt.value : null })}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {opt.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted-foreground" />
          Transmission
        </Label>
        <div className="space-y-2">
          {transmissionOptions.map((trans) => (
            <label key={trans.id} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={filters.transmission.includes(trans.id)}
                onCheckedChange={() => toggleTransmission(trans.id)}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                {trans.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Suppliers */}
      {availableSuppliers.length > 0 && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">Suppliers</Label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {availableSuppliers.map((supplier) => (
              <label key={supplier.id} className="flex items-center gap-3 cursor-pointer group">
                <Checkbox
                  checked={filters.suppliers.includes(supplier.id)}
                  onCheckedChange={() => toggleSupplier(supplier.id)}
                />
                <span className="flex-1 group-hover:text-foreground transition-colors text-sm">
                  {supplier.name}
                </span>
                <span className="text-xs text-muted-foreground">({supplier.count})</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Fuel Type */}
      <div>
        <Label className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Fuel className="w-4 h-4 text-muted-foreground" />
          Fuel Type
        </Label>
        <div className="space-y-2">
          {fuelTypeOptions.map((f) => (
            <label key={f.id} className="flex items-center gap-3 cursor-pointer group">
              <Checkbox
                checked={(filters.fuelType || []).includes(f.id)}
                onCheckedChange={() => toggleFuelType(f.id)}
              />
              <span className="flex-1 group-hover:text-foreground transition-colors text-sm">{f.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Free Cancellation */}
      <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <Label className="text-sm font-medium cursor-pointer">Free Cancellation</Label>
        </div>
        <Switch
          checked={filters.freeCancellation || false}
          onCheckedChange={(v) => onFilterChange({ freeCancellation: v })}
        />
      </div>

      {/* Filter Note */}
      <p className="text-[10px] text-muted-foreground italic mt-4 px-1">
        Filters adjust partner-provided results only.
      </p>
    </div>
  );
}
