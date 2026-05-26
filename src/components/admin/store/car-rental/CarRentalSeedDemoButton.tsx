/**
 * One-click "Seed demo data" button shown on the dashboard when the store is
 * empty. Populates a realistic starter fleet so the operator can immediately
 * explore the workflow.
 */
import { useState } from "react";
import { Sparkles, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  storeId: string;
  hasLocation: boolean;
  hasVehicle: boolean;
  hasAddon: boolean;
  onSeeded?: () => void;
}

export default function CarRentalSeedDemoButton({ storeId, hasLocation, hasVehicle, hasAddon, onSeeded }: Props) {
  const [open, setOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't show the card if the operator already has fleet content set up.
  if (hasLocation && hasVehicle && hasAddon) return null;

  const seed = async () => {
    setRunning(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Default location
      let locationId: string | null = null;
      if (!hasLocation) {
        const { data, error: err } = await supabase
          .from("car_rental_locations")
          .insert({
            store_id: storeId,
            name: "Main Branch",
            address: "100 Main Street",
            city: "Phnom Penh",
            country: "Cambodia",
            phone: "+855 12 345 678",
            open_time: "07:00",
            close_time: "20:00",
            is_default: true,
            is_active: true,
          } as never)
          .select("id")
          .single();
        if (err) throw err;
        locationId = (data as any).id;
      } else {
        const { data } = await supabase.from("car_rental_locations").select("id").eq("store_id", storeId).order("is_default", { ascending: false }).limit(1).maybeSingle();
        locationId = (data as any)?.id ?? null;
      }

      // 2. Three vehicles spanning categories
      const vehicleSeeds = [
        {
          make: "Toyota", model: "Camry", year: 2024, color: "Silver",
          license_plate: "DEMO-001", category: "standard" as const,
          transmission: "automatic" as const, fuel_type: "gasoline" as const,
          seats: 5, doors: 4, luggage_capacity: 3, air_conditioning: true,
          daily_rate_cents: 4500, weekly_rate_cents: 27000, monthly_rate_cents: 100000, hourly_rate_cents: 1000,
          mileage_limit_per_day: 200, extra_mile_cents: 20, security_deposit_cents: 15000,
          description: "Reliable mid-size sedan with great fuel economy. Perfect for business trips.",
          photo_url: "https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800",
        },
        {
          make: "Honda", model: "CR-V", year: 2023, color: "Pearl White",
          license_plate: "DEMO-002", category: "suv" as const,
          transmission: "automatic" as const, fuel_type: "gasoline" as const,
          seats: 5, doors: 4, luggage_capacity: 4, air_conditioning: true,
          daily_rate_cents: 6500, weekly_rate_cents: 39000, monthly_rate_cents: 150000, hourly_rate_cents: 1500,
          mileage_limit_per_day: 200, extra_mile_cents: 25, security_deposit_cents: 20000,
          description: "Spacious SUV with AWD. Ideal for road trips and family travel.",
          photo_url: "https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800",
        },
        {
          make: "Toyota", model: "Yaris", year: 2024, color: "Red",
          license_plate: "DEMO-003", category: "economy" as const,
          transmission: "automatic" as const, fuel_type: "gasoline" as const,
          seats: 5, doors: 4, luggage_capacity: 2, air_conditioning: true,
          daily_rate_cents: 3000, weekly_rate_cents: 18000, monthly_rate_cents: 68000, hourly_rate_cents: 700,
          mileage_limit_per_day: 250, extra_mile_cents: 15, security_deposit_cents: 10000,
          description: "Compact and efficient — easy to park in the city.",
          photo_url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800",
        },
      ];
      if (!hasVehicle) {
        const payload = vehicleSeeds.map((v) => ({
          ...v, store_id: storeId, home_location_id: locationId, is_active: true,
        }));
        const { error: err } = await supabase.from("car_rental_vehicles").insert(payload as never);
        if (err) throw err;
      }

      // 3. Common add-ons
      if (!hasAddon) {
        const addons = [
          { name: "Comprehensive insurance", description: "Zero-deductible damage waiver.", price_cents: 1500, billing: "per_day" as const, sort_order: 1 },
          { name: "GPS navigation", description: "Pre-loaded device with local maps.", price_cents: 800, billing: "per_day" as const, sort_order: 2 },
          { name: "Child car seat", description: "Forward-facing seat for ages 3+.", price_cents: 1000, billing: "per_rental" as const, sort_order: 3 },
          { name: "Additional driver", description: "Add a second authorized driver.", price_cents: 1200, billing: "per_rental" as const, sort_order: 4 },
        ];
        const payload = addons.map((a) => ({ ...a, store_id: storeId, is_active: true }));
        const { error: err } = await supabase.from("car_rental_addons").insert(payload as never);
        if (err) throw err;
      }

      // 4. Default settings (only if missing)
      const { data: existingSettings } = await supabase
        .from("car_rental_store_settings")
        .select("store_id")
        .eq("store_id", storeId)
        .maybeSingle();
      if (!existingSettings) {
        await supabase.from("car_rental_store_settings").insert({
          store_id: storeId,
          tax_rate_bps: 1000,
          tax_label: "VAT",
          currency_code: "USD",
          no_show_grace_hours: 4,
          auto_confirm_app_bookings: false,
          late_grace_hours: 12,
          cancellation_policy:
            "Free cancellation up to 24 hours before pickup. After that, 50% of the daily rate is non-refundable. No-shows forfeit the full deposit.",
        } as never);
      }

      // Audit attribution
      void user;

      toast.success("Demo data added", {
        description: "1 location, 3 vehicles, 4 add-ons, and default settings.",
      });
      setOpen(false);
      onSeeded?.();
    } catch (e: any) {
      console.error("[seed] failed", e);
      setError(e?.message ?? "Couldn't seed demo data.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="rounded-2xl border-dashed border-primary/40 bg-primary/5">
      <CardContent className="p-4 flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">Want to try it out fast?</p>
          <p className="text-[11px] text-muted-foreground">
            Seed sample vehicles, a location, and add-ons so you can explore the workflow.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Sparkles className="mr-1 h-3.5 w-3.5" /> Seed demo data
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(o) => !running && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Seed demo data?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              This will add the following to your <span className="font-semibold text-foreground">live store</span>:
            </p>
            <ul className="space-y-1.5 text-sm text-foreground">
              {!hasLocation && <li>• Main Branch location (Phnom Penh, 7am–8pm)</li>}
              {!hasVehicle && <>
                <li>• 2024 Toyota Camry · $45/day</li>
                <li>• 2023 Honda CR-V (SUV) · $65/day</li>
                <li>• 2024 Toyota Yaris (economy) · $30/day</li>
              </>}
              {!hasAddon && <>
                <li>• 4 add-ons (insurance, GPS, child seat, additional driver)</li>
              </>}
              <li>• Default settings (10% VAT, 24-hour cancellation policy)</li>
            </ul>
            <p className="text-[11px] text-muted-foreground">
              You can delete or edit any of these afterwards from the Fleet, Locations, and Add-ons tabs.
            </p>
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" /> {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={running}>Cancel</Button>
            <Button onClick={seed} disabled={running}>
              {running ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              Seed it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
