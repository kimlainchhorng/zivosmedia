/**
 * SalonDailySchedulePage — print-friendly one-page schedule for a given day.
 * Owner-only (RLS protects). Grouped by stylist, sorted by start time.
 * Posts well at the front desk for the team to glance at.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Printer, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface ScheduleBooking {
  id: string;
  client_name: string;
  client_phone: string | null;
  service_name: string;
  stylist_name: string | null;
  start_at: string;
  end_at: string;
  status: string;
  duration_minutes: number;
}

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const formatDay = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default function SalonDailySchedulePage() {
  const { storeId = "", date = "" } = useParams<{ storeId: string; date: string }>();
  const [searchParams] = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";

  const [storeName, setStoreName] = useState<string>("");
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId || !date) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const dayStart = new Date(`${date}T00:00:00`).toISOString();
      const dayEnd = new Date(`${date}T23:59:59.999`).toISOString();
      const [storeRes, bookingsRes] = await Promise.all([
        supabase.from("store_profiles").select("name").eq("id", storeId).maybeSingle(),
        supabase.from("salon_bookings")
          .select("id, client_name, client_phone, service_name, stylist_name, start_at, end_at, status, duration_minutes")
          .eq("store_id", storeId)
          .gte("start_at", dayStart).lte("start_at", dayEnd)
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
      setBookings((bookingsRes.data ?? []) as unknown as ScheduleBooking[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, date]);

  useEffect(() => {
    if (autoPrint && !loading && bookings.length >= 0) {
      const t = setTimeout(() => window.print(), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [autoPrint, loading, bookings.length]);

  const grouped = useMemo(() => {
    const map = new Map<string, ScheduleBooking[]>();
    for (const b of bookings) {
      const key = b.stylist_name ?? "Unassigned";
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [bookings]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
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
    <div className="min-h-screen bg-muted/20 print:bg-white">
      <Helmet><title>{formatDay(date)} · {storeName}</title></Helmet>

      <style>{`
        @media print {
          @page { size: auto; margin: 12mm; }
          body { background: white !important; }
          .sched-noprint { display: none !important; }
          .sched-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-4 py-8 print:p-0">
        <div className="sched-noprint mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="gap-1.5">
            <X className="h-4 w-4" /> Close
          </Button>
          <Button onClick={() => window.print()} size="sm" className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        <div className="sched-card rounded-2xl border border-border bg-card p-6 shadow-sm">
          <header className="border-b border-dashed border-border pb-4">
            <h1 className="text-2xl font-bold text-foreground">{storeName}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{formatDay(date)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{bookings.length} booking{bookings.length === 1 ? "" : "s"}</p>
          </header>

          {bookings.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No bookings on this day.</p>
          ) : (
            <div className="mt-4 space-y-6">
              {grouped.map(([stylist, rows]) => (
                <div key={stylist}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{stylist}</p>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="py-1.5 pr-2">Time</th>
                        <th className="py-1.5 pr-2">Client</th>
                        <th className="py-1.5 pr-2">Service</th>
                        <th className="py-1.5">Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id} className="border-b border-border/60">
                          <td className="py-1.5 pr-2 font-mono text-foreground/90">{formatTime(r.start_at)}–{formatTime(r.end_at)}</td>
                          <td className="py-1.5 pr-2 font-semibold text-foreground">{r.client_name}</td>
                          <td className="py-1.5 pr-2 text-foreground/85">{r.service_name}</td>
                          <td className="py-1.5 text-[12px] text-muted-foreground">{r.client_phone ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          <footer className="mt-8 border-t border-dashed border-border pt-3 text-center text-[11px] text-muted-foreground">
            Printed from {storeName} · {new Date().toLocaleString()}
          </footer>
        </div>
      </div>
    </div>
  );
}
