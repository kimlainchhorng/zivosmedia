import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  ArrowLeft,
  Hotel,
  CalendarRange,
  Users,
  CreditCard,
  Banknote,
  MapPin,
  Loader2,
  CheckCircle,
  ChevronRight,
  Shield,
  Info,
  Clock,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { useUserProfile } from "@/hooks/useUserProfile";
import { CountryPhoneInput } from "@/components/auth/CountryPhoneInput";
import { LodgingEmbeddedCheckout } from "@/components/lodging/LodgingEmbeddedCheckout";
import { LodgingCutluyCheckout } from "@/components/lodging/LodgingCutluyCheckout";
import { cn } from "@/lib/utils";
import SEOHead from "@/components/SEOHead";
import { createLodgeGuestReservation } from "@/lib/lodging/createLodgeReservation";
import { withRedirectParam } from "@/lib/authRedirect";
import TravelPageFrame from "@/components/travel/TravelPageFrame";
import { isCutluyLodgingStoreEnabled } from "@/config/cutluyLodging";
import { resolveHotelDateWindow } from "@/lib/lodging/hotelDateWindow";

type PayMethod = "cash" | "card" | "khqr";
type CheckoutReservation = {
  id: string;
  number: string | null;
  status: string | null;
  payment_status: string | null;
  total_cents?: number | null;
  last_payment_error?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  payment_provider?: string | null;
  cutluy_manual_review_required?: boolean;
  cutluy_manual_refund_required?: boolean;
};

const ONLINE_PAYMENT_SUCCESS = new Set(["authorized", "captured", "paid"]);
const USD_PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
});

const formatUsdPrice = (cents: number) =>
  cents > 0 ? USD_PRICE_FORMATTER.format(cents / 100) : "—";

const HOTEL_CHECKOUT_CARD_CLASS =
  "rounded-2xl border border-border/50 bg-card shadow-sm";
const HOTEL_CHECKOUT_SECTION_HEADING_CLASS =
  "text-base font-bold tracking-tight text-foreground";

function HotelOnlinePaymentProgress({ method }: { method: "card" | "khqr" }) {
  const steps = [
    { label: "Room held", state: "complete" as const },
    {
      label: method === "khqr" ? "Pay KHQR" : "Pay card",
      state: "current" as const,
    },
    { label: "Confirmed", state: "upcoming" as const },
  ];

  return (
    <ol aria-label="Booking progress" className="grid grid-cols-3 gap-2">
      {steps.map((step, index) => (
        <li
          key={step.label}
          aria-current={step.state === "current" ? "step" : undefined}
          className={cn(
            "rounded-xl p-2 text-center ring-1",
            step.state === "complete"
              ? "bg-emerald-500/[0.08] ring-emerald-500/20"
              : step.state === "current"
                ? "bg-primary/[0.07] ring-primary/25"
                : "bg-background/85 ring-border/60",
          )}
        >
          <span
            className={cn(
              "mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
              step.state === "complete"
                ? "bg-emerald-600 text-white"
                : step.state === "current"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {step.state === "complete" ? (
              <CheckCircle className="h-3.5 w-3.5" aria-hidden />
            ) : (
              index + 1
            )}
          </span>
          <span
            className={cn(
              "block text-[10px] font-bold",
              step.state === "upcoming"
                ? "text-muted-foreground"
                : "text-foreground",
            )}
          >
            {step.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

const firstNonEmptyString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) return trimmed;
  }
  return "";
};

const normalizeAccountPhone = (value: string) => {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (value.trim().startsWith("+")) return `+${digits}`;
  if (digits.startsWith("855")) return `+${digits}`;
  if (/^0?\d{8,9}$/.test(digits)) return `+855${digits.replace(/^0/, "")}`;
  return `+${digits}`;
};

const roomGuestLimit = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
};

const normalizeGuestParam = (
  value: string | null,
  fallback: number,
  min: number,
) => {
  if (value === null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(16, Math.max(min, Math.floor(parsed)))
    : fallback;
};

const guestCapacityMessage = (limit: number, selected: number) =>
  `This room fits up to ${limit} guest${limit === 1 ? "" : "s"}, but your stay has ${selected} guest${selected === 1 ? "" : "s"}. Choose a larger room or reduce guests.`;

const getBookingErrorMessage = (err: unknown) => {
  const raw =
    err && typeof err === "object" && "message" in err
      ? String((err as { message?: unknown }).message || "")
      : String(err || "");
  const lower = raw.toLowerCase();

  if (lower.includes("auth")) {
    return "Please sign in again before booking this stay.";
  }
  if (
    lower.includes("no longer available") ||
    lower.includes("not available") ||
    lower.includes("sold out") ||
    lower.includes("blocked dates")
  ) {
    return "This room is no longer available for the selected dates. Please choose another room or change your dates.";
  }
  if (lower.includes("valid room") || lower.includes("room is required")) {
    return "Choose a room before booking this stay.";
  }
  if (lower.includes("guest count exceeds")) {
    return "This room cannot fit the selected guests. Please reduce guests or choose a larger room.";
  }
  if (lower.includes("minimum stay") || lower.includes("maximum stay")) {
    return raw || "This stay does not match the room's booking rules.";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("schema cache") ||
    lower.includes("could not find the function")
  ) {
    return "Booking service is temporarily unavailable. Please try again in a moment.";
  }

  return raw || "Failed to create booking";
};

export default function HotelRoomCheckoutPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: userProfile, isLoading: profileLoading } = useUserProfile();
  const { currency, format: formatCurrency } = useCurrency();
  const formatPrice = (cents: number) =>
    cents > 0 ? formatCurrency(cents / 100, "USD") : "—";
  const isConvertedDisplayCurrency = currency !== "USD";
  const cutluyEnabledForStore = isCutluyLodgingStoreEnabled(storeId);

  const roomId = params.get("room") || "";
  const reservationIdParam = params.get("reservation_id") || "";
  const dateWindow = resolveHotelDateWindow(params.get("ci"), params.get("co"));
  const dateWindowMessage =
    dateWindow.ok === false
      ? {
          missing:
            "Choose both check-in and check-out dates before booking this room.",
          unparseable:
            "These stay dates are not valid. Choose the dates again from the hotel page.",
          reversed:
            "Check-out must be at least one night after check-in. Choose a valid stay.",
          past: "The check-in date has already passed. Choose new dates before booking.",
        }[dateWindow.reason]
      : null;
  const adults = normalizeGuestParam(params.get("adults"), 2, 1);
  const children = normalizeGuestParam(params.get("children"), 0, 0);
  const nights = dateWindow.ok ? dateWindow.nights : 0;
  const checkInIso = dateWindow.ok ? dateWindow.checkInIso : "";
  const checkOutIso = dateWindow.ok ? dateWindow.checkOutIso : "";

  // Load store
  const storeQ = useQuery({
    queryKey: ["hotel-checkout-store", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_profiles")
        .select("id, name, address, logo_url")
        .eq("id", storeId)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        name: string;
        address: string | null;
        logo_url: string | null;
      } | null;
    },
    enabled: !!storeId,
  });

  // Load rooms
  const roomsQ = useLodgeRooms(storeId);
  const room = useMemo(
    () => (roomsQ.data || []).find((r) => r.id === roomId) ?? null,
    [roomsQ.data, roomId],
  );
  const selectedGuestCount = Math.max(1, adults + children);
  const maxRoomGuests = roomGuestLimit(room?.max_guests);
  const guestCapacityExceeded = !!room && selectedGuestCount > maxRoomGuests;

  // Price calc
  const basePerNight = room?.base_rate_cents ?? 0;
  const originalPerNight = room?.original_rate_cents ?? null;
  const hasDiscount = !!originalPerNight && originalPerNight > basePerNight;
  const discountPct =
    hasDiscount && originalPerNight
      ? Math.round(((originalPerNight - basePerNight) / originalPerNight) * 100)
      : 0;
  const subtotalCents = basePerNight * nights;
  const taxPct = room?.fees?.vat_pct ?? 10;
  const taxCents = Math.round((subtotalCents * taxPct) / 100);
  const totalCents =
    subtotalCents + taxCents + (room?.fees?.cleaning_fee_cents ?? 0);

  // Form state
  const [name, setName] = useState("");
  // Default to Cambodia dial code so the user lands on a sensible country
  // without having to open the picker. They can still switch via the flag
  // dropdown.
  const [phone, setPhone] = useState("+855");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [payMethod, setPayMethod] = useState<PayMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [loadRetrying, setLoadRetrying] = useState(false);
  const [checkoutReservation, setCheckoutReservation] =
    useState<CheckoutReservation | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [guestValidationAttempted, setGuestValidationAttempted] =
    useState(false);
  const guestFieldTouchedRef = useRef({
    name: false,
    phone: false,
    email: false,
  });
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const submitInFlightRef = useRef(false);
  const loadRetryInFlightRef = useRef(false);
  const paymentSectionRef = useRef<HTMLDivElement | null>(null);
  const paymentSuccessToastRef = useRef<string | null>(null);
  const paymentSuccessRedirectRef = useRef<string | null>(null);
  const phoneDigits = phone.replace(/[^0-9]/g, "");
  const nameError =
    guestValidationAttempted && !name.trim() ? "Enter your full name." : null;
  const phoneError =
    guestValidationAttempted && phoneDigits.length < 7
      ? "Enter a valid phone number."
      : null;

  const isLoading = storeQ.isLoading || roomsQ.isLoading;
  const onlinePaymentConfirmed =
    checkoutReservation?.status === "confirmed" &&
    ONLINE_PAYMENT_SUCCESS.has(checkoutReservation.payment_status || "");
  const onlinePaymentDone =
    onlinePaymentConfirmed &&
    !checkoutReservation.cutluy_manual_review_required &&
    !checkoutReservation.cutluy_manual_refund_required;
  const checkoutAmountCents = checkoutReservation?.total_cents ?? totalCents;
  const onlinePaymentStepActive =
    (payMethod === "card" || payMethod === "khqr") && !!checkoutReservation;
  const showPrimaryCheckoutAction = !onlinePaymentStepActive;
  const hotelDetailUrl = useMemo(() => {
    if (!dateWindow.ok) return `/hotel/${storeId}`;

    const stayParams = new URLSearchParams({
      ci: checkInIso,
      co: checkOutIso,
      adults: String(adults),
      children: String(children),
    });
    return `/hotel/${storeId}?${stayParams.toString()}`;
  }, [adults, checkInIso, checkOutIso, children, dateWindow.ok, storeId]);
  const loginUrl = useMemo(
    () =>
      withRedirectParam(
        "/login",
        `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
      ),
    [location.hash, location.pathname, location.search],
  );
  const storeLoadError = !!storeQ.error && storeQ.data === undefined;
  const roomsLoadError = !!roomsQ.error && roomsQ.data === undefined;
  const loadError = dateWindow.ok && (storeLoadError || roomsLoadError);
  const roomLookupFinished =
    dateWindow.ok && !!roomId && !roomsQ.isLoading && roomsQ.data !== undefined;
  const checkoutBlockingMessage = !roomId
    ? "Choose a room before booking this stay."
    : dateWindowMessage
      ? dateWindowMessage
      : roomLookupFinished && (!room || room.is_active === false)
        ? "This room is no longer available. Please choose another room."
        : guestCapacityExceeded
          ? guestCapacityMessage(maxRoomGuests, selectedGuestCount)
          : !user
            ? "Please sign in to book this stay."
            : null;
  const checkoutDetailsReady =
    dateWindow.ok &&
    !isLoading &&
    !loadError &&
    !!room &&
    !checkoutBlockingMessage;
  const accountGuestDetails = useMemo(() => {
    const metadata = (user?.user_metadata ?? {}) as Record<string, unknown>;
    const accountPhone = firstNonEmptyString(
      userProfile?.phone,
      metadata.phone,
      metadata.phone_number,
    );

    return {
      name: firstNonEmptyString(
        userProfile?.full_name,
        metadata.full_name,
        metadata.name,
      ),
      phone: normalizeAccountPhone(accountPhone),
      email: firstNonEmptyString(
        userProfile?.email,
        user?.email,
        metadata.email,
      ),
    };
  }, [
    user?.email,
    user?.user_metadata,
    userProfile?.email,
    userProfile?.full_name,
    userProfile?.phone,
  ]);
  const hasAccountGuestDetails = Boolean(
    accountGuestDetails.name ||
    accountGuestDetails.phone ||
    accountGuestDetails.email,
  );

  useEffect(() => {
    if (!checkoutReservation?.id) return;

    let cancelled = false;
    const refreshReservation = async () => {
      const { data } = await (supabase as any)
        .from("lodge_reservations")
        .select(
          "id, number, status, payment_status, payment_provider, total_cents, last_payment_error, cutluy_manual_review_required, cutluy_manual_refund_required",
        )
        .eq("id", checkoutReservation.id)
        .maybeSingle();
      if (!cancelled && data)
        setCheckoutReservation(data as CheckoutReservation);
    };

    refreshReservation();
    const channel = supabase
      .channel(`hotel-checkout-reservation-${checkoutReservation.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lodge_reservations",
          filter: `id=eq.${checkoutReservation.id}`,
        },
        (payload) => {
          setCheckoutReservation((prev) =>
            prev
              ? { ...prev, ...(payload.new as Partial<CheckoutReservation>) }
              : prev,
          );
        },
      )
      .subscribe();

    const pollId = window.setInterval(refreshReservation, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [checkoutReservation?.id]);

  useEffect(() => {
    if (
      !reservationIdParam ||
      reservationIdParam === checkoutReservation?.id ||
      !storeId
    )
      return;

    let cancelled = false;
    const restoreReservation = async () => {
      const { data } = await (supabase as any)
        .from("lodge_reservations")
        .select(
          "id, number, status, payment_status, payment_provider, total_cents, last_payment_error, cutluy_manual_review_required, cutluy_manual_refund_required",
        )
        .eq("id", reservationIdParam)
        .eq("store_id", storeId)
        .maybeSingle();
      if (cancelled || !data) return;
      setPayMethod(
        data.payment_provider === "khqr" || data.payment_provider === "cutluy"
          ? "khqr"
          : "card",
      );
      setCheckoutReservation(data as CheckoutReservation);
    };

    restoreReservation();
    return () => {
      cancelled = true;
    };
  }, [checkoutReservation?.id, reservationIdParam, storeId]);

  useEffect(() => {
    if (!checkoutReservation?.id) return;
    requestAnimationFrame(() => {
      paymentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
  }, [checkoutReservation?.id]);

  useEffect(() => {
    if (!checkoutReservation?.id || !onlinePaymentDone) return;
    if (paymentSuccessToastRef.current === checkoutReservation.id) return;
    paymentSuccessToastRef.current = checkoutReservation.id;
    toast.success("Payment received. Your booking is confirmed.");
    if (paymentSuccessRedirectRef.current === checkoutReservation.id) return;
    paymentSuccessRedirectRef.current = checkoutReservation.id;
    navigate(
      `/hotel/${storeId}/booking-confirmed?reservation_id=${checkoutReservation.id}`,
      { replace: true },
    );
  }, [checkoutReservation?.id, navigate, onlinePaymentDone, storeId]);

  useEffect(() => {
    if (
      accountGuestDetails.name &&
      !guestFieldTouchedRef.current.name &&
      !name.trim()
    ) {
      setName(accountGuestDetails.name);
    }
    if (
      accountGuestDetails.phone &&
      !guestFieldTouchedRef.current.phone &&
      (!phone.trim() || phone.trim() === "+855")
    ) {
      setPhone(accountGuestDetails.phone);
    }
    if (
      accountGuestDetails.email &&
      !guestFieldTouchedRef.current.email &&
      !email.trim()
    ) {
      setEmail(accountGuestDetails.email);
    }
  }, [accountGuestDetails, email, name, phone]);

  useEffect(() => {
    setCheckoutError(null);
  }, [adults, checkInIso, checkOutIso, children, payMethod, roomId]);

  const handleRetryCheckoutDetails = async () => {
    if (loadRetryInFlightRef.current) return;

    loadRetryInFlightRef.current = true;
    setLoadRetrying(true);
    setCheckoutError(null);
    try {
      await Promise.all([storeQ.refetch(), roomsQ.refetch()]);
    } finally {
      loadRetryInFlightRef.current = false;
      setLoadRetrying(false);
    }
  };

  const handleConfirm = async () => {
    if (submitInFlightRef.current) return;

    setCheckoutError(null);
    if (dateWindow.ok === false) {
      setCheckoutError(dateWindowMessage);
      toast.error(dateWindowMessage);
      return;
    }
    if (checkoutBlockingMessage) {
      setCheckoutError(checkoutBlockingMessage);
      toast.error(checkoutBlockingMessage);
      if (!user) navigate(loginUrl);
      return;
    }
    if (
      (payMethod === "card" || payMethod === "khqr") &&
      checkoutReservation?.id
    ) {
      paymentSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    const nameInvalid = !name.trim();
    // CountryPhoneInput always carries a leading "+<dial>" — require enough
    // digits beyond it to qualify as a real number.
    const phoneInvalid = phoneDigits.length < 7;
    if (nameInvalid || phoneInvalid) {
      setGuestValidationAttempted(true);
      requestAnimationFrame(() => {
        const firstInvalidField = nameInvalid
          ? nameInputRef.current
          : phoneInputRef.current;
        firstInvalidField?.focus({ preventScroll: true });
        firstInvalidField?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    setGuestValidationAttempted(false);
    submitInFlightRef.current = true;
    setSubmitting(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        const message = "Please sign in again before booking this stay.";
        setCheckoutError(message);
        toast.error(message);
        navigate(loginUrl);
        return;
      }

      const res = await createLodgeGuestReservation({
        store_id: storeId,
        room_id: roomId,
        guest_name: name.trim(),
        guest_phone: phone.trim(),
        guest_email: email.trim() || null,
        adults,
        children,
        check_in: dateWindow.checkInIso,
        check_out: dateWindow.checkOutIso,
        status: payMethod === "cash" ? "confirmed" : "hold",
        source: "zivo_app",
        payment_method: payMethod,
        notes: notes.trim() || null,
      });

      if (payMethod === "card" || payMethod === "khqr") {
        const nextParams = new URLSearchParams(params);
        nextParams.set("reservation_id", res.id);
        setSearchParams(nextParams, { replace: true });
        setCheckoutReservation({
          id: res.id,
          number: res.number,
          status: res.status,
          payment_status: res.payment_status,
          total_cents: res.total_cents,
          last_payment_error: null,
          card_brand: null,
          card_last4: null,
          payment_provider: res.payment_provider,
        });
        toast.success(
          payMethod === "khqr"
            ? "Booking held. Scan the secure Bakong KHQR below."
            : "Booking held. Complete secure payment below.",
        );
        return;
      }

      toast.success("Booking confirmed!");
      navigate(`/hotel/${storeId}/booking-confirmed?reservation_id=${res.id}`);
    } catch (err: any) {
      const message = getBookingErrorMessage(err);
      setCheckoutError(message);
      toast.error(message);
    } finally {
      submitInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const handleCheckoutSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void handleConfirm();
  };

  const handleGuestFormKeyDown = (
    event: ReactKeyboardEvent<HTMLFormElement>,
  ) => {
    if (
      event.key !== "Enter" ||
      event.defaultPrevented ||
      event.nativeEvent.isComposing
    )
      return;
    if (
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLButtonElement
    )
      return;

    event.preventDefault();
    event.currentTarget.requestSubmit();
  };

  const store = storeQ.data;
  // photos can be a string[] OR an array of objects ({url, order, source, ...})
  // depending on import vintage. Extract the URL safely so we don't end up with
  // src="[object Object]" and a broken image.
  const rawPhoto =
    (room?.photos as unknown[] | undefined)?.[room?.cover_photo_index ?? 0] ??
    (room?.photos as unknown[] | undefined)?.[0];
  const photo: string | null =
    typeof rawPhoto === "string"
      ? rawPhoto
      : rawPhoto && typeof rawPhoto === "object"
        ? (((rawPhoto as Record<string, unknown>).url ??
            (rawPhoto as Record<string, unknown>).src ??
            (rawPhoto as Record<string, unknown>).path ??
            null) as string | null)
        : null;

  return (
    <TravelPageFrame>
      <div className="min-h-screen bg-background pb-[calc(var(--zivo-safe-bottom,0px)+2rem)]">
        <SEOHead
          title="Hotel Booking – Complete Your Reservation – ZIVO"
          description="Complete your hotel reservation securely. Review pricing, confirm details, and book your stay with flexible payment options."
        />
        {/* Header */}
        <header
          className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3"
          style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}
        >
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="h-11 w-11 shrink-0 rounded-full border-border/60 bg-card/80 shadow-sm"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" aria-hidden />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ig-gradient truncate leading-tight">
              Confirm Booking
            </h1>
            {store && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {store.name}
              </p>
            )}
          </div>
          <span className="inline-flex h-8 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
            <Shield className="h-3.5 w-3.5" aria-hidden /> Secure
          </span>
        </header>

        <div className="mx-auto max-w-lg space-y-5 px-4 pt-5">
          {loadError && (
            <div
              role="alert"
              aria-labelledby="hotel-checkout-unavailable-title"
              className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
            >
              <p
                id="hotel-checkout-unavailable-title"
                className="font-semibold"
              >
                Hotel booking details unavailable
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                We could not verify the latest hotel and room details. This does
                not mean the room was removed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void handleRetryCheckoutDetails()}
                  disabled={loadRetrying}
                  aria-busy={loadRetrying}
                  className="rounded-xl"
                >
                  {loadRetrying && (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {loadRetrying ? "Retrying…" : "Retry booking details"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(hotelDetailUrl)}
                  className="rounded-xl bg-background"
                >
                  Back to rooms
                </Button>
              </div>
            </div>
          )}

          {!loadError && checkoutBlockingMessage && (
            <div
              role="alert"
              aria-labelledby="hotel-checkout-blocked-title"
              className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm text-amber-900 dark:text-amber-100"
            >
              <p id="hotel-checkout-blocked-title" className="font-semibold">
                {checkoutBlockingMessage}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl bg-background"
                onClick={() => navigate(user ? hotelDetailUrl : loginUrl)}
              >
                {user
                  ? dateWindow.ok
                    ? "Back to rooms"
                    : "Choose dates"
                  : "Sign in"}
              </Button>
            </div>
          )}

          {checkoutError && !loadError && !checkoutBlockingMessage && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
              {checkoutError}
            </div>
          )}

          {/* Room summary card */}
          {isLoading && dateWindow.ok ? (
            <Skeleton className="h-28 rounded-2xl" />
          ) : loadError || !room || !dateWindow.ok ? null : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                HOTEL_CHECKOUT_CARD_CLASS,
                "flex gap-0 overflow-hidden",
              )}
            >
              <div className="w-28 shrink-0 relative">
                {photo ? (
                  <img
                    src={photo}
                    alt={room.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full min-h-[96px] bg-muted flex items-center justify-center">
                    <Hotel className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 min-w-0">
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {room.name}
                  </p>
                  {room.breakfast_included && (
                    <Badge variant="outline" className="text-[9px] shrink-0">
                      Breakfast
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {room.beds || room.room_type || "Room"} · {maxRoomGuests}{" "}
                  guest{maxRoomGuests === 1 ? "" : "s"}
                </p>
                {(hasDiscount || room.original_rate_cents) && (
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    {hasDiscount && originalPerNight ? (
                      <>
                        <span className="text-muted-foreground line-through">
                          {formatPrice(originalPerNight)}
                        </span>
                        <span className="rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 font-semibold">
                          -{discountPct}%
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Original rate available
                      </span>
                    )}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarRange className="w-3 h-3" />
                    {format(dateWindow.checkIn, "MMM d")} –{" "}
                    {format(dateWindow.checkOut, "MMM d")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {selectedGuestCount} guest
                    {selectedGuestCount === 1 ? "" : "s"}
                  </span>
                </div>
                {store?.address && (
                  <p className="mt-1 text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {store.address}
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {checkoutDetailsReady && dateWindow.ok && (
            <>
              {/* Dates strip */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="grid grid-cols-3 gap-2"
              >
                {[
                  {
                    label: "Check-in",
                    value: format(dateWindow.checkIn, "EEE, MMM d"),
                  },
                  {
                    label: "Check-out",
                    value: format(dateWindow.checkOut, "EEE, MMM d"),
                  },
                  {
                    label: "Duration",
                    value: `${dateWindow.nights} night${dateWindow.nights > 1 ? "s" : ""}`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-border/50 bg-card p-3 text-center shadow-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs font-bold text-foreground">
                      {item.value}
                    </p>
                  </div>
                ))}
              </motion.div>

              {/* Guest info */}
              {!onlinePaymentStepActive && (
                <motion.form
                  id="hotel-guest-details-form"
                  noValidate
                  onSubmit={handleCheckoutSubmit}
                  onKeyDown={handleGuestFormKeyDown}
                  aria-labelledby="hotel-guest-details-heading"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(HOTEL_CHECKOUT_CARD_CLASS, "space-y-4 p-4")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2
                        id="hotel-guest-details-heading"
                        className={HOTEL_CHECKOUT_SECTION_HEADING_CLASS}
                      >
                        Guest Details
                      </h2>
                      {hasAccountGuestDetails && (
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          Filled from your customer account. You can edit it for
                          this stay.
                        </p>
                      )}
                    </div>
                    {hasAccountGuestDetails ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                        <CheckCircle className="h-3 w-3" />
                        From account
                      </span>
                    ) : profileLoading ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Loading account
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <Label
                        htmlFor="hotel-guest-name"
                        className="text-[11px] text-muted-foreground mb-1 block"
                      >
                        Full name <span aria-hidden="true">*</span>
                        <span className="sr-only"> (required)</span>
                      </Label>
                      <Input
                        ref={nameInputRef}
                        id="hotel-guest-name"
                        name="guest_name"
                        required
                        autoComplete="name"
                        aria-invalid={!!nameError}
                        aria-describedby={
                          nameError ? "hotel-guest-name-error" : undefined
                        }
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => {
                          guestFieldTouchedRef.current.name = true;
                          setName(e.target.value);
                        }}
                        className={cn(
                          "h-11 rounded-xl text-sm",
                          nameError &&
                            "border-destructive focus-visible:ring-destructive/30",
                        )}
                      />
                      {nameError && (
                        <p
                          id="hotel-guest-name-error"
                          role="alert"
                          className="mt-1 text-[11px] font-medium text-destructive"
                        >
                          {nameError}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor="hotel-guest-phone"
                        className="text-[11px] text-muted-foreground mb-1 block"
                      >
                        Phone number <span aria-hidden="true">*</span>
                        <span className="sr-only"> (required)</span>
                      </Label>
                      <CountryPhoneInput
                        ref={phoneInputRef}
                        id="hotel-guest-phone"
                        value={phone}
                        onChange={(value) => {
                          guestFieldTouchedRef.current.phone = true;
                          setPhone(value);
                        }}
                        name="guest_phone"
                        required
                        autoComplete="tel-national"
                        aria-invalid={!!phoneError}
                        aria-describedby={
                          phoneError ? "hotel-guest-phone-error" : undefined
                        }
                      />
                      {phoneError && (
                        <p
                          id="hotel-guest-phone-error"
                          role="alert"
                          className="mt-1 text-[11px] font-medium text-destructive"
                        >
                          {phoneError}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label
                        htmlFor="hotel-guest-email"
                        className="text-[11px] text-muted-foreground mb-1 block"
                      >
                        Email (optional)
                      </Label>
                      <Input
                        id="hotel-guest-email"
                        name="guest_email"
                        placeholder="you@email.com"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => {
                          guestFieldTouchedRef.current.email = true;
                          setEmail(e.target.value);
                        }}
                        className="h-11 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="hotel-special-requests"
                        className="text-[11px] text-muted-foreground mb-1 block"
                      >
                        Special requests (optional)
                      </Label>
                      <Textarea
                        id="hotel-special-requests"
                        name="special_requests"
                        autoComplete="off"
                        placeholder="Early check-in, high floor, etc."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="rounded-xl text-sm resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </motion.form>
              )}

              {/* Price breakdown */}
              {room && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  aria-labelledby="hotel-price-breakdown-heading"
                  className={cn(HOTEL_CHECKOUT_CARD_CLASS, "space-y-3 p-4")}
                >
                  <h2
                    id="hotel-price-breakdown-heading"
                    className={HOTEL_CHECKOUT_SECTION_HEADING_CLASS}
                  >
                    Price Breakdown
                  </h2>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>
                        {formatPrice(basePerNight)} × {nights} night
                        {nights > 1 ? "s" : ""}
                      </span>
                      <span>{formatPrice(subtotalCents)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Taxes ({taxPct}%)</span>
                      <span>{formatPrice(taxCents)}</span>
                    </div>
                    {(room.fees?.cleaning_fee_cents ?? 0) > 0 && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Cleaning fee</span>
                        <span>
                          {formatPrice(room.fees?.cleaning_fee_cents ?? 0)}
                        </span>
                      </div>
                    )}
                    <Separator className="my-1 bg-border/30" />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total</span>
                      <span className="text-primary">
                        {formatPrice(totalCents)}
                      </span>
                    </div>
                    {isConvertedDisplayCurrency && (
                      <div
                        role="note"
                        data-testid="hotel-price-conversion-note"
                        className="flex items-start gap-1.5 rounded-lg bg-muted/45 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground"
                      >
                        <Info
                          className="mt-0.5 h-3.5 w-3.5 shrink-0"
                          aria-hidden
                        />
                        <span>
                          USD source total:{" "}
                          <strong className="text-foreground">
                            {formatUsdPrice(totalCents)}
                          </strong>
                          . {currency} amounts are estimated conversions;
                          exchange rates may vary.
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Payment method */}
              {!onlinePaymentStepActive && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className={cn(HOTEL_CHECKOUT_CARD_CLASS, "space-y-4 p-4")}
                >
                  <h2
                    id="hotel-payment-method-heading"
                    className={HOTEL_CHECKOUT_SECTION_HEADING_CLASS}
                  >
                    Payment Method
                  </h2>
                  <div
                    role="group"
                    aria-labelledby="hotel-payment-method-heading"
                    className={cn(
                      "grid grid-cols-1 gap-2",
                      cutluyEnabledForStore
                        ? "min-[480px]:grid-cols-3"
                        : "min-[480px]:grid-cols-2",
                    )}
                  >
                    {[
                      {
                        key: "cash" as PayMethod,
                        icon: Banknote,
                        label: "Cash at hotel",
                        sub: "Pay when you arrive",
                      },
                      {
                        key: "card" as PayMethod,
                        icon: CreditCard,
                        label: "Pay online",
                        sub: "Charged in USD",
                      },
                      ...(cutluyEnabledForStore
                        ? [
                            {
                              key: "khqr" as PayMethod,
                              icon: QrCode,
                              label: "Bakong KHQR",
                              sub: "Scan any KHQR app",
                            },
                          ]
                        : []),
                    ].map(({ key, icon: Icon, label, sub }) => (
                      <button
                        type="button"
                        key={key}
                        aria-pressed={payMethod === key}
                        aria-labelledby={`hotel-payment-method-${key}-label`}
                        aria-describedby={`hotel-payment-method-${key}-description`}
                        disabled={!!checkoutReservation && payMethod !== key}
                        onClick={() => setPayMethod(key)}
                        className={cn(
                          "relative flex min-h-16 min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-45 min-[480px]:min-h-24 min-[480px]:flex-col min-[480px]:items-start",
                          payMethod === key
                            ? "border-primary/60 bg-primary/[0.06] shadow-sm"
                            : "border-border/60 bg-card hover:border-primary/30 hover:bg-muted/30",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                            payMethod === key
                              ? "bg-primary/10 text-primary"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon aria-hidden className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            id={`hotel-payment-method-${key}-label`}
                            className={cn(
                              "block text-[12px] font-semibold",
                              payMethod === key
                                ? "text-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {label}
                          </span>
                          <span
                            id={`hotel-payment-method-${key}-description`}
                            className="mt-0.5 block text-[11px] leading-snug text-muted-foreground"
                          >
                            {sub}
                          </span>
                        </span>
                        {payMethod === key && (
                          <CheckCircle
                            aria-hidden
                            className="ml-auto h-4 w-4 shrink-0 text-primary min-[480px]:absolute min-[480px]:right-3 min-[480px]:top-3"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                  {payMethod === "cash" && (
                    <p className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Your room is reserved instantly. Pay the full amount at
                        the front desk upon arrival.
                        {isConvertedDisplayCurrency &&
                          ` Confirm the hotel's accepted cash currency; the ${currency} total is an estimate.`}
                      </span>
                    </p>
                  )}
                  {payMethod === "card" && (
                    <p
                      role="note"
                      data-testid="hotel-online-charge-disclosure"
                      className="text-[11px] text-muted-foreground flex items-start gap-1.5"
                    >
                      <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        Pay securely inside ZIVO with Stripe. Your card will be
                        charged in USD:{" "}
                        <strong className="text-foreground">
                          {formatUsdPrice(totalCents)}
                        </strong>
                        . Your bank or card network may use a different exchange
                        rate or add fees.
                      </span>
                    </p>
                  )}
                  {payMethod === "khqr" && (
                    <p
                      role="note"
                      data-testid="hotel-cutluy-charge-disclosure"
                      className="flex items-start gap-1.5 text-[11px] text-muted-foreground"
                    >
                      <Shield
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        aria-hidden
                      />
                      <span>
                        Pay{" "}
                        <strong className="text-foreground">
                          {formatUsdPrice(totalCents)} USD
                        </strong>{" "}
                        through CutLuy with any Bakong KHQR-supported Cambodian
                        banking app. Scanning is not payment; ZIVO confirms only
                        after CutLuy reports{" "}
                        <strong className="text-foreground">paid</strong>.
                      </span>
                    </p>
                  )}
                </motion.div>
              )}

              {payMethod === "card" && checkoutReservation && (
                <motion.div
                  ref={paymentSectionRef}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-3"
                >
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Step 2 of 3
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                            <Clock className="h-3 w-3" />
                            Room held
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          Finish secure card payment
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          Reservation{" "}
                          {checkoutReservation.number ||
                            checkoutReservation.id.slice(0, 8)}{" "}
                          is held for this room. Enter your card below; ZIVO
                          confirms the booking automatically after Stripe
                          approves it.
                        </p>
                      </div>
                    </div>
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                      <CheckCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600"
                        aria-hidden
                      />
                      Guest and payment details are saved to this held
                      reservation.
                    </p>
                  </div>

                  <HotelOnlinePaymentProgress method="card" />

                  <div
                    role="note"
                    data-testid="hotel-stripe-charge-disclosure"
                    className="rounded-xl border border-sky-500/20 bg-sky-500/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    <p className="font-semibold text-foreground">
                      Stripe charge: USD {formatUsdPrice(checkoutAmountCents)}
                    </p>
                    {isConvertedDisplayCurrency && (
                      <p className="mt-0.5">
                        {formatPrice(checkoutAmountCents)} is an estimated{" "}
                        {currency} display conversion. Your bank sets the final
                        exchange rate and any fees.
                      </p>
                    )}
                  </div>

                  <LodgingEmbeddedCheckout
                    reservationId={checkoutReservation.id}
                    storeId={storeId}
                    amountCents={checkoutAmountCents}
                    mode="full"
                    method="card"
                    hideMethodToggle
                    paymentStatus={checkoutReservation.payment_status}
                    lastPaymentError={
                      checkoutReservation.last_payment_error || null
                    }
                    cardBrand={checkoutReservation.card_brand || null}
                    cardLast4={checkoutReservation.card_last4 || null}
                    reservationRef={checkoutReservation.number}
                    onComplete={() =>
                      toast.success("Payment submitted. Confirming with ZIVO…")
                    }
                  />

                  {onlinePaymentConfirmed && (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-2xl font-bold shadow-md shadow-primary/15"
                      onClick={() =>
                        navigate(
                          `/hotel/${storeId}/booking-confirmed?reservation_id=${checkoutReservation.id}`,
                        )
                      }
                    >
                      View confirmed booking
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              )}

              {payMethod === "khqr" && checkoutReservation && (
                <motion.div
                  ref={paymentSectionRef}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="space-y-3"
                >
                  <div className="space-y-3 rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300">
                        <QrCode className="h-4 w-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
                            Step 2 of 3
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/80 px-2 py-1 text-[10px] font-bold text-sky-700 ring-1 ring-sky-500/20 dark:text-sky-300">
                            <Clock className="h-3 w-3" aria-hidden />
                            Room held
                          </span>
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          Finish Bakong KHQR payment
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                          Reservation{" "}
                          {checkoutReservation.number ||
                            checkoutReservation.id.slice(0, 8)}{" "}
                          is held. ZIVO uses the saved USD total and waits for
                          signed payment confirmation.
                        </p>
                      </div>
                    </div>
                    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted-foreground">
                      <CheckCircle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600"
                        aria-hidden
                      />
                      Guest and payment details are saved to this held
                      reservation.
                    </p>
                  </div>

                  <HotelOnlinePaymentProgress method="khqr" />

                  <LodgingCutluyCheckout
                    reservationId={checkoutReservation.id}
                    reservationRef={checkoutReservation.number}
                    amountCents={checkoutAmountCents}
                    paymentStatus={checkoutReservation.payment_status}
                    reservationStatus={checkoutReservation.status}
                    manualReviewRequired={
                      checkoutReservation.cutluy_manual_review_required
                    }
                    manualRefundRequired={
                      checkoutReservation.cutluy_manual_refund_required
                    }
                  />

                  {onlinePaymentDone && (
                    <Button
                      type="button"
                      className="h-12 w-full rounded-2xl font-bold shadow-md shadow-primary/15"
                      onClick={() =>
                        navigate(
                          `/hotel/${storeId}/booking-confirmed?reservation_id=${checkoutReservation.id}`,
                        )
                      }
                    >
                      View confirmed booking
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Button>
                  )}
                </motion.div>
              )}

              {/* Cancellation policy */}
              {room?.cancellation_policy && (
                <section
                  role="note"
                  aria-labelledby="hotel-cancellation-refunds-heading"
                  data-testid="hotel-cancellation-refund-disclosure"
                  className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-3"
                >
                  <h2
                    id="hotel-cancellation-refunds-heading"
                    className="text-xs font-bold text-amber-800 dark:text-amber-300"
                  >
                    Cancellation and refunds
                  </h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    For amounts already paid:{" "}
                    <strong className="text-foreground">
                      7+ days before check-in
                    </strong>{" "}
                    receives a full refund;{" "}
                    <strong className="text-foreground">
                      2–6 days before check-in
                    </strong>{" "}
                    receives a 50% refund; and{" "}
                    <strong className="text-foreground">
                      less than 48 hours before check-in
                    </strong>{" "}
                    receives no refund.
                  </p>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                    Before cancellation, ZIVO shows the exact refundable and
                    non-refundable amounts and recalculates them from the
                    current reservation state.
                  </p>
                </section>
              )}

              {/* CTA */}
              {showPrimaryCheckoutAction && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="pt-2"
                >
                  <Button
                    type="submit"
                    form="hotel-guest-details-form"
                    size="lg"
                    className="h-14 w-full rounded-2xl font-bold shadow-lg shadow-primary/20"
                    disabled={
                      !!checkoutBlockingMessage ||
                      submitting ||
                      !room ||
                      isLoading
                    }
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : payMethod === "card" || payMethod === "khqr" ? (
                      <>
                        {payMethod === "khqr" ? (
                          <QrCode className="h-4 w-4" aria-hidden />
                        ) : (
                          <CreditCard className="h-4 w-4" aria-hidden />
                        )}
                        {payMethod === "khqr"
                          ? "Continue to Bakong KHQR"
                          : "Continue to payment"}{" "}
                        · USD {formatUsdPrice(totalCents)}
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" aria-hidden />
                        Confirm Booking
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </Button>
                  <p className="mt-2 flex items-center justify-center gap-1 text-center text-[10px] text-muted-foreground">
                    <Shield className="h-3 w-3" aria-hidden />
                    Your booking is protected by ZIVO
                  </p>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </TravelPageFrame>
  );
}
