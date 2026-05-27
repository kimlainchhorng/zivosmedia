/**
 * LodgingPropertyProfileSection - Booking.com-grade property editor.
 * Sticky header with completeness meter · grouped accordion · search · sticky save.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Hotel, Utensils, Globe, Accessibility, Leaf, Shield, MapPin, Sparkles, Plus, Trash2,
  Search, Footprints, Car, Ship, Save, Check, GripVertical,
} from "lucide-react";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import { toast } from "sonner";
import {
  useLodgePropertyProfile,
  type LodgePropertyProfile,
  type HouseRules,
  type NearbyDistance,
} from "@/hooks/lodging/useLodgePropertyProfile";
import PropertyCompletenessMeter, { computeCompleteness } from "./PropertyCompletenessMeter";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import CheckInOutCard from "./property-profile/CheckInOutCard";
import CancellationPolicyCard from "./property-profile/CancellationPolicyCard";
import PetChildPolicyCard from "./property-profile/PetChildPolicyCard";
import ContactCard from "./property-profile/ContactCard";
import GuestEssentialsCard from "./property-profile/GuestEssentialsCard";
import StorefrontContentCard from "./property-profile/StorefrontContentCard";
import { Wifi, BookOpen } from "lucide-react";

const LANGUAGES = ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Khmer", "Thai", "Vietnamese", "Chinese", "Japanese", "Korean", "Russian", "Arabic", "Hindi"];
const FACILITY_GROUPS: { label: string; items: string[] }[] = [
  { label: "Pools & wellness", items: ["Outdoor pool", "Indoor pool", "Spa", "Sauna", "Hot tub", "Gym", "Steam room", "Massage"] },
  { label: "Food & drink", items: ["Restaurant", "Bar", "Rooftop bar", "Lounge", "Snack bar", "Room service"] },
  { label: "Family & entertainment", items: ["Kids club", "Playground", "Game room", "Library"] },
  { label: "Business", items: ["Business center", "Conference room", "Co-working space", "Meeting rooms"] },
  { label: "Services", items: ["Laundry service", "Dry cleaning", "24h front desk", "Concierge", "Tour desk", "Currency exchange", "ATM on site", "Souvenir shop", "Daily housekeeping", "Baggage storage"] },
  { label: "Transport & parking", items: ["Airport shuttle", "Free parking", "Valet parking", "EV charging", "Bicycle hire", "Car rental"] },
  { label: "Outdoor & location", items: ["Beach access", "Beachfront", "Garden", "Terrace", "BBQ area", "Sun deck"] },
];
const FACILITIES = FACILITY_GROUPS.flatMap(g => g.items);
const MEAL_PLANS = ["Room only", "Bed & Breakfast", "Half board", "Full board", "All-inclusive"];
const ACCESSIBILITY = [
  "Step-free access", "Wheelchair accessible", "Accessible bathroom", "Roll-in shower",
  "Elevator", "Braille signage", "Hearing-loop", "Visual alarm", "Service animals welcome",
];
const SUSTAINABILITY = [
  "Single-use plastic free", "Solar power", "Towel & linen reuse", "EV-only fleet",
  "Locally sourced food", "Water-saving fixtures", "Recycling program", "Green building cert",
];
const HERO_BADGES = [
  "Beachfront", "Free cancellation", "Breakfast included", "Pet-friendly",
  "Adults only", "Family-friendly", "Eco-stay", "Spa retreat", "Business-ready", "Romantic", "Boutique",
];
const INCLUDED = [
  "Pool", "Wi-Fi", "Breakfast", "Airport pickup", "Parking", "Spa access",
  "Gym access", "Bicycle use", "Beach towels", "Welcome drink",
];
const PAYMENT_METHODS = ["card", "cash", "aba", "bank_transfer"];
const PAYMENT_LABELS: Record<string, string> = { card: "Card", cash: "Cash", aba: "ABA Pay", bank_transfer: "Bank transfer" };
const CURRENCIES = ["USD", "KHR", "THB", "EUR", "GBP", "JPY"];
const KHR_PER_USD = 4062.5;

export default function LodgingPropertyProfileSection({ storeId }: { storeId: string }) {
  const { data, isLoading, upsert, defaults } = useLodgePropertyProfile(storeId);
  const [form, setForm] = useState<Partial<LodgePropertyProfile>>(() => ({ ...defaults, ...(data || {}) }));
  const [savedSnapshot, setSavedSnapshot] = useState<string>("");
  const [search, setSearch] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (data) {
      const merged = { ...defaults, ...data };
      setForm(merged);
      setSavedSnapshot(JSON.stringify(merged));
    } else if (!isLoading) {
      setSavedSnapshot(JSON.stringify({ ...defaults }));
    }
  }, [data, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty = useMemo(() => JSON.stringify(form) !== savedSnapshot, [form, savedSnapshot]);

  // Warn on tab close
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const { score, missing } = computeCompleteness(form);

  const toggleIn = (key: keyof LodgePropertyProfile, val: string) => {
    const cur = ((form[key] as string[]) || []);
    const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val];
    setForm({ ...form, [key]: next });
  };

  const setRule = (patch: Partial<HouseRules>) =>
    setForm({ ...form, house_rules: { ...(form.house_rules || {}), ...patch } });

  const setNearby = (idx: number, patch: Partial<NearbyDistance>) => {
    const next = [...(form.nearby || [])];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, nearby: next });
  };
  const addNearby = () =>
    setForm({ ...form, nearby: [...(form.nearby || []), { label: "", minutes: undefined, mode: "walk" }] });
  const removeNearby = (idx: number) =>
    setForm({ ...form, nearby: (form.nearby || []).filter((_, i) => i !== idx) });

  // Drag-to-reorder included highlights
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const reorderIncluded = (from: number, to: number) => {
    const arr = [...(form.included_highlights || [])];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    setForm({ ...form, included_highlights: arr });
  };

  // Validation
  const errors = useMemo(() => {
    const e: string[] = [];
    const c = form.contact || {};
    if (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) e.push("Invalid email");
    if ((form.deposit_percent ?? 0) < 0 || (form.deposit_percent ?? 0) > 100) e.push("Deposit % must be 0–100");
    if (form.child_policy?.allowed && form.child_policy?.min_age != null && (form.child_policy.min_age < 0 || form.child_policy.min_age > 21))
      e.push("Child min age out of range");
    return e;
  }, [form]);

  const save = async () => {
    if (errors.length) { toast.error(`${errors.length} field${errors.length > 1 ? "s" : ""} need${errors.length > 1 ? "" : "s"} fixing`); return; }
    try {
      await upsert.mutateAsync(form);
      setSavedSnapshot(JSON.stringify(form));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      toast.success("Property profile saved");
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("row-level security") || msg.includes("permission") || msg.includes("violates")) {
        toast.error("You must be the store owner to edit this property");
      } else {
        toast.error(msg || "Save failed");
      }
    }
  };

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>;
  }

  // Search filter for chip groups (case-insensitive)
  const matches = (s: string) => !search || s.toLowerCase().includes(search.toLowerCase());

  const completenessScore = computeCompleteness(form).score;

  return (
    <div className="space-y-3 pb-24">
      <LodgingQuickJump active="lodge-property" />
      <LodgingSectionStatusBanner title="Property Profile" icon={Hotel} countLabel="Completeness" countValue={`${completenessScore}%`} fixLabel="Open Gallery" fixTab="lodge-gallery" />
      {/* Sticky header */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h2 className="text-[14px] font-bold text-foreground">Property Profile</h2>
            <p className="text-[11px] text-muted-foreground">Make your storefront irresistible. Updates publish instantly.</p>
          </div>
          <PropertyCompletenessMeter form={form} />
          <div className={`text-[11px] px-2 py-1 rounded-full border ${
            savedFlash ? "border-primary bg-primary/10 text-primary" :
            dirty ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400" :
            "border-border bg-muted text-muted-foreground"
          }`}>
            {savedFlash ? <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Saved</span>
              : dirty ? "Unsaved changes" : "All saved"}
          </div>
        </div>
        <div className="mt-2 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search amenities, badges, languages…"
            className="h-8 pl-8 text-[12px]"
          />
        </div>
      </div>

      <Accordion type="multiple" defaultValue={["essentials", "storefront", "facilities", "rules", "trust"]} className="space-y-2">
        {/* GROUP 0 — Storefront content (Booking.com-style About this property) */}
        <AccordionItem value="storefront" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-3 py-2.5 text-[13px] font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-primary" /> Storefront content
              <span className="text-[10px] font-normal text-muted-foreground">· About · Highlights · Popular amenities</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <StorefrontContentCard
              descriptionSections={form.description_sections || []}
              propertyHighlights={form.property_highlights || {}}
              popularAmenities={form.popular_amenities || []}
              facilityPool={[...(form.facilities || []), ...(form.included_highlights || [])]}
              onChangeSections={(next) => setForm({ ...form, description_sections: next })}
              onChangeHighlights={(patch) => setForm({ ...form, property_highlights: { ...(form.property_highlights || {}), ...patch } })}
              onChangePopular={(next) => setForm({ ...form, popular_amenities: next })}
            />
          </AccordionContent>
        </AccordionItem>

        {/* GROUP 1 — Storefront essentials */}
        <AccordionItem value="essentials" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-3 py-2.5 text-[13px] font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> Storefront essentials</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 space-y-3">
            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Hero badges <span className="text-[10px] font-normal text-muted-foreground">· top 3 visible</span></CardTitle></CardHeader>
              <CardContent className="pt-0">
                <ChipGroup options={HERO_BADGES.filter(matches)} selected={form.hero_badges || []} onToggle={v => toggleIn("hero_badges", v)} withIcons />
                {(form.hero_badges || []).length > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-2">Visible on storefront: <b>{(form.hero_badges || []).slice(0, 3).join(" · ")}</b></p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Hotel className="h-3.5 w-3.5" /> Included highlights <span className="text-[10px] font-normal text-muted-foreground">· {(form.included_highlights || []).length}/6</span></CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-2">
                <ChipGroup options={INCLUDED.filter(matches)} selected={form.included_highlights || []} onToggle={v => toggleIn("included_highlights", v)} max={6} withIcons />
                {(form.included_highlights || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(form.included_highlights || []).map((h, i) => (
                      <div
                        key={h}
                        draggable
                        onDragStart={() => setDragIdx(i)}
                        onDragOver={e => e.preventDefault()}
                        onDrop={() => { if (dragIdx != null && dragIdx !== i) reorderIncluded(dragIdx, i); setDragIdx(null); }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] cursor-move"
                      >
                        <GripVertical className="h-3 w-3 text-muted-foreground" />
                        {h}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Languages spoken</CardTitle></CardHeader>
              <CardContent className="pt-0"><ChipGroup options={LANGUAGES.filter(matches)} selected={form.languages || []} onToggle={v => toggleIn("languages", v)} /></CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* GROUP 1b — Guest essentials */}
        <AccordionItem value="guest-essentials" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-3 py-2.5 text-[13px] font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><Wifi className="h-3.5 w-3.5 text-primary" /> Guest essentials</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3">
            <GuestEssentialsCard
              value={(form.contact || {}) as any}
              onChange={(patch) => setForm({ ...form, contact: { ...(form.contact || {}), ...patch } as any })}
            />
          </AccordionContent>
        </AccordionItem>

        {/* GROUP 2 — Facilities & dining */}
        <AccordionItem value="facilities" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-3 py-2.5 text-[13px] font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><Hotel className="h-3.5 w-3.5 text-primary" /> Facilities & dining</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 space-y-3">
            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Hotel className="h-3.5 w-3.5" /> Property-wide facilities <span className="text-[10px] font-normal text-muted-foreground">· {(form.facilities || []).length} selected</span></CardTitle></CardHeader>
              <CardContent className="pt-0 space-y-3">
                {FACILITY_GROUPS.map(group => {
                  const items = group.items.filter(matches);
                  if (items.length === 0) return null;
                  const selectedInGroup = items.filter(i => (form.facilities || []).includes(i)).length;
                  return (
                    <div key={group.label}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label} <span className="text-muted-foreground/60 normal-case">· {selectedInGroup}/{items.length}</span></p>
                        <button
                          type="button"
                          onClick={() => {
                            const allSelected = items.every(i => (form.facilities || []).includes(i));
                            const next = allSelected
                              ? (form.facilities || []).filter(f => !items.includes(f))
                              : Array.from(new Set([...(form.facilities || []), ...items]));
                            setForm({ ...form, facilities: next });
                          }}
                          className="text-[10px] text-primary hover:underline font-medium"
                        >
                          {items.every(i => (form.facilities || []).includes(i)) ? "Clear" : "Select all"}
                        </button>
                      </div>
                      <ChipGroup options={items} selected={form.facilities || []} onToggle={v => toggleIn("facilities", v)} withIcons />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Utensils className="h-3.5 w-3.5" /> Meal plans</CardTitle></CardHeader>
              <CardContent className="pt-0"><ChipGroup options={MEAL_PLANS.filter(matches)} selected={form.meal_plans || []} onToggle={v => toggleIn("meal_plans", v)} withIcons /></CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* GROUP 3 — Stay rules & policies */}
        <AccordionItem value="rules" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-3 py-2.5 text-[13px] font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><Shield className="h-3.5 w-3.5 text-primary" /> Stay rules & policies</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 space-y-3">
            <CheckInOutCard
              checkInFrom={form.check_in_from} checkInUntil={form.check_in_until}
              checkOutFrom={form.check_out_from} checkOutUntil={form.check_out_until}
              onChange={patch => setForm({ ...form, ...patch })}
            />

            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> House rules</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quiet hours from</Label>
                    <Input type="time" value={form.house_rules?.quiet_from || ""} onChange={e => setRule({ quiet_from: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quiet hours until</Label>
                    <Input type="time" value={form.house_rules?.quiet_to || ""} onChange={e => setRule({ quiet_to: e.target.value })} className="h-9" />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Min guest age</Label>
                    <Input type="number" inputMode="numeric" className="h-9" value={form.house_rules?.min_age ?? ""} onChange={e => setRule({ min_age: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Smoking zones</Label>
                    <Input className="h-9" value={form.house_rules?.smoking_zones || ""} onChange={e => setRule({ smoking_zones: e.target.value })} placeholder="Outdoor only" />
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Security deposit (USD)</Label>
                  <Input type="number" step="0.01" className="h-9" value={form.house_rules?.security_deposit_cents == null ? "" : (form.house_rules.security_deposit_cents / 100).toString()} onChange={e => setRule({ security_deposit_cents: e.target.value === "" ? undefined : Math.round(parseFloat(e.target.value) * 100) })} />
                  {form.house_rules?.security_deposit_cents ? (
                    <p className="text-[10px] text-muted-foreground mt-0.5">≈ {Math.round((form.house_rules.security_deposit_cents / 100) * KHR_PER_USD).toLocaleString()} KHR</p>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl border border-border">
                    <Switch checked={!!form.house_rules?.parties_allowed} onCheckedChange={v => setRule({ parties_allowed: v })} />
                    <Label className="text-[11px]">Parties allowed</Label>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-xl border border-border">
                    <Switch checked={!!form.house_rules?.id_at_checkin} onCheckedChange={v => setRule({ id_at_checkin: v })} />
                    <Label className="text-[11px]">ID at check-in</Label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <CancellationPolicyCard
              policy={form.cancellation_policy}
              windowHours={form.cancellation_window_hours}
              onChange={patch => setForm({ ...form, ...patch })}
            />

            <PetChildPolicyCard
              pet={form.pet_policy || {}}
              child={form.child_policy || {}}
              onPet={patch => setForm({ ...form, pet_policy: { ...(form.pet_policy || {}), ...patch } })}
              onChild={patch => setForm({ ...form, child_policy: { ...(form.child_policy || {}), ...patch } })}
            />

            {/* Payment & deposit */}
            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px]">Payment & deposit</CardTitle></CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Accepted payment methods</Label>
                  <ChipGroup
                    options={PAYMENT_METHODS} selected={form.payment_methods || []}
                    onToggle={v => toggleIn("payment_methods", v)}
                    labelMap={PAYMENT_LABELS}
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Currencies accepted</Label>
                  <ChipGroup options={CURRENCIES} selected={form.currencies_accepted || []} onToggle={v => toggleIn("currencies_accepted", v)} />
                </div>
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="flex items-center gap-2 p-2 rounded-xl border border-border">
                    <Switch checked={!!form.deposit_required} onCheckedChange={v => setForm({ ...form, deposit_required: v })} />
                    <Label className="text-[11px]">Deposit required</Label>
                  </div>
                  {form.deposit_required && (
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Deposit (% of total)</Label>
                      <Input type="number" inputMode="numeric" className="h-9" value={form.deposit_percent ?? ""} onChange={e => setForm({ ...form, deposit_percent: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </AccordionContent>
        </AccordionItem>

        {/* GROUP 4 — Trust & location */}
        <AccordionItem value="trust" className="border rounded-xl bg-card">
          <AccordionTrigger className="px-3 py-2.5 text-[13px] font-semibold hover:no-underline">
            <span className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Trust & location</span>
          </AccordionTrigger>
          <AccordionContent className="px-3 pb-3 space-y-3">
            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Accessibility className="h-3.5 w-3.5" /> Accessibility</CardTitle></CardHeader>
              <CardContent className="pt-0"><ChipGroup options={ACCESSIBILITY.filter(matches)} selected={form.accessibility || []} onToggle={v => toggleIn("accessibility", v)} withIcons /></CardContent>
            </Card>
            <Card>
              <CardHeader className="py-2.5"><CardTitle className="text-[12px] flex items-center gap-1.5"><Leaf className="h-3.5 w-3.5" /> Sustainability</CardTitle></CardHeader>
              <CardContent className="pt-0"><ChipGroup options={SUSTAINABILITY.filter(matches)} selected={form.sustainability || []} onToggle={v => toggleIn("sustainability", v)} withIcons /></CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-2.5">
                <CardTitle className="text-[12px] flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Nearby distances</CardTitle>
                <Button size="sm" variant="outline" onClick={addNearby} className="h-7 gap-1 text-[11px]"><Plus className="h-3 w-3" /> Add</Button>
              </CardHeader>
              <CardContent className="pt-0">
                {(form.nearby || []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">e.g. Beach · 5 min walk · Airport · 15 min drive.</p>
                ) : (
                  <div className="space-y-2">
                    {(form.nearby || []).map((n, i) => (
                      <div key={i} className="grid grid-cols-12 gap-1.5 items-center p-2 rounded-xl border border-border bg-muted/20">
                        <Input className="col-span-5 h-8 text-[11px]" placeholder="Beach" value={n.label} onChange={e => setNearby(i, { label: e.target.value })} />
                        <Input className="col-span-2 h-8 text-[11px]" type="number" inputMode="numeric" placeholder="min" value={n.minutes ?? ""} onChange={e => setNearby(i, { minutes: e.target.value === "" ? undefined : parseInt(e.target.value) })} />
                        <Input className="col-span-2 h-8 text-[11px]" type="number" inputMode="numeric" placeholder="km" value={n.km ?? ""} onChange={e => setNearby(i, { km: e.target.value === "" ? undefined : parseFloat(e.target.value) })} />
                        <div className="col-span-2 flex gap-0.5">
                          {([{ k: "walk", I: Footprints }, { k: "drive", I: Car }, { k: "boat", I: Ship }] as const).map(({ k, I }) => (
                            <button type="button"
                              key={k} onClick={() => setNearby(i, { mode: k as any })}
                              className={`flex-1 h-8 rounded-lg flex items-center justify-center transition ${
                                (n.mode || "walk") === k ? "bg-primary text-primary-foreground" : "bg-background border border-border text-muted-foreground hover:border-primary/40"
                              }`}
                              aria-label={k}
                            ><I className="h-3.5 w-3.5" /></button>
                          ))}
                        </div>
                        <Button type="button" size="icon" variant="ghost" className="col-span-1 h-8 w-8" onClick={() => removeNearby(i)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <ContactCard
              contact={form.contact || {}}
              onChange={patch => setForm({ ...form, contact: { ...(form.contact || {}), ...patch } })}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md px-4 py-2.5 pb-[calc(var(--zivo-safe-bottom,0px)+0.625rem)]">
          <div className="max-w-screen-lg mx-auto flex items-center justify-between gap-3">
            <div className="text-[11px] text-muted-foreground min-w-0 truncate">
              {errors.length ? (
                <span className="text-destructive font-semibold">{errors.length} field{errors.length > 1 ? "s" : ""} need fixing: {errors.join(" · ")}</span>
              ) : (
                <>You have unsaved changes · {score}% complete{missing.length ? ` · ${missing.length} sections to finish` : ""}</>
              )}
            </div>
            <Button onClick={save} disabled={upsert.isPending || errors.length > 0} size="sm" className="font-bold gap-1">
              <Save className="h-3.5 w-3.5" />
              {upsert.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipGroup({ options, selected, onToggle, max, labelMap, withIcons }: {
  options: string[]; selected: string[]; onToggle: (v: string) => void; max?: number; labelMap?: Record<string, string>; withIcons?: boolean;
}) {
  const atMax = max != null && selected.length >= max;
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = selected.includes(o);
        const disabled = !on && atMax;
        const Icon = withIcons ? getAmenityIcon(o) : null;
        return (
          <button type="button"
            key={o} disabled={disabled} onClick={() => onToggle(o)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition inline-flex items-center gap-1 ${
              on
                ? "bg-primary text-primary-foreground border-primary shadow-sm font-semibold"
                : disabled
                ? "bg-background border-border text-muted-foreground/40 cursor-not-allowed"
                : "bg-background border-border text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            {Icon && <Icon className="h-3 w-3" />}
            {labelMap?.[o] || o}
          </button>
        );
      })}
    </div>
  );
}
