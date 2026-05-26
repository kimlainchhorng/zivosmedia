/**
 * VehiclePicker — combobox-style selector backed by live inventory.
 * When a vehicle is selected, calls onSelect with the full VehicleOption so
 * the parent can auto-fill label, VIN, price, etc.
 * Pass vehicleId={null} to show the "Select from inventory" placeholder.
 */
import { useState, useMemo } from "react";
import { Search, Car } from "lucide-react";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useVehicleOptions, type VehicleOption } from "@/hooks/car-dealership/useVehicleOptions";

interface Props {
  storeId: string;
  vehicleId: string | null;
  vehicleLabel: string;
  /** Called when a vehicle is chosen from inventory */
  onSelect: (vehicle: VehicleOption | null) => void;
  /** Called when the free-text label changes */
  onLabelChange: (label: string) => void;
  required?: boolean;
  className?: string;
}

export default function VehiclePicker({
  storeId, vehicleId, vehicleLabel, onSelect, onLabelChange, required, className,
}: Props) {
  const { options, loading } = useVehicleOptions(storeId);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"picker" | "manual">(vehicleId ? "picker" : "picker");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return options;
    return options.filter((o) =>
      o.label.toLowerCase().includes(q) ||
      (o.vin?.toLowerCase().includes(q)) ||
      (o.stock_number?.toLowerCase().includes(q))
    );
  }, [options, search]);

  const selected = options.find((o) => o.id === vehicleId) ?? null;

  const handleSelectChange = (value: string) => {
    if (value === "_manual") {
      setMode("manual");
      onSelect(null);
      return;
    }
    if (value === "_none") {
      onSelect(null);
      return;
    }
    const vehicle = options.find((o) => o.id === value);
    if (vehicle) {
      setMode("picker");
      onSelect(vehicle);
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>Vehicle {required && <span className="text-destructive">*</span>}</Label>

      {options.length > 0 && mode === "picker" ? (
        <div className="space-y-1.5">
          {/* search filter */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Filter inventory…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={vehicleId ?? "_none"}
            onValueChange={handleSelectChange}
            disabled={loading}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder={loading ? "Loading inventory…" : "— Select from inventory —"} />
            </SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value="_none">— Select from inventory —</SelectItem>
              {filtered.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <span className="flex items-center gap-2">
                    <Car className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {v.label}
                      {v.stock_number && <span className="ml-1 text-[10px] text-muted-foreground">#{v.stock_number}</span>}
                    </span>
                  </span>
                </SelectItem>
              ))}
              <SelectItem value="_manual">
                <span className="text-muted-foreground italic">✎ Type manually…</span>
              </SelectItem>
            </SelectContent>
          </Select>
          {selected?.vin && (
            <p className="text-[10px] text-muted-foreground pl-1">VIN: {selected.vin}</p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <Input
            value={vehicleLabel}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder="e.g. 2023 Toyota Camry SE"
          />
          {options.length > 0 && (
            <button
              type="button"
              className="text-[11px] text-primary hover:underline"
              onClick={() => { setMode("picker"); setSearch(""); }}
            >
              ← Pick from inventory
            </button>
          )}
        </div>
      )}
    </div>
  );
}
