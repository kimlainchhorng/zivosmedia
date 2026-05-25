/**
 * SalonBookingsSection — day view of bookings with full CRUD + status flow.
 * Built as a chronological list grouped by stylist, with a date stepper.
 * (A grid/timeline view can be layered on later — this gives the workflow first.)
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarRange, Plus, ChevronLeft, ChevronRight, Loader2, AlertCircle,
  CheckCircle2, XCircle, AlarmClockOff, UserCheck, Trash2, Edit,
  Clock, DollarSign, Mail, Phone, User, NotebookText, Package, Star, BadgeCheck, MessageSquare,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useSalonBookings,
  type SalonBooking,
  type SalonBookingStatus,
  type SalonBookingDraft,
} from "@/hooks/salon/useSalonBookings";
import { useSalonServices } from "@/hooks/salon/useSalonServices";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import { useSalonClients } from "@/hooks/salon/useSalonClients";
import { useSalonPaymentSettings } from "@/hooks/salon/useSalonPaymentSettings";
import { useSalonStylistSchedule, describeScheduleConflict } from "@/hooks/salon/useSalonStylistSchedule";
import { supabase } from "@/integrations/supabase/client";
import { consumeBookingPreset } from "@/lib/salon/bookingPreset";
import SalonBookingRetailDialog from "./SalonBookingRetailDialog";
import SalonCheckoutDialog from "./SalonCheckoutDialog";
import SalonBookingsDayGrid from "./SalonBookingsDayGrid";
import SalonBookingsWeekGrid from "./SalonBookingsWeekGrid";
import SalonBlockoutDialog from "./SalonBlockoutDialog";

interface SalonBookingsSectionProps {
  storeId: string;
}

const STATUS_META: Record<SalonBookingStatus, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30" },
  confirmed: { label: "Confirmed", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" },
  completed: { label: "Completed", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" },
  cancelled: { label: "Cancelled", tone: "bg-muted text-muted-foreground border-border" },
  no_show: { label: "No-show", tone: "bg-destructive/15 text-destructive border-destructive/30" },
};

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatTimeRange = (startIso: string, endIso: string) => {
  const f = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${f(new Date(startIso))} – ${f(new Date(endIso))}`;
};
const todayIso = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};
const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};
const friendlyDate = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const today = todayIso();
  const yesterday = shiftDay(today, -1);
  const tomorrow = shiftDay(today, 1);
  if (iso === today) return "Today";
  if (iso === yesterday) return "Yesterday";
  if (iso === tomorrow) return "Tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};
const isoForLocalDateTime = (date: string, time: string) => new Date(`${date}T${time}`).toISOString();
const isoToLocalTime = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

interface DraftState {
  client_id: string | null;
  client_name: string;
  client_phone: string;
  client_email: string;
  service_id: string;
  stylist_id: string;
  date: string;
  time: string;
  client_notes: string;
  internal_notes: string;
  status: SalonBookingStatus;
  addonIds: string[];
  referral_source: string;
}

export default function SalonBookingsSection({ storeId }: SalonBookingsSectionProps) {
  const [date, setDate] = useState(todayIso());
  const { bookings, loading, saving, error, create, update, changeStatus, remove } =
    useSalonBookings({ storeId, date });
  const { services } = useSalonServices(storeId);
  const { stylists } = useSalonStylists(storeId);
  const { clients } = useSalonClients(storeId);
  const { settings: paymentSettings } = useSalonPaymentSettings(storeId);
  // Store display name — surfaced in SMS templates so the message has context.
  const [storeName, setStoreName] = useState("");
  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("store_profiles").select("name").eq("id", storeId).maybeSingle();
      if (!cancelled && data) setStoreName((data as any).name ?? "");
    })();
    return () => { cancelled = true; };
  }, [storeId]);
  // Lazy-loaded; only kicks in when a stylist is picked in the dialog.

  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const primaryServices = useMemo(() => activeServices.filter((s) => s.category !== "Add-on"), [activeServices]);
  const addonServices = useMemo(() => activeServices.filter((s) => s.category === "Add-on"), [activeServices]);
  const activeStylists = useMemo(() => stylists.filter((s) => s.is_active), [stylists]);
  const stylistById = useMemo(() => {
    const m: Record<string, typeof stylists[number]> = {};
    stylists.forEach((s) => { m[s.id] = s; });
    return m;
  }, [stylists]);
  const serviceById = useMemo(() => {
    const m: Record<string, typeof services[number]> = {};
    services.forEach((s) => { m[s.id] = s; });
    return m;
  }, [services]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [waitlistIdToMark, setWaitlistIdToMark] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({
    client_id: null,
    client_name: "",
    client_phone: "",
    client_email: "",
    service_id: "",
    stylist_id: "",
    date,
    time: "10:00",
    client_notes: "",
    internal_notes: "",
    status: "confirmed",
    addonIds: [],
    referral_source: "",
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [retailForBooking, setRetailForBooking] = useState<SalonBooking | null>(null);
  // Recurring bookings: weeks=0 means "don't repeat". When >0, generate
  // `repeatCount` additional occurrences spaced by that many weeks.
  const [repeatWeeks, setRepeatWeeks] = useState<0 | 1 | 2 | 4>(0);
  const [repeatCount, setRepeatCount] = useState(4);
  const [checkoutBooking, setCheckoutBooking] = useState<SalonBooking | null>(null);
  const [blockoutOpen, setBlockoutOpen] = useState(false);
  const [view, setView] = useState<"list" | "day" | "week">("list");
  const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "completed" | "no_show" | "cancelled" | "walk_in" | "app">("all");
  const [allSchedules, setAllSchedules] = useState<{ stylist_id: string; day_of_week: number; is_working: boolean; start_time: string | null; end_time: string | null }[]>([]);
  const [dayBlockouts, setDayBlockouts] = useState<{ id: string; stylist_id: string; start_at: string; end_at: string; reason: string | null }[]>([]);
  const [addonsByBooking, setAddonsByBooking] = useState<Record<string, Array<{ id: string; name: string; price_cents: number; duration_minutes: number; quantity: number }>>>({});

  // Global search across all dates (debounced). Active when ≥2 chars.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SalonBooking[]>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    if (!storeId) return;
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const handle = setTimeout(async () => {
      const like = `%${q.replace(/[%_\\]/g, (m) => "\\" + m)}%`;
      const { data, error: err } = await supabase
        .from("salon_bookings")
        .select("*")
        .eq("store_id", storeId)
        .or(`client_name.ilike.${like},client_phone.ilike.${like},client_email.ilike.${like}`)
        .order("start_at", { ascending: false })
        .limit(50);
      if (err) {
        console.error("[SalonBookings] global search failed", err);
        setSearchResults([]);
      } else {
        setSearchResults((data ?? []) as unknown as SalonBooking[]);
      }
      setSearching(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [searchQuery, storeId]);

  useEffect(() => {
    if (!storeId || bookings.length === 0) { setAddonsByBooking({}); return; }
    let cancelled = false;
    (async () => {
      const ids = bookings.map((b) => b.id);
      const { data, error: err } = await supabase
        .from("salon_booking_addons")
        .select("id, booking_id, name, price_cents, duration_minutes, quantity")
        .in("booking_id", ids);
      if (cancelled || err) return;
      const map: typeof addonsByBooking = {};
      for (const row of (data ?? []) as any[]) {
        (map[row.booking_id] ||= []).push({ id: row.id, name: row.name, price_cents: row.price_cents, duration_minutes: row.duration_minutes, quantity: row.quantity });
      }
      setAddonsByBooking(map);
    })();
    return () => { cancelled = true; };
  }, [storeId, bookings]);

  useEffect(() => {
    if (view !== "day" || !storeId) return;
    let cancelled = false;
    (async () => {
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
      const [schedRes, blockRes] = await Promise.all([
        supabase
          .from("salon_stylist_schedules")
          .select("stylist_id, day_of_week, is_working, start_time, end_time")
          .eq("store_id", storeId),
        supabase
          .from("salon_blockouts")
          .select("id, stylist_id, start_at, end_at, reason")
          .eq("store_id", storeId)
          .lt("start_at", dayEnd)
          .gt("end_at", dayStart),
      ]);
      if (cancelled) return;
      setAllSchedules((schedRes.data ?? []) as any);
      setDayBlockouts((blockRes.data ?? []) as any);
    })();
    return () => { cancelled = true; };
  }, [view, storeId, date]);

  // One-shot: a sibling tab (e.g. Waitlist's "Book now") can drop a preset in
  // sessionStorage; consume it once services/stylists are loaded and pop the
  // dialog with the values pre-filled.
  const [presetConsumed, setPresetConsumed] = useState(false);
  useEffect(() => {
    if (presetConsumed) return;
    if (activeServices.length === 0 && activeStylists.length === 0) return;
    const preset = consumeBookingPreset();
    setPresetConsumed(true);
    if (!preset) return;
    setEditingId(null);
    setWaitlistIdToMark(preset.waitlist_id ?? null);
    setDraft({
      client_id: preset.client_id ?? null,
      client_name: preset.client_name ?? "",
      client_phone: preset.client_phone ?? "",
      client_email: "",
      service_id: preset.service_id ?? activeServices[0]?.id ?? "",
      stylist_id: preset.stylist_id ?? activeStylists[0]?.id ?? "",
      date,
      time: "10:00",
      client_notes: "",
      internal_notes: "",
      status: "confirmed",
      addonIds: [],
    });
    setDialogOpen(true);
    toast.info(
      preset.waitlist_id
        ? "Filled from waitlist — pick a time and Save to book."
        : "Pre-filled from your previous selection.",
    );
  }, [presetConsumed, activeServices, activeStylists, date]);

  const openAdd = () => {
    setEditingId(null);
    setRepeatWeeks(0);
    setRepeatCount(4);
    setDraft({
      client_id: null,
      client_name: "",
      client_phone: "",
      client_email: "",
      service_id: activeServices[0]?.id ?? "",
      stylist_id: activeStylists[0]?.id ?? "",
      date,
      time: "10:00",
      client_notes: "",
      internal_notes: "",
      status: "confirmed",
      addonIds: [],
    });
    setDialogOpen(true);
  };

  const openEdit = (b: SalonBooking) => {
    setEditingId(b.id);
    setDraft({
      client_id: b.client_id,
      client_name: b.client_name,
      client_phone: b.client_phone ?? "",
      client_email: b.client_email ?? "",
      service_id: b.service_id ?? "",
      stylist_id: b.stylist_id ?? "",
      date: b.start_at.slice(0, 10),
      time: isoToLocalTime(b.start_at),
      client_notes: b.client_notes ?? "",
      internal_notes: b.internal_notes ?? "",
      status: b.status,
      addonIds: [],
      referral_source: b.referral_source ?? "",
    });
    setDialogOpen(true);
  };

  const pickClient = (clientId: string) => {
    if (!clientId) {
      setDraft((d) => ({ ...d, client_id: null }));
      return;
    }
    const c = clients.find((x) => x.id === clientId);
    if (!c) return;
    setDraft((d) => ({
      ...d,
      client_id: c.id,
      client_name: c.display_name,
      client_phone: c.phone ?? "",
      client_email: c.email ?? "",
    }));
  };

  // Stylists filtered to those who can perform the selected service.
  const eligibleStylists = useMemo(() => {
    if (!draft.service_id) return activeStylists;
    const eligible = activeStylists.filter((s) => s.service_ids.includes(draft.service_id));
    return eligible.length > 0 ? eligible : activeStylists;
  }, [activeStylists, draft.service_id]);

  // Schedule lookup for the stylist currently picked in the dialog.
  const { schedule: stylistSchedule } = useSalonStylistSchedule(dialogOpen ? draft.stylist_id : null);
  const scheduleWarning = useMemo(() => {
    if (!dialogOpen || !draft.stylist_id || !draft.date || !draft.time || !draft.service_id) return null;
    const svc = serviceById[draft.service_id];
    if (!svc) return null;
    return describeScheduleConflict(stylistSchedule, draft.date, draft.time, svc.duration_minutes);
  }, [dialogOpen, draft.stylist_id, draft.date, draft.time, draft.service_id, stylistSchedule, serviceById]);

  const handleSave = async () => {
    const svc = serviceById[draft.service_id];
    if (!svc) {
      toast.error("Pick a service.");
      return;
    }
    if (!draft.client_name.trim()) {
      toast.error("Client name is required.");
      return;
    }
    if (!draft.date || !draft.time) {
      toast.error("Pick a date and time.");
      return;
    }
    const startIso = isoForLocalDateTime(draft.date, draft.time);
    const stylist = draft.stylist_id ? stylistById[draft.stylist_id] : null;

    if (editingId) {
      await update(editingId, {
        client_id: draft.client_id,
        client_name: draft.client_name,
        client_phone: draft.client_phone || null,
        client_email: draft.client_email || null,
        service_id: svc.id,
        service_name: svc.name,
        stylist_id: stylist?.id ?? null,
        stylist_name: stylist?.display_name ?? null,
        price_cents: svc.price_cents,
        duration_minutes: svc.duration_minutes,
        start_at: startIso,
        status: draft.status,
        client_notes: draft.client_notes || null,
        internal_notes: draft.internal_notes || null,
        referral_source: draft.referral_source || null,
      });
      // Snap calendar to the new date if changed
      if (draft.date !== date) setDate(draft.date);
      toast.success("Booking updated.");
    } else {
      const created = await create({
        client_id: draft.client_id,
        client_name: draft.client_name,
        client_phone: draft.client_phone || null,
        client_email: draft.client_email || null,
        service_id: svc.id,
        service_name: svc.name,
        stylist_id: stylist?.id ?? null,
        stylist_name: stylist?.display_name ?? null,
        price_cents: svc.price_cents,
        duration_minutes: svc.duration_minutes,
        start_at: startIso,
        status: draft.status,
        source: "admin",
        client_notes: draft.client_notes || null,
        internal_notes: draft.internal_notes || null,
        referral_source: draft.referral_source || null,
      });
      if (created) {
        // Attach selected add-ons (trigger updates booking total + duration).
        if (draft.addonIds.length > 0) {
          const rows = draft.addonIds
            .map((id) => serviceById[id])
            .filter((a): a is NonNullable<typeof a> => Boolean(a))
            .map((a) => ({
              booking_id: created.id,
              store_id: storeId,
              service_id: a.id,
              name: a.name,
              price_cents: a.price_cents,
              duration_minutes: a.duration_minutes,
              quantity: 1,
            }));
          if (rows.length > 0) {
            const { error: addonErr } = await supabase.from("salon_booking_addons").insert(rows as never);
            if (addonErr) toast.error(`Couldn't attach add-ons: ${addonErr.message}`);
          }
        }
        if (draft.date !== date) setDate(draft.date);
        toast.success("Booking added.");
        // Recurring follow-ups: create N more occurrences at the same time,
        // spaced by `repeatWeeks` weeks. Skip any that conflict (the GIST
        // exclusion catches them) and report counts in the toast.
        if (repeatWeeks > 0 && repeatCount > 0) {
          let okCount = 0;
          let skipCount = 0;
          for (let i = 1; i <= repeatCount; i++) {
            const occStart = new Date(startIso);
            occStart.setDate(occStart.getDate() + repeatWeeks * 7 * i);
            const r = await create({
              client_id: draft.client_id,
              client_name: draft.client_name,
              client_phone: draft.client_phone || null,
              client_email: draft.client_email || null,
              service_id: svc.id,
              service_name: svc.name,
              stylist_id: stylist?.id ?? null,
              stylist_name: stylist?.display_name ?? null,
              price_cents: svc.price_cents,
              duration_minutes: svc.duration_minutes,
              start_at: occStart.toISOString(),
              status: "confirmed",
              source: "admin",
              client_notes: null,
              internal_notes: null,
            });
            if (r) okCount++; else skipCount++;
          }
          if (okCount > 0) toast.success(`+${okCount} future visit${okCount === 1 ? "" : "s"} scheduled${skipCount > 0 ? ` (${skipCount} skipped due to conflicts)` : ""}.`);
          else if (skipCount > 0) toast.warning(`Couldn't add the future visits — all ${skipCount} slots conflict with existing bookings.`);
        }
      } else {
        // create() sets error state; keep dialog open so they can fix the slot
        return;
      }
    }
    // Save came from a waitlist promotion — mark the waitlist row as booked.
    if (waitlistIdToMark) {
      const { error: wErr } = await supabase
        .from("salon_waitlist")
        .update({ status: "booked" } as never)
        .eq("id", waitlistIdToMark);
      if (wErr) console.error("[SalonBookings] waitlist mark failed", wErr);
      setWaitlistIdToMark(null);
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await remove(confirmDeleteId);
    setConfirmDeleteId(null);
    toast.success("Booking removed.");
  };

  const handleStatus = async (b: SalonBooking, status: SalonBookingStatus) => {
    const opts: Parameters<typeof changeStatus>[2] = {};
    if (status === "no_show" && paymentSettings.no_show_fee_cents > 0) {
      opts.noShowFeeCents = paymentSettings.no_show_fee_cents;
    }
    await changeStatus(b.id, status, opts);
    toast.success(`Marked ${STATUS_META[status].label.toLowerCase()}.`);
  };

  /** Build a mailto URL with booking details pre-filled. */
  const buildBookingMailto = (b: SalonBooking): string | null => {
    if (!b.client_email) return null;
    const when = new Date(b.start_at).toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
    const subject = b.status === "cancelled"
      ? `Your booking was cancelled`
      : b.status === "confirmed" || b.status === "pending"
      ? `Your appointment is ${b.status === "confirmed" ? "confirmed" : "received"}`
      : `Your visit at ${b.service_name}`;
    const lines = [
      `Hi ${b.client_name.split(/\s+/)[0]},`,
      "",
      b.status === "cancelled"
        ? `Sorry — your ${b.service_name} on ${when} has been cancelled. Reach out if you'd like to reschedule.`
        : b.status === "completed"
        ? `Thanks for visiting! We hope you loved your ${b.service_name}.`
        : `Your ${b.service_name}${b.stylist_name ? ` with ${b.stylist_name}` : ""} is set for ${when}.`,
      "",
      `Booking reference: #${b.id.slice(0, 8).toUpperCase()}`,
      `View or cancel: ${typeof window !== "undefined" ? window.location.origin : ""}/booking/${b.id}`,
    ].join("\n");
    return `mailto:${encodeURIComponent(b.client_email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
  };

  /** Clone a completed booking N weeks ahead at the same time. */
  const rebookIn = async (b: SalonBooking, weeks: number) => {
    const start = new Date(b.start_at);
    start.setDate(start.getDate() + 7 * weeks);
    const created = await create({
      client_id: b.client_id,
      client_name: b.client_name,
      client_phone: b.client_phone,
      client_email: b.client_email,
      service_id: b.service_id,
      service_name: b.service_name,
      stylist_id: b.stylist_id,
      stylist_name: b.stylist_name,
      price_cents: b.price_cents,
      duration_minutes: b.duration_minutes,
      start_at: start.toISOString(),
      status: "confirmed",
      source: "admin",
      client_notes: null,
      internal_notes: null,
    });
    if (created) {
      toast.success(`Rebooked ${b.client_name} for ${start.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`);
    }
    // create() surfaces its own conflict error via the section's error banner.
  };

  // Filter bookings before grouping (so list/day/week views all see the filtered set).
  const visibleBookings = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "walk_in" || filter === "app") return bookings.filter((b) => b.source === filter);
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  const filterCounts = useMemo(() => ({
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    no_show: bookings.filter((b) => b.status === "no_show").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
    walk_in: bookings.filter((b) => b.source === "walk_in").length,
    app: bookings.filter((b) => b.source === "app").length,
  }), [bookings]);

  // Group bookings by stylist for display.
  const grouped = useMemo(() => {
    const map = new Map<string, { stylistName: string; rows: SalonBooking[] }>();
    visibleBookings.forEach((b) => {
      const key = b.stylist_id ?? "_unassigned";
      const name = b.stylist_name ?? "Unassigned";
      if (!map.has(key)) map.set(key, { stylistName: name, rows: [] });
      map.get(key)!.rows.push(b);
    });
    return Array.from(map.entries()).sort(([, a], [, b]) => a.stylistName.localeCompare(b.stylistName));
  }, [visibleBookings]);

  const noActiveSetup = activeServices.length === 0 || activeStylists.length === 0;

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-5 w-5 text-primary" />
              Bookings
              {bookings.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {bookings.length}
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline" className="gap-1.5" asChild
              >
                <a href={`/admin/salon-queue/${storeId}`} target="_blank" rel="noopener" title="Open the live front-desk queue display on a separate screen or tablet">
                  Queue display
                </a>
              </Button>
              <Button
                size="sm" variant="outline" className="gap-1.5" asChild
              >
                <a href={`/admin/salon-schedule/${storeId}/${date}?print=1`} target="_blank" rel="noopener" title="Open the day's schedule in a print-ready view">
                  Print schedule
                </a>
              </Button>
              <Button
                size="sm" variant="outline" className="gap-1.5" asChild
              >
                <a href={`/admin/salon-summary/${storeId}/${date}`} target="_blank" rel="noopener" title="Open the printable end-of-day summary with totals and per-stylist breakdown">
                  Day summary
                </a>
              </Button>
              <Button onClick={() => setBlockoutOpen(true)} size="sm" variant="outline" className="gap-1.5" disabled={noActiveSetup}>
                Block-off
              </Button>
              <Button onClick={openAdd} size="sm" className="gap-1.5" disabled={noActiveSetup}>
                <Plus className="h-4 w-4" /> New booking
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDate(shiftDay(date, -1))} aria-label="Previous day">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || todayIso())}
              className="h-9 w-auto"
            />
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => setDate(shiftDay(date, 1))} aria-label="Next day">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9" onClick={() => setDate(todayIso())}>
              Today
            </Button>
            <span className="ml-2 text-sm font-semibold text-foreground">{friendlyDate(date)}</span>
            <div className="ml-auto inline-flex rounded-md border border-border bg-card p-0.5 text-xs">
              <button type="button" onClick={() => setView("list")}
                className={cn("rounded px-2.5 py-1 transition-colors", view === "list" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted")}
              >List</button>
              <button type="button" onClick={() => setView("day")}
                className={cn("rounded px-2.5 py-1 transition-colors", view === "day" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted")}
              >Day grid</button>
              <button type="button" onClick={() => setView("week")}
                className={cn("rounded px-2.5 py-1 transition-colors", view === "week" ? "bg-primary text-primary-foreground" : "text-foreground/70 hover:bg-muted")}
              >Week</button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search every booking — name, phone, email"
              className="pr-20"
            />
            {searchQuery.trim().length > 0 && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                clear
              </button>
            )}
          </div>

          {searchQuery.trim().length >= 2 && (
            <div className="rounded-xl border border-border">
              <div className="border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {searching ? "Searching…" : `${searchResults.length} match${searchResults.length === 1 ? "" : "es"} across all dates`}
              </div>
              {searchResults.length === 0 && !searching ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No bookings match "{searchQuery.trim()}".
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {searchResults.map((b) => {
                    const status = STATUS_META[b.status];
                    const when = new Date(b.start_at);
                    return (
                      <li key={b.id} className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">{b.client_name}</p>
                            <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", status.tone)}>
                              {status.label}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {b.service_name}{b.stylist_name ? ` · ${b.stylist_name}` : ""}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {when.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                            {" · "}
                            {when.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            size="sm" variant="outline" className="h-7"
                            onClick={() => { setDate(b.start_at.slice(0, 10)); setSearchQuery(""); }}
                          >
                            Jump to day
                          </Button>
                          <Button
                            size="sm" variant="ghost" className="h-7 gap-1.5"
                            onClick={() => { openEdit(b); setSearchQuery(""); }}
                          >
                            <Edit className="h-3.5 w-3.5" /> Open
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {searchQuery.trim().length < 2 && view !== "week" && bookings.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "confirmed", label: "Confirmed" },
                { id: "completed", label: "Completed" },
                { id: "no_show", label: "No-show" },
                { id: "cancelled", label: "Cancelled" },
                { id: "walk_in", label: "Walk-in" },
                { id: "app", label: "Public" },
              ].map((f) => {
                const count = filterCounts[f.id as keyof typeof filterCounts];
                if (f.id !== "all" && count === 0) return null;
                const active = filter === f.id;
                return (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => setFilter(f.id as typeof filter)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/75 hover:border-primary/40"
                    )}
                  >
                    {f.label} <span className="opacity-70">{count}</span>
                  </button>
                );
              })}
            </div>
          )}
          {noActiveSetup && (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/8 p-3 text-xs text-amber-700 dark:text-amber-300">
              Add at least one active service and stylist before you can book appointments.
            </div>
          )}

          {searchQuery.trim().length >= 2 ? null : loading && view !== "week" ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading bookings…
            </div>
          ) : view !== "week" && bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <CalendarRange className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No bookings on {friendlyDate(date).toLowerCase()}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add an appointment, or pick another date.
              </p>
              {!noActiveSetup && (
                <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5">
                  <Plus className="h-4 w-4" /> New booking
                </Button>
              )}
            </div>
          ) : view !== "week" && visibleBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No bookings match this filter.{" "}
              <button type="button" onClick={() => setFilter("all")} className="font-semibold text-primary hover:underline">Show all</button>
            </div>
          ) : view === "week" ? (
            <SalonBookingsWeekGrid
              storeId={storeId}
              date={date}
              onJumpToDay={(iso) => { setDate(iso); setView("day"); }}
              onClickBooking={(b) => openEdit(b)}
            />
          ) : view === "day" ? (
            <SalonBookingsDayGrid
              date={date}
              bookings={visibleBookings}
              stylists={stylists}
              schedules={allSchedules}
              blockouts={dayBlockouts}
              onClickBooking={(b) => openEdit(b)}
              onClickEmptySlot={({ stylistId, time }) => {
                setEditingId(null);
                setDraft({
                  client_id: null,
                  client_name: "",
                  client_phone: "",
                  client_email: "",
                  service_id: activeServices[0]?.id ?? "",
                  stylist_id: stylistId || activeStylists[0]?.id || "",
                  date,
                  time,
                  client_notes: "",
                  internal_notes: "",
                  status: "confirmed",
                  addonIds: [],
                  referral_source: "",
                });
                setDialogOpen(true);
              }}
            />
          ) : (
            <div className="space-y-5">
              {grouped.map(([key, { stylistName, rows }]) => (
                <div key={key}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {stylistName}
                  </p>
                  <div className="divide-y divide-border rounded-xl border border-border">
                    {rows.map((b) => {
                      const status = STATUS_META[b.status];
                      const isPastOrDone = b.status === "completed" || b.status === "cancelled" || b.status === "no_show";
                      return (
                        <div key={b.id} className={cn("p-3", isPastOrDone && "bg-muted/20")}>
                          <div className="flex items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-foreground">{b.client_name}</p>
                                <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider", status.tone)}>
                                  {status.label}
                                </span>
                              </div>
                              <p className="mt-0.5 text-sm text-foreground/85">{b.service_name}</p>
                              {(addonsByBooking[b.id] ?? []).length > 0 && (
                                <ul className="mt-1 flex flex-wrap gap-1.5">
                                  {(addonsByBooking[b.id] ?? []).map((a) => (
                                    <li
                                      key={a.id}
                                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary"
                                      title={`+${formatPrice(a.price_cents)}`}
                                    >
                                      + {a.name}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTimeRange(b.start_at, b.end_at)}</span>
                                <span className="inline-flex items-center gap-1 font-semibold text-foreground"><DollarSign className="h-3 w-3" /> {formatPrice(b.price_cents).slice(1)}</span>
                                {b.client_phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {b.client_phone}</span>}
                                {b.client_email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {b.client_email}</span>}
                              </div>
                              {b.client_notes && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  <NotebookText className="-mt-0.5 mr-1 inline h-3 w-3" /> {b.client_notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {b.status === "pending" && (
                              <Button size="sm" variant="outline" className="h-7 gap-1.5 text-sky-700" onClick={() => handleStatus(b, "confirmed")} disabled={saving}>
                                <UserCheck className="h-3.5 w-3.5" /> Confirm
                              </Button>
                            )}
                            {(b.status === "pending" || b.status === "confirmed") && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-emerald-700" onClick={() => setCheckoutBooking(b)} disabled={saving}>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Complete
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 gap-1.5 text-destructive" onClick={() => handleStatus(b, "no_show")} disabled={saving}>
                                  <AlarmClockOff className="h-3.5 w-3.5" /> No-show
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => handleStatus(b, "cancelled")} disabled={saving}>
                                  <XCircle className="h-3.5 w-3.5" /> Cancel
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={() => setRetailForBooking(b)} disabled={saving}>
                              <Package className="h-3.5 w-3.5" /> Retail
                            </Button>
                            <DepositControl
                              booking={b}
                              depositPercent={paymentSettings?.deposit_percent ?? 0}
                              onRecord={async (cents) => {
                                await update(b.id, { deposit_paid_cents: cents, deposit_paid_at: cents > 0 ? new Date().toISOString() : null });
                                toast.success(cents > 0 ? `Recorded ${formatPrice(cents)} deposit.` : "Deposit cleared.");
                              }}
                              saving={saving}
                            />
                            {b.client_email && (
                              <Button size="sm" variant="ghost" className="h-7 gap-1.5" asChild>
                                <a href={buildBookingMailto(b) ?? "#"} title={`Email ${b.client_email}`}>
                                  <Mail className="h-3.5 w-3.5" /> Email
                                </a>
                              </Button>
                            )}
                            {b.client_phone && (
                              <MessageButton booking={b} storeName={storeName} />
                            )}
                            {b.status === "completed" && (
                              <>
                                <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={() => rebookIn(b, 2)} disabled={saving}>
                                  <CalendarRange className="h-3.5 w-3.5" /> Rebook 2w
                                </Button>
                                <Button
                                  size="sm" variant="outline" className="h-7 gap-1.5"
                                  onClick={async () => {
                                    const url = `${window.location.origin}/review/${b.id}`;
                                    try {
                                      await navigator.clipboard.writeText(url);
                                      toast.success("Review link copied — text it to your client.");
                                    } catch {
                                      toast.info(url);
                                    }
                                  }}
                                  title="Copy a link the client can use to leave a review"
                                >
                                  <Star className="h-3.5 w-3.5" /> Review link
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={() => openEdit(b)} disabled={saving}>
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-destructive hover:text-destructive" onClick={() => setConfirmDeleteId(b.id)} disabled={saving}>
                              <Trash2 className="h-3.5 w-3.5" /> Delete
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit booking" : "New booking"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="bkClient">Existing client</Label>
              <select
                id="bkClient"
                value={draft.client_id ?? ""}
                onChange={(e) => pickClient(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">— New / walk-in client —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} disabled={c.is_blocked}>
                    {c.display_name}{c.phone ? ` · ${c.phone}` : ""}{c.is_blocked ? " · BLOCKED" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bkName">Name *</Label>
                <Input
                  id="bkName"
                  value={draft.client_name}
                  onChange={(e) => setDraft({ ...draft, client_name: e.target.value, client_id: null })}
                  placeholder="Client name"
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bkPhone">Phone</Label>
                <Input
                  id="bkPhone"
                  type="tel"
                  value={draft.client_phone}
                  onChange={(e) => setDraft({ ...draft, client_phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bkService">Service *</Label>
              <select
                id="bkService"
                value={draft.service_id}
                onChange={(e) => setDraft({ ...draft, service_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pick a service…</option>
                {primaryServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.duration_minutes} min · {formatPrice(s.price_cents)}
                  </option>
                ))}
              </select>
            </div>

            {!editingId && addonServices.length > 0 && (
              <div className="space-y-1.5">
                <Label>Add-ons</Label>
                <div className="space-y-1 rounded-md border border-input bg-background p-2">
                  {addonServices.map((a) => {
                    const checked = draft.addonIds.includes(a.id);
                    return (
                      <label key={a.id} className="flex cursor-pointer items-center justify-between gap-3 rounded px-2 py-1.5 text-sm hover:bg-muted/40">
                        <span className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              setDraft((d) => ({
                                ...d,
                                addonIds: e.target.checked
                                  ? [...d.addonIds, a.id]
                                  : d.addonIds.filter((id) => id !== a.id),
                              }));
                            }}
                            className="h-4 w-4"
                          />
                          <span>{a.name}</span>
                          {a.duration_minutes > 0 && (
                            <span className="text-[11px] text-muted-foreground">+{a.duration_minutes} min</span>
                          )}
                        </span>
                        <span className="text-xs font-semibold text-foreground">+{formatPrice(a.price_cents)}</span>
                      </label>
                    );
                  })}
                </div>
                {draft.addonIds.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    {draft.addonIds.length} add-on{draft.addonIds.length === 1 ? "" : "s"} · +{formatPrice(
                      draft.addonIds.reduce((sum, id) => sum + (serviceById[id]?.price_cents ?? 0), 0)
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bkStylist">Stylist</Label>
              <select
                id="bkStylist"
                value={draft.stylist_id}
                onChange={(e) => setDraft({ ...draft, stylist_id: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {eligibleStylists.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
              {draft.service_id && eligibleStylists.length < activeStylists.length && (
                <p className="text-xs text-muted-foreground">
                  Showing only stylists who can perform this service.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="bkDate">Date *</Label>
                <Input
                  id="bkDate"
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bkTime">Start time *</Label>
                <Input
                  id="bkTime"
                  type="time"
                  step={300}
                  value={draft.time}
                  onChange={(e) => setDraft({ ...draft, time: e.target.value })}
                />
              </div>
            </div>

            {scheduleWarning && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/8 p-2 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Outside working hours: {scheduleWarning} Save anyway, or pick another time.</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="bkStatus">Status</Label>
              <select
                id="bkStatus"
                value={draft.status}
                onChange={(e) => setDraft({ ...draft, status: e.target.value as SalonBookingStatus })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No-show</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bkClientNotes">Client notes</Label>
              <Textarea
                id="bkClientNotes"
                value={draft.client_notes}
                onChange={(e) => setDraft({ ...draft, client_notes: e.target.value })}
                placeholder="Anything the client mentioned…"
                rows={2}
                maxLength={1000}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bkInternalNotes">Stylist notes — formula, products, observations</Label>
              <Textarea
                id="bkInternalNotes"
                value={draft.internal_notes}
                onChange={(e) => setDraft({ ...draft, internal_notes: e.target.value })}
                placeholder="e.g. Color: 20g 6N + 10g 7G + 30vol developer, 30 min · used Olaplex No.2 · loved the result"
                rows={3}
                maxLength={1000}
              />
              <p className="text-[11px] text-muted-foreground">
                Visible to the team only. Pulls up on the client's next visit so anyone can replicate the work.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bkReferral">How did they hear about you?</Label>
              <input
                id="bkReferral"
                list="bk-referral-list"
                value={draft.referral_source}
                onChange={(e) => setDraft({ ...draft, referral_source: e.target.value })}
                placeholder="Google, Instagram, walk-by, friend, etc. (optional)"
                maxLength={60}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <datalist id="bk-referral-list">
                {["Google", "Instagram", "Facebook", "Walk-by", "Friend", "Yelp", "Past client", "Other"].map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </div>

            {!editingId && (
              <div className="space-y-1.5">
                <Label htmlFor="bkRepeat">Repeat</Label>
                <div className="flex flex-wrap gap-1.5">
                  {([
                    { v: 0 as const, label: "Don't repeat" },
                    { v: 1 as const, label: "Weekly" },
                    { v: 2 as const, label: "Every 2 weeks" },
                    { v: 4 as const, label: "Every 4 weeks" },
                  ]).map((o) => (
                    <button
                      type="button"
                      key={o.v}
                      onClick={() => setRepeatWeeks(o.v)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        repeatWeeks === o.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground/75 hover:border-primary/40"
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                {repeatWeeks > 0 && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                    <span>Create</span>
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={repeatCount}
                      onChange={(e) => setRepeatCount(Math.max(1, Math.min(12, parseInt(e.target.value, 10) || 1)))}
                      className="h-7 w-16"
                    />
                    <span>future visit{repeatCount === 1 ? "" : "s"} at the same time. Conflicting slots are skipped.</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Add booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SalonBookingRetailDialog
        storeId={storeId}
        bookingId={retailForBooking?.id ?? null}
        bookingClientName={retailForBooking?.client_name}
        bookingStatus={retailForBooking?.status}
        onClose={() => setRetailForBooking(null)}
      />

      <SalonCheckoutDialog
        storeId={storeId}
        booking={checkoutBooking}
        onClose={() => setCheckoutBooking(null)}
        onCompleted={() => { setCheckoutBooking(null); }}
      />

      <SalonBlockoutDialog
        storeId={storeId}
        open={blockoutOpen}
        defaultDate={date}
        onClose={() => setBlockoutOpen(false)}
        onChanged={async () => {
          if (view !== "day") return;
          const dayStart = new Date(`${date}T00:00:00`).toISOString();
          const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
          const { data } = await supabase
            .from("salon_blockouts")
            .select("id, stylist_id, start_at, end_at, reason")
            .eq("store_id", storeId)
            .lt("start_at", dayEnd)
            .gt("end_at", dayStart);
          setDayBlockouts((data ?? []) as any);
        }}
      />

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the record. To keep history, cancel the booking instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Compact inline control: shows the deposit on file if any, otherwise a
 * "Record deposit" button that pre-fills the recommended amount from the
 * store's deposit_percent. */
function DepositControl({
  booking,
  depositPercent,
  onRecord,
  saving,
}: {
  booking: SalonBooking;
  depositPercent: number;
  onRecord: (cents: number) => Promise<void>;
  saving: boolean;
}) {
  const recommended = Math.round((booking.price_cents * (depositPercent || 0)) / 100);
  if (booking.deposit_paid_cents > 0) {
    return (
      <Button
        size="sm" variant="ghost"
        className="h-7 gap-1.5 text-emerald-700 dark:text-emerald-300"
        disabled={saving}
        title={`$${(booking.deposit_paid_cents / 100).toFixed(2)} deposit on file — click to clear`}
        onClick={() => {
          if (confirm(`Clear the $${(booking.deposit_paid_cents / 100).toFixed(2)} deposit on file?`)) {
            void onRecord(0);
          }
        }}
      >
        <BadgeCheck className="h-3.5 w-3.5" /> ${(booking.deposit_paid_cents / 100).toFixed(2)} deposit
      </Button>
    );
  }
  if (booking.status === "cancelled" || booking.status === "no_show") return null;
  const placeholder = recommended > 0 ? (recommended / 100).toFixed(2) : (booking.price_cents / 100 / 4).toFixed(2);
  return (
    <Button
      size="sm" variant="outline" className="h-7 gap-1.5"
      disabled={saving}
      onClick={() => {
        const prompt = depositPercent > 0
          ? `Deposit amount (recommended ${depositPercent}% = $${(recommended / 100).toFixed(2)}):`
          : "Deposit amount in dollars:";
        const raw = window.prompt(prompt, placeholder);
        if (raw === null) return;
        const dollars = parseFloat(raw);
        if (!Number.isFinite(dollars) || dollars <= 0) {
          alert("Enter a positive amount.");
          return;
        }
        const cents = Math.round(dollars * 100);
        if (cents > booking.price_cents) {
          if (!confirm(`That's more than the booking total ($${(booking.price_cents / 100).toFixed(2)}). Record it anyway?`)) return;
        }
        void onRecord(cents);
      }}
    >
      <DollarSign className="h-3.5 w-3.5" /> Record deposit
    </Button>
  );
}

/** SMS template picker: builds the message body locally, opens an sms: link
 * so the owner's native messaging app takes over, and also offers a Copy
 * fallback for desktops without an SMS handler. */
function MessageButton({ booking, storeName }: { booking: SalonBooking; storeName: string }) {
  const [open, setOpen] = useState(false);
  if (!booking.client_phone) return null;

  const startDate = new Date(booking.start_at);
  const dateStr = startDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const timeStr = startDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const first = (booking.client_name.split(" ")[0] || booking.client_name).trim();
  const stylistFrag = booking.stylist_name ? ` with ${booking.stylist_name}` : "";
  const storeFrag = storeName ? ` at ${storeName}` : "";

  const templates: { label: string; body: string }[] = [];
  if (booking.status === "pending" || booking.status === "confirmed") {
    templates.push({
      label: "Confirm appointment",
      body: `Hi ${first}, confirming your ${booking.service_name}${storeFrag} on ${dateStr} at ${timeStr}${stylistFrag}. See you then!`,
    });
    templates.push({
      label: "Reminder (day before)",
      body: `Hi ${first}, just a friendly reminder about your ${booking.service_name} tomorrow at ${timeStr}${storeFrag}. Reply to reschedule if needed.`,
    });
    templates.push({
      label: "We're running late",
      body: `Hi ${first}, sorry — we're running about 10–15 minutes behind for your ${timeStr} appointment. Thanks for your patience.`,
    });
  } else if (booking.status === "completed") {
    templates.push({
      label: "Thank you",
      body: `Hi ${first}, thanks so much for visiting ${storeName || "us"} today! Hope you love your ${booking.service_name}. Would mean the world if you left us a quick review.`,
    });
    templates.push({
      label: "Ask for a review",
      body: `Hi ${first}, hope you're loving your ${booking.service_name}! If you have a sec, would you mind leaving us a quick review? Means a lot. — ${storeName || "the team"}`,
    });
    templates.push({
      label: "Book next visit",
      body: `Hi ${first}, time for your next ${booking.service_name}? Tap the link to book — same stylist if you'd like. — ${storeName || "the team"}`,
    });
  } else if (booking.status === "no_show") {
    templates.push({
      label: "Missed appointment",
      body: `Hi ${first}, we missed you${storeFrag} on ${dateStr}. No worries — reply if you'd like to rebook.`,
    });
  } else {
    templates.push({
      label: "We miss you",
      body: `Hi ${first}, it's been a while since your last visit${storeFrag}. We'd love to see you again — reply if you'd like to book.`,
    });
  }

  const phoneDigits = booking.client_phone.replace(/[^\d+]/g, "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Message
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Pick a template
          </p>
          <p className="text-[11px] text-muted-foreground">
            Opens your phone's messaging app prefilled. Click <strong>Copy</strong> if it doesn't.
          </p>
          <ul className="space-y-2">
            {templates.map((t) => (
              <li key={t.label} className="rounded-md border border-border bg-card p-2">
                <p className="text-xs font-semibold text-foreground">{t.label}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-muted-foreground">{t.body}</p>
                <div className="mt-1.5 flex gap-1.5">
                  <Button
                    size="sm" variant="outline" className="h-7 flex-1 gap-1.5" asChild
                    onClick={() => setOpen(false)}
                  >
                    <a href={`sms:${phoneDigits}?body=${encodeURIComponent(t.body)}`}>
                      <MessageSquare className="h-3.5 w-3.5" /> Send
                    </a>
                  </Button>
                  <Button
                    size="sm" variant="ghost" className="h-7"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(t.body);
                        toast.success("Message copied.");
                        setOpen(false);
                      } catch {
                        toast.info(t.body);
                      }
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}
