/**
 * Public booking detail page at /booking/:id.
 * The booking UUID acts as the unguessable token: anyone with the link can
 * view + cancel. Backed by SECURITY DEFINER RPCs that scope what anon can do.
 */
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  CheckCircle2, AlertCircle, Loader2, Calendar, Clock, DollarSign, RotateCcw,
  Store, UserCog, XCircle, ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface PublicBooking {
  id: string;
  store_id: string;
  store_name: string;
  store_slug: string;
  service_id: string | null;
  service_name: string;
  stylist_id: string | null;
  stylist_name: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  start_at: string;
  end_at: string;
  price_cents: number;
  addons_total_cents: number;
  duration_minutes: number;
  status: string;
  source: string;
  cancelled_at: string | null;
  cancellation_window_hours: number;
  /** Set by the booking-time sanitize trigger when the salon has Stripe
   *  connected and a non-zero deposit_percent. Zero otherwise. */
  deposit_cents: number;
  /** Stamped by the Stripe webhook on a successful Checkout session. */
  deposit_paid_cents: number;
  /** Updated by the stripe-webhook charge.refunded handler when the owner
   *  issues a manual refund. Drives the cancellation warning copy so we
   *  don't tell the customer they'll forfeit money the owner already gave
   *  back. */
  deposit_refunded_cents: number;
  /** Snapshot of the salon's no-show fee at booking-insert time. Used to
   *  remind the customer on the confirmation view that their card may be
   *  charged this amount if they don't show up. Zero means no policy
   *  applies to this booking. */
  no_show_fee_cents: number;
}

const STATUS_COPY: Record<string, { label: string; tone: string; description: string }> = {
  pending: { label: "Pending confirmation", tone: "border-amber-500/40 bg-amber-500/8 text-amber-800 dark:text-amber-200", description: "The salon will confirm this shortly." },
  confirmed: { label: "Confirmed", tone: "border-sky-500/40 bg-sky-500/8 text-sky-800 dark:text-sky-200", description: "You're all set. See you then!" },
  completed: { label: "Completed", tone: "border-emerald-500/40 bg-emerald-500/8 text-emerald-800 dark:text-emerald-200", description: "Thanks for visiting." },
  cancelled: { label: "Cancelled", tone: "border-border bg-muted text-muted-foreground", description: "This booking was cancelled." },
  no_show: { label: "Marked as no-show", tone: "border-destructive/40 bg-destructive/8 text-destructive", description: "The salon marked this as a no-show." },
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "long", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function PublicSalonBookingDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  // Optionally authenticated — drives the "go to your salon area" link.
  const { user } = useAuth();
  const [booking, setBooking] = useState<PublicBooking | null>(null);
  // Stripe return states: ?deposit=success or ?deposit=cancel
  const depositReturn = params.get("deposit");
  const [retryingDeposit, setRetryingDeposit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("salon_public_get_booking", { p_id: id });
    if (err) {
      console.error("[PublicSalonBookingDetailPage] load failed", err);
      setError("Couldn't load this booking.");
      setLoading(false);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : null) as PublicBooking | null;
    if (!row) {
      setError("Booking not found.");
      setLoading(false);
      return;
    }
    setBooking(row);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  const handleCancel = async () => {
    setCancelling(true);
    const { error: err } = await supabase.rpc("salon_public_cancel_booking", { p_id: id });
    setCancelling(false);
    setConfirmCancelOpen(false);
    if (err) {
      console.error("[PublicSalonBookingDetailPage] cancel failed", err);
      const msg = (err as any).message ?? "Couldn't cancel.";
      toast.error(msg);
      return;
    }
    toast.success("Your booking was cancelled.");
    await load();
  };

  // "Pay deposit now" — kicks off (or resumes) the Stripe Checkout session
  // for this booking. Used when the customer landed back on this page after
  // hitting Stripe's cancel button, or when they re-open the email link
  // before paying.
  const handlePayDeposit = async () => {
    if (!booking) return;
    setRetryingDeposit(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("create-salon-deposit", {
        body: { booking_id: booking.id },
      });
      if (err) throw err;
      const url = (data as any)?.url as string | undefined;
      if (url) {
        window.location.href = url;
      } else {
        toast.error("Stripe didn't return a payment URL.");
      }
    } catch (e) {
      toast.error((e as Error).message || "Couldn't start the deposit.");
    } finally {
      setRetryingDeposit(false);
    }
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </div>
    );
  }
  if (error || !booking) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error ?? "Booking not found."}</p>
        </div>
      </div>
    );
  }

  const meta = STATUS_COPY[booking.status] ?? STATUS_COPY.pending;
  const startAt = new Date(booking.start_at);
  const now = new Date();
  const windowHours = booking.cancellation_window_hours ?? 0;
  const cancelDeadline = windowHours > 0 ? new Date(startAt.getTime() - windowHours * 60 * 60 * 1000) : null;
  const pastCancelDeadline = cancelDeadline !== null && now > cancelDeadline;
  const inActiveStatus = booking.status === "pending" || booking.status === "confirmed";
  const isCancellable = inActiveStatus && startAt > now && !pastCancelDeadline;

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Your booking · {booking.store_name}</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-10 sm:py-14">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs">
          <Link to={`/salon/${booking.store_slug}`} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Back to {booking.store_name}
          </Link>
          {/* Authenticated viewers get a one-tap shortcut to /salon/me so they
              can see all their visits, not just this one. RLS guarantees they
              only land on this page for bookings tied to their account. */}
          {user && (
            <Link to="/salon/me" className="inline-flex items-center gap-1 text-primary hover:underline">
              Your salon area <ArrowLeft className="h-3 w-3 rotate-180" />
            </Link>
          )}
        </div>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-primary" /> {booking.store_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Stripe return banners — show once after the customer comes back
                from Checkout. Success banner is informational; cancel banner
                offers the customer a one-tap retry via "Pay deposit now". */}
            {depositReturn === "success" && booking.deposit_paid_cents > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="-mt-0.5 mr-1 inline h-4 w-4" />
                Deposit of {formatPrice(booking.deposit_paid_cents)} paid. Your booking is confirmed.
              </div>
            )}
            {depositReturn === "cancel" && booking.deposit_cents > 0 && booking.deposit_paid_cents === 0 && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/8 p-3 text-sm text-amber-800 dark:text-amber-200">
                <AlertCircle className="-mt-0.5 mr-1 inline h-4 w-4" />
                Payment cancelled — no charge yet. Your booking is held as pending; pay the deposit when you're ready.
              </div>
            )}

            <div className={cn("rounded-xl border p-4", meta.tone)}>
              <div className="flex items-center gap-2">
                {booking.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> :
                  booking.status === "cancelled" ? <XCircle className="h-5 w-5" /> :
                  <Calendar className="h-5 w-5" />}
                <p className="text-sm font-bold uppercase tracking-wider">{meta.label}</p>
              </div>
              <p className="mt-1 text-xs">{meta.description}</p>
            </div>

            {/* Unpaid deposit prompt — the booking is pending until the
                customer settles the deposit. */}
            {booking.deposit_cents > 0
             && booking.deposit_paid_cents === 0
             && (booking.status === "pending" || booking.status === "confirmed")
             && (
              <div className="rounded-xl border border-primary/40 bg-primary/8 p-3">
                <p className="text-sm font-semibold text-foreground">Deposit due: {formatPrice(booking.deposit_cents)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pay the deposit now to confirm this booking.
                </p>
                <Button
                  onClick={() => void handlePayDeposit()}
                  disabled={retryingDeposit}
                  className="mt-2 gap-1.5"
                  size="sm"
                >
                  {retryingDeposit ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                  Pay deposit now
                </Button>
              </div>
            )}

            {/* Already-paid deposit acknowledgement — informational. */}
            {booking.deposit_paid_cents > 0 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                Deposit paid: {formatPrice(booking.deposit_paid_cents)}
              </div>
            )}

            {/* No-show fee reminder — courtesy reminder only; consent was
                captured up front at booking time via the cancellation-policy
                disclosure on PublicSalonBookingPage. Show only while the
                booking is in a state where a charge could still happen
                (i.e., not cancelled/completed and the fee isn't already
                charged). */}
            {booking.no_show_fee_cents > 0
              && booking.status !== "cancelled"
              && booking.status !== "completed"
              && booking.deposit_paid_cents > 0 && (
              <div className="rounded-xl border border-dashed border-amber-300/60 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                <AlertCircle className="-mt-0.5 mr-1 inline h-3.5 w-3.5" />
                No-show fee: {formatPrice(booking.no_show_fee_cents)} may be charged to your card if you don't show up.
              </div>
            )}

            <div className="space-y-2 rounded-xl border border-border bg-card p-4 text-sm">
              <p className="text-base font-bold text-foreground">{booking.service_name}</p>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" /> {formatDateTime(booking.start_at)}
              </p>
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" /> {booking.duration_minutes} min
              </p>
              {booking.stylist_name && (
                <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserCog className="h-3.5 w-3.5" /> {booking.stylist_name}
                </p>
              )}
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" /> {formatPrice(booking.price_cents + (booking.addons_total_cents ?? 0))}
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-border p-3 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Booked under</p>
              <p className="mt-0.5 text-foreground">{booking.client_name}</p>
              {booking.client_phone && <p className="text-muted-foreground">{booking.client_phone}</p>}
              {booking.client_email && <p className="text-muted-foreground">{booking.client_email}</p>}
            </div>

            {isCancellable ? (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full gap-1.5 text-destructive hover:text-destructive"
                  onClick={() => setConfirmCancelOpen(true)}
                  disabled={cancelling}
                >
                  <XCircle className="h-4 w-4" /> Cancel this booking
                </Button>
                {cancelDeadline && (
                  <p className="text-center text-[11px] text-muted-foreground">
                    Free cancellation until {cancelDeadline.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
                  </p>
                )}
              </div>
            ) : inActiveStatus && pastCancelDeadline && startAt > now ? (
              <p className="text-center text-xs text-muted-foreground">
                It's within the {windowHours}-hour cancellation window — please call {booking.store_name} to make changes.
              </p>
            ) : booking.status !== "cancelled" && booking.status !== "completed" ? (
              <p className="text-center text-xs text-muted-foreground">
                Contact the salon directly to make changes — it's too late to cancel online.
              </p>
            ) : null}

            {(booking.status === "completed" || booking.status === "cancelled") && (
              <Button
                asChild
                className="w-full gap-1.5"
                variant={booking.status === "completed" ? "default" : "outline"}
              >
                <Link
                  to={`/salon/${booking.store_slug}${
                    booking.service_id || booking.stylist_id
                      ? `?${[
                          booking.service_id ? `service=${booking.service_id}` : "",
                          booking.stylist_id ? `stylist=${booking.stylist_id}` : "",
                        ].filter(Boolean).join("&")}`
                      : ""
                  }`}
                >
                  <RotateCcw className="h-4 w-4" /> Book again
                </Link>
              </Button>
            )}

            <p className="text-center text-[11px] text-muted-foreground">
              Reference: <span className="font-mono">{booking.id.slice(0, 8)}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your booking?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll let {booking.store_name} know. If you change your mind, you can book again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Non-refundable deposit warning. The platform never auto-refunds
              deposits on cancel — they're a reservation fee. Surface this up
              front so the customer doesn't expect a refund and dispute the
              charge later. Only show when there's a real unrecovered amount
              (paid minus already-refunded > 0). */}
          {booking.deposit_paid_cents > 0
            && (booking.deposit_paid_cents - (booking.deposit_refunded_cents ?? 0)) > 0 && (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p className="font-semibold">
                    Your {formatPrice(booking.deposit_paid_cents - (booking.deposit_refunded_cents ?? 0))} deposit is non-refundable.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed">
                    Cancelling won't return your deposit automatically. If you have a
                    question about your deposit, please contact {booking.store_name} directly.
                  </p>
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel booking"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
