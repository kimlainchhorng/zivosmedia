/**
 * Vehicle add/edit dialog — tabbed layout.
 *
 * Tab 1 · Vehicle   — identity (year/make/model/trim/body/VIN/stock#/condition/status/toggles)
 * Tab 2 · Specs     — mechanical (transmission/fuel/drivetrain/engine/cylinders/doors/seats/
 *                       mileage/colors/photo) + feature chips
 * Tab 3 · Pricing   — costs/margins/min-price/acquisition/description
 */
import { useEffect, useState, useRef, useMemo } from "react";
import { X, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  DealershipVehicle, DealershipVehicleDraft,
  DealershipCondition, DealershipTransmission, DealershipFuel,
  DealershipDrivetrain, DealershipVehicleStatus,
} from "@/hooks/car-dealership/useDealershipInventory";
import VehiclePhotoManager from "./VehiclePhotoManager";
import { decodeVin } from "@/lib/car-dealership/decodeVin";

interface Props {
  storeId: string;
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

const toDollars = (cents: number) =>
  cents === 0 ? "" : (cents / 100).toFixed(2).replace(/\.00$/, "");

const fromDollars = (str: string) => {
  const cleaned = str.replace(/[^\d.]/g, "");
  if (!cleaned) return 0;
  return Math.round(parseFloat(cleaned) * 100);
};

// ─── margin helper ────────────────────────────────────────────────────────────

function MarginBadge({ cost, ask }: { cost: number; ask: number }) {
  if (!ask || !cost) return null;
  const pct = ((ask - cost) / ask) * 100;
  const cls =
    pct >= 20 ? "bg-emerald-500/15 text-emerald-700"
    : pct >= 10 ? "bg-green-500/15 text-green-700"
    : pct >= 5  ? "bg-amber-500/15 text-amber-700"
    : "bg-red-500/15 text-red-700";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold", cls)}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}% margin
    </span>
  );
}

// ─── dialog ───────────────────────────────────────────────────────────────────

// Stable UUID generator for new-vehicle photo upload folders.
function genTempId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CarDealershipVehicleDialog({
  storeId, open, onOpenChange, editing, saving, onSubmit,
}: Props) {
  const [draft, setDraft] = useState<DealershipVehicleDraft>(emptyDraft());
  const [tab, setTab] = useState("vehicle");
  const [featureInput, setFeatureInput] = useState("");
  const featureInputRef = useRef<HTMLInputElement>(null);
  const [decodingVin, setDecodingVin] = useState(false);
  // Temp ID used for the photo-upload folder when creating a new vehicle.
  // Reset every time the dialog re-opens in "new" mode.
  const [tempVehicleId, setTempVehicleId] = useState<string>(() => genTempId());

  // ID to pass to the photo manager — real vehicle ID when editing, temp UUID otherwise.
  const photoFolderId = useMemo(
    () => editing?.id ?? tempVehicleId,
    [editing?.id, tempVehicleId],
  );

  useEffect(() => {
    if (editing) {
      const { id, store_id, created_at, updated_at, days_on_lot, ...rest } = editing;
      setDraft(rest);
    } else if (open) {
      setDraft(emptyDraft());
      setTempVehicleId(genTempId()); // fresh upload folder for each new draft
    }
    if (open) { setTab("vehicle"); setFeatureInput(""); }
  }, [editing, open]);

  const update = <K extends keyof DealershipVehicleDraft>(key: K, value: DealershipVehicleDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f) return;
    if (!draft.features.includes(f)) {
      update("features", [...draft.features, f]);
    }
    setFeatureInput("");
    featureInputRef.current?.focus();
  };

  const removeFeature = (f: string) =>
    update("features", draft.features.filter((x) => x !== f));

  const handleDecodeVin = async () => {
    const vin = (draft.vin ?? "").trim();
    if (vin.length < 11) {
      toast.error("Enter a 17-character VIN first.");
      return;
    }
    setDecodingVin(true);
    try {
      const result = await decodeVin(vin);
      if (result.fieldCount === 0) {
        toast.error(result.warning ?? "Couldn't decode that VIN.");
        return;
      }
      // Only fill blanks — never overwrite user-entered data
      setDraft((d) => {
        const next = { ...d };
        const patch = result.patch;
        if (!d.year && patch.year != null) next.year = patch.year;
        if (!d.make.trim() && patch.make) next.make = patch.make;
        if (!d.model.trim() && patch.model) next.model = patch.model;
        if (!d.trim && patch.trim) next.trim = patch.trim;
        if (!d.body_type && patch.body_type) next.body_type = patch.body_type;
        if (d.cylinders == null && patch.cylinders != null) next.cylinders = patch.cylinders;
        if (d.doors == null && patch.doors != null) next.doors = patch.doors;
        if (d.seats == null && patch.seats != null) next.seats = patch.seats;
        if (!d.engine && patch.engine) next.engine = patch.engine;
        // Fuel/drivetrain only auto-fill if still on their defaults
        if (d.fuel_type === "gasoline" && patch.fuel_type) next.fuel_type = patch.fuel_type;
        if (d.drivetrain == null && patch.drivetrain) next.drivetrain = patch.drivetrain;
        return next;
      });
      toast.success(`Decoded: ${result.summary}`);
    } catch (e: any) {
      console.error("[VIN decode] failed", e);
      toast.error(e?.message || "Couldn't reach the VIN decoder service.");
    } finally {
      setDecodingVin(false);
    }
  };

  const handleSubmit = async () => {
    if (!draft.make.trim() || !draft.model.trim()) { setTab("vehicle"); return; }
    await onSubmit(draft);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle>{editing ? "Edit vehicle" : "Add vehicle to inventory"}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-4 w-auto shrink-0 self-start">
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="specs">Specs</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          {/* ── Tab 1 · Vehicle ───────────────────────────────────────────── */}
          <TabsContent value="vehicle" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">

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
                <Input
                  value={draft.make}
                  onChange={(e) => update("make", e.target.value)}
                  placeholder="Toyota"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Model *</Label>
                <Input
                  value={draft.model}
                  onChange={(e) => update("model", e.target.value)}
                  placeholder="Camry"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Trim</Label>
                <Input
                  value={draft.trim ?? ""}
                  onChange={(e) => update("trim", e.target.value || null)}
                  placeholder="SE / LE / Limited"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Body type</Label>
                <Input
                  value={draft.body_type ?? ""}
                  onChange={(e) => update("body_type", e.target.value || null)}
                  placeholder="Sedan / SUV / Truck"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>VIN</span>
                  <button
                    type="button"
                    onClick={handleDecodeVin}
                    disabled={decodingVin || !draft.vin || draft.vin.trim().length < 11}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                      decodingVin || !draft.vin || draft.vin.trim().length < 11
                        ? "bg-muted text-muted-foreground/50 cursor-not-allowed"
                        : "bg-primary/10 text-primary hover:bg-primary/20",
                    )}
                    title={
                      !draft.vin || draft.vin.trim().length < 11
                        ? "Enter a 17-char VIN first"
                        : "Auto-fill year, make, model, body, engine, etc. from this VIN"
                    }
                  >
                    {decodingVin
                      ? <><Loader2 className="h-2.5 w-2.5 animate-spin" />Decoding...</>
                      : <><Wand2 className="h-2.5 w-2.5" />Decode VIN</>}
                  </button>
                </Label>
                <Input
                  value={draft.vin ?? ""}
                  onChange={(e) => update("vin", e.target.value.toUpperCase() || null)}
                  className="font-mono uppercase"
                  maxLength={17}
                  placeholder="17-character VIN"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock #</Label>
                <Input
                  value={draft.stock_number ?? ""}
                  onChange={(e) => update("stock_number", e.target.value || null)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>License plate</Label>
                <Input
                  value={draft.license_plate ?? ""}
                  onChange={(e) => update("license_plate", e.target.value || null)}
                  className="uppercase"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lot location</Label>
                <Input
                  value={draft.location_label ?? ""}
                  onChange={(e) => update("location_label", e.target.value || null)}
                  placeholder="Lot A, Row 3"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Active in inventory</p>
                <p className="text-xs text-muted-foreground">Hidden from storefront when inactive.</p>
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
          </TabsContent>

          {/* ── Tab 2 · Specs ─────────────────────────────────────────────── */}
          <TabsContent value="specs" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">

            <div className="grid grid-cols-3 gap-3">
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
            </div>

            <div className="space-y-1.5">
              <Label>Engine</Label>
              <Input
                value={draft.engine ?? ""}
                onChange={(e) => update("engine", e.target.value || null)}
                placeholder="2.5L 4-cyl / 3.5L V6 / 2.0L Turbocharged"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Cylinders</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft.cylinders ?? ""}
                  onChange={(e) => update("cylinders", e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="4"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Doors</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.doors ?? ""}
                  onChange={(e) => update("doors", e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="4"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Seats</Label>
                <Input
                  type="number"
                  min={1}
                  value={draft.seats ?? ""}
                  onChange={(e) => update("seats", e.target.value ? parseInt(e.target.value, 10) : null)}
                  placeholder="5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mileage</Label>
                <Input
                  type="number"
                  min={0}
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
                <Input
                  value={draft.exterior_color ?? ""}
                  onChange={(e) => update("exterior_color", e.target.value || null)}
                  placeholder="Arctic White"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Interior color</Label>
                <Input
                  value={draft.interior_color ?? ""}
                  onChange={(e) => update("interior_color", e.target.value || null)}
                  placeholder="Black Leather"
                />
              </div>
            </div>

            <VehiclePhotoManager
              storeId={storeId}
              vehicleId={photoFolderId}
              photos={draft.photo_urls}
              onChange={(photos) => setDraft((d) => ({
                ...d,
                photo_urls: photos,
                photo_url: photos[0] ?? null, // primary mirrors the first photo
              }))}
            />

            {/* ── Features chip input ── */}
            <div className="space-y-2">
              <Label>Features & options</Label>
              <div className="flex gap-2">
                <Input
                  ref={featureInputRef}
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }}
                  placeholder="Type a feature and press Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addFeature}
                  disabled={!featureInput.trim()}
                >
                  Add
                </Button>
              </div>
              {draft.features.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {draft.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1"
                    >
                      {f}
                      <button
                        type="button"
                        onClick={() => removeFeature(f)}
                        className="hover:text-destructive transition-colors"
                        aria-label={`Remove ${f}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {draft.features.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  E.g. "Backup camera", "Heated seats", "Navigation", "Sunroof"
                </p>
              )}
            </div>
          </TabsContent>

          {/* ── Tab 3 · Pricing ───────────────────────────────────────────── */}
          <TabsContent value="pricing" className="flex-1 overflow-y-auto px-6 py-4 space-y-4 mt-0">

            {/* Main price box */}
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pricing</p>
                <MarginBadge cost={draft.cost_cents} ask={draft.asking_price_cents} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Cost ($)</Label>
                  <Input
                    inputMode="decimal"
                    value={toDollars(draft.cost_cents)}
                    onChange={(e) => update("cost_cents", fromDollars(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">MSRP ($)</Label>
                  <Input
                    inputMode="decimal"
                    value={toDollars(draft.msrp_cents)}
                    onChange={(e) => update("msrp_cents", fromDollars(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Asking price ($)</Label>
                  <Input
                    inputMode="decimal"
                    value={toDollars(draft.asking_price_cents)}
                    onChange={(e) => update("asking_price_cents", fromDollars(e.target.value))}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Gross read-out */}
              {draft.cost_cents > 0 && draft.asking_price_cents > 0 && (
                <div className="flex items-center justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground text-xs">Gross if sold at asking</span>
                  <span className={cn(
                    "font-bold",
                    draft.asking_price_cents >= draft.cost_cents ? "text-emerald-700" : "text-red-700",
                  )}>
                    {draft.asking_price_cents >= draft.cost_cents ? "+" : ""}
                    {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
                      .format((draft.asking_price_cents - draft.cost_cents) / 100)}
                  </span>
                </div>
              )}
            </div>

            {/* Floor price */}
            <div className="space-y-1.5">
              <Label>Minimum / floor price ($)</Label>
              <Input
                inputMode="decimal"
                value={toDollars(draft.min_price_cents)}
                onChange={(e) => update("min_price_cents", fromDollars(e.target.value))}
                placeholder="Do not sell below this amount"
              />
              <p className="text-xs text-muted-foreground">
                Internal use only — not shown to customers.
              </p>
            </div>

            {/* Acquisition */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Acquired on</Label>
                <Input
                  type="date"
                  value={draft.acquired_at ?? ""}
                  onChange={(e) => update("acquired_at", e.target.value || null)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Acquired from</Label>
                <Input
                  value={draft.acquired_from ?? ""}
                  onChange={(e) => update("acquired_from", e.target.value || null)}
                  placeholder="Auction / Trade-in / Private party"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={draft.description ?? ""}
                onChange={(e) => update("description", e.target.value || null)}
                placeholder="One-owner, full service history, no accidents..."
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 border-t shrink-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !draft.make.trim() || !draft.model.trim()}>
            {saving ? "Saving..." : editing ? "Save changes" : "Add vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
