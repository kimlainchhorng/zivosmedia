/**
 * CafePrepForecastCard — "what to prep today" suggestions. Averaged from
 * the last 4 occurrences of today's weekday, with a 20% safety buffer.
 * Empty state covers the brand-new store case so it stays calm during
 * onboarding.
 */
import { Loader2, ChefHat, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCafePrepForecast } from "@/hooks/cafe/useCafePrepForecast";

interface Props { storeId: string }

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function CafePrepForecastCard({ storeId }: Props) {
  const { rows, loading } = useCafePrepForecast(storeId);
  const todayLabel = WEEKDAY[new Date().getDay()];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2"><ChefHat className="h-4 w-4 text-amber-600" /> Prep forecast</span>
          <Badge variant="secondary" className="text-[10px]">{todayLabel}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            No history yet for {todayLabel}s. Come back after a couple of weeks of orders and we&rsquo;ll suggest what to prep.
          </p>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground mb-2">
              Based on the last {rows[0].weeks_observed} {todayLabel}{rows[0].weeks_observed === 1 ? "" : "s"} of completed orders. 20% safety buffer included.
            </p>
            <ul className="divide-y divide-border/60">
              {rows.map((r) => (
                <li key={r.menu_item_id} className="flex items-center justify-between py-2">
                  <span className="min-w-0">
                    <span className="font-medium truncate block">{r.item_name}</span>
                    {r.category_name && (
                      <span className="text-[11px] text-muted-foreground">{r.category_name}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 shrink-0 text-sm">
                    <span className="text-[11px] text-muted-foreground tabular-nums">avg {r.avg_qty}</span>
                    <span className="inline-flex items-center gap-1 font-bold tabular-nums">
                      <TrendingUp className="h-3.5 w-3.5 text-amber-600" />
                      {r.suggested_prep}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
