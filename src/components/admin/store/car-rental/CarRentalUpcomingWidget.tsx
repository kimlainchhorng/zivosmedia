/**
 * Compact "next 24h" widget — pickups + returns with one-tap contact buttons.
 * Sits high on the dashboard for quick operational awareness.
 */
import { useEffect, useState } from "react";
import { KeyRound, ClipboardCheck, Phone, Mail, Clock, Loader2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Props { storeId: string; onJumpToTab?: (tab: string) => void }

interface UpcomingItem {
  id: string;
  kind: "pickup" | "return";
  at: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  vehicle_label: string;
  confirmation_code: string;
  overdue: boolean;
}

const HOURS = 24;

export default function CarRentalUpcomingWidget({ storeId, onJumpToTab }: Props) {
  const [items, setItems] = useState<UpcomingItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const now = new Date();
      const horizon = new Date(now.getTime() + HOURS * 60 * 60 * 1000);
      const dayPast = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [pickupsR, returnsR] = await Promise.all([
        supabase
          .from("car_rental_reservations")
          .select("id, customer_name, customer_phone, customer_email, vehicle_label, confirmation_code, pickup_at")
          .eq("store_id", storeId)
          .in("status", ["pending", "confirmed"])
          .gte("pickup_at", dayPast.toISOString())
          .lt("pickup_at", horizon.toISOString())
          .order("pickup_at", { ascending: true }),
        supabase
          .from("car_rental_reservations")
          .select("id, customer_name, customer_phone, customer_email, vehicle_label, confirmation_code, dropoff_at")
          .eq("store_id", storeId)
          .eq("status", "picked_up")
          .lt("dropoff_at", horizon.toISOString())
          .order("dropoff_at", { ascending: true }),
      ]);
      if (cancelled) return;
      const nowMs = now.getTime();
      const out: UpcomingItem[] = [];
      for (const r of (pickupsR.data ?? []) as any[]) {
        out.push({
          id: `p-${r.id}`,
          kind: "pickup",
          at: r.pickup_at,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          customer_email: r.customer_email,
          vehicle_label: r.vehicle_label,
          confirmation_code: r.confirmation_code,
          overdue: new Date(r.pickup_at).getTime() < nowMs,
        });
      }
      for (const r of (returnsR.data ?? []) as any[]) {
        out.push({
          id: `r-${r.id}`,
          kind: "return",
          at: r.dropoff_at,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          customer_email: r.customer_email,
          vehicle_label: r.vehicle_label,
          confirmation_code: r.confirmation_code,
          overdue: new Date(r.dropoff_at).getTime() < nowMs,
        });
      }
      out.sort((a, b) => a.at.localeCompare(b.at));
      setItems(out);
    })();
    return () => { cancelled = true; };
  }, [storeId]);

  if (items === null) {
    return (
      <Card className="rounded-2xl border-border/60">
        <CardContent className="p-3 text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading upcoming…
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) return null;

  const formatRelTime = (iso: string) => {
    const diffMs = new Date(iso).getTime() - Date.now();
    const absMin = Math.abs(diffMs) / (60 * 1000);
    if (absMin < 60) return `${Math.round(absMin)}m ${diffMs < 0 ? "ago" : ""}`.trim();
    return `${(absMin / 60).toFixed(1)}h ${diffMs < 0 ? "ago" : ""}`.trim();
  };
  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const formatDay = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
    return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  const pickups = items.filter((i) => i.kind === "pickup").length;
  const returns = items.filter((i) => i.kind === "return").length;
  const overdue = items.filter((i) => i.overdue).length;

  return (
    <Card className="rounded-2xl border-border/60">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" /> Next 24 hours
          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {pickups} pickup{pickups === 1 ? "" : "s"} · {returns} return{returns === 1 ? "" : "s"}
          </span>
          {overdue > 0 && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {overdue} overdue
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {items.slice(0, 6).map((i) => {
            const Icon = i.kind === "pickup" ? KeyRound : ClipboardCheck;
            return (
              <li key={i.id} className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5 transition-colors",
                i.overdue ? "border-amber-500/30 bg-amber-500/5" : "border-border",
              )}>
                <div className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                  i.overdue ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" :
                    i.kind === "pickup" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                )}>
                  {i.overdue ? <AlertCircle className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="truncate text-sm font-semibold text-foreground">{i.customer_name}</p>
                    <span className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                      i.kind === "pickup" ? "bg-primary/15 text-primary" : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
                    )}>
                      {i.kind}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {i.vehicle_label} · {formatDay(i.at)} {formatTime(i.at)} ·{" "}
                    <span className={i.overdue ? "font-bold text-amber-700 dark:text-amber-300" : ""}>{formatRelTime(i.at)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {i.customer_phone && (
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7" title={`Call ${i.customer_phone}`}>
                      <a href={`tel:${i.customer_phone}`}><Phone className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                  {i.customer_phone && (
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7" title={`SMS ${i.customer_phone}`}>
                      <a href={`sms:${i.customer_phone}`}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                      </a>
                    </Button>
                  )}
                  {i.customer_email && (
                    <Button asChild variant="ghost" size="icon" className="h-7 w-7" title={`Email ${i.customer_email}`}>
                      <a href={`mailto:${i.customer_email}`}><Mail className="h-3.5 w-3.5" /></a>
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {items.length > 6 && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            + {items.length - 6} more in the next 24h
          </p>
        )}
        {onJumpToTab && (
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onJumpToTab("car-rental-checkout")}>
              <KeyRound className="mr-1 h-3.5 w-3.5" /> Open check-out
            </Button>
            <Button size="sm" variant="outline" className="flex-1" onClick={() => onJumpToTab("car-rental-returns")}>
              <ClipboardCheck className="mr-1 h-3.5 w-3.5" /> Open returns
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
