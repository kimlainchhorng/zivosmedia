/**
 * Public salon booking page at /salon/:slug.
 * Three steps: pick service → pick stylist → pick time → enter info → confirm.
 * Creates a salon_bookings row with status='pending', source='app'.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Store, Loader2, AlertCircle, ChevronLeft, ChevronRight, CheckCircle2,
  Clock, DollarSign, UserCog, Calendar, ArrowRight, Star, Sparkles,
  MapPin, Phone, Facebook, Instagram, Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { computeOpenSlots, type ScheduleRow, type BusyRange } from "@/lib/salon/availability";
import { useAuth } from "@/contexts/AuthContext";

interface SalonProfile {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  category: string | null;
  is_active: boolean;
  gallery_images: string[] | null;
  address: string | null;
  phone: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  tiktok_url: string | null;
  telegram_url: string | null;
}
interface Service {
  id: string; name: string; description: string | null; duration_minutes: number; price_cents: number; image_url: string | null; category: string | null;
}
interface Stylist {
  id: string; display_name: string; title: string | null; photo_url: string | null;
  service_ids: string[];
}

/** Local YYYY-MM-DD — the date the customer sees on their device. Using
 *  `.toISOString().slice(0, 10)` here would return the UTC date, which is
 *  off by a day for negative-UTC offset users in the evening, defaulting
 *  the picker to tomorrow and breaking past-slot suppression on "today". */
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PublicSalonBookingPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  // Optionally authenticated. When set, the booking gets created_by_user_id =
  // user.id; the sanitize trigger then attaches it to a salon_clients row so
  // the booking shows up in their /salon/me portal.
  const { user } = useAuth();
  /** Honor ?service= and ?stylist= deep-links from "Book again" — but only on
   * first arrival, so navigating past step 1 isn't yanked back. */
  const deepLinkConsumed = useRef(false);

  const [store, setStore] = useState<SalonProfile | null>(null);
  // Public-readable subset of the salon's payment policy. Drives the
  // cancellation-policy disclosure: a no-show fee can only fire when a
  // card is on file, which requires a deposit, so we only show the
  // policy block when BOTH are configured.
  const [paymentPolicy, setPaymentPolicy] = useState<{ deposit_percent: number; no_show_fee_cents: number } | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [reviews, setReviews] = useState<{ id: string; rating_stars: number; comment: string | null; client_name: string; stylist_name: string | null; created_at: string; owner_response: string | null }[]>([]);
  const [reviewStats, setReviewStats] = useState<{ avg: number; count: number }>({ avg: 0, count: 0 });
  const [storeHours, setStoreHours] = useState<Array<{ day_of_week: number; is_open: boolean; start: string | null; end: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>("all");
  const [serviceId, setServiceId] = useState<string>("");
  const [stylistId, setStylistId] = useState<string>("");
  const [date, setDate] = useState(todayIso());
  const [selectedSlot, setSelectedSlot] = useState<string>("");

  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [busy, setBusy] = useState<BusyRange[]>([]);
  /** True when the selected day is fully covered by a store closure — so we
   *  can show "Closed today" instead of the generic "no openings" message. */
  const [dayClosed, setDayClosed] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  /** When the user picks "Any stylist", we compute per-stylist slot maps so a
   * selected time can be attributed to whichever stylist offered it. */
  const [anyStylistSlotMap, setAnyStylistSlotMap] = useState<Map<string, string>>(new Map());

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  // Transactional opt-in defaults true (customer is asking for the booking;
  // a confirmation/reminder is presumed). Marketing defaults false (TCPA /
  // CAN-SPAM require explicit consent before promotional sends).
  const [remindersOptIn, setRemindersOptIn] = useState(true);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState<{ id: string; startAt: string } | null>(null);

  // Load salon + services + stylists by slug (using public read policies).
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setLoadError(null);
      const { data: storeRow, error: sErr } = await supabase
        .from("store_profiles")
        .select("id,name,slug,description,logo_url,banner_url,category,is_active,gallery_images,address,phone,facebook_url,instagram_url,tiktok_url,telegram_url")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (sErr || !storeRow) {
        setLoadError("Salon not found.");
        setLoading(false);
        return;
      }
      if ((storeRow as any).category !== "salon") {
        setLoadError("This page is only for salon-style businesses.");
        setLoading(false);
        return;
      }
      setStore(storeRow as unknown as SalonProfile);

      // Public payment-policy snippet — drives the cancellation disclosure
      // shown above the submit button. Owner-only fields like
      // stripe_account_id stay locked; this RPC only returns the customer-
      // relevant numbers.
      void (async () => {
        const { data: policyRows, error: pErr } = await supabase
          .rpc("salon_public_get_payment_policy", { p_store_id: (storeRow as any).id });
        if (cancelled) return;
        if (!pErr && Array.isArray(policyRows) && policyRows.length > 0) {
          const p = policyRows[0] as any;
          setPaymentPolicy({
            deposit_percent: Number(p.deposit_percent ?? 0),
            no_show_fee_cents: Number(p.no_show_fee_cents ?? 0),
          });
        } else {
          setPaymentPolicy({ deposit_percent: 0, no_show_fee_cents: 0 });
        }
      })();

      const [servicesRes, stylistsRes, reviewsRes, schedulesRes] = await Promise.all([
        supabase.from("salon_services").select("id,name,description,duration_minutes,price_cents,image_url,category")
          .eq("store_id", (storeRow as any).id).eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("salon_stylists")
          .select("id,display_name,title,photo_url,salon_stylist_services(service_id)")
          .eq("store_id", (storeRow as any).id).eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.from("salon_reviews")
          .select("id,rating_stars,comment,client_name,stylist_name,created_at,owner_response")
          .eq("store_id", (storeRow as any).id).eq("is_visible", true)
          .order("created_at", { ascending: false }).limit(50),
        // Pull schedules for ALL active stylists at this store — the public
        // read policy allows it. We aggregate into "salon hours" client-side.
        supabase.from("salon_stylist_schedules")
          .select("day_of_week, is_working, start_time, end_time, stylist_id, salon_stylists!inner(is_active, store_id)")
          .eq("salon_stylists.store_id", (storeRow as any).id)
          .eq("salon_stylists.is_active", true),
      ]);
      if (cancelled) return;
      setServices((servicesRes.data ?? []) as unknown as Service[]);
      const sty = (stylistsRes.data ?? []).map((s: any) => ({
        id: s.id, display_name: s.display_name, title: s.title, photo_url: s.photo_url,
        service_ids: (s.salon_stylist_services ?? []).map((j: any) => j.service_id as string),
      }));
      setStylists(sty);
      const reviewRows = (reviewsRes.data ?? []) as unknown as { id: string; rating_stars: number; comment: string | null; client_name: string; stylist_name: string | null; created_at: string; owner_response: string | null }[];
      setReviews(reviewRows);
      const count = reviewRows.length;
      const avg = count > 0 ? reviewRows.reduce((s, r) => s + r.rating_stars, 0) / count : 0;
      setReviewStats({ avg, count });

      // Aggregate per-day salon hours: union of all active stylists' windows.
      const hoursByDow = new Map<number, { start: string; end: string }>();
      for (const row of (schedulesRes.data ?? []) as any[]) {
        if (!row.is_working || !row.start_time || !row.end_time) continue;
        const cur = hoursByDow.get(row.day_of_week);
        const start = row.start_time as string;
        const end = row.end_time as string;
        if (!cur) {
          hoursByDow.set(row.day_of_week, { start, end });
        } else {
          if (start < cur.start) cur.start = start;
          if (end > cur.end) cur.end = end;
        }
      }
      const hours: typeof storeHours = [];
      for (let d = 0; d < 7; d++) {
        const h = hoursByDow.get(d);
        hours.push({ day_of_week: d, is_open: !!h, start: h?.start ?? null, end: h?.end ?? null });
      }
      setStoreHours(hours);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Consume ?service= and ?stylist= once services/stylists are loaded.
  useEffect(() => {
    if (deepLinkConsumed.current) return;
    if (services.length === 0 && stylists.length === 0) return;
    const wantedService = searchParams.get("service");
    const wantedStylist = searchParams.get("stylist");
    if (wantedService && services.some((s) => s.id === wantedService)) {
      setServiceId(wantedService);
    }
    if (wantedStylist && stylists.some((s) => s.id === wantedStylist)) {
      setStylistId(wantedStylist);
    }
    if (wantedService || wantedStylist) {
      deepLinkConsumed.current = true;
    }
  }, [searchParams, services, stylists]);

  // When stylist + date change, fetch schedule for that stylist + existing bookings.
  // "__any" means we'll compute combined availability across all eligible
  // stylists; that fetch lives in a separate effect below.
  useEffect(() => {
    if (!stylistId || stylistId === "__any" || !store) { setSchedule([]); setBusy([]); setDayClosed(false); return; }
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      const dayStartMs = new Date(`${date}T00:00:00`).getTime();
      const dayEndMs = new Date(`${date}T23:59:59.999`).getTime();
      const dayStart = new Date(dayStartMs).toISOString();
      const dayEnd = new Date(dayEndMs).toISOString();
      const [schedRes, busyRes, blockoutRes, closureRes] = await Promise.all([
        supabase.from("salon_stylist_schedules").select("day_of_week,is_working,start_time,end_time").eq("stylist_id", stylistId),
        // Use the public RPC — direct salon_bookings SELECT would either fail
        // (no anon policy) or leak client info. The RPC returns just
        // start_at/end_at for pending+confirmed bookings on this stylist.
        // `as never` until types.ts is regenerated with the new RPC.
        supabase.rpc("salon_public_stylist_busy" as never, {
          p_stylist_id: stylistId, p_day_start: dayStart, p_day_end: dayEnd,
        } as never),
        supabase.rpc("salon_public_stylist_blockouts", {
          p_stylist_id: stylistId, p_day_start: dayStart, p_day_end: dayEnd,
        }),
        supabase.rpc("salon_public_store_closures", {
          p_store_id: store.id, p_day_start: dayStart, p_day_end: dayEnd,
        }),
      ]);
      if (cancelled) return;
      setSchedule((schedRes.data ?? []) as unknown as ScheduleRow[]);
      const closuresList = (closureRes.data ?? []) as unknown as BusyRange[];
      // Day is "closed" if any single closure window contains the full day.
      setDayClosed(closuresList.some((c) =>
        new Date(c.start_at).getTime() <= dayStartMs && new Date(c.end_at).getTime() >= dayEndMs
      ));
      const allBusy = [
        ...((busyRes.data ?? []) as unknown as BusyRange[]),
        ...((blockoutRes.data ?? []) as unknown as BusyRange[]),
        ...closuresList,
      ];
      setBusy(allBusy);
      setSlotsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stylistId, date, store?.id]);

  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [services, serviceId]);

  const serviceCategories = useMemo(() => {
    const set = new Set<string>();
    for (const s of services) if (s.category) set.add(s.category);
    return Array.from(set).sort();
  }, [services]);

  const visibleServices = useMemo(() => {
    if (serviceCategoryFilter === "all") return services;
    return services.filter((s) => (s.category ?? "Other") === serviceCategoryFilter);
  }, [services, serviceCategoryFilter]);
  const eligibleStylists = useMemo(() => {
    if (!serviceId) return stylists;
    const list = stylists.filter((s) => s.service_ids.includes(serviceId));
    return list.length > 0 ? list : stylists; // fall back to all if nobody assigned
  }, [stylists, serviceId]);

  // "Any stylist" mode: fetch per-stylist availability and build a slot→stylist map.
  useEffect(() => {
    if (stylistId !== "__any" || !selectedService) {
      setAnyStylistSlotMap(new Map());
      return;
    }
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
      const ids = eligibleStylists.map((s) => s.id);
      const [schedRes, busyRes, blockRes, closureRes] = await Promise.all([
        // Schedules already have an anon SELECT policy (see migration 070000)
        // so the direct query is fine.
        supabase.from("salon_stylist_schedules")
          .select("stylist_id, day_of_week, is_working, start_time, end_time")
          .in("stylist_id", ids),
        // Bookings + blockouts need SECURITY DEFINER RPCs — see comment in
        // the single-stylist effect above for the privacy rationale.
        // `as never` until types.ts is regenerated with the new RPCs.
        supabase.rpc("salon_public_stylists_busy" as never, {
          p_stylist_ids: ids, p_day_start: dayStart, p_day_end: dayEnd,
        } as never),
        supabase.rpc("salon_public_stylists_blockouts" as never, {
          p_stylist_ids: ids, p_day_start: dayStart, p_day_end: dayEnd,
        } as never),
        store
          ? supabase.rpc("salon_public_store_closures", { p_store_id: store.id, p_day_start: dayStart, p_day_end: dayEnd })
          : Promise.resolve({ data: [] as Array<{ start_at: string; end_at: string }>, error: null }),
      ]);
      if (cancelled) return;
      const schedByStylist = new Map<string, ScheduleRow[]>();
      for (const row of (schedRes.data ?? []) as any[]) {
        const arr = schedByStylist.get(row.stylist_id) ?? [];
        arr.push({ day_of_week: row.day_of_week, is_working: row.is_working, start_time: row.start_time, end_time: row.end_time });
        schedByStylist.set(row.stylist_id, arr);
      }
      const busyByStylist = new Map<string, BusyRange[]>();
      for (const row of [...(busyRes.data ?? []), ...(blockRes.data ?? [])] as any[]) {
        const arr = busyByStylist.get(row.stylist_id) ?? [];
        arr.push({ start_at: row.start_at, end_at: row.end_at });
        busyByStylist.set(row.stylist_id, arr);
      }
      // Store-wide closures apply to every eligible stylist.
      const storeClosures = (closureRes.data ?? []) as Array<{ start_at: string; end_at: string }>;
      for (const sid of ids) {
        const arr = busyByStylist.get(sid) ?? [];
        for (const c of storeClosures) arr.push({ start_at: c.start_at, end_at: c.end_at });
        busyByStylist.set(sid, arr);
      }
      const dayStartMs = new Date(`${date}T00:00:00`).getTime();
      const dayEndMs = new Date(`${date}T23:59:59.999`).getTime();
      setDayClosed(storeClosures.some((c) =>
        new Date(c.start_at).getTime() <= dayStartMs && new Date(c.end_at).getTime() >= dayEndMs
      ));
      const now = new Date();
      const earliest = date === todayIso() ? now : undefined;
      const slotMap = new Map<string, string>(); // ISO start → stylist_id
      for (const sty of eligibleStylists) {
        const open = computeOpenSlots({
          date,
          schedule: schedByStylist.get(sty.id) ?? [],
          busy: busyByStylist.get(sty.id) ?? [],
          durationMinutes: selectedService.duration_minutes,
          slotMinutes: 15,
          earliestStart: earliest,
        });
        for (const iso of open) {
          // First stylist with that slot wins (preserves stable picks).
          if (!slotMap.has(iso)) slotMap.set(iso, sty.id);
        }
      }
      setAnyStylistSlotMap(slotMap);
      setSlotsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stylistId, date, selectedService, eligibleStylists]);

  const slots = useMemo(() => {
    if (!selectedService) return [];
    if (stylistId === "__any") {
      return Array.from(anyStylistSlotMap.keys()).sort();
    }
    const now = new Date();
    const earliest = date === todayIso() ? now : undefined;
    return computeOpenSlots({
      date, schedule, busy,
      durationMinutes: selectedService.duration_minutes,
      slotMinutes: 15,
      earliestStart: earliest,
    });
  }, [date, schedule, busy, selectedService, stylistId, anyStylistSlotMap]);

  const canSubmit = !!(store && selectedService && stylistId && selectedSlot && name.trim() && (phone.trim() || email.trim()));

  /** Resolve "__any" to a concrete stylist by looking up the slot map. */
  const resolveStylistForSubmit = (): typeof stylists[number] | null => {
    if (stylistId === "__any") {
      const id = anyStylistSlotMap.get(selectedSlot);
      return id ? stylists.find((s) => s.id === id) ?? null : null;
    }
    return stylists.find((s) => s.id === stylistId) ?? null;
  };

  const handleConfirm = async () => {
    if (!store || !selectedService || !canSubmit) return;
    // Light email check — `type=email` is on the field but this form submits
    // via a button handler, not a `<form>`, so the native validation never
    // fires. A typo here breaks the confirmation email + the View/cancel link.
    const trimmedEmail = email.trim();
    if (trimmedEmail && !/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      toast.error("That email looks malformed. Double-check the address.");
      return;
    }
    setSubmitting(true);
    const stylist = resolveStylistForSubmit();
    const startIso = selectedSlot;
    const endIso = new Date(new Date(startIso).getTime() + selectedService.duration_minutes * 60 * 1000).toISOString();
    const payload = {
      store_id: store.id,
      client_id: null,
      stylist_id: stylist?.id ?? null,
      service_id: selectedService.id,
      service_name: selectedService.name,
      stylist_name: stylist?.display_name ?? null,
      client_name: name.trim(),
      client_phone: phone.trim() || null,
      client_email: email.trim() || null,
      price_cents: selectedService.price_cents,
      duration_minutes: selectedService.duration_minutes,
      start_at: startIso,
      end_at: endIso,
      status: "pending",
      source: "app",
      client_notes: notes.trim() || null,
      // Opt-in flags drive the salon_reminders auto-scheduling trigger on
      // INSERT. The server-side sanitize coalesces missing flags to safe
      // defaults (transactional true, marketing false) so even if a future
      // form drops these the trigger does the right thing.
      sms_opt_in: remindersOptIn,
      email_opt_in: remindersOptIn,
      marketing_opt_in: marketingOptIn,
      // When the submitter is signed in, attribute the booking to them so it
      // appears in /salon/me. The sanitize trigger also uses this to find-or-
      // create the matching salon_clients row. Anon submits keep this NULL
      // (the RLS WITH CHECK enforces "NULL or auth.uid()").
      created_by_user_id: user?.id ?? null,
      // Audit trail of the no-show policy acceptance. Stamped client-side
      // ONLY when both a deposit + no-show fee are configured (i.e., when
      // the disclosure block was rendered to the customer). The sanitize
      // trigger preserves this value; if the salon has no fee configured
      // the trigger clears it (no point storing consent for nothing).
      no_show_fee_consent_at:
        paymentPolicy
        && paymentPolicy.deposit_percent > 0
        && paymentPolicy.no_show_fee_cents > 0
          ? new Date().toISOString()
          : null,
    };
    const { data, error } = await supabase
      .from("salon_bookings").insert(payload as never).select("id, start_at, deposit_cents").single();
    if (error) {
      setSubmitting(false);
      console.error("[PublicSalonBookingPage] insert failed", error);
      if ((error as any).code === "23P01") {
        // 23P01 = exclusion_violation, raised by THREE different sources:
        // the GIST no-overlap (real "just booked" case), the blockout guard,
        // and the store-closure guard. The guards' messages are
        // customer-friendly so pass them through; fall back to the
        // booking-conflict copy for the raw exclusion.
        const msg = (error as { message?: string }).message ?? "";
        if (/closed during/i.test(msg) || /block-off in place/i.test(msg) || /unavailable during/i.test(msg)) {
          toast.error(msg);
        } else {
          toast.error("Sorry — someone just booked that slot. Pick another time.");
        }
        setSelectedSlot("");
      } else {
        toast.error("Couldn't submit your booking. Please try again.");
      }
      return;
    }

    // If the salon requires a deposit (computed server-side by the sanitize
    // trigger), redirect to Stripe Checkout to collect it now. On success
    // Stripe routes the customer back to /booking/<id>?deposit=success and
    // the webhook auto-confirms the booking. If the deposit-create call
    // fails we still show the confirmed state — the customer can pay later
    // via the booking detail page.
    const newBookingId = (data as any).id as string;
    const depositOwed = ((data as any).deposit_cents as number) ?? 0;
    if (depositOwed > 0) {
      try {
        const { data: depositRes, error: depErr } = await supabase.functions.invoke(
          "create-salon-deposit",
          { body: { booking_id: newBookingId } },
        );
        if (depErr) throw depErr;
        const url = (depositRes as any)?.url as string | undefined;
        if (url) {
          window.location.href = url;
          return;
        }
      } catch (e) {
        console.warn("[PublicSalonBookingPage] deposit redirect failed", e);
        toast.error("Booking saved, but the deposit page didn't load. Open the booking link to pay.");
      }
    }
    setSubmitting(false);
    setConfirmed({ id: newBookingId, startAt: (data as any).start_at });
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{loadError}</p>
        </div>
      </div>
    );
  }
  if (!store) return null;

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background">
        <Helmet><title>Booked · {store.name}</title></Helmet>
        <div className="mx-auto max-w-xl px-4 py-12">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-emerald-600" />
            <h1 className="text-xl font-bold text-foreground">You're booked!</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedService?.name} at {store.name}<br />
              {formatDate(confirmed.startAt.slice(0, 10))} · {formatTime(confirmed.startAt)}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <a
                href={`/booking/${confirmed.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/40"
              >
                View or cancel this booking
              </a>
              {/* Logged-in customers get a one-tap link into their portal —
                  much friendlier than asking them to bookmark the magic
                  booking URL. */}
              {user && (
                <a
                  href="/salon/me"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/15"
                >
                  Go to your salon area →
                </a>
              )}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              We'll be in touch to confirm. Booking reference: <span className="font-mono">{confirmed.id.slice(0, 8)}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {user
                ? "This booking is linked to your account — find it any time under your salon area."
                : "Bookmark this link — anyone with it can view or cancel."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Book · {store.name}</title></Helmet>

      {/* Banner */}
      <div className="relative h-40 sm:h-56 w-full bg-gradient-to-br from-primary/15 to-primary/5 overflow-hidden">
        {store.banner_url && (
          <img src={store.banner_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
      </div>

      <div className="mx-auto -mt-10 max-w-3xl px-4 pb-12 sm:px-6">
        {/* Header card */}
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            {store.logo_url ? (
              <img src={store.logo_url} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-border" />
            ) : (
              <div className="grid h-14 w-14 place-items-center rounded-xl bg-primary/10 text-primary"><Store className="h-7 w-7" /></div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-xl font-bold text-foreground">{store.name}</h1>
              {reviewStats.count > 0 && (
                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                  <span className="font-semibold text-foreground">{reviewStats.avg.toFixed(1)}</span>
                  <span>· {reviewStats.count} review{reviewStats.count === 1 ? "" : "s"}</span>
                </p>
              )}
              {store.description && <p className="line-clamp-2 text-xs text-muted-foreground">{store.description}</p>}
              <SalonContactStrip store={store} />
            </div>
          </div>
          {storeHours.some((h) => h.is_open) && <SalonHoursStrip hours={storeHours} />}
          {Array.isArray(store.gallery_images) && store.gallery_images.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Gallery</p>
              <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1">
                {store.gallery_images.map((src, i) => (
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    className="h-28 w-28 shrink-0 rounded-xl object-cover ring-1 ring-border"
                    loading="lazy"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 1: service */}
        <Card className="mb-4 rounded-2xl border-border/60">
          <CardHeader><CardTitle className="text-base">1. Pick a service</CardTitle></CardHeader>
          <CardContent>
            {services.length === 0 ? (
              <p className="text-sm text-muted-foreground">No services available right now.</p>
            ) : (
              <>
                {services.length >= 6 && serviceCategories.length > 1 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {(["all", ...serviceCategories] as const).map((cat) => {
                      const active = serviceCategoryFilter === cat;
                      return (
                        <button
                          type="button"
                          key={cat}
                          onClick={() => setServiceCategoryFilter(cat)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                            active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/75 hover:border-primary/40"
                          )}
                        >
                          {cat === "all" ? "All" : cat}
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                {visibleServices.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => { setServiceId(s.id); setStylistId(""); setSelectedSlot(""); }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                      serviceId === s.id ? "border-primary bg-primary/8" : "border-border hover:border-primary/40"
                    )}
                  >
                    {s.image_url && (
                      <img src={s.image_url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover ring-1 ring-border" loading="lazy" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                      {s.description && <p className="line-clamp-1 text-xs text-muted-foreground">{s.description}</p>}
                      <p className="mt-1 text-[11px] text-muted-foreground inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {s.duration_minutes} min</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-foreground">{formatPrice(s.price_cents)}</p>
                  </button>
                ))}
                </div>
                {visibleServices.length === 0 && (
                  <p className="text-sm text-muted-foreground">No services match this filter.</p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Step 2: stylist */}
        {serviceId && (
          <Card className="mb-4 rounded-2xl border-border/60">
            <CardHeader><CardTitle className="text-base">2. Pick your stylist</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {eligibleStylists.length > 1 && (
                  <button
                    type="button"
                    onClick={() => { setStylistId("__any"); setSelectedSlot(""); }}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      stylistId === "__any" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                    )}
                  >
                    <Sparkles className="h-3.5 w-3.5" /> Any stylist (earliest)
                  </button>
                )}
                {eligibleStylists.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => { setStylistId(s.id); setSelectedSlot(""); }}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      stylistId === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                    )}
                  >
                    <UserCog className="h-3.5 w-3.5" /> {s.display_name}
                    {s.title && <span className="opacity-70">· {s.title}</span>}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: date + time */}
        {stylistId && (
          <Card className="mb-4 rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span>3. Pick a time</span>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day"><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="px-2 text-xs font-medium">{formatDate(date)}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day"><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {slotsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking availability…</div>
              ) : slots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                  {dayClosed
                    ? "The salon is closed on this day. Please pick another date."
                    : schedule.length === 0
                      ? "This stylist's schedule isn't set yet — please pick a different stylist or contact the salon."
                      : "No openings on this day. Try another date."}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {slots.map((iso) => (
                    <button
                      type="button"
                      key={iso}
                      onClick={() => setSelectedSlot(iso)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-sm font-medium transition-colors",
                        selectedSlot === iso ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"
                      )}
                    >
                      {formatTime(iso)}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: client info + confirm */}
        {selectedSlot && (
          <Card className="rounded-2xl border-border/60">
            <CardHeader><CardTitle className="text-base">4. Your info</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pbName">Name *</Label>
                <Input id="pbName" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pbPhone">Phone</Label>
                  <Input id="pbPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pbEmail">Email</Label>
                  <Input id="pbEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pbNotes">Anything for the stylist? (optional)</Label>
                <Textarea id="pbNotes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={1000} />
              </div>
              <p className="text-[11px] text-muted-foreground">We'll use your phone or email to confirm your booking.</p>

              {/* Two checkboxes for explicit opt-in. Transactional reminder
                  defaults to checked (the customer asked for the booking, so
                  basic confirmation/reminder consent is presumed). Marketing
                  defaults to unchecked — TCPA + CAN-SPAM require explicit
                  opt-in before promotional sends. */}
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={remindersOptIn}
                    onChange={(e) => setRemindersOptIn(e.target.checked)}
                  />
                  <span className="text-sm text-foreground">
                    Send me a reminder before my appointment
                    <span className="block text-[11px] text-muted-foreground">By SMS and/or email — you can opt out anytime.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                  />
                  <span className="text-sm text-foreground">
                    Send me occasional offers from {store.name}
                    <span className="block text-[11px] text-muted-foreground">Birthday discounts and win-back offers — optional.</span>
                  </span>
                </label>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</p>
                <p className="mt-1 text-foreground">
                  {selectedService?.name} · {formatDate(date)} · {formatTime(selectedSlot)}
                </p>
                <p className="text-xs text-muted-foreground">
                  with {resolveStylistForSubmit()?.display_name ?? "—"} · {selectedService?.duration_minutes} min · {formatPrice(selectedService?.price_cents ?? 0)}
                </p>
              </div>

              {/* Cancellation policy disclosure — only renders when BOTH a
                  deposit and a no-show fee are configured. The deposit
                  Checkout step is what saves the card off-session; without
                  it, no card is on file and no no-show fee can fire. We
                  capture customer consent here (audit-trail timestamp
                  stamped at submit time) so the off-session charge later
                  isn't a surprise. */}
              {paymentPolicy
                && paymentPolicy.deposit_percent > 0
                && paymentPolicy.no_show_fee_cents > 0 && (
                <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-900/60 dark:bg-amber-950/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    Cancellation policy
                  </p>
                  <p className="mt-1 text-amber-900 dark:text-amber-200">
                    A no-show fee of <strong>{formatPrice(paymentPolicy.no_show_fee_cents)}</strong> will be charged to your card if you don't show up.
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-200/70">
                    By booking, you authorize {store.name} to charge this fee to the card you use for the deposit.
                  </p>
                </div>
              )}

              <Button onClick={handleConfirm} disabled={!canSubmit || submitting} className="w-full gap-1.5">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Request booking
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Your request will be pending until the salon confirms.
              </p>
            </CardContent>
          </Card>
        )}

        {stylists.length > 0 && (
          <Card className="mt-4 rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCog className="h-5 w-5 text-primary" /> Meet the team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {stylists.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border bg-card p-3 text-center">
                    {s.photo_url ? (
                      <img src={s.photo_url} alt="" className="mx-auto h-14 w-14 rounded-full object-cover ring-1 ring-border" loading="lazy" />
                    ) : (
                      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {s.display_name.split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <p className="mt-2 truncate text-sm font-semibold text-foreground">{s.display_name}</p>
                    {s.title && <p className="truncate text-[11px] text-muted-foreground">{s.title}</p>}
                    {s.service_ids.length > 0 && (
                      <p className="mt-1 text-[10px] text-muted-foreground">{s.service_ids.length} service{s.service_ids.length === 1 ? "" : "s"}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {reviews.length > 0 && (
          <Card className="mt-4 rounded-2xl border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="inline-flex items-center gap-2">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
                  {reviewStats.avg.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">· {reviewStats.count} review{reviewStats.count === 1 ? "" : "s"}</span>
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {reviews.slice(0, 5).map((r) => (
                  <li key={r.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-0.5 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${r.rating_stars >= s ? "fill-current" : "fill-none"}`} />
                        ))}
                      </span>
                      <p className="text-sm font-semibold text-foreground">{r.client_name}</p>
                      {r.stylist_name && <p className="text-[11px] text-muted-foreground">· with {r.stylist_name}</p>}
                      <p className="ml-auto text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</p>
                    </div>
                    {r.comment && <p className="mt-1 text-sm text-foreground/85">{r.comment}</p>}
                    {r.owner_response && (
                      <div className="mt-2 rounded-lg border-l-2 border-primary/40 bg-primary/5 px-3 py-1.5 text-xs">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">Salon response</p>
                        <p className="text-foreground/90">{r.owner_response}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {reviews.length > 5 && (
                <p className="mt-3 text-center text-[11px] text-muted-foreground">
                  Showing 5 of {reviews.length}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hhmm = (timeStr: string) => {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
};

function SalonContactStrip({ store }: { store: SalonProfile }) {
  const items: Array<{ key: string; icon: typeof MapPin; href: string; label: string }> = [];
  if (store.address) {
    items.push({ key: "addr", icon: MapPin, href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(store.address)}`, label: store.address });
  }
  if (store.phone) {
    items.push({ key: "phone", icon: Phone, href: `tel:${store.phone}`, label: store.phone });
  }
  if (items.length === 0 && !store.facebook_url && !store.instagram_url && !store.tiktok_url && !store.telegram_url) return null;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
      {items.map(({ key, icon: Icon, href, label }) => (
        <a key={key} href={href} target={key === "addr" ? "_blank" : undefined} rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
          <Icon className="h-3 w-3" /> <span className="truncate max-w-[180px]">{label}</span>
        </a>
      ))}
      <span className="ml-auto inline-flex items-center gap-1.5">
        {store.facebook_url && (
          <a href={store.facebook_url} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <Facebook className="h-3.5 w-3.5" />
          </a>
        )}
        {store.instagram_url && (
          <a href={store.instagram_url} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <Instagram className="h-3.5 w-3.5" />
          </a>
        )}
        {store.tiktok_url && (
          <a href={store.tiktok_url} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="grid h-6 w-6 place-items-center rounded-md text-[10px] font-bold text-muted-foreground hover:bg-muted hover:text-foreground">TT</a>
        )}
        {store.telegram_url && (
          <a href={store.telegram_url} target="_blank" rel="noopener noreferrer" aria-label="Telegram" className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
            <Send className="h-3.5 w-3.5" />
          </a>
        )}
      </span>
    </div>
  );
}

function SalonHoursStrip({ hours }: { hours: { day_of_week: number; is_open: boolean; start: string | null; end: string | null }[] }) {
  const todayDow = new Date().getDay();
  return (
    <div className="mt-4 grid grid-cols-7 gap-1 rounded-xl border border-border bg-muted/20 p-2 text-center">
      {hours.map((h) => {
        const isToday = h.day_of_week === todayDow;
        return (
          <div
            key={h.day_of_week}
            className={cn(
              "rounded-lg p-1.5",
              isToday ? "bg-primary/10 ring-1 ring-primary/30" : "",
              !h.is_open && "opacity-60"
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{DAY_LABELS[h.day_of_week]}</p>
            <p className={cn("mt-0.5 text-[10px]", isToday ? "text-foreground font-semibold" : "text-foreground/85")}>
              {h.is_open && h.start && h.end ? `${hhmm(h.start)}–${hhmm(h.end)}` : "Closed"}
            </p>
          </div>
        );
      })}
    </div>
  );
}
