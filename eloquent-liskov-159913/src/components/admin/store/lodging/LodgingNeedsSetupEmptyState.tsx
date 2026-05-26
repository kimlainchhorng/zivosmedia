import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, ListChecks } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LodgingSetupAction = {
  label: string;
  tab?: string;
  href?: string;
  onClick?: () => void;
  variant?: "default" | "outline" | "secondary";
};

const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

export const FRONT_DESK_EMPTY_ACTIONS = {
  arrivals: { primary: { label: "Create / review reservations", tab: "lodge-reservations" }, secondary: { label: "Open rooms", tab: "lodge-rooms" } },
  inHouse: { primary: { label: "Review reservations", tab: "lodge-reservations" }, secondary: { label: "Open rate plans", tab: "lodge-rate-plans" } },
  departures: { primary: { label: "Review departures", tab: "lodge-reservations" }, secondary: { label: "Open guest requests", tab: "lodge-guest-requests" } },
} as const;

export function runLodgingSetupAction(action: LodgingSetupAction) {
  if (action.onClick) return action.onClick();
  if (action.tab) return goTab(action.tab);
  if (action.href) window.location.assign(action.href);
}

export default function LodgingNeedsSetupEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  qaAction = { label: "Run QA", href: "/admin/lodging/qa-checklist" },
  nextBestAction,
  compact = false,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  primaryAction: LodgingSetupAction;
  secondaryAction?: LodgingSetupAction;
  qaAction?: LodgingSetupAction | null;
  nextBestAction?: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-primary/20 bg-primary/5 ${compact ? "p-3" : "p-5"}`}>
      <div className="flex flex-col gap-3 text-left sm:flex-row sm:items-start">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-foreground">{title}</p>
            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Section installed</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          {nextBestAction && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-card p-2 text-xs">
              <ArrowRight className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">Next best action:</span>
              <span className="text-muted-foreground">{nextBestAction}</span>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant={primaryAction.variant || "default"} onClick={() => runLodgingSetupAction(primaryAction)}>{primaryAction.label}</Button>
            {secondaryAction && <Button size="sm" variant={secondaryAction.variant || "outline"} onClick={() => runLodgingSetupAction(secondaryAction)}>{secondaryAction.label}</Button>}
            {qaAction && <Button size="sm" variant={qaAction.variant || "outline"} onClick={() => runLodgingSetupAction(qaAction)}><ListChecks className="mr-2 h-4 w-4" /> {qaAction.label}</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}