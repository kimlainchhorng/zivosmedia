/**
 * MyLodgingTripPage — guest-facing trip detail page for a lodge reservation.
 * Route: /my-trips/lodging/:reservationId
 */
import { useCallback, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarRange, XCircle, CreditCard, Clock, ShoppingBag, ShieldCheck, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useReservationLive } from "@/hooks/lodging/useReservationLive";
import { useReservationChangeRequests } from "@/hooks/lodging/useReservationChangeRequests";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import StayHeroCard from "@/components/lodging/guest/StayHeroCard";
import RescheduleSheet from "@/components/lodging/guest/RescheduleSheet";
import CancelReservationSheet from "@/components/lodging/guest/CancelReservationSheet";
import CheckInQrCard from "@/components/lodging/guest/CheckInQrCard";
import ReceiptActions from "@/components/lodging/guest/ReceiptActions";
import AddOnsSheet, { type LodgingAddon } from "@/components/lodging/guest/AddOnsSheet";
import MessagePropertyButton from "@/components/lodging/guest/MessagePropertyButton";
import ReceiptHistoryCard, { type ReceiptHistoryItem } from "@/components/lodging/guest/ReceiptHistoryCard";
import StoreLiveChat from "@/components/grocery/StoreLiveChat";
import { useLodgingTripToasts } from "@/hooks/lodging/useLodgingTripToasts";
import LodgingTripHelpDrawer from "@/components/lodging/guest/LodgingTripHelpDrawer";
import AddOnStatusTimeline from "@/components/lodging/guest/AddOnStatusTimeline";
import RefundDisputeCard from "@/components/lodging/guest/RefundDisputeCard";
import { useLodgingRefundDisputes } from "@/hooks/lodging/useLodgingRefundDisputes";
import LodgingTripNotificationSettings from "@/components/lodging/guest/LodgingTripNotificationSettings";
import { toast } from "sonner";
import { ReviewSubmissionSheet } from "@/components/reviews/ReviewSubmissionSheet";
import { LodgingReviewSheet } from "@/components/reviews/LodgingReviewSheet";
import { ReviewsList } from "@/components/reviews/ReviewsList";
import { ReviewsSummary } from "@/components/reviews/ReviewsSummary";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  getLodgingTripStateCopy,
  humanizeLodgingStatus,
  isFinalLodgingReservationStatus,
  lodgingPaymentStatusLabel,
  lodgingReservationStatusLabel,
} from "@/lib/lodging/reservationDisplay";

interface FullReservation {
  id: string;
  store_id: string;
  room_id: string | null;
  number: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  status: string | null;
  payment_status: string | null;
  total_cents: number;
  paid_cents: number;
  room_number: string | null;
  adults: number | null;
  children: number | null;
  addons: any;
  addon_selections: any;
  fee_breakdown: any;
  deposit_cents: number | null;
  stripe_payment_intent_id: string | null;
  last_payment_error: string | null;
}

const REQ_STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "secondary",
  auto_approved: "default",
  approved: "default",
  declined: "destructive",
  cancelled: "outline",
};

const TRIP_STATE_STYLE = {
  success: {
    card: "border-emerald-500/25 bg-emerald-500/[0.06]",
    icon: "bg-emerald-500/10 text-emerald-600",
    badge: "border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    card: "border-amber-500/25 bg-amber-500/[0.08]",
    icon: "bg-amber-500/10 text-amber-600",
    badge: "border-amber-500/30 text-amber-700 dark:text-amber-300",
  },
  destructive: {
    card: "border-destructive/25 bg-destructive/[0.06]",
    icon: "bg-destructive/10 text-destructive",
    badge: "border-destructive/30 text-destructive",
  },
  muted: {
    card: "border-border bg-muted/30",
    icon: "bg-muted text-muted-foreground",
    badge: "border-border text-muted-foreground",
  },
};

export default function MyLodgingTripPage() {
  const { reservationId = "" } = useParams();
  const queryClient = useQueryClient();
  const { format: formatCurrency } = useCurrency();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [addonsOpen, setAddonsOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [addonStatusRefreshing, setAddonStatusRefreshing] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [lodgingReviewOpen, setLodgingReviewOpen] = useState(false);

  const { data: reservation, isLoading } = useQuery({
    queryKey: ["lodge-reservation-full", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservations" as any)
        .select("id, store_id, room_id, number, guest_name, guest_email, guest_phone, adults, children, check_in, check_out, nights, status, payment_status, total_cents, paid_cents, deposit_cents, room_number, addons, addon_selections, fee_breakdown, stripe_payment_intent_id, last_payment_error")
        .eq("id", reservationId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FullReservation | null;
    },
    enabled: !!reservationId,
  });

  // Realtime status updates
  const { data: liveReservation } = useReservationLive(reservationId);
  useLodgingTripToasts(reservationId);

  const { data: store } = useQuery({
    queryKey: ["lodge-store-name", reservation?.store_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles" as any)
        .select("name, logo_url")
        .eq("id", reservation!.store_id)
        .maybeSingle();
      return (data as unknown) as { name: string; logo_url?: string | null } | null;
    },
    enabled: !!reservation?.store_id,
  });

  const { data: requests = [], isLoading: requestsLoading, isFetching: requestsFetching } = useReservationChangeRequests(reservationId);
  const { data: disputes = [] } = useLodgingRefundDisputes(reservationId);
  const { data: room } = useQuery({
    queryKey: ["lodge-trip-room", reservation?.room_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lodge_rooms" as any)
        .select("name, room_type, base_rate_cents, cancellation_policy, addons, check_in_time, check_out_time")
        .eq("id", reservation!.room_id)
        .maybeSingle();
      return data as unknown as { name?: string; room_type?: string; base_rate_cents?: number; cancellation_policy?: string | null; addons?: LodgingAddon[]; check_in_time?: string | null; check_out_time?: string | null } | null;
    },
    enabled: !!reservation?.room_id,
  });

  const { data: blockedDates = [] } = useQuery({
    queryKey: ["lodge-trip-blocks", reservation?.room_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("lodge_room_blocks" as any)
        .select("block_date")
        .eq("room_id", reservation!.room_id);
      return (data || []).map((r: any) => String(r.block_date));
    },
    enabled: !!reservation?.room_id,
  });

  const { data: receipts = [], isLoading: receiptsLoading, isFetching: receiptsFetching, refetch: refetchReceipts } = useQuery({
    queryKey: ["lodge-receipt-history", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservation_receipts" as any)
        .select("id, filename, created_at, reservation_number")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReceiptHistoryItem[];
    },
    enabled: !!reservationId,
  });

  const refreshReceiptHistory = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["lodge-receipt-history", reservationId] });
    return refetchReceipts();
  }, [queryClient, refetchReceipts, reservationId]);
  const highlightAddonStatus = useCallback(() => {
    const target = document.querySelector("#addon-status") as HTMLElement | null;
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    target?.classList.add("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background");
    window.setTimeout(() => target?.classList.remove("transition-shadow", "ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"), 1600);
  }, []);

  const formatMoney = useCallback(
    (cents: number | null | undefined) => formatCurrency((Number(cents) || 0) / 100, "USD"),
    [formatCurrency],
  );

  const visibleReservation = useMemo<FullReservation | null>(() => {
    if (!reservation) return null;
    return {
      ...reservation,
      status: liveReservation?.status ?? reservation.status,
      payment_status: liveReservation?.payment_status ?? reservation.payment_status,
      total_cents: liveReservation?.total_cents ?? reservation.total_cents,
      deposit_cents: liveReservation?.deposit_cents ?? reservation.deposit_cents,
      stripe_payment_intent_id: liveReservation?.stripe_payment_intent_id ?? reservation.stripe_payment_intent_id,
    };
  }, [liveReservation, reservation]);


  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto p-4 space-y-4 safe-area-top">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!reservation || !visibleReservation) {
    return (
      <div className="container max-w-3xl mx-auto p-8 text-center safe-area-top">
        <h1 className="text-2xl font-bold mb-2">Reservation not found or unavailable</h1>
        <p className="text-muted-foreground mb-4">This reservation may belong to another account, be unavailable under privacy rules, or no longer exist.</p>
        <Button asChild><Link to="/my-trips">Back to my trips</Link></Button>
      </div>
    );
  }

  const reservationRef = visibleReservation.number || visibleReservation.id.slice(0, 8).toUpperCase();
  const reservationStatus = visibleReservation.status || "hold";
  const paymentStatus = visibleReservation.payment_status || "pending";
  const tripState = getLodgingTripStateCopy(reservationStatus, paymentStatus);
  const tripStyle = TRIP_STATE_STYLE[tripState.tone];
  const TripIcon = tripState.tone === "destructive" ? AlertTriangle : tripState.tone === "warning" ? Clock : tripState.tone === "muted" ? Info : CheckCircle2;
  const isActive = !isFinalLodgingReservationStatus(reservationStatus);
  const balanceCents = Math.max(0, visibleReservation.total_cents - visibleReservation.paid_cents);
  const guests = Math.max(1, Number(visibleReservation.adults || 1) + Number(visibleReservation.children || 0));
  const addons = Array.isArray(room?.addons) ? room.addons : [];
  const latestRequest = requests[0];
  const roomLabel = visibleReservation.room_number ? `Room ${visibleReservation.room_number}` : room?.name || room?.room_type || "Assigned room";
  const chatContext = {
    reservationId: visibleReservation.id,
    reservationNumber: reservationRef,
    dates: `${reservation.check_in} → ${reservation.check_out}`,
    roomLabel,
    status: reservationStatus,
    href: `/my-trips/lodging/${visibleReservation.id}`,
  };
  const maxDisputeCents = Math.max(0, visibleReservation.paid_cents - (requests.find((r) => r.type === "cancel")?.refund_cents || 0));
  const canDispute = reservationStatus === "cancelled" || String(paymentStatus || "").includes("refund") || paymentStatus === "cancelled_no_refund";

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4 pb-24 safe-area-top">
      <div className="flex items-center justify-between gap-3">
        <Link to="/my-trips" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> All trips
        </Link>
        <LodgingTripHelpDrawer reservationNumber={reservation.number} propertyName={store?.name || "Your stay"} dates={`${reservation.check_in} → ${reservation.check_out}`} paymentStatus={reservation.payment_status} />
      </div>

      <Card className={`overflow-hidden ${tripStyle.card}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tripStyle.icon}`}>
              <TripIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold leading-tight">{tripState.title}</h2>
                <Badge variant="outline" className={`text-[10px] ${tripStyle.badge}`}>
                  {tripState.badge}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{tripState.description}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <div className="rounded-lg bg-background/70 p-2">
                  <p className="text-muted-foreground">Reference</p>
                  <p className="font-semibold">{reservationRef}</p>
                </div>
                <div className="rounded-lg bg-background/70 p-2">
                  <p className="text-muted-foreground">Stay</p>
                  <p className="font-semibold">{lodgingReservationStatusLabel(reservationStatus)}</p>
                </div>
                <div className="rounded-lg bg-background/70 p-2">
                  <p className="text-muted-foreground">Payment</p>
                  <p className="font-semibold">{lodgingPaymentStatusLabel(paymentStatus)}</p>
                </div>
                <div className="rounded-lg bg-background/70 p-2">
                  <p className="text-muted-foreground">Balance</p>
                  <p className="font-semibold">{formatMoney(balanceCents)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div id="stay-summary" className="scroll-mt-24">
        <StayHeroCard
          propertyName={store?.name || "Your stay"}
          roomLabel={roomLabel}
          checkIn={visibleReservation.check_in}
          checkOut={visibleReservation.check_out}
          nights={visibleReservation.nights}
          status={reservationStatus}
        />
      </div>

      <CheckInQrCard
        reservationNumber={reservationRef}
        reservationId={visibleReservation.id}
        checkIn={visibleReservation.check_in}
        checkOut={visibleReservation.check_out}
        status={reservationStatus}
      />

      {/* Manage actions */}
      {isActive && (
        <Card id="manage-stay" className="scroll-mt-24">
          <CardHeader className="pb-3"><CardTitle className="text-base">Manage your stay</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 h-auto py-3 flex-col" onClick={() => setRescheduleOpen(true)}>
              <CalendarRange className="w-4 h-4" />
              <span className="text-xs">Change dates</span>
            </Button>
            <Button variant="outline" className="gap-2 h-auto py-3 flex-col" onClick={() => setCancelOpen(true)}>
              <XCircle className="w-4 h-4" />
              <span className="text-xs">Cancel</span>
            </Button>
            <Button variant="outline" className="gap-2 h-auto py-3 flex-col" onClick={() => setAddonsOpen(true)}>
              <ShoppingBag className="w-4 h-4" />
              <span className="text-xs">Add services</span>
            </Button>
            <div id="message-property" className="scroll-mt-24"><MessagePropertyButton storeId={visibleReservation.store_id} storeName={store?.name || "Property"} reservationContext={chatContext} onOpenChat={() => setChatOpen(true)} /></div>
          </CardContent>
        </Card>
      )}

      {/* Payment summary */}
      <Card id="payment-summary" className="scroll-mt-24">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><CreditCard className="w-4 h-4" /> Payment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-semibold">{formatMoney(visibleReservation.total_cents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span>{formatMoney(visibleReservation.paid_cents)}</span>
          </div>
          {balanceCents > 0 && (
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Balance due</span>
              <span className="font-bold text-destructive">{formatMoney(balanceCents)}</span>
            </div>
          )}
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge variant="outline">{lodgingPaymentStatusLabel(paymentStatus)}</Badge>
            {latestRequest && <Badge variant="secondary">Latest: {humanizeLodgingStatus(latestRequest.type)} {humanizeLodgingStatus(latestRequest.status)}</Badge>}
          </div>
          {visibleReservation.last_payment_error && <p className="text-xs text-destructive">{visibleReservation.last_payment_error}</p>}
        </CardContent>
      </Card>

      {/* Change request history */}
      {requests.length > 0 && (
        <Card id="request-history" className="scroll-mt-24">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Request history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="flex items-start justify-between gap-2 p-2 rounded-lg border bg-muted/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{humanizeLodgingStatus(r.type)}</span>
                    <Badge variant={REQ_STATUS_VARIANT[r.status]} className="text-[10px] capitalize">
                      {humanizeLodgingStatus(r.status)}
                    </Badge>
                  </div>
                  {r.proposed_check_in && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      → {r.proposed_check_in} to {r.proposed_check_out}
                    </p>
                  )}
                  {r.host_response && <p className="text-xs italic text-muted-foreground mt-0.5">"{r.host_response}"</p>}
                </div>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {format(parseISO(r.created_at), "MMM d")}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AddOnStatusTimeline requests={requests} isUpdating={addonStatusRefreshing || requestsLoading || requestsFetching} formatMoney={formatMoney} />

      <Card id="cancellation-policy" className="scroll-mt-24">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Cancellation and refunds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">{room?.cancellation_policy || "Standard lodging cancellation policy applies to this reservation."}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => document.querySelector("#request-history")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Request history</Button>
            <Button variant="outline" size="sm" onClick={() => document.querySelector("#refund-disputes")?.scrollIntoView({ behavior: "smooth", block: "start" })}>Refund review</Button>
          </div>
        </CardContent>
      </Card>

      <ReceiptActions
        reservationNumber={reservationRef}
        reservationId={visibleReservation.id}
        propertyName={store?.name || "Your stay"}
        checkIn={visibleReservation.check_in}
        checkOut={visibleReservation.check_out}
        roomName={roomLabel}
        guestName={visibleReservation.guest_name}
        guestEmail={visibleReservation.guest_email}
        checkInTime={room?.check_in_time}
        checkOutTime={room?.check_out_time}
        totalText={`${formatMoney(visibleReservation.total_cents)} · ${lodgingPaymentStatusLabel(paymentStatus)}`}
        cancellationText={room?.cancellation_policy}
        latestReceiptId={receipts[0]?.id}
        receiptHistoryLoading={receiptsLoading || receiptsFetching}
        onReceiptDownloaded={refreshReceiptHistory}
      />

      <div id="receipt-history" className="scroll-mt-24"><ReceiptHistoryCard reservationId={visibleReservation.id} receipts={receipts} /></div>

      <LodgingTripNotificationSettings reservationId={visibleReservation.id} />

      <RefundDisputeCard reservationId={visibleReservation.id} disputes={disputes} canRequest={canDispute} maxAmountCents={maxDisputeCents} formatMoney={formatMoney} />

      {/* Reviews */}
      <ReviewsSummary
        serviceType="hotel"
        serviceId={visibleReservation.id}
        onWriteClick={() => setReviewSheetOpen(true)}
      />
      <ReviewsList serviceType="hotel" serviceId={visibleReservation.id} />

      {/* Rate this stay (writes to lodging_reviews shown on the hotel detail page) */}
      <div className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold">Rate your stay</p>
          <p className="text-[11px] text-muted-foreground">Help other travellers — score 5 aspects in 30 seconds.</p>
        </div>
        <Button size="sm" onClick={() => setLodgingReviewOpen(true)}>
          Rate stay
        </Button>
      </div>

      <RescheduleSheet
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        reservationId={visibleReservation.id}
        roomId={visibleReservation.room_id || ""}
        checkIn={visibleReservation.check_in}
        checkOut={visibleReservation.check_out}
        totalCents={visibleReservation.total_cents}
        blockedDates={blockedDates}
        formatMoney={formatMoney}
      />
      <AddOnsSheet
        open={addonsOpen}
        onOpenChange={setAddonsOpen}
        reservationId={visibleReservation.id}
        addons={addons}
        nights={visibleReservation.nights}
        guests={guests}
        formatMoney={formatMoney}
        onPurchased={(result) => {
          setAddonStatusRefreshing(true);
          Promise.all([
            queryClient.invalidateQueries({ queryKey: ["lodge-reservation-full", reservationId] }),
            queryClient.invalidateQueries({ queryKey: ["lodge-change-requests", reservationId] }),
            queryClient.invalidateQueries({ queryKey: ["lodging-notification-audit", reservationId] }),
            queryClient.invalidateQueries({ queryKey: ["lodging-notification-audit", reservationId, "sms"] }),
          ]).finally(() => setAddonStatusRefreshing(false));
          if (result === "failed") toast.error("Add-on charge failed");
          window.setTimeout(highlightAddonStatus, 180);
        }}
      />
      <CancelReservationSheet
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        reservationId={visibleReservation.id}
        checkIn={visibleReservation.check_in}
        totalCents={visibleReservation.total_cents}
        paidCents={visibleReservation.paid_cents}
        formatMoney={formatMoney}
      />
      <StoreLiveChat
        storeId={visibleReservation.store_id}
        storeName={store?.name || "Property"}
        storeLogo={store?.logo_url || null}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        reservationContext={chatContext}
      />

      <ReviewSubmissionSheet
        isOpen={reviewSheetOpen}
        onClose={() => setReviewSheetOpen(false)}
        serviceType="hotel"
        serviceId={visibleReservation.id}
        title={store?.name || "Your stay"}
      />
      <LodgingReviewSheet
        isOpen={lodgingReviewOpen}
        onClose={() => setLodgingReviewOpen(false)}
        storeId={visibleReservation.store_id}
        reservationId={visibleReservation.id}
        guestName={visibleReservation.guest_name}
        propertyName={store?.name || "Your stay"}
      />
    </div>
  );
}
