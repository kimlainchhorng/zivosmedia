/**
 * Per-stylist day view at /stylist/:stylistId. Owner texts the URL to each
 * stylist; they bookmark it on their phone and see today's appointments
 * (with client phone + service notes / formulas) at a glance. No auth — the
 * stylist UUID is the unguessable token. Read-only.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Loader2, AlertCircle, Phone, Clock, NotebookPen,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  BadgeDollarSign, ShieldCheck, ArrowRight,
  Play, Square, Pencil, Save, FlaskConical, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { cn } from "@/lib/utils";

interface StylistMeta {
  id: string;
  display_name: string;
  store_id: string;
  store_name: string;
  store_slug: string;
}

type ConnectStatusValue = "not_connected" | "pending" | "active" | "restricted";
interface ConnectStatus {
  status: ConnectStatusValue;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
}

interface DayRow {
  id: string;
  store_id: string;
  store_name: string;
  stylist_id: string;
  stylist_name: string;
  client_name: string;
  client_phone: string | null;
  service_name: string;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  status: string;
  internal_notes: string | null;
}

const STATUS_META: Record<string, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  pending: { label: "Pending", tone: "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300", Icon: Clock },
  confirmed: { label: "Confirmed", tone: "border-sky-500/30 bg-sky-500/8 text-sky-700 dark:text-sky-300", Icon: Clock },
  completed: { label: "Done", tone: "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300", Icon: CheckCircle2 },
  no_show: { label: "No show", tone: "border-destructive/30 bg-destructive/8 text-destructive", Icon: XCircle },
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const shiftDay = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const formatDay = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
};

export default function PublicStylistDayPage() {
  const { stylistId = "" } = useParams<{ stylistId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [meta, setMeta] = useState<StylistMeta | null>(null);
  const [rows, setRows] = useState<DayRow[]>([]);
  const [date, setDate] = useState(todayIso());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  // Time-clock state. `openShift` is null when clocked out; loaded once on
  // mount and updated optimistically after clock in/out actions.
  const [openShift, setOpenShift] = useState<{ id: string; start_at: string } | null>(null);
  const [clockBusy, setClockBusy] = useState(false);
  // Ticker — re-render every minute so the elapsed display updates without
  // hammering the DB. The actual elapsed value is computed from openShift
  // at render time; this state just forces the re-render.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!openShift) return;
    const id = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, [openShift]);

  // Per-booking notes-editor state. Map of bookingId → { open, draft }. Only
  // the row whose `open=true` shows the editor; closing keeps the unsaved
  // draft so the stylist can re-open without losing input.
  const [noteEditor, setNoteEditor] = useState<Record<string, { open: boolean; draft: string }>>({});
  const [savingNotes, setSavingNotes] = useState<Record<string, boolean>>({});
  const [markingComplete, setMarkingComplete] = useState<Record<string, boolean>>({});

  // Per-booking formula panel state. `formulas` is the loaded list per
  // bookingId; lazy-loaded the first time the panel opens.
  interface FormulaRow {
    id: string;
    formula: string;
    notes: string | null;
    applied_at: string;
    service_name: string | null;
    stylist_name: string | null;
    booking_id: string | null;
  }
  const [formulaPanel, setFormulaPanel] = useState<Record<string, {
    open: boolean;
    loaded: boolean;
    list: FormulaRow[];
    draft: string;
    draftNotes: string;
  }>>({});
  const [savingFormula, setSavingFormula] = useState<Record<string, boolean>>({});

  // Load stylist meta once.
  useEffect(() => {
    if (!stylistId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.rpc("salon_public_stylist_meta", { p_stylist_id: stylistId });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load this page.");
        setLoading(false);
        return;
      }
      const row = (Array.isArray(data) ? data[0] : null) as StylistMeta | null;
      if (!row) {
        setError("This page isn't available.");
        setLoading(false);
        return;
      }
      setMeta(row);
    })();
    return () => { cancelled = true; };
  }, [stylistId]);

  // Load day bookings whenever date or stylistId changes.
  useEffect(() => {
    if (!stylistId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
      const { data, error: err } = await supabase.rpc("salon_public_stylist_day", {
        p_stylist_id: stylistId,
        p_day_start: dayStart,
        p_day_end: dayEnd,
      });
      if (cancelled) return;
      if (err) {
        setError("Couldn't load today's schedule.");
        setLoading(false);
        return;
      }
      setRows(((data ?? []) as unknown as DayRow[]));
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stylistId, date]);

  const totals = useMemo(() => {
    const upcoming = rows.filter((r) => r.status === "pending" || r.status === "confirmed").length;
    const done = rows.filter((r) => r.status === "completed").length;
    return { upcoming, done, total: rows.length };
  }, [rows]);

  // Load Stripe Connect status. Re-runs after the stylist returns from
  // Stripe's hosted onboarding (?connect=done) so the banner refreshes.
  const connectParam = searchParams.get("connect");
  useEffect(() => {
    if (!stylistId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.rpc(
        "salon_public_get_stylist_connect_status",
        { p_stylist_id: stylistId } as never,
      );
      if (cancelled) return;
      if (err) return;
      const row = (Array.isArray(data) ? data[0] : null) as ConnectStatus | null;
      setConnect(row);
    })();
    return () => { cancelled = true; };
  }, [stylistId, connectParam]);

  // One-shot toast on return from Stripe; then strip the query param so a
  // reload doesn't re-fire it.
  useEffect(() => {
    if (!connectParam) return;
    if (connectParam === "done") {
      toast.success("Thanks — Stripe is finalizing your account.");
    } else if (connectParam === "refresh") {
      toast.message("Onboarding was paused. Tap the banner to pick up where you left off.");
    }
    const next = new URLSearchParams(searchParams);
    next.delete("connect");
    setSearchParams(next, { replace: true });
  }, [connectParam, searchParams, setSearchParams]);

  const startStripeConnect = async () => {
    if (!stylistId) return;
    setConnecting(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("connect-onboard-stylist", {
        body: { stylist_id: stylistId },
      });
      if (err) throw err;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error("Stripe didn't return an onboarding URL.");
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Couldn't start Stripe setup: ${msg}`);
      setConnecting(false);
    }
  };

  // Load any currently-open shift on mount. Used to render Clock-out + the
  // elapsed timer (or fall through to Clock-in if null).
  useEffect(() => {
    if (!stylistId) return;
    let cancelled = false;
    (async () => {
      const { data, error: err } = await supabase.rpc("salon_public_stylist_open_shift", {
        p_stylist_id: stylistId,
      } as never);
      if (cancelled || err) return;
      const row = (Array.isArray(data) ? data[0] : null) as { id: string; start_at: string } | null;
      setOpenShift(row);
    })();
    return () => { cancelled = true; };
  }, [stylistId]);

  const handleClockIn = async () => {
    setClockBusy(true);
    const { data, error: err } = await supabase.rpc("salon_public_stylist_clock_in", {
      p_stylist_id: stylistId,
    } as never);
    setClockBusy(false);
    if (err) {
      const msg = (err as { message?: string }).message || "Couldn't clock in.";
      toast.error(msg);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : null) as { id: string; start_at: string } | null;
    setOpenShift(row);
    toast.success("Clocked in.");
  };

  const handleClockOut = async () => {
    setClockBusy(true);
    const { data, error: err } = await supabase.rpc("salon_public_stylist_clock_out", {
      p_stylist_id: stylistId,
    } as never);
    setClockBusy(false);
    if (err) {
      const msg = (err as { message?: string }).message || "Couldn't clock out.";
      toast.error(msg);
      return;
    }
    const row = (Array.isArray(data) ? data[0] : null) as { minutes: number } | null;
    setOpenShift(null);
    if (row?.minutes != null) {
      const hrs = Math.floor(row.minutes / 60);
      const mins = row.minutes % 60;
      toast.success(`Clocked out · ${hrs > 0 ? `${hrs}h ` : ""}${mins}m`);
    } else {
      toast.success("Clocked out.");
    }
  };

  // Reload the day's bookings (used after a mutation). Wrapped so we don't
  // re-implement the date-effect's logic each time.
  const reloadDay = async () => {
    const dayStart = new Date(`${date}T00:00:00`).toISOString();
    const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
    const { data, error: err } = await supabase.rpc("salon_public_stylist_day", {
      p_stylist_id: stylistId,
      p_day_start: dayStart,
      p_day_end: dayEnd,
    });
    if (err) return;
    setRows(((data ?? []) as unknown as DayRow[]));
  };

  const handleMarkComplete = async (bookingId: string) => {
    setMarkingComplete((m) => ({ ...m, [bookingId]: true }));
    const { error: err } = await supabase.rpc("salon_public_stylist_mark_complete", {
      p_booking_id: bookingId,
      p_stylist_id: stylistId,
    } as never);
    setMarkingComplete((m) => ({ ...m, [bookingId]: false }));
    if (err) {
      const msg = (err as { message?: string }).message || "Couldn't mark complete.";
      toast.error(msg);
      return;
    }
    toast.success("Marked complete.");
    await reloadDay();
  };

  const openNoteEditor = (bookingId: string, existing: string | null) => {
    setNoteEditor((s) => ({ ...s, [bookingId]: { open: true, draft: s[bookingId]?.draft ?? existing ?? "" } }));
  };
  const closeNoteEditor = (bookingId: string) => {
    setNoteEditor((s) => ({ ...s, [bookingId]: { ...(s[bookingId] ?? { draft: "" }), open: false } }));
  };
  const updateNoteDraft = (bookingId: string, draft: string) => {
    setNoteEditor((s) => ({ ...s, [bookingId]: { open: s[bookingId]?.open ?? true, draft } }));
  };
  const handleSaveNotes = async (bookingId: string) => {
    const draft = noteEditor[bookingId]?.draft ?? "";
    setSavingNotes((m) => ({ ...m, [bookingId]: true }));
    const { error: err } = await supabase.rpc("salon_public_stylist_save_notes", {
      p_booking_id: bookingId,
      p_stylist_id: stylistId,
      p_notes: draft,
    } as never);
    setSavingNotes((m) => ({ ...m, [bookingId]: false }));
    if (err) {
      const msg = (err as { message?: string }).message || "Couldn't save notes.";
      toast.error(msg);
      return;
    }
    toast.success("Notes saved.");
    closeNoteEditor(bookingId);
    await reloadDay();
  };

  const toggleFormulaPanel = async (bookingId: string) => {
    const current = formulaPanel[bookingId];
    if (current?.open) {
      // Just close.
      setFormulaPanel((s) => ({ ...s, [bookingId]: { ...current, open: false } }));
      return;
    }
    // Open. If we haven't loaded yet, fetch now.
    setFormulaPanel((s) => ({
      ...s,
      [bookingId]: {
        open: true,
        loaded: current?.loaded ?? false,
        list: current?.list ?? [],
        draft: current?.draft ?? "",
        draftNotes: current?.draftNotes ?? "",
      },
    }));
    if (current?.loaded) return;
    const { data, error: err } = await supabase.rpc("salon_public_stylist_get_formulas_for_booking", {
      p_booking_id: bookingId,
      p_stylist_id: stylistId,
      p_limit: 5,
    } as never);
    if (err) {
      // Don't toast on the empty / no-client case — the RPC returns empty
      // rather than RAISE, but a real error is rare and shouldn't block
      // the panel from showing the save form.
      console.error("[PublicStylistDayPage] load formulas failed", err);
    }
    setFormulaPanel((s) => ({
      ...s,
      [bookingId]: {
        ...(s[bookingId] ?? { open: true, draft: "", draftNotes: "" }),
        loaded: true,
        list: ((data ?? []) as unknown as FormulaRow[]),
      },
    }));
  };

  const updateFormulaDraft = (bookingId: string, draft: string) => {
    setFormulaPanel((s) => ({
      ...s,
      [bookingId]: {
        ...(s[bookingId] ?? { open: true, loaded: false, list: [], draftNotes: "" }),
        draft,
      },
    }));
  };
  const updateFormulaDraftNotes = (bookingId: string, draftNotes: string) => {
    setFormulaPanel((s) => ({
      ...s,
      [bookingId]: {
        ...(s[bookingId] ?? { open: true, loaded: false, list: [], draft: "" }),
        draftNotes,
      },
    }));
  };

  const handleSaveFormula = async (bookingId: string) => {
    const panel = formulaPanel[bookingId];
    const formula = panel?.draft.trim() ?? "";
    if (!formula) return;
    setSavingFormula((m) => ({ ...m, [bookingId]: true }));
    const { data, error: err } = await supabase.rpc("salon_public_stylist_save_formula", {
      p_booking_id: bookingId,
      p_stylist_id: stylistId,
      p_formula: formula,
      p_notes: panel?.draftNotes.trim() || null,
    } as never);
    setSavingFormula((m) => ({ ...m, [bookingId]: false }));
    if (err) {
      const msg = (err as { message?: string }).message || "Couldn't save formula.";
      toast.error(msg);
      return;
    }
    toast.success("Formula saved.");
    // Optimistically prepend the new row to the list + clear the draft.
    const row = (Array.isArray(data) ? data[0] : null) as FormulaRow | null;
    setFormulaPanel((s) => ({
      ...s,
      [bookingId]: {
        ...(s[bookingId] ?? { open: true, loaded: true, list: [], draftNotes: "" }),
        draft: "",
        draftNotes: "",
        list: row
          ? [{ ...row, service_name: null, stylist_name: null, booking_id: bookingId }, ...(s[bookingId]?.list ?? [])]
          : (s[bookingId]?.list ?? []),
      },
    }));
  };

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>{meta?.display_name ?? "Your day"} · {meta?.store_name ?? ""}</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-6 sm:py-10">
        <header className="mb-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{meta?.store_name ?? " "}</p>
          <h1 className="text-2xl font-bold tracking-tight">{meta?.display_name ?? " "}</h1>
        </header>

        <StripeConnectBanner
          stylistId={stylistId}
          connect={connect}
          connecting={connecting}
          onConnect={startStripeConnect}
        />

        <ClockCard
          openShift={openShift}
          busy={clockBusy}
          onClockIn={handleClockIn}
          onClockOut={handleClockOut}
        />

        <div className="mb-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDate(shiftDay(date, -1))} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{formatDay(date)}</p>
            {date !== todayIso() && (
              <button type="button" onClick={() => setDate(todayIso())} className="rounded-sm text-[11px] text-primary transition-all hover:underline active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                Jump to today
              </button>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDate(shiftDay(date, 1))} className="gap-1">
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Total" value={String(totals.total)} />
          <Stat label="Upcoming" value={String(totals.upcoming)} />
          <Stat label="Done" value={String(totals.done)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nothing booked for {date === todayIso() ? "today" : "this day"}. Enjoy the break.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => {
              const status = STATUS_META[r.status] ?? STATUS_META.confirmed;
              const StatusIcon = status.Icon;
              const dimmed = r.status === "completed" || r.status === "no_show";
              return (
                <li
                  key={r.id}
                  className={cn(
                    "rounded-2xl border bg-card p-3",
                    dimmed ? "border-border opacity-75" : "border-border"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-12 w-14 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <span className="text-xs font-bold leading-none">{formatTime(r.start_at).split(" ")[0]}</span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider">{formatTime(r.start_at).split(" ")[1]}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-foreground">{r.client_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{r.service_name} · {r.duration_minutes} min</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider", status.tone)}>
                          <StatusIcon className="h-3 w-3" /> {status.label}
                        </span>
                        {r.client_phone && (
                          <a href={`tel:${r.client_phone}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Phone className="h-3 w-3" /> {r.client_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.internal_notes && !noteEditor[r.id]?.open && (
                    <div className="mt-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                      <p className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <NotebookPen className="h-3 w-3" /> Notes
                      </p>
                      <p className="whitespace-pre-wrap text-foreground/85">{r.internal_notes}</p>
                    </div>
                  )}

                  {/* Notes editor — opens in place. Save persists via the
                      anon RPC; the row state is gated so the stylist can
                      only write to their own bookings. */}
                  {noteEditor[r.id]?.open && (
                    <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-2">
                      <Textarea
                        value={noteEditor[r.id]?.draft ?? ""}
                        onChange={(e) => updateNoteDraft(r.id, e.target.value)}
                        placeholder="Formula, allergies, chair-side observations…"
                        className="min-h-[80px] text-xs"
                        maxLength={1000}
                      />
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost" size="sm" className="h-7 text-xs"
                          onClick={() => closeNoteEditor(r.id)}
                          disabled={!!savingNotes[r.id]}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm" className="h-7 gap-1 text-xs"
                          onClick={() => void handleSaveNotes(r.id)}
                          disabled={!!savingNotes[r.id]}
                        >
                          {savingNotes[r.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          Save
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Per-booking actions. Hidden once the booking is closed
                      out — completed/no-show/cancelled don't need them. */}
                  {(r.status === "pending" || r.status === "confirmed") && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm" className="h-7 gap-1 px-2 text-xs"
                        onClick={() => void handleMarkComplete(r.id)}
                        disabled={!!markingComplete[r.id]}
                      >
                        {markingComplete[r.id]
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <CheckCircle2 className="h-3 w-3" />}
                        Mark complete
                      </Button>
                      {!noteEditor[r.id]?.open && (
                        <Button
                          variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"
                          onClick={() => openNoteEditor(r.id, r.internal_notes)}
                        >
                          <Pencil className="h-3 w-3" />
                          {r.internal_notes ? "Edit notes" : "Add notes"}
                        </Button>
                      )}
                      <Button
                        variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs"
                        onClick={() => void toggleFormulaPanel(r.id)}
                      >
                        <FlaskConical className="h-3 w-3" />
                        Formulas
                      </Button>
                    </div>
                  )}

                  {/* Formula library panel — lazy-loaded on first open. Past
                      formulas (most recent first) + a save-new form. The RPC
                      gracefully returns an empty list for walk-ins (no client
                      to attach to); the save form will RAISE in that case
                      and we toast the friendly error. */}
                  {formulaPanel[r.id]?.open && (
                    <div className="mt-2 space-y-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <FlaskConical className="h-3 w-3" /> Color formulas
                      </div>
                      {!formulaPanel[r.id]?.loaded ? (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading past formulas…
                        </div>
                      ) : formulaPanel[r.id]?.list.length === 0 ? (
                        <p className="text-muted-foreground">No past formulas for this client.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {formulaPanel[r.id]?.list.map((f) => (
                            <li key={f.id} className="rounded-md bg-background/70 px-2 py-1.5">
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                {new Date(f.applied_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                                {f.service_name ? ` · ${f.service_name}` : ""}
                              </p>
                              <p className="mt-0.5 whitespace-pre-wrap text-foreground/90">{f.formula}</p>
                              {f.notes && (
                                <p className="mt-0.5 text-[11px] italic text-muted-foreground">{f.notes}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {/* Save a new formula. Textarea + optional notes line. */}
                      <div className="space-y-1.5 border-t border-border pt-2">
                        <Textarea
                          value={formulaPanel[r.id]?.draft ?? ""}
                          onChange={(e) => updateFormulaDraft(r.id, e.target.value)}
                          placeholder="e.g. 20g 6N + 10g 7G + 30vol developer, 30 min"
                          className="min-h-[60px] text-xs"
                          maxLength={1000}
                        />
                        <input
                          type="text"
                          value={formulaPanel[r.id]?.draftNotes ?? ""}
                          onChange={(e) => updateFormulaDraftNotes(r.id, e.target.value)}
                          placeholder="Notes (e.g. 'loved it', 'try 7G next time')"
                          className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          maxLength={500}
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost" size="sm" className="h-7 text-xs"
                            onClick={() => void toggleFormulaPanel(r.id)}
                          >
                            Close
                          </Button>
                          <Button
                            size="sm" className="h-7 gap-1 text-xs"
                            onClick={() => void handleSaveFormula(r.id)}
                            disabled={!!savingFormula[r.id] || !(formulaPanel[r.id]?.draft.trim())}
                          >
                            {savingFormula[r.id] ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            Save formula
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Mark bookings complete and add notes as you go — the front desk handles tip + checkout.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-foreground">{value}</p>
    </div>
  );
}

/** Per-stylist clock-in/out card. When clocked in, shows elapsed Hh Mm
 *  (computed at render time so the every-minute tick re-renders the figure
 *  without a setState dance). When clocked out, a single tap clocks in. */
function ClockCard({
  openShift,
  busy,
  onClockIn,
  onClockOut,
}: {
  openShift: { id: string; start_at: string } | null;
  busy: boolean;
  onClockIn: () => void;
  onClockOut: () => void;
}) {
  const elapsed = openShift ? (() => {
    const ms = Date.now() - new Date(openShift.start_at).getTime();
    const mins = Math.max(0, Math.floor(ms / 60_000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  })() : "";

  if (openShift) {
    return (
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-3">
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
            <Clock className="h-3.5 w-3.5" /> On the clock · {elapsed}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Started {new Date(openShift.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9 shrink-0 gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
          onClick={onClockOut}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />}
          Clock out
        </Button>
      </div>
    );
  }

  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-border bg-card p-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> Clocked out
      </p>
      <Button
        size="sm"
        className="h-9 shrink-0 gap-1.5"
        onClick={onClockIn}
        disabled={busy}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        Clock in
      </Button>
    </div>
  );
}

function StripeConnectBanner({
  stylistId,
  connect,
  connecting,
  onConnect,
}: {
  stylistId: string;
  connect: ConnectStatus | null;
  connecting: boolean;
  onConnect: () => void;
}) {
  // The first call to the RPC may still be in flight — render nothing rather
  // than flash an empty banner.
  if (!connect) return null;

  if (connect.status === "active") {
    // Compact strip: "active ✓" + link to the read-only earnings page.
    return (
      <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-emerald-700 dark:text-emerald-300">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider">
          <ShieldCheck className="h-3.5 w-3.5" /> Stripe payouts active
        </span>
        <Link
          to={`/stylist/${stylistId}/earnings`}
          className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-bold text-foreground transition-all hover:bg-muted active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          My earnings <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  const copy =
    connect.status === "pending"
      ? {
          title: "Stripe is reviewing your account",
          body: "We'll let you know when payouts are turned on. Tap below to add anything they still need.",
          cta: "Continue Stripe setup",
        }
      : connect.status === "restricted"
      ? {
          title: "Stripe needs more information",
          body: "Your payouts are paused until you provide the missing details.",
          cta: "Open Stripe",
        }
      : {
          title: "Set up Stripe payouts",
          body: "Connect your bank account so the salon can pay you directly. Takes about 2 minutes.",
          cta: "Set up payouts",
        };

  const tone =
    connect.status === "restricted"
      ? "border-destructive/30 bg-destructive/8 text-destructive"
      : connect.status === "pending"
      ? "border-amber-500/30 bg-amber-500/8 text-amber-700 dark:text-amber-300"
      : "border-primary/30 bg-primary/8 text-foreground";

  return (
    <div className={cn("mb-3 rounded-2xl border p-3", tone)}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background">
          <BadgeDollarSign className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight">{copy.title}</p>
          <p className="mt-0.5 text-xs leading-snug opacity-90">{copy.body}</p>
          <Button
            size="sm"
            onClick={onConnect}
            disabled={connecting}
            className="mt-2 h-8 gap-1 px-3 text-xs"
          >
            {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {copy.cta} {!connecting && <ArrowRight className="h-3 w-3" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
