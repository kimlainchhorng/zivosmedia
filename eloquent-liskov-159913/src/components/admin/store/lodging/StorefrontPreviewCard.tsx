/**
 * StorefrontPreviewCard — Booking.com-style preview of guest-facing storefront content.
 * Surfaces description_sections, property_highlights and popular_amenities on the
 * Overview tab with a one-click jump to the Property Profile editor.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, BookOpen, Coffee, BedDouble, Pencil, Sparkles, Star } from "lucide-react";
import { getAmenityIcon } from "@/components/lodging/amenityIcons";
import type { LodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";

const goTab = (tab: string) =>
  window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

export default function StorefrontPreviewCard({ profile }: { profile: LodgePropertyProfile | null }) {
  const sections = profile?.description_sections ?? [];
  const highlights = profile?.property_highlights ?? {};
  const popular = profile?.popular_amenities ?? [];
  const filled =
    sections.length +
    popular.length +
    (highlights.perfect_for ? 1 : 0) +
    (highlights.top_location_score != null ? 1 : 0) +
    (highlights.breakfast_info ? 1 : 0);
  const empty = filled === 0;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
        <CardTitle className="flex items-center gap-1.5 text-[13px]">
          <BookOpen className="h-4 w-4 text-primary" /> Storefront preview
          <span className="text-[10px] font-normal text-muted-foreground">· Booking.com-style</span>
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => goTab("lodge-property")} className="h-7 gap-1 text-[11px]">
          <Pencil className="h-3 w-3" /> Edit
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {empty ? (
          <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
            <p className="mb-1 text-[12px] font-semibold text-foreground">Nothing to show yet</p>
            <p className="mb-2 text-[11px] text-muted-foreground">
              Add an "About this property" description, top location score, breakfast info, and your top 8 amenities.
              These match what Booking.com displays at the top of every listing.
            </p>
            <Button size="sm" onClick={() => goTab("lodge-property")} className="h-7 gap-1 text-[11px]">
              Open Storefront content <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <>
            {sections.length > 0 && (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">About this property</p>
                <div className="space-y-2">
                  {sections.slice(0, 2).map((s, i) => (
                    <div key={i}>
                      <p className="text-[12px] font-bold text-foreground">{s.title || "Untitled"}</p>
                      <p className="line-clamp-2 text-[11px] text-muted-foreground">{s.body || "—"}</p>
                    </div>
                  ))}
                  {sections.length > 2 && (
                    <p className="text-[10px] text-primary">+ {sections.length - 2} more section{sections.length - 2 === 1 ? "" : "s"}</p>
                  )}
                </div>
              </div>
            )}

            {(highlights.perfect_for || highlights.top_location_score != null || highlights.breakfast_info || (highlights.rooms_with || []).length > 0) && (
              <div className="rounded-lg border border-border bg-muted/30 p-2.5">
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Star className="h-3 w-3" /> Property highlights
                </p>
                <div className="space-y-1 text-[11px]">
                  {highlights.perfect_for && (
                    <p><span className="font-semibold">Perfect for</span> <span className="text-muted-foreground">{highlights.perfect_for}</span></p>
                  )}
                  {highlights.top_location_score != null && (
                    <p className="flex items-center gap-1.5">
                      <span className="rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{highlights.top_location_score}</span>
                      <span className="text-muted-foreground">Top location score</span>
                    </p>
                  )}
                  {highlights.breakfast_info && (
                    <p className="flex items-start gap-1"><Coffee className="mt-0.5 h-3 w-3 flex-shrink-0" /> <span className="text-muted-foreground">{highlights.breakfast_info}</span></p>
                  )}
                  {(highlights.rooms_with || []).length > 0 && (
                    <p className="flex items-start gap-1"><BedDouble className="mt-0.5 h-3 w-3 flex-shrink-0" /> <span className="text-muted-foreground">{(highlights.rooms_with || []).join(" · ")}</span></p>
                  )}
                </div>
              </div>
            )}

            {popular.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Sparkles className="h-3 w-3" /> Most popular amenities
                </p>
                <div className="flex flex-wrap gap-x-2.5 gap-y-1">
                  {popular.map((a) => {
                    const Icon = getAmenityIcon(a);
                    return (
                      <span key={a} className="inline-flex items-center gap-1 text-[11px] text-foreground">
                        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
                        {a}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
