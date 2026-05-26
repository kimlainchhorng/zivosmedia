/**
 * Full rental history + lifetime stats for a single renter.
 * Opens from the Renters section.
 */
import { useEffect, useMemo, useState } from "react";
import {
  User, Phone, Mail, IdCard, DollarSign, CalendarRange, AlertOctagon, Star, Loader2, Car, Award,
  Activity, KeyRound, ClipboardCheck, XCircle, MessageSquare,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import type { CarRentalCustomer } from "@/hooks/car-rental/useCarRentalCustomers";
import { getLoyaltyTier } from "@/lib/car-rental/loyalty";

interface Props {
  customer: CarRentalCustomer | null;
  onClose: () => void;
}

interface Reservation {
  id: string;
  vehicle_label: string;
  pickup_at: string;
  dropoff_at: string;
  rental_days: number;
  total_cents: number;
  status: string;
  confirmation_code: string;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function CarRentalCustomerDetailDialog({ customer, onClose }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [resR, revR] = await Promise.all([
        supabase.from("car_rental_reservations")
          .select("id, vehicle_label, pickup_at, dropoff_at, rental_days, total_cents, status, confirmation_code")
          .eq("customer_id", customer.id)
          .order("pickup_at", { ascending: false })
          .limit(100),
        supabase.from("car_rental_reviews")
          .select("id, rating, comment, created_at")
          .eq("customer_id", customer.id)
          .order("created_at", { ascending: false })
          .limit(10),
      ]);
      if (cancelled) return;
      setReservations((resR.data ?? []) as unknown as Reservation[]);
      setReviews((revR.data ?? []) as unknown as Review[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [customer]);

  const activityTimeline = useMemo(() => {
    type Entry = { at: string; kind: "booked" | "picked_up" | "returned" | "cancelled" | "reviewed"; label: string; detail: string };
    const entries: Entry[] = [];
    for (const r of reservations) {
      entries.push({
        at: r.pickup_at,
        kind: "booked",
        label: "Booking",
        detail: `${r.vehicle_label} — ${r.rental_days} day${r.rental_days === 1 ? "" : "s"} ($${(r.total_cents / 100).toFixed(2)})`,
      });
      if (r.status === "picked_up" || r.status === "returned") {
        entries.push({ at: r.pickup_at, kind: "picked_up", label: "Picked up", detail: r.vehicle_label });
      }
      if (r.status === "returned") {
        entries.push({ at: r.dropoff_at, kind: "returned", label: "Returned", detail: r.vehicle_label });
      }
      if (r.status === "cancelled" || r.status === "no_show") {
        entries.push({ at: r.pickup_at, kind: "cancelled", label: r.status === "no_show" ? "No-show" : "Cancelled", detail: r.vehicle_label });
      }
    }
    for (const v of reviews) {
      entries.push({
        at: v.created_at,
        kind: "reviewed",
        label: `${v.rating}-star review`,
        detail: v.comment ? `"${v.comment.slice(0, 80)}${v.comment.length > 80 ? "…" : ""}"` : "(no comment)",
      });
    }
    return entries.sort((a, b) => b.at.localeCompare(a.at));
  }, [reservations, reviews]);

  const stats = useMemo(() => {
    if (!customer) return null;
    const completed = reservations.filter((r) => r.status === "returned");
    const cancelled = reservations.filter((r) => r.status === "cancelled").length;
    const noShows = reservations.filter((r) => r.status === "no_show").length;
    const lifetimeSpend = completed.reduce((s, r) => s + r.total_cents, 0);
    const totalDays = completed.reduce((s, r) => s + r.rental_days, 0);
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
    const avgRentalLength = completed.length > 0 ? totalDays / completed.length : 0;
    const avgRentalValue = completed.length > 0 ? lifetimeSpend / completed.length : 0;
    // Days as customer — from earliest reservation pickup_at or customer.created_at, whichever earlier
    const allDates = [
      ...reservations.map((r) => new Date(r.pickup_at).getTime()).filter((n) => Number.isFinite(n)),
      new Date(customer.created_at).getTime(),
    ].filter((n) => Number.isFinite(n));
    const earliest = allDates.length > 0 ? Math.min(...allDates) : Date.now();
    const daysAsCustomer = Math.max(0, Math.floor((Date.now() - earliest) / (24 * 60 * 60 * 1000)));
    // Repeat rate: completed / total (excluding pending/confirmed in flight)
    const completedDenom = completed.length + cancelled + noShows;
    const completionRate = completedDenom > 0 ? completed.length / completedDenom : null;
    return {
      completed: completed.length, cancelled, noShows, lifetimeSpend, totalDays,
      avgRating, avgRentalLength, avgRentalValue, daysAsCustomer, completionRate,
    };
  }, [reservations, reviews, customer]);

  if (!customer) return null;

  const c = customer;
  const licenseExpiringSoon = c.driver_license_expiry &&
    new Date(c.driver_license_expiry).getTime() < Date.now() + 90 * 24 * 60 * 60 * 1000;
  const licenseExpired = c.driver_license_expiry &&
    new Date(c.driver_license_expiry).getTime() < Date.now();

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {c.display_name.charAt(0).toUpperCase()}
            </div>
            {c.display_name}
            {(() => {
              const t = getLoyaltyTier(c.total_rentals);
              if (t.tier === "none") return null;
              return (
                <span className={cn("ml-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", t.className)}>
                  <span aria-hidden>{t.emoji}</span> {t.label}
                </span>
              );
            })()}
            {c.is_blocked && (
              <span className="ml-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                Blocked
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contact + license */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Contact</p>
              {c.phone && <p className="flex items-center gap-2 text-sm"><Phone className="h-3.5 w-3.5 text-muted-foreground" />{c.phone}</p>}
              {c.email && <p className="flex items-center gap-2 text-sm"><Mail className="h-3.5 w-3.5 text-muted-foreground" />{c.email}</p>}
              {(c.address || c.city) && (
                <p className="text-xs text-muted-foreground pl-5">
                  {[c.address, c.city, c.state, c.postal_code, c.country].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-card p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Driver license</p>
              {c.driver_license_number ? (
                <>
                  <p className="flex items-center gap-2 text-sm">
                    <IdCard className="h-3.5 w-3.5 text-muted-foreground" />
                    {c.driver_license_number}
                    {c.driver_license_state && <span className="text-muted-foreground">({c.driver_license_state})</span>}
                  </p>
                  {c.driver_license_expiry && (
                    <p className={cn(
                      "text-xs pl-5",
                      licenseExpired ? "text-destructive font-semibold" : licenseExpiringSoon ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground",
                    )}>
                      {licenseExpired ? "EXPIRED " : licenseExpiringSoon ? "Expires soon: " : "Expires "}
                      {new Date(c.driver_license_expiry).toLocaleDateString()}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No license on file.</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : stats && (
            <>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                <Stat icon={DollarSign} label="Lifetime spend" value={formatMoney(stats.lifetimeSpend)} sub={stats.completed > 0 ? `avg ${formatMoney(Math.round(stats.avgRentalValue))}/rental` : undefined} />
                <Stat icon={Car} label="Completed rentals" value={String(stats.completed)} sub={`${stats.totalDays} days total`} />
                <Stat icon={CalendarRange} label="Avg rental length" value={stats.avgRentalLength > 0 ? `${stats.avgRentalLength.toFixed(1)} d` : "—"} />
                <Stat icon={AlertOctagon} label="No-shows / cancels" value={`${stats.noShows} / ${stats.cancelled}`} tone={(stats.noShows + stats.cancelled) > 0 ? "warn" : "neutral"} />
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                <Stat
                  icon={Activity}
                  label="Days as customer"
                  value={stats.daysAsCustomer > 0 ? `${stats.daysAsCustomer}` : "Today"}
                  sub={stats.daysAsCustomer >= 30 ? `since ${new Date(c.created_at).toLocaleDateString()}` : undefined}
                />
                <Stat
                  icon={CalendarRange}
                  label="Completion rate"
                  value={stats.completionRate !== null ? `${Math.round(stats.completionRate * 100)}%` : "—"}
                  sub={stats.completionRate !== null && stats.completionRate < 0.6 ? "below typical" : undefined}
                  tone={stats.completionRate !== null && stats.completionRate < 0.6 ? "warn" : "neutral"}
                />
                <Stat
                  icon={DollarSign}
                  label="Avg rental value"
                  value={stats.completed > 0 ? formatMoney(Math.round(stats.avgRentalValue)) : "—"}
                />
              </div>
              {stats.completed >= 3 && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-3">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Loyal customer — {stats.completed} completed rentals</p>
                    <p className="text-[11px] text-muted-foreground">
                      Consider extending a returning-renter perk on the next booking.
                    </p>
                  </div>
                </div>
              )}

              {(() => {
                const t = getLoyaltyTier(c.total_rentals);
                if (t.nextLabel && t.rentalsToNext !== null && t.rentalsToNext > 0) {
                  return (
                    <div className={cn("rounded-xl border p-3 flex items-center gap-3", t.className)}>
                      <span className="text-2xl" aria-hidden>{t.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">
                          {t.tier === "none" ? "Just getting started" : `${t.label} member`}
                        </p>
                        <p className="text-[11px] opacity-80">
                          {t.rentalsToNext} more rental{t.rentalsToNext === 1 ? "" : "s"} to reach {t.nextLabel}
                        </p>
                      </div>
                    </div>
                  );
                }
                if (t.tier === "platinum") {
                  return (
                    <div className={cn("rounded-xl border p-3 flex items-center gap-3", t.className)}>
                      <span className="text-2xl" aria-hidden>{t.emoji}</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold">Platinum member — top tier reached</p>
                        <p className="text-[11px] opacity-80">Long-term loyal renter.</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {stats.avgRating !== null && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-3">
                  <Award className="h-5 w-5 text-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">Average rating left: {stats.avgRating.toFixed(1)}/5</p>
                    <p className="text-[11px] text-muted-foreground">From {reviews.length} review{reviews.length === 1 ? "" : "s"}</p>
                  </div>
                </div>
              )}

              {/* Reservations history */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Rental history ({reservations.length})
                </p>
                {reservations.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    <Car className="mx-auto mb-2 h-8 w-8 opacity-50" />
                    No rentals yet.
                  </div>
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {reservations.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="truncate text-sm font-semibold text-foreground">{r.vehicle_label}</p>
                            <span className="font-mono text-[10px] text-muted-foreground">{r.confirmation_code}</span>
                            <StatusPill status={r.status} />
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {new Date(r.pickup_at).toLocaleDateString()} → {new Date(r.dropoff_at).toLocaleDateString()} · {r.rental_days} day{r.rental_days === 1 ? "" : "s"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-foreground">{formatMoney(r.total_cents)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Combined activity timeline */}
              {activityTimeline.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 inline-flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5" /> Activity timeline
                  </p>
                  <ol className="space-y-1.5">
                    {activityTimeline.slice(0, 20).map((e, i) => {
                      const Icon =
                        e.kind === "booked" ? CalendarRange :
                        e.kind === "picked_up" ? KeyRound :
                        e.kind === "returned" ? ClipboardCheck :
                        e.kind === "cancelled" ? XCircle :
                        MessageSquare;
                      const tone =
                        e.kind === "booked" ? "bg-primary/10 text-primary" :
                        e.kind === "picked_up" ? "bg-emerald-500/10 text-emerald-600" :
                        e.kind === "returned" ? "bg-emerald-500/10 text-emerald-600" :
                        e.kind === "cancelled" ? "bg-destructive/10 text-destructive" :
                        "bg-amber-500/10 text-amber-700 dark:text-amber-300";
                      return (
                        <li key={i} className="flex items-start gap-2 rounded-lg border border-border bg-card p-2">
                          <div className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", tone)}>
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="text-sm font-semibold text-foreground">{e.label}</p>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(e.at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                    {activityTimeline.length > 20 && (
                      <li className="text-center text-[11px] text-muted-foreground">
                        + {activityTimeline.length - 20} more events
                      </li>
                    )}
                  </ol>
                </div>
              )}

              {/* Reviews left */}
              {reviews.length > 0 && (
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Reviews ({reviews.length})
                  </p>
                  <ul className="space-y-1.5">
                    {reviews.map((r) => (
                      <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={cn("h-3.5 w-3.5", s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
                          ))}
                          <span className="ml-1 text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                        {r.comment && <p className="mt-1 text-sm text-foreground/90">{r.comment}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Notes / tags */}
          {(c.notes || c.tags.length > 0) && (
            <div className="rounded-xl border border-border bg-card p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
              {c.tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">{t}</span>
                  ))}
                </div>
              )}
              {c.notes && <p className="text-sm text-foreground/90 whitespace-pre-wrap">{c.notes}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ icon: Icon, label, value, sub, tone = "neutral" }: {
  icon: typeof DollarSign; label: string; value: string; sub?: string; tone?: "warn" | "neutral";
}) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-3",
      tone === "warn" && "border-amber-500/30 bg-amber-500/5",
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-[10px] font-bold uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "pending" ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
    : status === "confirmed" ? "bg-primary/10 text-primary border-primary/30"
    : status === "picked_up" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
    : status === "returned" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 opacity-75"
    : "bg-muted text-muted-foreground border-border";
  return (
    <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", tone)}>
      {status === "no_show" ? "no-show" : status === "picked_up" ? "on rental" : status}
    </span>
  );
}

// Suppress unused
void User;
