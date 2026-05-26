/**
 * LodgingAmenitiesPanel - guest-facing Booking-style amenities renderer.
 * Reads new `categories` jsonb when present, falls back to legacy `amenities` map.
 */
import { useMemo, useState } from "react";
import { Check, Tag, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AMENITY_CATEGORIES, findCategoryByKey } from "@/components/lodging/amenityCatalog";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  storeId: string;
}

interface AmenitiesRow {
  categories: Record<string, string[]> | null;
  extra_charge_keys: string[] | null;
  parking_mode: string | null;
  internet_mode: string | null;
  amenities: Record<string, boolean> | null;
}

export function LodgingAmenitiesPanel({ storeId }: Props) {
  const [feedbackSent, setFeedbackSent] = useState(false);

  const { data } = useQuery({
    queryKey: ["lodge-amenities-public", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_amenities" as any)
        .select("categories, extra_charge_keys, parking_mode, internet_mode, amenities")
        .eq("store_id", storeId)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as unknown as AmenitiesRow | null;
    },
    enabled: !!storeId,
  });

  const extraSet = useMemo(
    () => new Set(data?.extra_charge_keys || []),
    [data?.extra_charge_keys],
  );

  // Build a per-category list of selected items, preferring `categories` jsonb,
  // falling back to flat `amenities` map for legacy stores.
  const selectedByCat = useMemo(() => {
    const out: Record<string, { key: string; label: string }[]> = {};
    if (!data) return out;
    const cats = data.categories || {};
    const flat = data.amenities || {};
    for (const cat of AMENITY_CATEGORIES) {
      if (cat.singleSelect) {
        const v = cat.key === "parking" ? data.parking_mode : data.internet_mode;
        if (v && v !== "none") {
          const item = cat.items.find((i) => i.key === v);
          if (item) out[cat.key] = [{ key: item.key, label: item.label }];
        }
        continue;
      }
      const fromJson = cats[cat.key] || [];
      const items = cat.items.filter((i) => fromJson.includes(i.key) || flat[i.key]);
      if (items.length) {
        out[cat.key] = items.map((i) => ({ key: i.key, label: i.label }));
      }
    }
    return out;
  }, [data]);

  const popular = selectedByCat["popular"] || [];
  const otherCats = AMENITY_CATEGORIES.filter(
    (c) => c.key !== "popular" && (selectedByCat[c.key] || []).length > 0,
  );

  const totalSelected = Object.values(selectedByCat).reduce((s, arr) => s + arr.length, 0);
  if (!data || totalSelected === 0) return null;

  const sendFeedback = async (helpful: boolean) => {
    try {
      const { error } = await supabase
        .from("lodge_amenity_feedback" as any)
        .insert({ store_id: storeId, helpful, message: helpful ? "complete" : "missing_info" } as any);
      if (error) throw error;
      setFeedbackSent(true);
      toast.success("Thanks for your feedback");
    } catch {
      toast.error("Sign in to submit feedback");
    }
  };

  return (
    <section className="rounded-2xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Star className="h-4 w-4 text-primary" /> Amenities of this property
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Great facilities! Review score: highlights below.
        </p>
      </div>

      {/* Most popular hero strip */}
      {popular.length > 0 && (
        <div className="px-4 py-3 border-b">
          <p className="text-[11px] font-semibold text-muted-foreground mb-2">Most popular facilities</p>
          <div className="flex flex-wrap gap-1.5">
            {popular.map((item) => {
              const Icon = getAmenityIcon(item.key);
              const isExtra = extraSet.has(item.key);
              return (
                <span
                  key={item.key}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] border",
                    "bg-primary/10 border-primary/30 text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {item.label}
                  {isExtra && (
                    <span className="text-[9px] px-1 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Extra
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 3-column categorized grid */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          {otherCats.map((cat) => {
            const items = selectedByCat[cat.key] || [];
            const fullCat = findCategoryByKey(cat.key);
            return (
              <div key={cat.key}>
                <p className="text-[12px] font-semibold mb-2">{fullCat?.label || cat.label}</p>
                <ul className="space-y-1">
                  {items.map((item) => {
                    const Icon = getAmenityIcon(item.key);
                    const isExtra = extraSet.has(item.key);
                    return (
                      <li
                        key={`${cat.key}:${item.key}`}
                        className="flex items-center gap-2 text-[11.5px]"
                      >
                        <Check className="h-3 w-3 text-primary shrink-0" />
                        <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {isExtra && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 inline-flex items-center gap-1">
                            <Tag className="h-2.5 w-2.5" /> Additional charge
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer feedback */}
      <div className="px-4 py-3 border-t bg-muted/20 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground">
          Missing some information?
        </p>
        {feedbackSent ? (
          <span className="text-[11px] text-primary">Thanks for your feedback</span>
        ) : (
          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendFeedback(true)}
              className="h-7 px-2 text-[11px] rounded-lg gap-1"
            >
              <ThumbsUp className="h-3 w-3" /> Yes
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => sendFeedback(false)}
              className="h-7 px-2 text-[11px] rounded-lg gap-1"
            >
              <ThumbsDown className="h-3 w-3" /> No
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export default LodgingAmenitiesPanel;
