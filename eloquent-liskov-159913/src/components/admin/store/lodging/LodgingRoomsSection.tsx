/**
 * Lodging — Rooms & Rates section.
 * CRUD for room types: name, type, beds, max guests, rates (USD), amenities, units,
 * photos, description, cancellation policy, check-in/out times, add-ons.
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BedDouble, Plus, Trash2, Pencil, Image as ImageIcon,
  Landmark, Building, Sparkles, ConciergeBell, Receipt,
  Baby, UserPlus, Users, Coins, BadgePercent, Sun,
  Maximize2, Hash, CalendarDays, CalendarRange, Clock, ShieldCheck,
  DollarSign, Copy, Wand2, type LucideIcon,
} from "lucide-react";
import { AddonIcon } from "@/components/lodging/addonIcons";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import { toast } from "sonner";
import { useLodgeRooms, type LodgeRoom, type LodgeAddon, type RoomFees, type ChildPolicy } from "@/hooks/lodging/useLodgeRooms";
import { LodgingRoomPhotoUploader } from "@/components/lodging/LodgingRoomPhotoUploader";
import { BedConfigBuilder, bedConfigSummary, bedConfigSleeps } from "@/components/lodging/BedConfigBuilder";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";

const VIEW_OPTIONS = ["", "Sea view", "Garden view", "Pool view", "Mountain view", "City view", "Courtyard view", "River view"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ADDON_STATUS_OPTIONS = ["confirmed", "checked_in", "checked_out"];
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Villa", "Family", "Bungalow", "Cottage", "Dormitory", "Apartment", "Studio", "Penthouse"];
// Booking.com-style grouped amenities — shown as collapsible sections in the editor
const AMENITY_GROUPS: { label: string; items: string[] }[] = [
  {
    label: "Private bathroom",
    items: [
      "Free toiletries", "Shower", "Bathtub", "Bathrobe", "Slippers",
      "Hairdryer", "Bidet", "Toilet", "Toilet paper", "Towels",
      "Towels/Sheets (extra fee)", "Hot shower",
    ],
  },
  {
    label: "Bedroom",
    items: ["Linens", "Wardrobe or closet", "Extra long beds (> 2m)", "Alarm clock"],
  },
  {
    label: "View",
    items: ["Garden view", "Pool view", "Sea view", "Mountain view", "City view", "River view", "Courtyard view", "Landmark view"],
  },
  {
    label: "Outdoors",
    items: ["Balcony", "Terrace", "Patio", "Outdoor furniture", "Beach access", "Beachfront"],
  },
  {
    label: "Facilities",
    items: [
      "Carpeted", "Electric kettle", "Wardrobe or closet", "Socket near the bed",
      "Dining area", "Desk", "Clothes rack", "Sitting area", "Sofa", "Drying rack for clothing",
      "Minibar", "Tile/Marble floor", "Wooden/Parquet floor", "Soundproofing",
      "Heating", "Air conditioning", "Fan", "Iron", "Ironing facilities",
      "Safety deposit box", "Fireplace", "Private entrance",
    ],
  },
  {
    label: "Food & drink",
    items: ["Mini-bar", "Mini-fridge", "Refrigerator", "Coffee machine", "Tea/Coffee maker", "Kitchenette", "Microwave", "Dishwasher", "Stovetop", "Oven", "Toaster", "Dining table"],
  },
  {
    label: "Media & technology",
    items: ["Wi-Fi", "Free Wi-Fi", "TV", "Flat-screen TV", "Smart TV", "Cable channels", "Satellite channels", "Streaming service (Netflix)", "Telephone", "Laptop safe"],
  },
  {
    label: "Family",
    items: ["Crib available", "Baby cot on request", "Family-friendly", "Children's cribs/cots"],
  },
  {
    label: "Wellness",
    items: ["Jacuzzi", "Hot tub", "Private pool", "Sauna", "Spa tub"],
  },
  {
    label: "Services",
    items: ["Daily housekeeping", "Room service", "24h reception", "Wake-up service", "Laundry service"],
  },
  {
    label: "Accessibility & policy",
    items: ["Wheelchair accessible", "Upper floors accessible by elevator", "Pet-friendly", "Smoking allowed", "Non-smoking", "EV charger", "Free parking", "Private parking"],
  },
];

// Flat list (legacy) — used for backward compatibility / quick lookup
const AMENITY_OPTIONS = AMENITY_GROUPS.flatMap(g => g.items);

// Curated quick-add presets — one tap to add common hotel/resort extras.
// `icon` is a slug resolved by ADDON_ICON_MAP to a Lucide component (no emoji).
const ADDON_PRESETS: { name: string; price_cents: number; per: "stay" | "night" | "guest" | "person_night"; category: string; icon: string }[] = [
  // Food & drink
  { name: "Breakfast buffet", price_cents: 1200, per: "person_night", category: "Food & drink", icon: "breakfast" },
  { name: "Lunch set menu", price_cents: 1800, per: "guest", category: "Food & drink", icon: "lunch" },
  { name: "Dinner set menu", price_cents: 2500, per: "guest", category: "Food & drink", icon: "dinner" },
  { name: "Kids meal", price_cents: 900, per: "guest", category: "Food & drink", icon: "kidsmeal" },
  { name: "Half board (breakfast + dinner)", price_cents: 2500, per: "person_night", category: "Food & drink", icon: "halfboard" },
  { name: "Full board (3 meals)", price_cents: 4000, per: "person_night", category: "Food & drink", icon: "fullboard" },
  { name: "Floating breakfast", price_cents: 3500, per: "stay", category: "Food & drink", icon: "floatingbreakfast" },
  { name: "Romantic dinner", price_cents: 6500, per: "stay", category: "Food & drink", icon: "romanticdinner" },
  { name: "Welcome drink", price_cents: 500, per: "guest", category: "Food & drink", icon: "welcomedrink" },
  { name: "Bottle of wine", price_cents: 2500, per: "stay", category: "Food & drink", icon: "wine" },
  { name: "Mini-bar package", price_cents: 1500, per: "stay", category: "Food & drink", icon: "minibar" },
  { name: "Room service", price_cents: 1200, per: "stay", category: "Food & drink", icon: "roomservice" },
  { name: "Welcome fruit basket", price_cents: 1800, per: "stay", category: "Food & drink", icon: "fruitbasket" },
  // Transport
  { name: "Airport pickup", price_cents: 2500, per: "stay", category: "Transport", icon: "airportpickup" },
  { name: "Airport drop-off", price_cents: 2500, per: "stay", category: "Transport", icon: "airportdropoff" },
  { name: "Round-trip airport transfer", price_cents: 4500, per: "stay", category: "Transport", icon: "airporttransfer" },
  { name: "Ferry transfer", price_cents: 3000, per: "guest", category: "Transport", icon: "ferrytransfer" },
  { name: "Private boat transfer", price_cents: 12000, per: "stay", category: "Transport", icon: "privateboat" },
  { name: "Scooter rental", price_cents: 1000, per: "night", category: "Transport", icon: "scooter" },
  { name: "Car rental", price_cents: 4500, per: "night", category: "Transport", icon: "carrental" },
  { name: "Bicycle rental", price_cents: 500, per: "night", category: "Transport", icon: "bicycle" },
  { name: "Airport VIP meet & greet", price_cents: 5500, per: "stay", category: "Transport", icon: "airportvip" },
  { name: "Private driver", price_cents: 9000, per: "stay", category: "Transport", icon: "privatedriver" },
  // Stay flexibility
  { name: "Early check-in", price_cents: 1500, per: "stay", category: "Stay flexibility", icon: "earlycheckin" },
  { name: "Late check-out", price_cents: 1500, per: "stay", category: "Stay flexibility", icon: "latecheckout" },
  { name: "Extra bed", price_cents: 1500, per: "night", category: "Stay flexibility", icon: "extrabed" },
  { name: "Baby crib", price_cents: 0, per: "stay", category: "Stay flexibility", icon: "babycrib" },
  { name: "Extra guest", price_cents: 1500, per: "person_night", category: "Stay flexibility", icon: "extraguest" },
  { name: "Pet fee", price_cents: 1000, per: "night", category: "Stay flexibility", icon: "petfee" },
  // Wellness & experiences
  { name: "Spa massage (60 min)", price_cents: 4500, per: "guest", category: "Wellness", icon: "spa" },
  { name: "Couples massage", price_cents: 8000, per: "stay", category: "Wellness", icon: "couplesmassage" },
  { name: "Yoga session", price_cents: 1500, per: "guest", category: "Wellness", icon: "yoga" },
  { name: "Spa package", price_cents: 9500, per: "stay", category: "Wellness", icon: "spapackage" },
  { name: "Sauna access", price_cents: 1200, per: "guest", category: "Wellness", icon: "sauna" },
  { name: "Gym day pass", price_cents: 1000, per: "guest", category: "Wellness", icon: "gym" },
  { name: "Snorkeling tour", price_cents: 3500, per: "guest", category: "Experiences", icon: "snorkeling" },
  { name: "Island hopping tour", price_cents: 5000, per: "guest", category: "Experiences", icon: "island" },
  { name: "Fishing trip", price_cents: 5500, per: "guest", category: "Experiences", icon: "fishing" },
  { name: "Sunset cruise", price_cents: 6500, per: "guest", category: "Experiences", icon: "cruise" },
  { name: "Private chef dinner", price_cents: 7500, per: "stay", category: "Experiences", icon: "chef" },
  { name: "Resort day pass", price_cents: 3000, per: "guest", category: "Experiences", icon: "resortdaypass" },
  { name: "Kids club", price_cents: 1800, per: "guest", category: "Experiences", icon: "kidsclub" },
  // Romance & celebration
  { name: "Honeymoon setup", price_cents: 5000, per: "stay", category: "Celebration", icon: "honeymoon" },
  { name: "Birthday cake", price_cents: 1500, per: "stay", category: "Celebration", icon: "cake" },
  { name: "Flower bouquet", price_cents: 2000, per: "stay", category: "Celebration", icon: "flowers" },
  { name: "Champagne on arrival", price_cents: 3500, per: "stay", category: "Celebration", icon: "champagne" },
  // Practical services
  { name: "Daily housekeeping", price_cents: 800, per: "night", category: "Services", icon: "housekeeping" },
  { name: "Laundry service", price_cents: 1200, per: "stay", category: "Services", icon: "laundry" },
  { name: "Parking", price_cents: 500, per: "night", category: "Services", icon: "parking" },
  { name: "Beach towel rental", price_cents: 200, per: "guest", category: "Services", icon: "beachtowel" },
  { name: "Extra towels", price_cents: 300, per: "stay", category: "Services", icon: "extratowels" },
  { name: "Luggage storage", price_cents: 500, per: "stay", category: "Services", icon: "luggage" },
  { name: "Wake-up call", price_cents: 0, per: "stay", category: "Services", icon: "wakeup" },
];

const CANCEL_POLICIES: { value: string; label: string }[] = [
  { value: "flexible", label: "Flexible — full refund up to 24h before" },
  { value: "moderate", label: "Moderate — full refund up to 5 days before" },
  { value: "strict", label: "Strict — 50% refund up to 7 days before" },
  { value: "non_refundable", label: "Non-refundable" },
];

export default function LodgingRoomsSection({ storeId }: { storeId: string }) {
  const { data: rooms = [], isLoading, upsert, remove } = useLodgeRooms(storeId);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<LodgeRoom> | null>(null);

  const blank = (): Partial<LodgeRoom> => ({
    store_id: storeId, name: "", room_type: "Standard", beds: "1 Queen", max_guests: 2,
    units_total: 1, base_rate_cents: 5000, weekend_rate_cents: 6000,
    weekly_discount_pct: 0, monthly_discount_pct: 0,
    breakfast_included: false, amenities: ["Free toiletries", "Towels", "Toilet", "Shower", "Wi-Fi", "Air conditioning", "Wardrobe or closet", "Desk", "Non-smoking"], photos: [], sort_order: 0, is_active: true,
    description: "", cancellation_policy: "flexible", addons: [], cover_photo_index: 0,
    bed_config: [{ type: "Queen", qty: 1 }], view: null, floor: null, wing: null,
    child_policy: { child_max_age: 12, free_age: 3 }, fees: {}, seasonal_rates: [],
    min_stay: 1, max_stay: null, no_arrival_weekdays: [],
  });

  const openNew = () => { setEditing(blank()); setOpen(true); };
  const openEdit = (r: LodgeRoom) => { setEditing({ ...r, addons: r.addons || [], photos: r.photos || [] }); setOpen(true); };

  /**
   * Apply the "Deluxe Double Sea View" sample preset — one tap fills every field
   * (description, view, beds, size, bathroom + facility amenities, taxes, breakfast addon).
   */
  const applyDeluxeSeaViewPreset = () => {
    if (!editing) return;
    const sqm = Math.round(323 / 10.764 * 10) / 10; // 323 ft² → ~30 m²
    const bathroomAmenities = [
      "Bathtub", "Free toiletries", "Shower", "Bathrobe", "Bidet",
      "Toilet", "Towels", "Slippers", "Hairdryer",
      "Towels/Sheets (extra fee)", "Toilet paper",
    ];
    const facilityAmenities = [
      "Balcony", "Terrace", "Air conditioning", "Sofa", "Sitting area",
      "Socket near the bed", "Desk", "Minibar", "Carpeted",
      "Electric kettle", "Wardrobe or closet", "Dining area",
      "Clothes rack", "Drying rack for clothing", "Non-smoking",
    ];
    const viewAmenities = ["Sea view"];
    const merged = Array.from(new Set([
      ...(editing.amenities || []),
      ...bathroomAmenities, ...facilityAmenities, ...viewAmenities,
    ]));
    const existingAddons = editing.addons || [];
    const ensureAddon = (name: string, price_cents: number, per: LodgeAddon["per"], category: string, icon: string) =>
      existingAddons.some(a => a.name === name) ? null : { name, price_cents, per, category, icon };
    const newAddons: LodgeAddon[] = [
      ensureAddon("Exceptional breakfast", 0, "person_night", "Food & drink", "breakfast"),
      ensureAddon("15% off food & drink", 0, "stay", "Stay", "earlycheckin"),
      ensureAddon("Late check-in", 0, "stay", "Stay", "latecheckout"),
      ensureAddon("High-speed internet", 0, "stay", "Services", "housekeeping"),
    ].filter(Boolean) as LodgeAddon[];

    setEditing({
      ...editing,
      name: editing.name || "Deluxe Double Sea View",
      room_type: "Deluxe",
      description:
        "A spacious 323 ft² room with a private balcony and terrace overlooking the sea. Comfortably sleeps 2 in a king bed, with air conditioning, minibar, sitting area, and a private bathroom featuring a bathtub and shower. Exceptional breakfast included.",
      view: "Sea view",
      beds: "1 King",
      bed_config: [{ type: "King", qty: 1 }],
      max_guests: 2,
      size_sqm: sqm,
      base_rate_cents: 14600,
      weekend_rate_cents: editing.weekend_rate_cents || 16000,
      breakfast_included: true,
      amenities: merged,
      fees: {
        ...(editing.fees || {}),
        vat_pct: 10,
        city_tax_cents: 200, // $2/guest/night placeholder for "2% city tax"
      },
      cancellation_policy: "flexible",
      addons: [...existingAddons, ...newAddons],
    });
    toast.success("Filled with Deluxe Double Sea View preset");
  };

  /**
   * Apply the "Villa A" preset — $89/night garden-view villa with full bathroom
   * and facility list, breakfast add-on, flexible cancellation, no smoking.
   */
  const applyVillaAPreset = () => {
    if (!editing) return;
    const sqm = Math.round(323 / 10.764 * 10) / 10; // 323 ft² → ~30 m²
    const bathroomAmenities = [
      "Free toiletries", "Shower", "Bathrobe", "Bidet", "Toilet",
      "Towels", "Slippers", "Hairdryer",
      "Towels/Sheets (extra fee)", "Toilet paper",
    ];
    const facilityAmenities = [
      "Balcony", "Terrace", "Air conditioning", "Socket near the bed",
      "Desk", "Sitting area", "Minibar", "Carpeted",
      "Electric kettle", "Wardrobe or closet", "Dining area",
      "Clothes rack", "Drying rack for clothing", "Non-smoking",
    ];
    const viewAmenities = ["Garden view"];
    const merged = Array.from(new Set([
      ...(editing.amenities || []),
      ...bathroomAmenities, ...facilityAmenities, ...viewAmenities,
    ]));
    const existingAddons = editing.addons || [];
    const ensureAddon = (name: string, price_cents: number, per: LodgeAddon["per"], category: string, icon: string) =>
      existingAddons.some(a => a.name === name) ? null : { name, price_cents, per, category, icon };
    const newAddons: LodgeAddon[] = [
      ensureAddon("Exceptional breakfast", 1200, "person_night", "Food & drink", "breakfast"),
      ensureAddon("15% off food & drink", 0, "stay", "Stay", "earlycheckin"),
      ensureAddon("Late check-in", 0, "stay", "Stay", "latecheckout"),
      ensureAddon("High-speed internet", 0, "stay", "Services", "housekeeping"),
    ].filter(Boolean) as LodgeAddon[];

    setEditing({
      ...editing,
      name: editing.name || "Villa A",
      room_type: "Villa",
      description:
        "Comfy 323 ft² villa with garden view, balcony & terrace. 1 queen bed, sleeps 2. Private bathroom. Air-conditioned. Rated 9.4 for comfy beds (10 reviews).",
      view: "Garden view",
      beds: "1 Queen",
      bed_config: [{ type: "Queen", qty: 1 }],
      max_guests: 2,
      size_sqm: sqm,
      base_rate_cents: 8900,
      weekend_rate_cents: editing.weekend_rate_cents || 9500,
      breakfast_included: false,
      amenities: merged,
      fees: {
        ...(editing.fees || {}),
        vat_pct: 10,
        city_tax_cents: 200, // 2% city tax placeholder
      },
      cancellation_policy: "flexible",
      addons: [...existingAddons, ...newAddons],
    });
    toast.success("Filled with Villa A preset");
  };

  const duplicate = async (r: LodgeRoom) => {
    try {
      const { id, created_at, updated_at, ...rest } = r as any;
      const copy = {
        ...rest,
        name: `${r.name} (Copy)`,
        addons: r.addons || [],
        photos: r.photos || [],
        amenities: r.amenities || [],
        sort_order: (r.sort_order ?? 0) + 1,
      };
      await upsert.mutateAsync(copy);
      toast.success("Room duplicated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to duplicate room");
    }
  };

  const updateEditingPhotos = (next: string[]) => {
    setEditing((prev) => {
      if (!prev) return prev;
      const cur = prev.cover_photo_index ?? 0;
      const safe = Math.min(Math.max(cur, 0), Math.max(0, next.length - 1));
      return { ...prev, photos: next, cover_photo_index: safe };
    });
  };

  const updateEditingCover = (idx: number) => {
    setEditing((prev) => (prev ? { ...prev, cover_photo_index: idx } : prev));
  };

  const save = async () => {
    if (!editing?.name) { toast.error("Name required"); return; }
    try {
      await upsert.mutateAsync(editing as any);
      toast.success("Room saved");
      setOpen(false);
    } catch (e: any) { toast.error(e.message || "Save failed"); }
  };

  const toggleAmenity = (a: string) => {
    const cur = editing?.amenities || [];
    setEditing({ ...editing, amenities: cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a] });
  };

  const updateAddon = (idx: number, patch: Partial<LodgeAddon>) => {
    const next = [...(editing?.addons || [])];
    const merged = { ...next[idx], ...patch };
    next[idx] = patch.name && !patch.id ? { ...merged, id: slugify(patch.name) } : merged;
    setEditing({ ...editing, addons: next });
  };
  const addAddon = () => setEditing({ ...editing, addons: [...(editing?.addons || []), { id: "", name: "", price_cents: 500, per: "stay", category: "Services", active: true, max_quantity: 1, requires_status: ["confirmed", "checked_in"] }] });
  const removeAddon = (idx: number) => setEditing({ ...editing, addons: (editing?.addons || []).filter((_, i) => i !== idx) });

  return (
    <div className="space-y-3">
      <LodgingQuickJump active="lodge-rooms" />
      <LodgingSectionStatusBanner title="Rooms & Rates" icon={BedDouble} countLabel="Active rooms" countValue={rooms.filter((r) => r.is_active).length} fixLabel="Open Rate Plans" fixTab="lodge-rate-plans" />
      <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2"><BedDouble className="h-5 w-5" /> Rooms & Rates</CardTitle>
        <Button onClick={openNew} size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add Room</Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
        ) : rooms.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <BedDouble className="h-10 w-10 mx-auto text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No rooms yet</p>
            <Button onClick={openNew} variant="outline" size="sm" className="gap-1"><Plus className="h-4 w-4" /> Add First Room</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((r) => {
              const photos = (r.photos || []) as string[];
              const ci = r.cover_photo_index ?? 0;
              const cover = photos[ci] ?? photos[0];
              return (
                <div key={r.id} className="p-3 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {cover
	                        ? (
	                          <img
	                            src={cover}
	                            alt={r.name}
	                            className="h-full w-full object-cover"
	                            loading="lazy"
	                            decoding="async"
	                          />
	                        )
                        : <BedDouble className="h-6 w-6 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight break-words">{r.name}</p>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {r.room_type && (
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <BedDouble className="h-2.5 w-2.5" />{r.room_type}
                          </Badge>
                        )}
                        {!r.is_active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                        {(r.photos?.length || 0) > 0 && (
                          <Badge variant="outline" className="text-[10px] gap-1"><ImageIcon className="h-2.5 w-2.5" />{r.photos.length}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1 flex-wrap">
                        <BedDouble className="h-3 w-3 text-foreground dark:text-foreground shrink-0" />
                        <span>{r.beds || "—"}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <Users className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>Sleeps {r.max_guests}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <Hash className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span>{r.units_total} unit{r.units_total > 1 ? "s" : ""}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/40">
                    <div className="inline-flex items-baseline gap-1">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 self-center" />
                      <span className="font-bold text-sm">{(r.base_rate_cents / 100).toFixed(2)}</span>
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5 ml-0.5">
                        <Clock className="h-2.5 w-2.5" />per night
                      </span>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)} title="Edit"><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate(r)} title="Duplicate" disabled={upsert.isPending}>
                        <Copy className="h-4 w-4 text-foreground dark:text-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { if (confirm("Delete room?")) remove.mutate(r.id); }} title="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit Room" : "Add Room"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4">
              {/* Quick-fill preset — Deluxe Double Sea View sample */}
              <button
                type="button"
                onClick={applyDeluxeSeaViewPreset}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 px-3 py-2.5 text-left hover:bg-primary/10 transition"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <span>
                    <span className="font-semibold">Quick-fill: Deluxe Double Sea View</span>
                    <span className="block text-[11px] text-muted-foreground">
                      323 ft² · 1 King · Sea view · Bathtub · Balcony · $146/night
                    </span>
                  </span>
                </span>
                <span className="text-[11px] text-primary font-medium">Apply</span>
              </button>

              {/* Quick-fill preset — Villa A */}
              <button
                type="button"
                onClick={applyVillaAPreset}
                className="w-full flex items-center justify-between gap-2 rounded-lg border border-dashed border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 text-left hover:bg-emerald-500/10 transition"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Wand2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    <span className="font-semibold">Quick-fill: Villa A</span>
                    <span className="block text-[11px] text-muted-foreground">
                      323 ft² · 1 Queen · Garden view · Balcony · Terrace · $89/night
                    </span>
                  </span>
                </span>
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Apply</span>
              </button>

              {/* Cover hero — primary upload entry point */}
              <div>
                <LodgingRoomPhotoUploader
                  heroOnly
                  storeId={storeId}
                  photos={(editing.photos as string[]) || []}
                  onChange={updateEditingPhotos}
                  coverIndex={editing.cover_photo_index ?? 0}
                  onCoverChange={updateEditingCover}
                />
                <p className="text-[10px] text-muted-foreground mt-1.5">
                  Cover photo · shown on room cards & booking pages
                </p>
              </div>

              {/* All photos thumbnail manager */}
              {((editing.photos as string[]) || []).length > 0 && (
                <div>
                  <Label className="mb-1.5 block text-xs font-semibold text-muted-foreground uppercase tracking-wide">All photos</Label>
                  <LodgingRoomPhotoUploader
                    gridOnly
                    storeId={storeId}
                    photos={(editing.photos as string[]) || []}
                    onChange={updateEditingPhotos}
                    coverIndex={editing.cover_photo_index ?? 0}
                    onCoverChange={updateEditingCover}
                  />
                </div>
              )}

              <div><Label>Name</Label><Input value={editing.name || ""} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Deluxe Sea View" /></div>

              <div>
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description || ""}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                  placeholder="A spacious room with ocean views, king bed, and private balcony…"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Type</Label>
                  <select value={editing.room_type || ""} onChange={e => setEditing({ ...editing, room_type: e.target.value })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {ROOM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <Label>View</Label>
                  <select value={editing.view || ""} onChange={e => setEditing({ ...editing, view: e.target.value || null })}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    {VIEW_OPTIONS.map(v => <option key={v} value={v}>{v || "— none —"}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label>Floor</Label><Input value={editing.floor || ""} onChange={e => setEditing({ ...editing, floor: e.target.value || null })} placeholder="2nd floor" /></div>
                <div><Label>Wing / Building</Label><Input value={editing.wing || ""} onChange={e => setEditing({ ...editing, wing: e.target.value || null })} placeholder="Garden wing" /></div>
              </div>

              {/* Bed config builder */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label>Bed configuration</Label>
                  {(editing.bed_config && editing.bed_config.length > 0) && (
                    <span className="text-[10px] text-muted-foreground">
                      {bedConfigSummary(editing.bed_config)} · sleeps ~{bedConfigSleeps(editing.bed_config)}
                    </span>
                  )}
                </div>
                <BedConfigBuilder
                  value={editing.bed_config || []}
                  onChange={(next) => {
                    const summary = bedConfigSummary(next);
                    const sleeps = bedConfigSleeps(next);
                    setEditing({
                      ...editing,
                      bed_config: next,
                      beds: summary || editing.beds,
                      max_guests: sleeps > 0 ? Math.max(editing.max_guests || 1, sleeps) : editing.max_guests,
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div><Label className="inline-flex items-center gap-1.5"><Users className="h-3 w-3 text-muted-foreground" />Max guests</Label><Input type="number" inputMode="numeric" value={editing.max_guests ?? ""} onChange={e => setEditing({ ...editing, max_guests: e.target.value === "" ? null : parseInt(e.target.value) })} /></div>
                <div><Label className="inline-flex items-center gap-1.5"><Maximize2 className="h-3 w-3 text-muted-foreground" />Size m²</Label><Input type="number" inputMode="decimal" value={editing.size_sqm ?? ""} onChange={e => setEditing({ ...editing, size_sqm: e.target.value === "" ? null : parseFloat(e.target.value) })} /></div>
                <div><Label className="inline-flex items-center gap-1.5"><Hash className="h-3 w-3 text-muted-foreground" />Units</Label><Input type="number" inputMode="numeric" value={editing.units_total ?? ""} onChange={e => setEditing({ ...editing, units_total: e.target.value === "" ? null : parseInt(e.target.value) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="inline-flex items-center gap-1.5"><DollarSign className="h-3 w-3 text-muted-foreground" />Base rate (USD)</Label><Input type="number" step="0.01" inputMode="decimal" value={editing.base_rate_cents == null ? "" : editing.base_rate_cents / 100} onChange={e => setEditing({ ...editing, base_rate_cents: e.target.value === "" ? null : Math.round(parseFloat(e.target.value) * 100) })} /></div>
                <div><Label className="inline-flex items-center gap-1.5"><Sun className="h-3 w-3 text-amber-500" />Weekend rate (USD)</Label><Input type="number" step="0.01" inputMode="decimal" value={editing.weekend_rate_cents == null ? "" : editing.weekend_rate_cents / 100} onChange={e => setEditing({ ...editing, weekend_rate_cents: e.target.value === "" ? null : Math.round(parseFloat(e.target.value) * 100) })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="inline-flex items-center gap-1.5"><BadgePercent className="h-3 w-3 text-emerald-500" />Weekly discount %</Label><Input type="number" inputMode="decimal" value={editing.weekly_discount_pct ?? ""} onChange={e => setEditing({ ...editing, weekly_discount_pct: e.target.value === "" ? null : parseFloat(e.target.value) })} /></div>
                <div><Label className="inline-flex items-center gap-1.5"><BadgePercent className="h-3 w-3 text-emerald-500" />Monthly discount %</Label><Input type="number" inputMode="decimal" value={editing.monthly_discount_pct ?? ""} onChange={e => setEditing({ ...editing, monthly_discount_pct: e.target.value === "" ? null : parseFloat(e.target.value) })} /></div>
              </div>

              {/* Tax & fee breakdown */}
              <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/10">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  Taxes & fees (shown to guest at checkout)
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <FeeInput icon={Landmark} label="City tax / guest / night (USD)" value={editing.fees?.city_tax_cents}
                    onChange={(v) => setEditing({ ...editing, fees: { ...(editing.fees as RoomFees || {}), city_tax_cents: v } })} />
                  <FeeInput icon={Building} label="Resort fee / night (USD)" value={editing.fees?.resort_fee_cents}
                    onChange={(v) => setEditing({ ...editing, fees: { ...(editing.fees as RoomFees || {}), resort_fee_cents: v } })} />
                  <FeeInput icon={Sparkles} label="Cleaning fee / stay (USD)" value={editing.fees?.cleaning_fee_cents}
                    onChange={(v) => setEditing({ ...editing, fees: { ...(editing.fees as RoomFees || {}), cleaning_fee_cents: v } })} />
                  <PctInput icon={ConciergeBell} label="Service charge %" value={editing.fees?.service_charge_pct}
                    onChange={(v) => setEditing({ ...editing, fees: { ...(editing.fees as RoomFees || {}), service_charge_pct: v } })} />
                  <PctInput icon={Receipt} label="VAT %" value={editing.fees?.vat_pct}
                    onChange={(v) => setEditing({ ...editing, fees: { ...(editing.fees as RoomFees || {}), vat_pct: v } })} />
                </div>
              </div>

              {/* Children & extra-guest policy */}
              <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/10">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
                  <Baby className="h-3.5 w-3.5" />
                  Children & extra guests
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs inline-flex items-center gap-1.5"><Baby className="h-3 w-3 text-foreground" />Child max age</Label>
                    <Input type="number" inputMode="numeric" value={editing.child_policy?.child_max_age ?? ""}
                      onChange={e => setEditing({ ...editing, child_policy: { ...(editing.child_policy as ChildPolicy || {}), child_max_age: e.target.value === "" ? undefined : parseInt(e.target.value) } })} />
                  </div>
                  <div>
                    <Label className="text-xs inline-flex items-center gap-1.5"><BadgePercent className="h-3 w-3 text-emerald-500" />Free under age</Label>
                    <Input type="number" inputMode="numeric" value={editing.child_policy?.free_age ?? ""}
                      onChange={e => setEditing({ ...editing, child_policy: { ...(editing.child_policy as ChildPolicy || {}), free_age: e.target.value === "" ? undefined : parseInt(e.target.value) } })} />
                  </div>
                  <FeeInput icon={UserPlus} label="Extra adult / night (USD)" value={editing.child_policy?.extra_adult_fee_cents}
                    onChange={(v) => setEditing({ ...editing, child_policy: { ...(editing.child_policy as ChildPolicy || {}), extra_adult_fee_cents: v } })} />
                  <FeeInput icon={Baby} label="Extra child / night (USD)" value={editing.child_policy?.extra_child_fee_cents}
                    onChange={(v) => setEditing({ ...editing, child_policy: { ...(editing.child_policy as ChildPolicy || {}), extra_child_fee_cents: v } })} />
                </div>
              </div>

              {/* Min / max stay rules */}
              <div className="rounded-lg border border-dashed border-border p-3 space-y-2 bg-muted/10">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground inline-flex items-center gap-1.5">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Stay rules
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-muted-foreground" />Min nights</Label><Input type="number" inputMode="numeric" min={1} value={editing.min_stay ?? 1}
                    onChange={e => setEditing({ ...editing, min_stay: Math.max(1, parseInt(e.target.value) || 1) })} /></div>
                  <div><Label className="text-xs inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-muted-foreground" />Max nights</Label><Input type="number" inputMode="numeric" value={editing.max_stay ?? ""}
                    onChange={e => setEditing({ ...editing, max_stay: e.target.value === "" ? null : parseInt(e.target.value) })} placeholder="No limit" /></div>
                </div>
                <div>
                  <Label className="text-xs inline-flex items-center gap-1.5"><CalendarDays className="h-3 w-3 text-muted-foreground" />No arrivals on</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {WEEKDAYS.map((wd, i) => {
                      const on = (editing.no_arrival_weekdays || []).includes(i);
                      return (
                        <button type="button"
                          key={wd}
                          onClick={() => {
                            const cur = editing.no_arrival_weekdays || [];
                            setEditing({ ...editing, no_arrival_weekdays: on ? cur.filter(x => x !== i) : [...cur, i] });
                          }}
                          className={`px-2.5 py-1 rounded-full text-xs border transition ${on ? "bg-destructive/10 text-destructive border-destructive/40" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}
                        >
                          {wd}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3 text-muted-foreground" />Check-in time</Label><Input type="time" value={editing.check_in_time || ""} onChange={e => setEditing({ ...editing, check_in_time: e.target.value || null })} /></div>
                <div><Label className="inline-flex items-center gap-1.5"><Clock className="h-3 w-3 text-muted-foreground" />Check-out time</Label><Input type="time" value={editing.check_out_time || ""} onChange={e => setEditing({ ...editing, check_out_time: e.target.value || null })} /></div>
              </div>

              <div>
                <Label>Cancellation policy</Label>
                <select
                  value={editing.cancellation_policy || "flexible"}
                  onChange={e => setEditing({ ...editing, cancellation_policy: e.target.value })}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {CANCEL_POLICIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={!!editing.breakfast_included} onCheckedChange={v => setEditing({ ...editing, breakfast_included: v })} />
                <Label>Breakfast included</Label>
              </div>
              <div>
                <Label>Amenities & Facilities</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Tap to toggle. Grouped like Booking.com to make listing details look professional.</p>
                <div className="space-y-3">
                  {AMENITY_GROUPS.map(group => (
                    <div key={group.label} className="rounded-lg border border-border/60 p-2.5 bg-muted/10">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{group.label}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {group.items.map(a => {
                          const on = (editing.amenities || []).includes(a);
                          const Icon = getAmenityIcon(a);
                          return (
                            <button type="button" key={a} onClick={() => toggleAmenity(a)}
                              className={`px-2.5 py-1 rounded-full text-xs border transition inline-flex items-center gap-1.5 ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground hover:border-primary/40"}`}>
                              <Icon className="h-3 w-3" />
                              {a}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Booking-style offer badges */}
              <div>
                <Label>Offer badges</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Decorate this room's rate rows on the storefront. Booking.com calls these "Genius / Getaway / Free cancellation" tags.</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { v: "non_refundable", label: "Non-refundable" },
                    { v: "free_cancellation", label: "Free cancellation" },
                    { v: "no_prepayment", label: "No prepayment" },
                    { v: "breakfast_included", label: "Breakfast included" },
                    { v: "high_speed_internet", label: "High-speed internet" },
                    { v: "late_checkout", label: "Late checkout" },
                    { v: "genius_discount", label: "Genius discount" },
                    { v: "getaway_deal", label: "Getaway Deal" },
                    { v: "best_seller", label: "Best seller" },
                  ].map(b => {
                    const on = (editing.badges || []).includes(b.v);
                    return (
                      <button type="button"
                        key={b.v}
                        onClick={() => {
                          const cur = editing.badges || [];
                          setEditing({ ...editing, badges: on ? cur.filter((x: string) => x !== b.v) : [...cur, b.v] });
                        }}
                        className={`px-2.5 py-1 rounded-full text-[11px] border transition ${on ? "bg-primary text-primary-foreground border-primary font-semibold" : "bg-background border-border hover:border-primary/40"}`}
                      >{b.label}</button>
                    );
                  })}
                </div>
              </div>

              {/* Expandable features (Booking's "More" toggle) */}
              <div>
                <Label>Expandable features</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Extra in-room details revealed when guests tap "More". One per line.</p>
                <textarea
                  value={(editing.expandable_features || []).join("\n")}
                  onChange={e => setEditing({ ...editing, expandable_features: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                  placeholder={"Free toiletries\nSlippers\nBathrobe\nBidet\nHairdryer\nSafe\nElectric kettle\nClothes rack\nDrying rack\nToilet paper"}
                  rows={5}
                  className="w-full rounded-md border border-border bg-background px-2.5 py-2 text-[12px] font-mono"
                />
                <p className="text-[10px] text-muted-foreground mt-1">{(editing.expandable_features || []).length} feature{(editing.expandable_features || []).length === 1 ? "" : "s"}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Add-ons (optional extras)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addAddon} className="h-7 gap-1">
                    <Plus className="h-3 w-3" /> Custom
                  </Button>
                </div>

                {/* Quick-add presets — grouped by category */}
                <div className="rounded-lg border border-dashed border-border p-2.5 bg-muted/10 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Quick add — tap to include
                  </p>
                  {Array.from(new Set(ADDON_PRESETS.map(p => p.category))).map(cat => {
                    const items = ADDON_PRESETS.filter(p => p.category === cat);
                    return (
                      <div key={cat} className="space-y-1">
                        <p className="text-[10px] text-muted-foreground/80">{cat}</p>
                        <div className="flex flex-wrap gap-1">
                          {items.map(preset => {
                            const already = (editing.addons || []).some(a => a.name === preset.name);
                            return (
                              <button type="button"
                                key={preset.name}
                                disabled={already}
                                onClick={() => setEditing({
                                  ...editing,
                                  addons: [...(editing.addons || []), {
                                    id: slugify(preset.name),
                                    name: preset.name,
                                    price_cents: preset.price_cents,
                                    per: preset.per,
                                    category: preset.category,
                                    icon: preset.icon,
                                    active: true,
                                    max_quantity: 1,
                                    requires_status: ["confirmed", "checked_in"],
                                  }]
                                })}
                                className={`px-2 py-1 rounded-full text-[11px] border transition flex items-center gap-1 ${
                                  already
                                    ? "bg-primary/10 border-primary/30 text-primary cursor-not-allowed opacity-60"
                                    : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"
                                }`}
                              >
                                <AddonIcon slug={preset.icon} />
                                <span>{preset.name}</span>
                                {preset.price_cents > 0 && (
                                  <span className="text-muted-foreground">
                                    ${(preset.price_cents / 100).toFixed(0)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(editing.addons || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">e.g. Breakfast +$8/guest/night, Airport pickup +$25/stay</p>
                ) : (
                  <div className="space-y-2">
                    {(editing.addons || []).map((a, i) => (
                      <div key={i} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded-lg border border-border bg-muted/20">
                        <span className="col-span-1 flex justify-center"><AddonIcon slug={a.icon} className="h-4 w-4" /></span>
                        <Input
                          className="col-span-4 h-8 text-xs"
                          placeholder="Breakfast"
                          value={a.name}
                          onChange={e => updateAddon(i, { name: e.target.value })}
                        />
                        <Input
                          className="col-span-3 h-8 text-xs"
                          type="number" step="0.01" inputMode="decimal"
                          placeholder="8.00"
                          value={a.price_cents == null ? "" : a.price_cents / 100}
                          onChange={e => updateAddon(i, { price_cents: e.target.value === "" ? 0 : Math.round(parseFloat(e.target.value) * 100) })}
                        />
                        <select
                          className="col-span-3 h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={a.per}
                          onChange={e => updateAddon(i, { per: e.target.value as LodgeAddon["per"] })}
                        >
                          <option value="stay">/ stay</option>
                          <option value="night">/ night</option>
                          <option value="guest">/ guest</option>
                          <option value="person_night">/ guest/night</option>
                        </select>
                        <Button type="button" size="icon" variant="ghost" className="col-span-1 h-8 w-8" onClick={() => removeAddon(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                        <Input className="col-span-3 h-8 text-xs" placeholder="id / slug" value={a.id || slugify(a.name || "")} onChange={e => updateAddon(i, { id: slugify(e.target.value) })} />
                        <Input className="col-span-3 h-8 text-xs" placeholder="Category" value={a.category || ""} onChange={e => updateAddon(i, { category: e.target.value })} />
                        <Input className="col-span-2 h-8 text-xs" type="number" min={1} placeholder="Max qty" value={a.max_quantity ?? ""} onChange={e => updateAddon(i, { max_quantity: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                        <Input className="col-span-2 h-8 text-xs" type="number" min={1} placeholder="Min guests" value={a.min_guests ?? ""} onChange={e => updateAddon(i, { min_guests: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                        <Input className="col-span-2 h-8 text-xs" type="number" min={1} placeholder="Max guests" value={a.max_guests ?? ""} onChange={e => updateAddon(i, { max_guests: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                        <Input className="col-span-2 h-8 text-xs" type="number" min={1} placeholder="Min nights" value={a.min_nights ?? ""} onChange={e => updateAddon(i, { min_nights: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                        <Input className="col-span-2 h-8 text-xs" type="number" min={1} placeholder="Max nights" value={a.max_nights ?? ""} onChange={e => updateAddon(i, { max_nights: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                        <Input className="col-span-3 h-8 text-xs" type="date" value={a.available_from || ""} onChange={e => updateAddon(i, { available_from: e.target.value || undefined })} />
                        <Input className="col-span-3 h-8 text-xs" type="date" value={a.available_until || ""} onChange={e => updateAddon(i, { available_until: e.target.value || undefined })} />
                        <Input className="col-span-4 h-8 text-xs" placeholder="Host note" value={a.host_note || ""} onChange={e => updateAddon(i, { host_note: e.target.value })} />
                        <label className="col-span-2 flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={a.active !== false && !a.disabled} onCheckedChange={v => updateAddon(i, { active: v, disabled: !v })} /> Active</label>
                        <div className="col-span-12 flex flex-wrap gap-1">
                          {ADDON_STATUS_OPTIONS.map(s => {
                            const on = (a.requires_status || []).includes(s);
                            return <button type="button" key={s} onClick={() => updateAddon(i, { requires_status: on ? (a.requires_status || []).filter(x => x !== s) : [...(a.requires_status || []), s] })} className={`px-2 py-1 rounded-full text-[10px] border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-background border-border text-muted-foreground"}`}>{s.replace(/_/g, " ")}</button>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Switch checked={editing.is_active !== false} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                <Label>Active (visible on profile)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
    </div>
  );
}

function FeeInput({ label, value, onChange, icon: Icon }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; icon?: LucideIcon }) {
  return (
    <div>
      <Label className="text-xs inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {label}
      </Label>
      <Input
        type="number" step="0.01" inputMode="decimal"
        value={value == null ? "" : (value / 100).toString()}
        onChange={e => onChange(e.target.value === "" ? undefined : Math.round(parseFloat(e.target.value) * 100))}
      />
    </div>
  );
}

function PctInput({ label, value, onChange, icon: Icon }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; icon?: LucideIcon }) {
  return (
    <div>
      <Label className="text-xs inline-flex items-center gap-1.5">
        {Icon && <Icon className="h-3 w-3 text-muted-foreground" />}
        {label}
      </Label>
      <Input
        type="number" step="0.1" inputMode="decimal"
        value={value ?? ""}
        onChange={e => onChange(e.target.value === "" ? undefined : parseFloat(e.target.value))}
      />
    </div>
  );
}
