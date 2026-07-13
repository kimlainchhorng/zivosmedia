/**
 * SalonQueueDisplayPage — kiosk-style live booking queue at
 * /admin/salon-queue/:storeId. Owner opens it on a tablet at the front desk;
 * clients see who's currently being served, who's up next, and the rest of
 * the day's schedule. Updates live via the salon_bookings realtime channel
 * and falls back to a 60s timer if realtime is unavailable.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, AlertCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface QueueBooking {
  id: string;
  client_name: string;
  service_name: string;
  stylist_name: string | null;
  start_at: string;
  end_at: string;
  status: string;
  duration_minutes: number;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function SalonQueueDisplayPage() {
  const { storeId = "" } = useParams<{ storeId: string }>();
  const [storeName, setStoreName] = useState("");
  const [rows, setRows] = useState<QueueBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!storeId) return;
    let cancelled = false;
    const load = async () => {
      const today = new Date();
      const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(today); dayEnd.setHours(23, 59, 59, 999);
      const [storeRes, bookingsRes] = await Promise.all([
        supabase.from("store_profiles").select("name").eq("id", storeId).maybeSingle(),
        supabase.from("salon_bookings")
          .select("id, client_name, service_name, stylist_name, start_at, end_at, status, duration_minutes")
          .eq("store_id", storeId)
          .gte("start_at", dayStart.toISOString()).lte("start_at", dayEnd.toISOString())
          .in("status", ["pending", "confirmed", "completed"])
          .order("start_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (storeRes.error || !storeRes.data) {
        setError("Couldn't load store.");
        setLoading(false);
        return;
      }
      setStoreName((storeRes.data as any).name);
      setRows((bookingsRes.data ?? []) as unknown as QueueBooking[]);
      setLoading(false);
    };
    void load();
    const reload = setInterval(() => { void load(); }, 60_000);
    const clock = setInterval(() => setNow(new Date()), 1000);
    const channel = supabase
      .channel(`salon-queue:${storeId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "salon_bookings", filter: `store_id=eq.${storeId}` }, () => { void load(); })
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(reload);
      clearInterval(clock);
      void supabase.removeChannel(channel);
    };
  }, [storeId]);

  const { current, upcoming, later } = useMemo(() => {
    const nowTs = now.getTime();
    let current: QueueBooking | null = null;
    const upcoming: QueueBooking[] = [];
    const later: QueueBooking[] = [];
    for (const b of rows) {
      const start = new Date(b.start_at).getTime();
      const end = new Date(b.end_at).getTime();
      if (b.status === "completed") continue;
      if (start <= nowTs && nowTs < end && !current) {
        current = b;
      } else if (start > nowTs) {
        if (upcoming.length < 3) upcoming.push(b);
        else later.push(b);
      }
    }
    return { current, upcoming, later };
  }, [rows, now]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 text-zinc-100">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-zinc-950 p-6 text-zinc-100">
        <div className="max-w-md rounded-2xl border border-destructive/40 bg-destructive/15 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8" />
          <p className="text-base font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-zinc-100">
      <Helmet><title>Queue · {storeName}</title></Helmet>

      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-10 sm:py-12">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{storeName}</h1>
            <p className="mt-2 text-sm text-zinc-400">
              {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">
              {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Live
            </p>
          </div>
        </header>

        <section className="mb-10">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Now serving</p>
          {current ? (
            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 sm:p-8">
              <p className="text-3xl font-bold sm:text-5xl">{current.client_name}</p>
              <p className="mt-2 text-lg text-zinc-300 sm:text-2xl">{current.service_name}</p>
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-zinc-400">
                <Clock className="h-4 w-4" /> {formatTime(current.start_at)} – {formatTime(current.end_at)}
                {current.stylist_name && <span>· with {current.stylist_name}</span>}
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/50 p-8 text-center">
              <p className="text-xl text-zinc-400">No one in the chair right now.</p>
            </div>
          )}
        </section>

        <section className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Next up</p>
          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50 p-6 text-center">
              <p className="text-base text-zinc-400">No more bookings scheduled today.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((b, i) => (
                <li key={b.id} className={cn(
                  "flex items-center justify-between gap-4 rounded-2xl border bg-zinc-900/60 p-4 sm:p-5",
                  i === 0 ? "border-sky-500/40" : "border-zinc-800"
                )}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xl font-bold sm:text-2xl">{b.client_name}</p>
                    <p className="truncate text-sm text-zinc-300 sm:text-base">
                      {b.service_name}{b.stylist_name ? ` · ${b.stylist_name}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xl font-bold tabular-nums sm:text-2xl">{formatTime(b.start_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {later.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500">Later today</p>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {later.slice(0, 8).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm">
                  <span className="truncate text-zinc-200">{b.client_name}</span>
                  <span className="shrink-0 font-mono text-zinc-400">{formatTime(b.start_at)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
