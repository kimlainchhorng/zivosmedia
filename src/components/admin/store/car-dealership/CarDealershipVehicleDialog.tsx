/**
 * Vehicle add/edit dialog for the inventory section.
 */
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import type {
  DealershipVehicle, DealershipVehicleDraft,
  DealershipCondition, DealershipTransmission, DealershipFuel,
  DealershipDrivetrain, DealershipVehicleStatus,
} from "@/hooks/car-dealership/useDealershipInventory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: DealershipVehicle | null;
  saving: boolean;
  onSubmit: (draft: DealershipVehicleDraft) => Promise<void> | void;
}

const emptyDraft = (): DealershipVehicleDraft => ({
  stock_number: null,
  vin: null,
  make: "",
  model: "",
  trim: null,
  year: new Date().getFullYear(),
  body_type: null,
  exterior_color: null,
  interior_color: null,
  license_plate: null,
  condition: "used",
  transmission: "automatic",
  fuel_type: "gasoline",
  drivetrain: null,
  engine: null,
  cylinders: null,
  doors: 4,
  seats: 5,
  mileage: 0,
  mileage_unit: "mi",
  cost_cents: 0,
  asking_price_cents: 0,
  msrp_cents: 0,
  min_price_cents: 0,
  photo_url: null,
  photo_urls: [],
  video_url: null,
  features: [],
  description: null,
  acquired_at: null,
  acquired_from: null,
  location_label: null,
  status: "available",
  is_active: true,
  is_featured: false,
});

const toDollars = (cents: number) => (cents / 100).toString();
const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  return Math.round(parseFloat(cleaned) * 100);
};

export default function CarDealershipVehicleDialog({ open, onOpenChange, editing, saving, onSubmit }: Props) {
  const [draft, setDraft] = useState<DealershipVehicleDraft>(emptyDraft());

  useEffect(() => {
    if (editing) {
      const { id, store_id, created_at, updated_at, days_on_lot, ...rest } = editing;
      setDraft(rest);
    } else if (open) {
      setDraft(emptyDraft());
    }
  }, [editing, open]);

  const update = <K extends keyof DealershipVehicleDraft>(key: K, value: DealershipVehicleDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const handleSubmit = async () => {
    if (!draft.make.trim() || !draft.model.trim()) return;
    await onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle to inventory"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Input
                type="number"
                value={draft.year ?? ""}
                onChange={(e) => update("year", e.target.value ? parseInt(e.target.value, 10) : null)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Make *</Label>
              <Input value={draft.make} onChange={(e) => update("make", e.target.value)} placeholder="Toyota" />
            </div>
            <div className="space-y-1.5">
              <Label>Model *</Label>
              <Input value={draft.model} onChange={(e) => update("model", e.target.value)} placeholder="Camry" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Trim</Label>
              <Input value={draft.trim ?? ""} onChange={(e) => update("trim", e.target.value || null)} placeholder="SE / Limited" />
            </div>
            <div className="space-y-1.5">
              <Label>Body type</Label>
              <Input value={draft.body_type ?? ""} onChange={(e) => update("body_type", e.target.value || null)} placeholder="Sedan / SUV" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>VIN</Label>
              <Input value={draft.vin ?? ""} onChange={(e) => update("vin", e.target.value || null)} className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Stock #</Label>
              <Input value={draft.stock_number ?? ""} onChange={(e) => update("stock_number", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Condition</Label>
              <Select value={draft.condition} onValueChange={(v) => update("condition", v as DealershipCondition)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="used">Used</SelectItem>
                  <SelectItem value="certified_preowned">Certified Pre-owned</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Transmission</Label>
              <Select value={draft.transmission} onValueChange={(v) => update("transmission", v as DealershipTransmission)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatic">Automatic</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="cvt">CVT</SelectItem>
                  <SelectItem value="dual_clutch">Dual Clutch</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fuel</Label>
              <Select value={draft.fuel_type} onValueChange={(v) => update("fuel_type", v as DealershipFuel)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasoline">Gasoline</SelectItem>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="plugin_hybrid">Plug-in Hybrid</SelectItem>
                  <SelectItem value="electric">Electric</SelectItem>
                  <SelectItem value="flex_fuel">Flex Fuel</SelectItem>
                  <SelectItem value="lpg">LPG</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Drivetrain</Label>
              <Select
                value={draft.drivetrain ?? "_none"}
                onValueChange={(v) => update("drivetrain", v === "_none" ? null : (v as DealershipDrivetrain))}
              >
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  <SelectItem value="fwd">FWD</SelectItem>
                  <SelectItem value="rwd">RWD</SelectItem>
                  <SelectItem value="awd">AWD</SelectItem>
                  <SelectItem value="4wd">4WD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mileage</Label>
              <Input
                type="number"
                value={draft.mileage ?? 0}
                onChange={(e) => update("mileage", e.target.value ? parseInt(e.target.value, 10) : 0)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Unit</Label>
              <Select value={draft.mileage_unit} onValueChange={(v) => update("mileage_unit", v as "mi" | "km")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mi">mi</SelectItem>
                  <SelectItem value="km">km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Exterior color</Label>
              <Input value={draft.exterior_color ?? ""} onChange={(e) => update("exterior_color", e.target.value || null)} />
            </div>
            <div className="space-y-1.5">
              <Label>Interior color</Label>
              <Input value={draft.interior_color ?? ""} onChange={(e) => update("interior_color", e.target.value || null)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-muted/30 p-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Cost ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(draft.cost_cents)}
                onChange={(e) => update("cost_cents", fromDollars(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">MSRP ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(draft.msrp_cents)}
                onChange={(e) => update("msrp_cents", fromDollars(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Asking price ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(draft.asking_price_cents)}
                onChange={(e) => update("asking_price_cents", fromDollars(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Photo URL</Label>
            <Input
              value={draft.photo_url ?? ""}
              onChange={(e) => update("photo_url", e.target.value || null)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => update("description", e.target.value || null)}
              placeholder="One-owner, full service history, no accidents..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={draft.status} onValueChange={(v) => update("status", v as DealershipVehicleStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="pending_sale">Pending sale</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="in_transit">In transit</SelectItem>
                  <SelectItem value="service">In service</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lot location</Label>
              <Input value={draft.location_label ?? ""} onChange={(e) => update("location_label", e.target.value || null)} placeholder="Lot A, Row 3" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Active in inventory</p>
              <p className="text-xs text-muted-foreground">Inactive vehicles are hidden from the storefront and search.</p>
            </div>
            <Switch checked={draft.is_active} onCheckedChange={(v) => update("is_active", v)} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Featured</p>
              <p className="text-xs text-muted-foreground">Show in featured slots on the storefront.</p>
            </div>
            <Switch checked={draft.is_featured} onCheckedChange={(v) => update("is_featured", v)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !draft.make.trim() || !draft.model.trim()}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
