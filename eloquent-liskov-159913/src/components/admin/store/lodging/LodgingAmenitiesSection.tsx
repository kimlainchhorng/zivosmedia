/**
 * Lodging — Booking.com-grade Amenities & Policies editor.
 * - Categorized accordion with search
 * - Per-category select-all/clear
 * - Internet & Parking are radio (single-select)
 * - Languages render as chips
 * - "Extra charge" toggle per amenity row when allowed
 * - Sticky save bar
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Hotel, Search, ChevronDown, ChevronRight, Tag, Save, X } from "lucide-react";
import { toast } from "sonner";
import { useLodgeAmenities } from "@/hooks/lodging/useLodgeAmenities";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import {
  AMENITY_CATEGORIES,
  TOTAL_AMENITY_COUNT,
  type AmenityCategory,
} from "@/components/lodging/amenityCatalog";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import { cn } from "@/lib/utils";

const POLICY_FIELDS: { key: string; label: string; placeholder?: string; multiline?: boolean }[] = [
  { key: "check_in", label: "Check-in time", placeholder: "14:00" },
  { key: "check_out", label: "Check-out time", placeholder: "12:00" },
  { key: "cancellation", label: "Cancellation policy", multiline: true },
  { key: "children", label: "Children policy", multiline: true },
  { key: "pets", label: "Pet policy", multiline: true },
  { key: "smoking", label: "Smoking policy" },
  { key: "extra_bed", label: "Extra bed fee" },
];

type CatMap = Record<string, string[]>;

export default function LodgingAmenitiesSection({ storeId }: { storeId: string }) {
  const { data, save } = useLodgeAmenities(storeId);

  const [categories, setCategories] = useState<CatMap>({});
  const [extraCharge, setExtraCharge] = useState<Set<string>>(new Set());
  const [parkingMode, setParkingMode] = useState<string>("none");
  const [internetMode, setInternetMode] = useState<string>("none");
  const [policies, setPolicies] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(["popular"]));
  const [dirty, setDirty] = useState(false);

  // Hydrate from server
  useEffect(() => {
    if (!data) return;
    setCategories((data.categories as CatMap) || {});
    setExtraCharge(new Set(data.extra_charge_keys || []));
    setParkingMode(data.parking_mode || "none");
    setInternetMode(data.internet_mode || "none");
    setPolicies((data.policies as Record<string, string>) || {});
    setDirty(false);
  }, [data]);

  const markDirty = () => setDirty(true);

  const toggleAmenity = (catKey: string, key: string) => {
    setCategories((prev) => {
      const cur = prev[catKey] || [];
      const next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key];
      return { ...prev, [catKey]: next };
    });
    // If deselecting, also drop any extra-charge flag.
    setExtraCharge((prev) => {
      if (!prev.has(key)) return prev;
      const cur = categories[catKey] || [];
      if (cur.includes(key)) {
        const n = new Set(prev);
        n.delete(key);
        return n;
      }
      return prev;
    });
    markDirty();
  };

  const isSelected = (catKey: string, key: string) =>
    (categories[catKey] || []).includes(key);

  const toggleExtraCharge = (key: string) => {
    setExtraCharge((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
    markDirty();
  };

  const selectAll = (cat: AmenityCategory) => {
    setCategories((prev) => ({ ...prev, [cat.key]: cat.items.map((i) => i.key) }));
    markDirty();
  };
  const clearCat = (cat: AmenityCategory) => {
    setCategories((prev) => ({ ...prev, [cat.key]: [] }));
    markDirty();
  };

  const toggleCatOpen = (key: string) => {
    setOpenCats((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const lowerQuery = search.trim().toLowerCase();
  const filteredCats = useMemo(() => {
    if (!lowerQuery) return AMENITY_CATEGORIES;
    return AMENITY_CATEGORIES
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            i.label.toLowerCase().includes(lowerQuery) ||
            c.label.toLowerCase().includes(lowerQuery),
        ),
      }))
      .filter((c) => c.items.length > 0);
  }, [lowerQuery]);

  // Open all categories that have matches when searching
  useEffect(() => {
    if (!lowerQuery) return;
    setOpenCats(new Set(filteredCats.map((c) => c.key)));
  }, [lowerQuery, filteredCats]);

  const counts = useMemo(() => {
    let selected = 0;
    for (const cat of AMENITY_CATEGORIES) {
      if (cat.singleSelect) {
        const v = cat.key === "parking" ? parkingMode : cat.key === "internet" ? internetMode : null;
        if (v && v !== "none") selected += 1;
      } else {
        selected += (categories[cat.key] || []).length;
      }
    }
    return { selected, total: TOTAL_AMENITY_COUNT, extra: extraCharge.size };
  }, [categories, parkingMode, internetMode, extraCharge]);

  const handleSave = async () => {
    try {
      await save.mutateAsync({
        categories,
        extra_charge_keys: Array.from(extraCharge),
        parking_mode: parkingMode,
        internet_mode: internetMode,
        policies,
      });
      toast.success("Amenities saved");
      setDirty(false);
      setOpenCats(new Set(["popular"]));
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("row-level security") || msg.includes("permission")) {
        toast.error("You must be the store owner to edit amenities");
      } else {
        toast.error(msg || "Save failed");
      }
    }
  };

  const renderItemRow = (cat: AmenityCategory, item: AmenityCategory["items"][number]) => {
    const Icon = getAmenityIcon(item.key);
    const selected = isSelected(cat.key, item.key);
    const hasExtra = extraCharge.has(item.key);
    return (
      <label
        key={`${cat.key}:${item.key}`}
        className={cn(
          "group flex items-center gap-2 h-8 px-2 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer transition-colors",
          selected && "border-primary/40 bg-primary/5",
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => toggleAmenity(cat.key, item.key)}
          className="h-3.5 w-3.5"
        />
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] flex-1 truncate">{item.label}</span>
        {selected && item.extraChargeAllowed && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              toggleExtraCharge(item.key);
            }}
            className={cn(
              "text-[10px] px-1.5 h-5 rounded-md border inline-flex items-center gap-1 transition-colors",
              hasExtra
                ? "bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
                : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60",
            )}
            title="Mark as extra charge"
          >
            <Tag className="h-2.5 w-2.5" />
            {hasExtra ? "Extra" : "Free"}
          </button>
        )}
      </label>
    );
  };

  const renderCategoryBody = (cat: AmenityCategory) => {
    if (cat.singleSelect) {
      const value = cat.key === "parking" ? parkingMode : internetMode;
      const setValue = cat.key === "parking" ? setParkingMode : setInternetMode;
      return (
        <RadioGroup
          value={value}
          onValueChange={(v) => {
            setValue(v);
            markDirty();
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-1.5"
        >
          {cat.items.map((item) => {
            const Icon = getAmenityIcon(item.key);
            return (
              <label
                key={item.key}
                className="flex items-center gap-2 h-8 px-2 rounded-lg border bg-card hover:bg-muted/40 cursor-pointer"
              >
                <RadioGroupItem value={item.key} className="h-3.5 w-3.5" />
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[11px] flex-1 truncate">{item.label}</span>
              </label>
            );
          })}
        </RadioGroup>
      );
    }

    if (cat.asChips) {
      return (
        <div className="flex flex-wrap gap-1.5">
          {cat.items.map((item) => {
            const selected = isSelected(cat.key, item.key);
            return (
              <button type="button"
                key={item.key}
                onClick={() => toggleAmenity(cat.key, item.key)}
                className={cn(
                  "text-[11px] h-7 px-2.5 rounded-full border transition-colors",
                  selected
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted/40 border-border text-foreground",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {cat.items.map((item) => renderItemRow(cat, item))}
      </div>
    );
  };

  return (
    <div className="space-y-3 pb-20">
      <LodgingQuickJump active="lodge-amenities" />
      <LodgingSectionStatusBanner title="Amenities & Policies" icon={Hotel} countLabel="Selected amenities" countValue={`${counts.selected}/${counts.total}`} fixLabel="Open policies" fixTab="lodge-policies" />
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hotel className="h-4 w-4" /> Amenities catalog
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2 h-6 rounded-full bg-muted inline-flex items-center">
                {counts.selected}/{counts.total} selected
              </span>
              {counts.extra > 0 && (
                <span className="text-[11px] px-2 h-6 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                  <Tag className="h-2.5 w-2.5" /> {counts.extra} extra charge
                </span>
              )}
            </div>
          </div>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search amenities…"
              className="pl-8 h-9 text-[12px] rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-2">
          {filteredCats.length === 0 ? (
            <p className="text-[11px] text-muted-foreground py-6 text-center">
              No amenities match "{search}"
            </p>
          ) : (
            filteredCats.map((cat) => {
              const open = openCats.has(cat.key);
              const selectedCount = cat.singleSelect
                ? (cat.key === "parking" ? parkingMode : internetMode) !== "none"
                  ? 1
                  : 0
                : (categories[cat.key] || []).length;
              return (
                <Collapsible
                  key={cat.key}
                  open={open}
                  onOpenChange={() => toggleCatOpen(cat.key)}
                >
                  <div className="flex items-center justify-between gap-2 px-2 h-9 rounded-xl bg-muted/30 border border-border">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex items-center gap-2 flex-1 text-left">
                        {open ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-[12px] font-semibold">{cat.label}</span>
                        {selectedCount > 0 && (
                          <span className="text-[10px] px-1.5 h-4 rounded-full bg-primary/15 text-primary inline-flex items-center">
                            {selectedCount}
                          </span>
                        )}
                      </button>
                    </CollapsibleTrigger>
                    {!cat.singleSelect && !cat.asChips && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectAll(cat);
                          }}
                          className="text-[10px] px-1.5 h-5 rounded-md hover:bg-background border border-border"
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearCat(cat);
                          }}
                          className="text-[10px] px-1.5 h-5 rounded-md hover:bg-background border border-border"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>
                  <CollapsibleContent className="pt-2 pb-3 px-1">
                    {renderCategoryBody(cat)}
                  </CollapsibleContent>
                </Collapsible>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Policies card (separate from amenities for clarity) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Hotel className="h-4 w-4" /> House policies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {POLICY_FIELDS.map((f) => (
            <div key={f.key}>
              <Label className="text-[11px] text-muted-foreground">{f.label}</Label>
              {f.multiline ? (
                <Textarea
                  value={policies[f.key] || ""}
                  onChange={(e) => {
                    setPolicies({ ...policies, [f.key]: e.target.value });
                    markDirty();
                  }}
                  rows={2}
                  placeholder={f.placeholder}
                  className="text-[12px] rounded-xl"
                />
              ) : (
                <Input
                  value={policies[f.key] || ""}
                  onChange={(e) => {
                    setPolicies({ ...policies, [f.key]: e.target.value });
                    markDirty();
                  }}
                  placeholder={f.placeholder}
                  className="h-9 text-[12px] rounded-xl"
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 pb-[var(--zivo-safe-bottom,0px)] backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="text-[11px] text-muted-foreground">
            {dirty ? (
              <span className="text-amber-600 dark:text-amber-400">Unsaved changes</span>
            ) : (
              "All changes saved"
            )}
            {" · "}
            {counts.selected}/{counts.total} amenities
          </span>
          <Button
            onClick={handleSave}
            disabled={!dirty || save.isPending}
            size="sm"
            className="h-9 rounded-xl gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
