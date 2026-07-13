/**
 * Admin Pricing Page — Manage ride pricing (city_pricing table)
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface PricingRow {
  id: string;
  city: string | null;
  ride_type: string | null;
  base_fare: number | null;
  per_mile: number | null;
  per_minute: number | null;
  booking_fee: number | null;
  minimum_fare: number | null;
  card_fee_pct: number | null;
  is_active: boolean | null;
  updated_at: string | null;
}

const RIDE_TYPES_GLOBAL = [
  "standard", "share", "comfort", "ev", "xl",
  "black", "black_suv", "luxury_xl", "pet", "wheelchair",
];

const RIDE_TYPES_CAMBODIA = [
  "standard", "share", "comfort", "ev", "xl", "pet",
  "tuktuk", "tuktuk_ev", "moto", "share_xl",
];

// Map ride_type → vehicle thumbnail image
const RIDE_TYPE_IMAGES: Record<string, string> = {
  standard: "/vehicles/economy-car-v2.png",
  share: "/vehicles/share-car-v2.png",
  comfort: "/vehicles/comfort-car-v2.png",
  ev: "/vehicles/ev-car-v2.png",
  xl: "/vehicles/xl-car-v2.png",
  black: "/vehicles/black-lane-car-v2.png",
  black_suv: "/vehicles/black-xl-car-v2.png",
  luxury_xl: "/vehicles/luxury-car-v2.png",
  pet: "/vehicles/pet-car-v2.png",
  wheelchair: "/vehicles/wheelchair-car-v2.png",
  tuktuk: "/vehicles/zivo-tuktuk.png",
  tuktuk_ev: "/vehicles/zivo-ev-tuktuk.png",
  moto: "/vehicles/zivo-moto-v2.png",
  share_xl: "/vehicles/xl-car-v2.png",
};

// ZIVO-branded display names for Cambodia ride types
const CAMBODIA_RIDE_LABELS: Record<string, string> = {
  tuktuk: "ZIVO Tuk Tuk",
  tuktuk_ev: "ZIVO EV Tuk Tuk",
  moto: "ZIVO Moto",
  standard: "ZIVO Comfort",
  comfort: "ZIVO Comfort+",
  ev: "ZIVO EV",
  xl: "ZIVO XL",
  share: "ZIVO Share",
  share_xl: "ZIVO Share XL",
  pet: "ZIVO Pet",
};

/** Get display label for ride type */
function getRideTypeLabel(rideType: string, cambodia: boolean): string {
  if (cambodia && CAMBODIA_RIDE_LABELS[rideType]) return CAMBODIA_RIDE_LABELS[rideType];
  return rideType.replace(/_/g, " ");
}

// Country filter presets — map country label to known city names
const COUNTRY_FILTERS: { label: string; flag: string; cities: string[] | "all" }[] = [
  { label: "All", flag: "🌍", cities: "all" },
  { label: "USA", flag: "🇺🇸", cities: ["default", "Baton Rouge", "New York", "Los Angeles", "Chicago", "Houston", "Dallas", "Miami", "Atlanta", "San Francisco", "Seattle", "Denver", "Boston", "Phoenix", "Philadelphia", "San Antonio", "San Diego", "Austin", "Jacksonville", "Columbus", "Charlotte", "Indianapolis", "Washington", "Nashville", "Portland", "Las Vegas", "Memphis", "Louisville", "Baltimore", "Milwaukee", "Albuquerque", "Tucson", "Fresno", "Sacramento", "Mesa", "Kansas City", "Omaha", "Cleveland", "Virginia Beach", "Raleigh", "Minneapolis", "Tampa", "New Orleans", "Orlando", "Detroit", "St. Louis", "Pittsburgh", "Cincinnati", "Honolulu", "Anchorage"] },
  { label: "Cambodia", flag: "🇰🇭", cities: ["Phnom Penh", "Siem Reap", "Battambang", "Sihanoukville", "Kampong Cham", "Poipet", "Kampot", "Takeo", "Svay Rieng", "Prey Veng", "Pursat", "Kratie", "Koh Kong", "Stung Treng", "Ratanakiri", "Mondulkiri", "Pailin", "Kep", "Banteay Meanchey", "Kandal", "Kampong Chhnang", "Kampong Speu", "Kampong Thom", "Preah Vihear", "Oddar Meanchey", "Tboung Khmum"] },
];

const defaultForm = {
  city: "default",
  ride_type: "standard",
  base_fare: 3.5,
  per_mile: 1.75,
  per_minute: 0.35,
  booking_fee: 2.5,
  minimum_fare: 7,
  card_fee_pct: 0,
  is_active: true,
};

export default function AdminPricingPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [countryFilter, setCountryFilter] = useState(0);
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  const isCambodia = COUNTRY_FILTERS[countryFilter]?.label === "Cambodia";
  const RIDE_TYPES = isCambodia ? RIDE_TYPES_CAMBODIA : RIDE_TYPES_GLOBAL;
  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-city-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_pricing")
        .select("*")
        .order("city")
        .order("ride_type");
      if (error) throw error;
      return data as PricingRow[];
    },
  });

  // All Cambodian cities (excluding Phnom Penh) that should sync
  const CAMBODIA_OTHER_CITIES = COUNTRY_FILTERS[2].cities !== "all"
    ? (COUNTRY_FILTERS[2].cities as string[]).filter((c) => c !== "Phnom Penh")
    : [];

  const upsert = useMutation({
    mutationFn: async (values: typeof form & { id?: string }) => {
      const now = new Date().toISOString();
      if (values.id) {
        const { error } = await supabase
          .from("city_pricing")
          .update({ ...values, updated_at: now })
          .eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("city_pricing")
          .insert({ ...values, updated_at: now });
        if (error) throw error;
      }

      // Auto-sync: if this is a Phnom Penh row, propagate pricing to all other Cambodian cities
      const isCambodiaCity = COUNTRY_FILTERS[2].cities !== "all" &&
        (COUNTRY_FILTERS[2].cities as string[]).some((c) => c.toLowerCase() === values.city.toLowerCase());

      if (values.city === "Phnom Penh" || isCambodiaCity) {
        // Always sync from Phnom Penh pricing to all other cities for this ride_type
        const pricingFields = {
          base_fare: values.base_fare,
          per_mile: values.per_mile,
          per_minute: values.per_minute,
          booking_fee: values.booking_fee,
          minimum_fare: values.minimum_fare,
          card_fee_pct: values.card_fee_pct,
          is_active: values.is_active,
        };

        // Only sync to others if editing Phnom Penh
        if (values.city === "Phnom Penh") {
          for (const otherCity of CAMBODIA_OTHER_CITIES) {
            // Check if row exists for this city + ride_type
            const { data: existing } = await supabase
              .from("city_pricing")
              .select("id")
              .eq("city", otherCity)
              .eq("ride_type", values.ride_type)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("city_pricing")
                .update({ ...pricingFields, updated_at: now })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("city_pricing")
                .insert({
                  city: otherCity,
                  ride_type: values.ride_type,
                  ...pricingFields,
                  updated_at: now,
                });
            }
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-city-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["city-pricing"] });
      const syncMsg = form.city === "Phnom Penh" ? " (synced to all Cambodia cities)" : "";
      toast.success((editingId ? "Pricing updated" : "Pricing added") + syncMsg);
      closeDialog();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("city_pricing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-city-pricing"] });
      queryClient.invalidateQueries({ queryKey: ["city-pricing"] });
      toast.success("Pricing deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  function openEdit(row: PricingRow) {
    setEditingId(row.id);
    setForm({
      city: row.city || "default",
      ride_type: row.ride_type || "standard",
      base_fare: row.base_fare ?? 0,
      per_mile: row.per_mile ?? 0,
      per_minute: row.per_minute ?? 0,
      booking_fee: row.booking_fee ?? 0,
      minimum_fare: row.minimum_fare ?? 0,
      card_fee_pct: row.card_fee_pct ?? 0,
      is_active: row.is_active ?? true,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingId(null);
    setForm(defaultForm);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    upsert.mutate(editingId ? { ...form, id: editingId } : form);
  }

  const activeFilter = COUNTRY_FILTERS[countryFilter];
  
  // Get rows matching the country filter
  const countryRows = useMemo(() => rows?.filter((r) => {
    if (activeFilter.cities === "all") return true;
    const city = (r.city || "default").toLowerCase();
    return activeFilter.cities.some((c) => c.toLowerCase() === city);
  }), [rows, activeFilter]);

  // Extract unique cities from country-filtered rows for sub-filter
  const availableCities = useMemo(() => {
    if (!countryRows || activeFilter.cities === "all") return [];
    const citySet = new Set(countryRows.map((r) => r.city || "default"));
    return Array.from(citySet).sort();
  }, [countryRows, activeFilter]);

  // Apply city sub-filter
  const filteredRows = useMemo(() => {
    if (!cityFilter) return countryRows;
    return countryRows?.filter((r) => (r.city || "default") === cityFilter);
  }, [countryRows, cityFilter]);

  return (
    <AdminLayout title="Pricing Management">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Manage ride pricing per city and vehicle type.
          </p>
          <div className="flex items-center gap-2">
            <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={() => {
                setEditingId(null);
                const filter = COUNTRY_FILTERS[countryFilter];
                const countryCities = filter.cities !== "all" ? filter.cities : [];
                const defaultCity = cityFilter || (countryCities.length > 0 ? countryCities[0] : "default");
                setForm({ ...defaultForm, city: defaultCity, ride_type: RIDE_TYPES[0] });
              }}>
                <Plus className="w-4 h-4 mr-1.5" /> Add Pricing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Pricing" : "Add Pricing"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>City</Label>
                    {activeFilter.cities !== "all" && !editingId ? (
                      <select
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                      >
                        {(activeFilter.cities as string[]).map((c) => (
                          <option key={c} value={c}>
                            {c}{isCambodia && c === "Phnom Penh" ? " ★ Master" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="default" />
                    )}
                    {isCambodia && form.city === "Phnom Penh" && (
                      <p className="text-xs text-amber-600 mt-1">⚡ Changes will auto-sync to all 25 other Cambodia cities</p>
                    )}
                    {isCambodia && form.city !== "Phnom Penh" && (
                      <p className="text-xs text-muted-foreground mt-1">Pricing follows Phnom Penh. Edit Phnom Penh to change all.</p>
                    )}
                  </div>
                  <div>
                    <Label>Ride Type</Label>
                    <select
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                      value={form.ride_type}
                      onChange={(e) => setForm({ ...form, ride_type: e.target.value })}
                    >
                      {RIDE_TYPES.map((t) => <option key={t} value={t}>{getRideTypeLabel(t, isCambodia)}</option>)}
                    </select>
                  </div>
                </div>
                {/* Vehicle image preview */}
                {RIDE_TYPE_IMAGES[form.ride_type] && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                    <img
                      src={RIDE_TYPE_IMAGES[form.ride_type]}
                      alt={form.ride_type}
                      className="w-16 h-10 object-contain"
                    />
                    <span className="text-sm font-medium text-foreground">{getRideTypeLabel(form.ride_type, isCambodia)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Base Fare ({isCambodia ? "៛ KHR" : "$"})</Label>
                    <Input type="number" step="0.01" value={form.base_fare || ""} onChange={(e) => setForm({ ...form, base_fare: e.target.value === "" ? 0 : +e.target.value })} />
                  </div>
                  <div>
                    <Label>Per {isCambodia ? "Km" : "Mile"} ({isCambodia ? "៛ KHR" : "$"})</Label>
                    <Input type="number" step="0.01" value={form.per_mile || ""} onChange={(e) => setForm({ ...form, per_mile: e.target.value === "" ? 0 : +e.target.value })} />
                  </div>
                  <div>
                    <Label>Per Minute ({isCambodia ? "៛ KHR" : "$"})</Label>
                    <Input type="number" step="0.01" value={form.per_minute || ""} onChange={(e) => setForm({ ...form, per_minute: e.target.value === "" ? 0 : +e.target.value })} />
                  </div>
                  <div>
                    <Label>Booking Fee ({isCambodia ? "៛ KHR" : "$"})</Label>
                    <Input type="number" step="0.01" value={form.booking_fee || ""} onChange={(e) => setForm({ ...form, booking_fee: e.target.value === "" ? 0 : +e.target.value })} />
                  </div>
                  <div>
                    <Label>Minimum Fare ({isCambodia ? "៛ KHR" : "$"})</Label>
                    <Input type="number" step="0.01" value={form.minimum_fare || ""} onChange={(e) => setForm({ ...form, minimum_fare: e.target.value === "" ? 0 : +e.target.value })} />
                  </div>
                  <div>
                    <Label>Card Fee (%)</Label>
                    <Input type="number" step="0.1" min="0" max="100" value={form.card_fee_pct || ""} onChange={(e) => setForm({ ...form, card_fee_pct: e.target.value === "" ? 0 : +e.target.value })} placeholder="e.g. 3" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>Active</Label>
                </div>
                <Button type="submit" className="w-full" disabled={upsert.isPending}>
                  {upsert.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                  {editingId ? "Update" : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Country filter buttons */}
        <div className="flex flex-wrap gap-2">
          {COUNTRY_FILTERS.map((cf, i) => (
            <Button
              key={cf.label}
              variant={countryFilter === i ? "default" : "outline"}
              size="sm"
              onClick={() => { setCountryFilter(i); setCityFilter(null); }}
              className="gap-1.5"
            >
              <span>{cf.flag}</span> {cf.label}
              {cf.cities !== "all" && rows && (
                <span className="ml-1 text-xs opacity-70">
                  ({rows.filter((r) => cf.cities !== "all" && cf.cities.some((c) => c.toLowerCase() === (r.city || "default").toLowerCase())).length})
                </span>
              )}
            </Button>
          ))}
        </div>

        {/* City sub-filter (only for specific country) */}
        {availableCities.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant={cityFilter === null ? "secondary" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCityFilter(null)}
            >
              All Cities ({countryRows?.length})
            </Button>
            {availableCities.map((city) => (
              <Button
                key={city}
                variant={cityFilter === city ? "secondary" : "ghost"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setCityFilter(city)}
              >
                {city} ({countryRows?.filter((r) => (r.city || "default") === city).length})
              </Button>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredRows?.length ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              {rows?.length ? `No pricing rules for ${activeFilter.label}.` : "No pricing rules configured yet. Add your first one above."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>City</TableHead>
                  <TableHead>Ride Type</TableHead>
                  <TableHead className="text-right">Base</TableHead>
                  <TableHead className="text-right">/{isCambodia ? "Km" : "Mile"}</TableHead>
                  <TableHead className="text-right">/Min</TableHead>
                  <TableHead className="text-right">Booking</TableHead>
                  <TableHead className="text-right">Min Fare</TableHead>
                  <TableHead className="text-right">Card %</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => {
                  const sym = isCambodia ? "៛" : "$";
                  return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.city || "default"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {RIDE_TYPE_IMAGES[row.ride_type || ""] && (
                          <img
                            src={RIDE_TYPE_IMAGES[row.ride_type || ""]}
                            alt={row.ride_type || ""}
                            className="w-10 h-7 object-contain"
                          />
                        )}
                        <span>{getRideTypeLabel(row.ride_type || "", isCambodia)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{sym}{(row.base_fare ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{sym}{(row.per_mile ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{sym}{(row.per_minute ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{sym}{(row.booking_fee ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{sym}{(row.minimum_fare ?? 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">{(row.card_fee_pct ?? 0)}%</TableCell>
                    <TableCell>
                      <span className={row.is_active ? "text-green-500 text-xs font-medium" : "text-muted-foreground text-xs"}>
                        {row.is_active ? "Yes" : "No"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button aria-label="Edit" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button aria-label="Delete" variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Pricing</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete the <strong>{getRideTypeLabel(row.ride_type || "", isCambodia)}</strong> pricing for <strong>{row.city || "default"}</strong>? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMut.mutate(row.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
