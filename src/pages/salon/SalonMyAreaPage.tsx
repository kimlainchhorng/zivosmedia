/**
 * SalonMyAreaPage — authenticated customer dashboard at /salon/me.
 *
 * Lists the user's upcoming visits, past visits, loyalty totals per salon,
 * gift cards in their name, and per-salon communication preferences. RLS
 * gates everything via salon_clients.user_id = auth.uid(); the matching
 * triggers (added in 20260524370000) auto-link existing rows on signup and
 * stamp client_id on new authenticated public bookings.
 *
 * The page intentionally does NOT include in-portal reschedule. Cancel is
 * handled by the existing PublicSalonBookingPage detail view (linked
 * per-row); "Book again" links to the public booking page pre-filled with
 * service + stylist.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Calendar, Clock, Store, Sparkles, AlertCircle, Loader2, CreditCard,
  Star, ArrowRight, ScrollText, History, RefreshCw, BellRing, Mail, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useSalonMyArea, type MyAreaSalon, type MyAreaBooking, type MyAreaGiftCard } from "@/hooks/salon/useSalonMyArea";
import { supabase } from "@/integrations/supabase/client";

const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const STATUS_TONE: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  confirmed: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  no_show: "bg-destructive/10 text-destructive border-destructive/30",
};

// Mask a gift card code — show "XXXX-XXXX-XXXX" with only the last 4 visible.
function maskCode(code: string): string {
  if (!code) return "";
  const last4 = code.replace(/-/g, "").slice(-4);
  return `••••-••••-${last4}`;
}

function rebookHref(b: MyAreaBooking): string {
  const params = new URLSearchParams();
  if (b.service_id) params.set("service", b.service_id);
  const query = params.toString();
  return `/salon/${b.store_slug}${query ? `?${query}` : ""}`;
}

export default function SalonMyAreaPage() {
  const { user } = useAuth();
  const { loading, error, salons, upcoming, past, loyalty, giftCards, refresh } = useSalonMyArea();

  const firstName = useMemo(() => {
    const full = (user?.user_metadata?.full_name as string | undefined)
      ?? (user?.email ?? "").split("@")[0];
    return (full?.trim().split(/\s+/)[0] ?? "").trim() || "there";
  }, [user]);

  // Total loyalty points across every salon — a nice top-level stat.
  const totalLoyalty = useMemo(
    () => salons.reduce((s, x) => s + (x.loyalty_points ?? 0), 0),
    [salons],
  );
  const visibleGiftCards = useMemo(
    () => giftCards.filter((c) => c.balance_cents > 0 || c.is_active),
    [giftCards],
  );

  // Map store_id → name so loyalty event rows can show the salon context.
  const storeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of salons) m.set(s.store_id, s.store_name);
    return m;
  }, [salons]);

  const savePref = async (
    clientId: string,
    patch: { sms_opt_in?: boolean; email_opt_in?: boolean; marketing_opt_in?: boolean },
  ) => {
    // RLS lets the client UPDATE only the three opt-in columns on their own
    // salon_clients row (enforced by the salon_clients_self_update_guard
    // trigger added in the customer-portal migration). The refresh after
    // success keeps the UI consistent.
    const { error: err } = await supabase
      .from("salon_clients")
      .update(patch as never)
      .eq("id", clientId);
    if (err) {
      toast.error(err.message || "Couldn't update preferences.");
      return;
    }
    void refresh();
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Your salon area · ZIVO</title></Helmet>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
        {/* Header strip */}
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Salon</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
              Hi, {firstName}.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your upcoming visits, history, and rewards across every salon on ZIVO.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void refresh()} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Empty-state if the user has no salon history at all */}
        {salons.length === 0 && upcoming.length === 0 && past.length === 0 && giftCards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
            <p className="text-base font-semibold text-foreground">No salon visits yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Once you book a visit at a salon on ZIVO, you'll see it here — along with loyalty
              points, gift cards, and a way to reschedule with one tap.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upcoming */}
            <Card className="rounded-2xl border-border/60">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-primary" /> Upcoming visits
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">{upcoming.length} scheduled</span>
              </CardHeader>
              <CardContent>
                {upcoming.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                    Nothing on the calendar. Book your next visit at one of your salons below.
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {upcoming.map((b) => (
                      <li key={b.id} className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-sm font-semibold text-foreground">{b.service_name}</p>
                              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[b.status] ?? STATUS_TONE.pending)}>
                                {b.status}
                              </span>
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {b.store_name}{b.stylist_name ? ` · with ${b.stylist_name}` : ""}
                            </p>
                            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                              <Clock className="h-3 w-3" /> {formatDateTime(b.start_at)}
                            </p>
                          </div>
                          <Button asChild size="sm" variant="outline" className="gap-1.5">
                            <Link to={`/booking/${b.id}`}>
                              View <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Your salons */}
            {salons.length > 0 && (
              <Card className="rounded-2xl border-border/60">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="h-5 w-5 text-primary" /> Your salons
                  </CardTitle>
                  {totalLoyalty > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <Star className="h-3 w-3" /> {totalLoyalty} pts total
                    </span>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {salons.map((s) => (
                      <SalonRow key={s.client_id} salon={s} onPrefChange={(patch) => savePref(s.client_id, patch)} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Gift cards */}
            {visibleGiftCards.length > 0 && (
              <Card className="rounded-2xl border-border/60">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CreditCard className="h-5 w-5 text-primary" /> Your gift cards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {visibleGiftCards.map((c) => <GiftCardRow key={c.id} card={c} />)}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Visit history */}
            {past.length > 0 && (
              <Card className="rounded-2xl border-border/60">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-5 w-5 text-primary" /> Visit history
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">last {past.length}</span>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {past.map((b) => (
                      <li key={b.id} className="flex items-start gap-3 p-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                          <ScrollText className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{b.service_name}</p>
                            <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", STATUS_TONE[b.status] ?? STATUS_TONE.cancelled)}>
                              {b.status}
                            </span>
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {b.store_name}{b.stylist_name ? ` · with ${b.stylist_name}` : ""} · {formatDate(b.start_at)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatMoney(b.price_cents + (b.addons_total_cents ?? 0))}
                          </p>
                        </div>
                        {b.status === "completed" && b.store_slug && (
                          <Button asChild size="sm" variant="ghost" className="gap-1.5">
                            <Link to={rebookHref(b)}>
                              Book again
                            </Link>
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Loyalty activity — earn/redeem timeline. Only render when the
                user has any events so empty new accounts stay clean. */}
            {loyalty.length > 0 && (
              <Card className="rounded-2xl border-border/60">
                <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-5 w-5 text-amber-500" /> Loyalty activity
                  </CardTitle>
                  <span className="text-[11px] text-muted-foreground">last {loyalty.length}</span>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {loyalty.map((e) => {
                      const positive = e.points_delta >= 0;
                      const eventLabel = e.event_type === "earn" ? "Earned"
                        : e.event_type === "redeem" ? "Redeemed"
                        : e.event_type === "expire" ? "Expired"
                        : "Adjusted";
                      return (
                        <li key={e.id} className="flex items-start gap-3 p-3">
                          <div className={cn(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                            positive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-muted text-muted-foreground",
                          )}>
                            <Star className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">
                              {eventLabel}{" "}
                              <span className={cn("font-mono", positive ? "text-emerald-700 dark:text-emerald-300" : "text-foreground")}>
                                {positive ? "+" : ""}{e.points_delta} pts
                              </span>
                            </p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              {storeNameById.get(e.store_id) ?? "Salon"} · {formatDate(e.created_at)}
                              {e.reason ? ` · ${e.reason}` : ""}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SalonRow({ salon, onPrefChange }: {
  salon: MyAreaSalon;
  onPrefChange: (patch: { sms_opt_in?: boolean; email_opt_in?: boolean; marketing_opt_in?: boolean }) => Promise<void>;
}) {
  return (
    <li className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {salon.logo_url ? (
            <img src={salon.logo_url} alt="" className="h-full w-full rounded-lg object-cover" />
          ) : (
            <Store className="h-4 w-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link to={`/salon/${salon.store_slug}`} className="text-sm font-semibold text-foreground hover:underline">
            {salon.store_name}
          </Link>
          <p className="text-[11px] text-muted-foreground">
            {salon.visits_count} visit{salon.visits_count === 1 ? "" : "s"}
            {salon.total_spent_cents > 0 ? ` · ${formatMoney(salon.total_spent_cents)} spent` : ""}
            {salon.loyalty_points > 0 ? ` · ${salon.loyalty_points} pts` : ""}
          </p>
          {salon.last_visit_at && (
            <p className="text-[11px] text-muted-foreground">
              Last visit {formatDate(salon.last_visit_at)}
            </p>
          )}
        </div>
        <Button asChild size="sm" variant="outline" className="gap-1.5">
          <Link to={`/salon/${salon.store_slug}`}>Book</Link>
        </Button>
      </div>

      {/* Inline preference toggles for this salon */}
      {(salon.sms_opt_in !== undefined) && (
        <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
          <PrefToggle
            label="SMS reminders"
            Icon={MessageSquare}
            checked={!!salon.sms_opt_in}
            onChange={(v) => onPrefChange({ sms_opt_in: v })}
          />
          <PrefToggle
            label="Email reminders"
            Icon={Mail}
            checked={!!salon.email_opt_in}
            onChange={(v) => onPrefChange({ email_opt_in: v })}
          />
          <PrefToggle
            label="Marketing"
            Icon={BellRing}
            checked={!!salon.marketing_opt_in}
            onChange={(v) => onPrefChange({ marketing_opt_in: v })}
          />
        </div>
      )}
    </li>
  );
}

function PrefToggle({ label, Icon, checked, onChange }: {
  label: string;
  Icon: typeof Mail;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background px-2 py-1.5 cursor-pointer">
      <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
        <Icon className="h-3 w-3 text-muted-foreground" /> {label}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function GiftCardRow({ card }: { card: MyAreaGiftCard }) {
  const expired = card.expires_at !== null && new Date(card.expires_at) < new Date();
  return (
    <li className="flex items-start gap-3 p-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
        <CreditCard className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-foreground">{formatMoney(card.balance_cents)} remaining</p>
          {!card.is_active && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Disabled</span>
          )}
          {expired && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">Expired</span>
          )}
        </div>
        <p className="font-mono text-xs text-muted-foreground">{maskCode(card.code)}</p>
        <p className="text-[11px] text-muted-foreground">
          {card.store_name}
          {card.purchaser_name ? ` · from ${card.purchaser_name}` : ""}
          {card.expires_at ? ` · expires ${formatDate(card.expires_at)}` : ""}
        </p>
        {card.message && (
          <p className="mt-1 line-clamp-2 text-[11px] italic text-foreground/85">"{card.message}"</p>
        )}
      </div>
    </li>
  );
}
