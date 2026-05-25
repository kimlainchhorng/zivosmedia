/**
 * Public booking detail page at /booking/:id.
 * The booking UUID acts as the unguessable token: anyone with the link can
 * view + cancel. Backed by SECURITY DEFINER RPCs that scope what anon can do.
 */
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  duration_minutes: number;
  status: string;
  source: string;
  cancelled_at: string | null;
  cancellation_window_hours: number;
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
  const [booking, setBooking] = useState<PublicBooking | null>(null);
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
        <Link to={`/salon/${booking.store_slug}`} className="mb-4 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Back to {booking.store_name}
        </Link>

        <Card className="rounded-2xl border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Store className="h-5 w-5 text-primary" /> {booking.store_name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("rounded-xl border p-4", meta.tone)}>
              <div className="flex items-center gap-2">
                {booking.status === "completed" ? <CheckCircle2 className="h-5 w-5" /> :
                  booking.status === "cancelled" ? <XCircle className="h-5 w-5" /> :
                  <Calendar className="h-5 w-5" />}
                <p className="text-sm font-bold uppercase tracking-wider">{meta.label}</p>
              </div>
              <p className="mt-1 text-xs">{meta.description}</p>
            </div>

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
                <DollarSign className="h-3.5 w-3.5" /> {formatPrice(booking.price_cents)}
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
