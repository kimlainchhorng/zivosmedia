/**
 * MyLodgingTripPage — guest-facing trip detail page for a lodge reservation.
 * Route: /my-trips/lodging/:reservationId
 */
import { useCallback, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, CalendarRange, XCircle, CreditCard, Clock, ShoppingBag, ShieldCheck } from "lucide-react";
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

interface FullReservation {
  id: string;
  store_id: string;
  room_id: string;
  number: string;
  guest_name: string | null;
  check_in: string;
  check_out: string;
  nights: number;
  status: string;
  payment_status: string;
  total_cents: number;
  paid_cents: number;
  room_number: string | null;
  adults: number | null;
  children: number | null;
  guest_email: string | null;
  guest_phone: string | null;
  addons: any;
  addon_selections: any;
  fee_breakdown: any;
  deposit_cents: number;
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

export default function MyLodgingTripPage() {
  const { reservationId = "" } = useParams();
  const queryClient = useQueryClient();
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
  useReservationLive(reservationId);
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


  if (isLoading) {
    return (
      <div className="container max-w-3xl mx-auto p-4 space-y-4 safe-area-top">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="container max-w-3xl mx-auto p-8 text-center safe-area-top">
        <h1 className="text-2xl font-bold mb-2">Reservation not found</h1>
        <p className="text-muted-foreground mb-4">It may have been deleted or you don't have access.</p>
        <Button asChild><Link to="/my-trips">Back to my trips</Link></Button>
      </div>
    );
  }

  const isActive = !["cancelled", "checked_out", "no_show"].includes(reservation.status);
  const balanceCents = Math.max(0, reservation.total_cents - reservation.paid_cents);
  const guests = Math.max(1, Number(reservation.adults || 1) + Number(reservation.children || 0));
  const addons = Array.isArray(room?.addons) ? room.addons : [];
  const latestRequest = requests[0];
  const roomLabel = reservation.room_number ? `Room ${reservation.room_number}` : room?.name || room?.room_type || "Assigned room";
  const chatContext = {
    reservationId: reservation.id,
    reservationNumber: reservation.number,
    dates: `${reservation.check_in} → ${reservation.check_out}`,
    roomLabel,
    status: reservation.status,
    href: `/my-trips/lodging/${reservation.id}`,
  };
  const maxDisputeCents = Math.max(0, reservation.paid_cents - (requests.find((r) => r.type === "cancel")?.refund_cents || 0));
  const canDispute = reservation.status === "cancelled" || String(reservation.payment_status || "").includes("refund") || reservation.payment_status === "cancelled_no_refund";

  return (
    <div className="container max-w-3xl mx-auto p-4 space-y-4 pb-24 safe-area-top">
      <div className="flex items-center justify-between gap-3">
        <Link to="/my-trips" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> All trips
        </Link>
        <LodgingTripHelpDrawer reservationNumber={reservation.number} propertyName={store?.name || "Your stay"} dates={`${reservation.check_in} → ${reservation.check_out}`} paymentStatus={reservation.payment_status} />
      </div>

      <div id="stay-summary" className="scroll-mt-24">
        <StayHeroCard
          propertyName={store?.name || "Your stay"}
          roomLabel={roomLabel}
          checkIn={reservation.check_in}
          checkOut={reservation.check_out}
          nights={reservation.nights}
          status={reservation.status}
        />
      </div>

      <CheckInQrCard
        reservationNumber={reservation.number}
        reservationId={reservation.id}
        checkIn={reservation.check_in}
        checkOut={reservation.check_out}
        status={reservation.status}
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
            <div id="message-property" className="scroll-mt-24"><MessagePropertyButton storeId={reservation.store_id} storeName={store?.name || "Property"} reservationContext={chatContext} onOpenChat={() => setChatOpen(true)} /></div>
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
            <span className="font-semibold">${(reservation.total_cents / 100).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid</span>
            <span>${(reservation.paid_cents / 100).toFixed(2)}</span>
          </div>
          {balanceCents > 0 && (
            <div className="flex justify-between border-t pt-2">
              <span className="font-semibold">Balance due</span>
              <span className="font-bold text-destructive">${(balanceCents / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 flex flex-wrap gap-2">
            <Badge variant="outline" className="capitalize">{reservation.payment_status.replace(/_/g, " ")}</Badge>
            {latestRequest && <Badge variant="secondary" className="capitalize">Latest: {latestRequest.type} {latestRequest.status.replace(/_/g, " ")}</Badge>}
          </div>
          {reservation.last_payment_error && <p className="text-xs text-destructive">{reservation.last_payment_error}</p>}
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
                    <span className="text-sm font-medium capitalize">{r.type}</span>
                    <Badge variant={REQ_STATUS_VARIANT[r.status]} className="text-[10px] capitalize">
                      {r.status.replace(/_/g, " ")}
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

      <AddOnStatusTimeline requests={requests} isUpdating={addonStatusRefreshing || requestsLoading || requestsFetching} />

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
        reservationNumber={reservation.number}
        reservationId={reservation.id}
        propertyName={store?.name || "Your stay"}
        checkIn={reservation.check_in}
        checkOut={reservation.check_out}
        roomName={roomLabel}
        guestName={reservation.guest_name}
        guestEmail={reservation.guest_email}
        checkInTime={room?.check_in_time}
        checkOutTime={room?.check_out_time}
        totalText={`$${(reservation.total_cents / 100).toFixed(2)} · ${reservation.payment_status.replace(/_/g, " ")}`}
        cancellationText={room?.cancellation_policy}
        latestReceiptId={receipts[0]?.id}
        receiptHistoryLoading={receiptsLoading || receiptsFetching}
        onReceiptDownloaded={refreshReceiptHistory}
      />

      <div id="receipt-history" className="scroll-mt-24"><ReceiptHistoryCard reservationId={reservation.id} receipts={receipts} /></div>

      <LodgingTripNotificationSettings reservationId={reservation.id} />

      <RefundDisputeCard reservationId={reservation.id} disputes={disputes} canRequest={canDispute} maxAmountCents={maxDisputeCents} />

      {/* Reviews */}
      <ReviewsSummary
        serviceType="hotel"
        serviceId={reservation.id}
        onWriteClick={() => setReviewSheetOpen(true)}
      />
      <ReviewsList serviceType="hotel" serviceId={reservation.id} />

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
        reservationId={reservation.id}
        roomId={reservation.room_id}
        checkIn={reservation.check_in}
        checkOut={reservation.check_out}
        totalCents={reservation.total_cents}
        blockedDates={blockedDates}
      />
      <AddOnsSheet
        open={addonsOpen}
        onOpenChange={setAddonsOpen}
        reservationId={reservation.id}
        addons={addons}
        nights={reservation.nights}
        guests={guests}
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
        reservationId={reservation.id}
        checkIn={reservation.check_in}
        totalCents={reservation.total_cents}
        paidCents={reservation.paid_cents}
      />
      <StoreLiveChat
        storeId={reservation.store_id}
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
        serviceId={reservation.id}
        title={store?.name || "Your stay"}
      />
      <LodgingReviewSheet
        isOpen={lodgingReviewOpen}
        onClose={() => setLodgingReviewOpen(false)}
        storeId={reservation.store_id}
        reservationId={reservation.id}
        guestName={reservation.guest_name}
        propertyName={store?.name || "Your stay"}
      />
    </div>
  );
}
