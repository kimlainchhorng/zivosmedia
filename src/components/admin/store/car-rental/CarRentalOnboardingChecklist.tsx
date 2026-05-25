/**
 * Setup checklist shown on the car-rental dashboard. Auto-dismisses once all
 * steps are complete. Each step jumps the operator to the relevant tab.
 */
import { useMemo } from "react";
import {
  CheckCircle2, Circle, Car, Building2, PackagePlus, CalendarRange, ArrowRight, Sparkles, ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
  hint: string;
  icon: typeof Car;
  done: boolean;
  jumpTab?: string;
  externalHref?: string;
}

interface Props {
  storeId: string;
  storeSlug?: string;
  hasLocation: boolean;
  hasVehicle: boolean;
  hasAddon: boolean;
  hasReservation: boolean;
  onJumpToTab?: (tab: string) => void;
}

export default function CarRentalOnboardingChecklist({
  storeSlug, hasLocation, hasVehicle, hasAddon, hasReservation, onJumpToTab,
}: Props) {
  const steps: Step[] = useMemo(() => [
    {
      id: "location", label: "Add a pickup location",
      hint: "Where renters pick up and drop off vehicles.",
      icon: Building2, done: hasLocation, jumpTab: "car-rental-locations",
    },
    {
      id: "vehicle", label: "Add your first vehicle",
      hint: "Make, model, plate, daily rate, mileage limit.",
      icon: Car, done: hasVehicle, jumpTab: "car-rental-fleet",
    },
    {
      id: "addon", label: "Add a few rental extras (optional)",
      hint: "Insurance, GPS, child seat, additional driver.",
      icon: PackagePlus, done: hasAddon, jumpTab: "car-rental-addons",
    },
    {
      id: "link", label: "Share your booking link",
      hint: storeSlug ? `Customers book at /car-rental/${storeSlug}` : "Set a store slug on the Profile tab first.",
      icon: ExternalLink, done: Boolean(storeSlug), externalHref: storeSlug ? `/car-rental/${storeSlug}` : undefined,
    },
    {
      id: "first", label: "Take your first reservation",
      hint: "Walk-in, phone-in, or your first online booking.",
      icon: CalendarRange, done: hasReservation, jumpTab: "car-rental-reservations",
    },
  ], [hasLocation, hasVehicle, hasAddon, hasReservation, storeSlug]);

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completed === total;

  if (allDone) return null;

  return (
    <Card className="rounded-2xl border-primary/30 bg-gradient-to-br from-primary/8 via-card to-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-5 w-5 text-primary" /> Get your rental shop live
        </CardTitle>
        <span className="rounded-full bg-primary/12 px-2.5 py-1 text-[11px] font-bold text-primary">
          {completed} / {total}
        </span>
      </CardHeader>
      <CardContent>
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.round((completed / total) * 100)}%` }} />
        </div>
        <ul className="space-y-1.5">
          {steps.map((s) => {
            const Icon = s.done ? CheckCircle2 : Circle;
            return (
              <li key={s.id}>
                <div className={cn(
                  "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                  s.done ? "border-emerald-500/30 bg-emerald-500/5" : "border-border bg-card hover:border-primary/30"
                )}>
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", s.done ? "text-emerald-500" : "text-muted-foreground/60")} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm font-semibold", s.done ? "text-muted-foreground line-through" : "text-foreground")}>
                      {s.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{s.hint}</p>
                  </div>
                  {!s.done && (
                    s.jumpTab && onJumpToTab ? (
                      <Button size="sm" variant="outline" onClick={() => onJumpToTab(s.jumpTab!)}>
                        Open <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    ) : s.externalHref ? (
                      <Button size="sm" variant="outline" asChild>
                        <a href={s.externalHref} target="_blank" rel="noreferrer">
                          View <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      </Button>
                    ) : null
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
