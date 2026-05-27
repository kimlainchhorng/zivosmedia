import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, ListChecks, Sparkles } from "lucide-react";
import type { LodgeRoom } from "@/hooks/lodging/useLodgeRooms";
import type { LodgePropertyProfile } from "@/hooks/lodging/useLodgePropertyProfile";
import { getLodgingCompletion, type LodgingCompletionItem } from "@/lib/lodging/lodgingCompletion";

const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

export type LodgingSetupItem = LodgingCompletionItem;

export function getLodgingSetupItems({
  rooms, profile, addons, housekeepingCount, maintenanceReady, reportsReady,
  mealPlansCount, staffCount, channelConnectionsCount, promotionsCount,
  reviewsAwaitingReply, reservationsCount, guestRequestsCount,
}: {
  rooms: LodgeRoom[];
  profile: LodgePropertyProfile | null | undefined;
  addons: { active?: boolean; disabled?: boolean }[];
  housekeepingCount?: number;
  maintenanceReady?: boolean;
  reportsReady?: boolean;
  mealPlansCount?: number;
  staffCount?: number;
  channelConnectionsCount?: number;
  promotionsCount?: number;
  reviewsAwaitingReply?: number;
  reservationsCount?: number;
  guestRequestsCount?: number;
}): LodgingSetupItem[] {
  return getLodgingCompletion({
    rooms, profile, addons, housekeepingCount, maintenanceReady, reportsReady,
    mealPlansCount, staffCount, channelConnectionsCount, promotionsCount,
    reviewsAwaitingReply, reservationsCount, guestRequestsCount,
  }).items;
}

export function setupProgress(items: LodgingSetupItem[]) {
  const complete = items.filter((item) => item.ready).length;
  return { complete, total: items.length, percent: items.length ? Math.round((complete / items.length) * 100) : 0 };
}

export default function LodgingSetupChecklist({ items, compact = false, wizard = false }: { items: LodgingSetupItem[]; compact?: boolean; wizard?: boolean }) {
  const progress = setupProgress(items);
  const incomplete = items.filter((item) => !item.ready);
  const next = incomplete[0] || items[items.length - 1];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-primary" /> {wizard ? "Setup Wizard" : "Completion Center"}</span>
          <Badge variant="secondary">{progress.complete}/{progress.total} ready</Badge>
        </CardTitle>
        {wizard && next && (
          <div className="rounded-lg border border-primary/20 bg-background p-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> Next best action</p>
            <p className="mt-1 text-sm font-bold text-foreground">{next.actionLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">{next.hint}</p>
            <Button size="sm" className="mt-3 h-8" onClick={() => goTab(next.tab)}>{next.actionLabel}</Button>
          </div>
        )}
      </CardHeader>
      <CardContent className={compact ? "space-y-1.5" : wizard ? "grid gap-2 sm:grid-cols-2" : "grid gap-2 md:grid-cols-3"}>
        {items.map((item) => (
          <div key={item.key || item.label} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {item.ready ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="truncate">{item.label}</span>
                </p>
                {!compact && <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>}
              </div>
              <Badge variant={item.ready ? "secondary" : "outline"} className="text-[10px]">{item.ready ? "Ready" : "Needs setup"}</Badge>
            </div>
            {!compact && <Button size="sm" variant={wizard && !item.ready ? "default" : "outline"} className="mt-3 h-8 w-full text-xs" onClick={() => goTab(item.tab)}>{item.ready ? "Review" : item.actionLabel}</Button>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
