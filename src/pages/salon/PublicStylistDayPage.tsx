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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

        <div className="mb-3 flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDate(shiftDay(date, -1))} className="gap-1">
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{formatDay(date)}</p>
            {date !== todayIso() && (
              <button type="button" onClick={() => setDate(todayIso())} className="text-[11px] text-primary hover:underline">
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
                          <a href={`tel:${r.client_phone}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted/80">
                            <Phone className="h-3 w-3" /> {r.client_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.internal_notes && (
                    <div className="mt-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                      <p className="mb-0.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <NotebookPen className="h-3 w-3" /> Notes
                      </p>
                      <p className="whitespace-pre-wrap text-foreground/85">{r.internal_notes}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-6 text-center text-[10px] text-muted-foreground">
          Read-only. Ask the front desk to update or reschedule.
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
          className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted"
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
