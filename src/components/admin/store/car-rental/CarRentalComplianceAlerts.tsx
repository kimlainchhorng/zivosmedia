/**
 * Compliance alerts for fleet vehicles — flags registration/insurance/inspection
 * that's already expired or expiring within 30 days.
 */
import { useMemo } from "react";
import { ShieldAlert, ShieldCheck, Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCarRentalVehicles, type CarRentalVehicle } from "@/hooks/car-rental/useCarRentalVehicles";
import { cn } from "@/lib/utils";

interface Props { storeId: string; onJumpToTab?: (tab: string) => void }

const dayMs = 24 * 60 * 60 * 1000;
const HORIZON_DAYS = 30;

interface ComplianceItem {
  vehicle: CarRentalVehicle;
  label: string;
  dateIso: string;
  daysFromNow: number;
}

export default function CarRentalComplianceAlerts({ storeId, onJumpToTab }: Props) {
  const { vehicles } = useCarRentalVehicles(storeId);

  const items = useMemo(() => {
    const now = Date.now();
    const out: ComplianceItem[] = [];
    for (const v of vehicles) {
      if (!v.is_active) continue;
      const fields: Array<{ key: keyof CarRentalVehicle; label: string }> = [
        { key: "registration_expires_at", label: "Registration expires" },
        { key: "insurance_expires_at", label: "Insurance expires" },
        { key: "inspection_due_at", label: "Inspection due" },
      ];
      for (const f of fields) {
        const value = v[f.key] as string | null;
        if (!value) continue;
        const t = new Date(value).getTime();
        const days = Math.floor((t - now) / dayMs);
        if (days <= HORIZON_DAYS) {
          out.push({ vehicle: v, label: f.label, dateIso: value, daysFromNow: days });
        }
      }
    }
    out.sort((a, b) => a.daysFromNow - b.daysFromNow);
    return out;
  }, [vehicles]);

  if (items.length === 0) return null;

  const expired = items.filter((i) => i.daysFromNow < 0).length;

  return (
    <Card className={cn(
      "rounded-2xl",
      expired > 0 ? "border-destructive/40 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"
    )}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className={cn(
          "flex items-center gap-2 text-base",
          expired > 0 ? "text-destructive" : "text-amber-900 dark:text-amber-200"
        )}>
          <ShieldAlert className="h-5 w-5" />
          Compliance — {expired > 0 ? `${expired} expired` : `${items.length} expiring soon`}
        </CardTitle>
        {onJumpToTab && (
          <Button size="sm" variant="ghost" className="gap-1" onClick={() => onJumpToTab("car-rental-fleet")}>
            Manage fleet <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {items.slice(0, 6).map((i, idx) => {
            const isExpired = i.daysFromNow < 0;
            return (
              <li key={`${i.vehicle.id}-${idx}`} className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5",
                isExpired ? "border-destructive/30 bg-destructive/10" : "border-amber-500/30 bg-amber-500/10",
              )}>
                <div className={cn(
                  "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                  isExpired ? "bg-destructive/15 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                )}>
                  {isExpired ? <ShieldAlert className="h-4 w-4" /> : <Calendar className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {i.vehicle.year ? `${i.vehicle.year} ` : ""}{i.vehicle.make} {i.vehicle.model}
                    {i.vehicle.license_plate && <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{i.vehicle.license_plate}</span>}
                  </p>
                  <p className="truncate text-[11px]">
                    {i.label}{" "}
                    <span className={isExpired ? "font-bold text-destructive" : "font-bold text-amber-700 dark:text-amber-300"}>
                      {isExpired
                        ? `${Math.abs(i.daysFromNow)} day${Math.abs(i.daysFromNow) === 1 ? "" : "s"} ago`
                        : i.daysFromNow === 0 ? "today" : `in ${i.daysFromNow} day${i.daysFromNow === 1 ? "" : "s"}`}
                    </span>
                    {" · "}
                    <span className="text-muted-foreground">{new Date(i.dateIso).toLocaleDateString()}</span>
                  </p>
                </div>
              </li>
            );
          })}
          {items.length > 6 && (
            <li className="text-[11px] text-muted-foreground text-center pt-1">
              + {items.length - 6} more
            </li>
          )}
        </ul>
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Set expiration dates on each vehicle in the Fleet tab.
        </p>
      </CardContent>
    </Card>
  );
}
