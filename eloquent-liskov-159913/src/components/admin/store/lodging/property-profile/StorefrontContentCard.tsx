/**
 * StorefrontContentCard — Booking.com-style "About this property" editor.
 * - description_sections: titled long-form paragraphs (Accommodations, Facilities, Dining, Location, …)
 * - property_highlights: side mini-card content (Perfect for, Top location score, Breakfast info, Rooms with…)
 * - popular_amenities: curated top-8 amenity row, picked from the property's facilities/included highlights
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Trash2, Star, Coffee, BedDouble, Sparkles, GripVertical } from "lucide-react";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import type { DescriptionSection, PropertyHighlights } from "@/hooks/lodging/useLodgePropertyProfile";

const SECTION_PRESETS = [
  "Comfortable Accommodations",
  "Exceptional Facilities",
  "Dining Experience",
  "Prime Location",
  "Couples favorite",
  "Family-friendly",
  "Business amenities",
];

const ROOM_FEATURES = [
  "Sea view", "Garden view", "Pool view", "Mountain view", "Balcony", "Terrace",
  "Private bathroom", "Air conditioning", "Free Wi-Fi", "Minibar", "Coffee maker",
];

interface Props {
  descriptionSections: DescriptionSection[];
  propertyHighlights: PropertyHighlights;
  popularAmenities: string[];
  facilityPool: string[]; // available facilities to pick from
  onChangeSections: (next: DescriptionSection[]) => void;
  onChangeHighlights: (patch: Partial<PropertyHighlights>) => void;
  onChangePopular: (next: string[]) => void;
}

export default function StorefrontContentCard({
  descriptionSections, propertyHighlights, popularAmenities, facilityPool,
  onChangeSections, onChangeHighlights, onChangePopular,
}: Props) {
  const sections = descriptionSections || [];
  const popular = popularAmenities || [];
  const highlights = propertyHighlights || {};

  const pool = useMemo(() => {
    const merged = Array.from(new Set(facilityPool || []));
    return merged.sort();
  }, [facilityPool]);

  const addSection = (title = "") => {
    onChangeSections([...sections, { title, body: "" }]);
  };
  const updateSection = (i: number, patch: Partial<DescriptionSection>) => {
    const next = sections.map((s, idx) => idx === i ? { ...s, ...patch } : s);
    onChangeSections(next);
  };
  const removeSection = (i: number) => onChangeSections(sections.filter((_, idx) => idx !== i));
  const moveSection = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    [next[i], next[j]] = [next[j], next[i]];
    onChangeSections(next);
  };

  const togglePopular = (a: string) => {
    if (popular.includes(a)) onChangePopular(popular.filter(x => x !== a));
    else if (popular.length < 8) onChangePopular([...popular, a]);
  };

  const toggleRoomFeature = (a: string) => {
    const cur = highlights.rooms_with || [];
    const next = cur.includes(a) ? cur.filter(x => x !== a) : [...cur, a];
    onChangeHighlights({ rooms_with: next });
  };

  return (
    <div className="space-y-3">
      {/* About this property — long-form sections */}
      <Card>
        <CardHeader className="py-2.5 flex flex-row items-center justify-between">
          <CardTitle className="text-[12px] flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> About this property
            <span className="text-[10px] font-normal text-muted-foreground">· {sections.length} section{sections.length === 1 ? "" : "s"}</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => addSection()} className="h-7 gap-1 text-[11px]">
            <Plus className="h-3 w-3" /> Add section
          </Button>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {sections.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-3">
              <p className="text-[11px] text-muted-foreground mb-2">
                Tell guests what makes your property special. Mirror Booking.com's storytelling pattern with one paragraph per topic.
              </p>
              <div className="flex flex-wrap gap-1">
                {SECTION_PRESETS.map(p => (
                  <button type="button"
                    key={p} onClick={() => addSection(p)}
                    className="px-2 py-0.5 rounded-full text-[10px] border border-border bg-background hover:bg-primary/5 hover:border-primary/40 transition"
                  >+ {p}</button>
                ))}
              </div>
            </div>
          )}
          {sections.map((s, i) => (
            <div key={i} className="rounded-lg border border-border bg-muted/20 p-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground p-1"
                  aria-label="Move up"
                  onClick={() => moveSection(i, -1)}
                  disabled={i === 0}
                ><GripVertical className="h-3.5 w-3.5" /></button>
                <Input
                  value={s.title}
                  onChange={e => updateSection(i, { title: e.target.value })}
                  placeholder="Section title (e.g. Prime Location)"
                  className="h-8 text-[12px] font-semibold flex-1"
                  list={`section-presets-${i}`}
                />
                <datalist id={`section-presets-${i}`}>
                  {SECTION_PRESETS.map(p => <option key={p} value={p} />)}
                </datalist>
                <Button
                  type="button" size="icon" variant="ghost" className="h-8 w-8"
                  onClick={() => removeSection(i)}
                  aria-label="Remove section"
                ><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
              </div>
              <Textarea
                value={s.body}
                onChange={e => updateSection(i, { body: e.target.value })}
                placeholder="Describe this aspect of your property. Keep it warm, factual, and 2–4 sentences."
                rows={3}
                className="text-[12px]"
              />
              <div className="text-[10px] text-muted-foreground text-right">{s.body.length} chars · ~{Math.max(1, Math.round(s.body.length / 80))} lines</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Property highlights mini-card */}
      <Card>
        <CardHeader className="py-2.5">
          <CardTitle className="text-[12px] flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5" /> Property highlights
            <span className="text-[10px] font-normal text-muted-foreground">· side card on storefront</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Perfect for</Label>
              <Input
                value={highlights.perfect_for || ""}
                onChange={e => onChangeHighlights({ perfect_for: e.target.value })}
                placeholder="a 1-night stay"
                className="h-8 text-[12px]"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Top location score (0–10)</Label>
              <Input
                type="number" step="0.1" min={0} max={10}
                value={highlights.top_location_score ?? ""}
                onChange={e => onChangeHighlights({ top_location_score: e.target.value === "" ? undefined : parseFloat(e.target.value) })}
                placeholder="8.6"
                className="h-8 text-[12px]"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><Coffee className="h-3 w-3" /> Breakfast info</Label>
            <Input
              value={highlights.breakfast_info || ""}
              onChange={e => onChangeHighlights({ breakfast_info: e.target.value })}
              placeholder="Continental, Asian, American, Buffet, Breakfast to go"
              className="h-8 text-[12px]"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1"><BedDouble className="h-3 w-3" /> Rooms with</Label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {ROOM_FEATURES.map(rf => {
                const on = (highlights.rooms_with || []).includes(rf);
                return (
                  <button type="button"
                    key={rf} onClick={() => toggleRoomFeature(rf)}
                    className={`px-2 py-0.5 rounded-full text-[10px] border transition ${
                      on ? "bg-primary text-primary-foreground border-primary font-semibold" : "bg-background border-border hover:border-primary/40"
                    }`}
                  >{rf}</button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popular amenities */}
      <Card>
        <CardHeader className="py-2.5">
          <CardTitle className="text-[12px] flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Most popular amenities
            <span className="text-[10px] font-normal text-muted-foreground">· {popular.length}/8 · drag to reorder</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {pool.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Add property facilities first, then pick your top 8 to showcase.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {pool.map(a => {
                const on = popular.includes(a);
                const Icon = getAmenityIcon(a);
                const disabled = !on && popular.length >= 8;
                return (
                  <button type="button"
                    key={a} onClick={() => togglePopular(a)} disabled={disabled}
                    className={`px-2.5 py-1 rounded-full text-[11px] border inline-flex items-center gap-1 transition ${
                      on
                        ? "bg-primary text-primary-foreground border-primary font-semibold"
                        : disabled
                        ? "bg-background border-border text-muted-foreground/40 cursor-not-allowed"
                        : "bg-background border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {a}
                  </button>
                );
              })}
            </div>
          )}
          {popular.length > 0 && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-1">Storefront preview</p>
              <div className="flex flex-wrap gap-2">
                {popular.map((a, i) => {
                  const Icon = getAmenityIcon(a);
                  return (
                    <span key={a} className="inline-flex items-center gap-1 text-[11px] text-foreground">
                      {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
                      {a}
                      {i < popular.length - 1 && <span className="text-muted-foreground/40">·</span>}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
