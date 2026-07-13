import { Activity, AlertTriangle, ArrowRight, Loader2, ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFeedIncidentOpsSummary, type FeedIncidentRange } from "@/hooks/useFeedIncidentOpsSummary";

type FeedIncidentSummaryCardProps = {
  range?: FeedIncidentRange;
  title?: string;
  compact?: boolean;
  className?: string;
};

function severityLabel(severity: ReturnType<typeof useFeedIncidentOpsSummary>["severity"]) {
  if (severity === "critical") return { label: "Critical", variant: "destructive" as const };
  if (severity === "elevated") return { label: "Elevated", variant: "default" as const };
  return { label: "Stable", variant: "secondary" as const };
}

export function FeedIncidentSummaryCard({
  range = "24h",
  title = "Feed Incident Radar",
  compact = false,
  className,
}: FeedIncidentSummaryCardProps) {
  const navigate = useNavigate();
  const summary = useFeedIncidentOpsSummary(range);
  const status = severityLabel(summary.severity);
  const visibleAlerts = compact ? summary.alerts.slice(0, 2) : summary.alerts.slice(0, 3);
  const visibleTimeline = compact ? summary.watchTimeline.slice(-4) : summary.watchTimeline.slice(-6);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            {title}
          </span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{summary.rangeLabel}</Badge>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading feed incident summary...
          </div>
        ) : (
          <>
            <div className={cn("grid gap-3", compact ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-2 xl:grid-cols-4") }>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Errors</p>
                <p className="text-xl font-bold text-foreground">{summary.totalErrors}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">500s</p>
                <p className="text-xl font-bold text-foreground">{summary.status500Count}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Apply / Error</p>
                <p className="text-xl font-bold text-foreground">{summary.applyToErrorRatio}</p>
              </div>
              <div className="rounded-lg border border-border/60 px-3 py-2">
                <p className="text-xs text-muted-foreground">Recommended phase</p>
                <p className="text-sm font-semibold uppercase text-foreground">{summary.recommendedPhase}</p>
              </div>
            </div>

            <div className={cn("grid gap-4", compact ? "grid-cols-1 xl:grid-cols-[1.2fr_0.8fr]" : "grid-cols-1 xl:grid-cols-[1.4fr_0.6fr]") }>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active alerts</p>
                {visibleAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-lg border border-border/60 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{alert.title}</p>
                      <Badge variant={alert.severity === "critical" ? "destructive" : alert.severity === "elevated" ? "default" : "secondary"}>
                        {alert.count}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.detail}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Watch stream</p>
                {visibleTimeline.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm text-muted-foreground">
                    No watch buckets yet.
                  </div>
                ) : (
                  visibleTimeline.map((point) => (
                    <div key={point.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-foreground">{point.label}</p>
                        <p className="text-xs text-muted-foreground">Errors {point.errors} • Actions {point.actions}</p>
                      </div>
                      <Badge variant={point.gap > 0 ? "destructive" : point.actions > 0 ? "default" : "secondary"}>
                        {point.gap > 0 ? `+${point.gap}` : point.gap}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {summary.lastErrorAt
                    ? `Last feed failure ${new Date(summary.lastErrorAt).toLocaleString()} · top scope ${summary.topScope}`
                    : "No recent feed failures detected."}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => navigate(summary.criticalPath)} className="gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  500s
                </Button>
                <Button type="button" size="sm" onClick={() => navigate(summary.phasePath)} className="gap-2">
                  Open Incident
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}