/**
 * LodgingReviewsSummaryCard — Booking.com-style review roll-up.
 * Shows average score, label, count, and one featured guest quote.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

interface ReviewRow {
  id: string;
  rating: number | null;
  comment: string | null;
  guest_name: string | null;
  created_at: string;
  reply: string | null;
}

const scoreLabel = (s: number) =>
  s >= 9 ? "Wonderful" : s >= 8 ? "Very good" : s >= 7 ? "Good" : s >= 6 ? "Pleasant" : s >= 4 ? "Okay" : "Poor";

export default function LodgingReviewsSummaryCard({ storeId }: { storeId: string }) {
  const { data } = useQuery({
    queryKey: ["lodging-reviews-summary", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data: rows, error } = await (supabase as any)
        .from("lodging_reviews")
        .select("id, rating, comment, guest_name, created_at, reply")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) return { rows: [] as ReviewRow[], avg: 0, count: 0, featured: null as ReviewRow | null };
      const list = (rows || []) as ReviewRow[];
      const rated = list.filter(r => typeof r.rating === "number");
      const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
      const featured = [...rated].sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .find(r => (r.comment || "").trim().length > 20) || null;
      return { rows: list, avg, count: list.length, featured };
    },
  });

  if (!data || data.count === 0) {
    return (
      <Card>
        <CardHeader className="py-2.5">
          <CardTitle className="text-[12px] flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Guest reviews</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-[11px] text-muted-foreground">No reviews yet. Reviews appear here as guests rate their stay.</p>
        </CardContent>
      </Card>
    );
  }

  const avg = Math.round((data.avg + Number.EPSILON) * 10) / 10; // 1 decimal on a 0–10 scale
  const display = avg <= 5 ? Math.round((avg * 2 + Number.EPSILON) * 10) / 10 : avg; // assume 0–5 ratings, normalize to /10

  return (
    <Card>
      <CardHeader className="py-2.5 flex flex-row items-center justify-between">
        <CardTitle className="text-[12px] flex items-center gap-1.5"><Star className="h-3.5 w-3.5" /> Guest reviews</CardTitle>
        <span className="text-[10px] text-muted-foreground">{data.count} review{data.count === 1 ? "" : "s"}</span>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary text-primary-foreground px-2.5 py-1.5 text-center min-w-[48px]">
            <p className="text-[16px] font-bold leading-none">{display.toFixed(1)}</p>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-foreground">{scoreLabel(display)}</p>
            <p className="text-[10px] text-muted-foreground">Top-rated guest experiences</p>
          </div>
        </div>
        {data.featured?.comment && (
          <div className="mt-2.5 rounded-lg border border-border bg-muted/20 p-2.5">
            <Quote className="h-3.5 w-3.5 text-primary mb-1" />
            <p className="text-[11px] text-foreground line-clamp-3">{data.featured.comment}</p>
            <p className="text-[10px] text-muted-foreground mt-1.5">— {data.featured.guest_name || "Guest"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
