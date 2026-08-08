/**
 * Public walk-in kiosk at /salon/:slug/check-in.
 *
 * Two states:
 *   1. Pick service + enter name/phone → calls salon_public_create_walkin.
 *   2. Confirmation: live queue position + ETA, polled every 30s and
 *      refreshed via the salon_bookings realtime channel.
 *
 * Trust model: anon-callable. The phone number + service id are the only
 * gate against trolls — the same as the public booking flow.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import {
  Loader2, AlertCircle, Clock, CheckCircle2, ArrowLeft, ArrowRight, ClipboardList, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;
import { cn } from "@/lib/utils";

interface StoreLite {
  id: string;
  name: string;
  slug: string;
}

interface ServiceRow {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  description: string | null;
  image_url: string | null;
}

interface StatusRow {
  id: string;
  status: string;
  service_name: string;
  client_name: string;
  store_name: string;
  store_slug: string;
  position_in_queue: number | null;
  estimated_wait_minutes: number | null;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function PublicSalonCheckinPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const checkinId = params.get("id");

  const [store, setStore] = useState<StoreLite | null>(null);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Step 1 form state.
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 2 (confirmation) — polled status.
  const [status, setStatus] = useState<StatusRow | null>(null);

  // Load store + services. Skip if we're in confirmation mode (we'll fetch
  // status directly without needing the service catalog).
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      const { data: storeRow, error: sErr } = await supabase
        .from("store_profiles")
        .select("id, name, slug")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (cancelled) return;
      if (sErr || !storeRow) {
        setError("Salon not found.");
        setLoading(false);
        return;
      }
      const s = storeRow as unknown as StoreLite;
      setStore(s);

      if (!checkinId) {
        const { data: servicesData, error: svcErr } = await supabase
          .from("salon_services")
          .select("id, name, price_cents, duration_minutes, description, image_url")
          .eq("store_id", s.id)
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true });
        if (cancelled) return;
        if (svcErr) {
          setError("Couldn't load services.");
        } else {
          setServices((servicesData ?? []) as unknown as ServiceRow[]);
        }
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, checkinId]);

  // Confirmation-mode status poller + realtime listener.
  useEffect(() => {
    if (!checkinId) return;
    let cancelled = false;
    const refresh = async () => {
      const { data, error: err } = await supabase.rpc("salon_public_get_walkin_status", {
        p_booking_id: checkinId,
      } as never);
      if (cancelled) return;
      if (err) return;
      const row = (Array.isArray(data) ? data[0] : null) as StatusRow | null;
      setStatus(row);
    };
    void refresh();
    const tick = setInterval(refresh, 30_000);
    // Realtime: when any booking at this store changes, refresh position.
    const channel = status?.store_name
      ? supabase
          .channel(`walkin-status:${checkinId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "salon_bookings" },
            () => { void refresh(); },
          )
          .subscribe()
      : null;
    return () => {
      cancelled = true;
      clearInterval(tick);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [checkinId, status?.store_name]);

  const submitCheckin = async () => {
    if (!store || !selectedServiceId) return;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) { toast.error("Name is required."); return; }
    if (!cleanPhone) { toast.error("Phone is required so we can find you when it's your turn."); return; }
    setSubmitting(true);
    const { data, error: err } = await supabase.rpc("salon_public_create_walkin", {
      p_store_id: store.id,
      p_service_id: selectedServiceId,
      p_client_name: cleanName,
      p_client_phone: cleanPhone,
    } as never);
    setSubmitting(false);
    if (err) {
      toast.error((err as { message?: string }).message || "Couldn't check in.");
      return;
    }
    const row = (Array.isArray(data) ? data[0] : null) as { id: string } | null;
    if (!row) { toast.error("Check-in didn't return a record."); return; }
    // Navigate to ?id=<bookingId> so a refresh keeps the confirmation view.
    const next = new URLSearchParams(params);
    next.set("id", row.id);
    setParams(next, { replace: false });
  };

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) ?? null,
    [services, selectedServiceId],
  );

  if (loading && !checkinId) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6">
        <div className="max-w-md rounded-2xl border border-destructive/30 bg-destructive/8 p-6 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <p className="text-base font-semibold text-foreground">{error ?? "Salon not found."}</p>
        </div>
      </div>
    );
  }

  // ---- Confirmation view -------------------------------------------------
  if (checkinId) {
    const isPending = status?.status === "pending";
    const isInProgress = status?.status === "confirmed";
    const isDone = status?.status === "completed";
    const isCancelled = status?.status === "cancelled" || status?.status === "no_show";

    return (
      <div className="min-h-screen bg-background">
        <Helmet><title>You're in · {store.name}</title></Helmet>
        <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{store.name}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {isPending ? "You're in line" : isInProgress ? "It's your turn" : isDone ? "Visit complete" : isCancelled ? "Check-in cancelled" : "Check-in"}
          </h1>

          {!status ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading your spot…
            </div>
          ) : (
            <>
              <div className={cn(
                "mt-6 rounded-2xl border p-6 text-center",
                isPending && "border-primary/30 bg-primary/8",
                isInProgress && "border-emerald-500/40 bg-emerald-500/10",
                isDone && "border-border bg-muted/30",
                isCancelled && "border-destructive/40 bg-destructive/8 text-destructive",
              )}>
                {isPending && (
                  <>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your spot</p>
                    <p className="mt-1 text-5xl font-bold tracking-tight text-foreground">
                      #{status.position_in_queue ?? "—"}
                    </p>
                    <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {status.estimated_wait_minutes === 0
                        ? "Up next"
                        : status.estimated_wait_minutes != null
                        ? `~${status.estimated_wait_minutes} min wait`
                        : "Calculating wait…"}
                    </p>
                  </>
                )}
                {isInProgress && (
                  <>
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                    <p className="mt-3 text-base font-bold text-foreground">A stylist is ready for you.</p>
                    <p className="mt-1 text-xs text-muted-foreground">Head to the front desk.</p>
                  </>
                )}
                {isDone && (
                  <>
                    <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                    <p className="mt-3 text-base font-bold text-foreground">Thanks for visiting!</p>
                  </>
                )}
                {isCancelled && (
                  <p className="text-sm font-semibold">This check-in was {status.status === "no_show" ? "marked no-show" : "cancelled"}.</p>
                )}
              </div>

              <div className="mt-4 space-y-1 rounded-xl border border-border bg-card p-3 text-sm">
                <p className="flex justify-between text-muted-foreground">
                  <span>Service</span><span className="text-foreground">{status.service_name}</span>
                </p>
                <p className="flex justify-between text-muted-foreground">
                  <span>Name</span><span className="text-foreground">{status.client_name}</span>
                </p>
                <p className="flex justify-between text-muted-foreground">
                  <span>Reference</span><span className="font-mono text-foreground">{status.id.slice(0, 8).toUpperCase()}</span>
                </p>
              </div>
            </>
          )}

          <p className="mt-6 text-center text-[11px] text-muted-foreground">
            This page updates automatically — keep it open. Step outside if you'd like, we'll text you when you're up.
          </p>

          <div className="mt-4 flex items-center justify-center">
            <Link to={`/salon/${store.slug}`} className="inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-all hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ArrowLeft className="h-3 w-3" /> Back to {store.name}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---- Step 1: service + contact -----------------------------------------
  return (
    <div className="min-h-screen bg-background">
      <Helmet><title>Check in · {store.name}</title></Helmet>
      <div className="mx-auto max-w-md px-4 py-8 sm:py-12">
        <Link to={`/salon/${store.slug}`} className="mb-4 inline-flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-all hover:text-foreground active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <ArrowLeft className="h-3 w-3" /> Back to {store.name}
        </Link>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <ClipboardList className="h-3 w-3" /> Walk-in
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">Check in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick what you're here for. We'll add you to the queue and text you when it's your turn.
          </p>
        </header>

        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Service</p>
          {services.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
              No services available right now.
            </p>
          ) : (
            <ul className="space-y-2">
              {services.map((s) => {
                const active = selectedServiceId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedServiceId(s.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-primary/60 bg-primary/8" : "border-border bg-card hover:border-primary/30"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{s.name}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {s.duration_minutes} min · {formatPrice(s.price_cents)}
                        </p>
                      </div>
                      {active && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selectedService && (
          <section className="mt-6 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your info</p>
            <div className="space-y-1.5">
              <Label htmlFor="checkinName">Name</Label>
              <Input id="checkinName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jamie Chen" autoComplete="name" maxLength={120} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="checkinPhone">Phone</Label>
              <Input id="checkinPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" autoComplete="tel" maxLength={30} />
              <p className="text-[11px] text-muted-foreground">We'll only use this to text you when you're up.</p>
            </div>

            <Button
              className="mt-2 w-full gap-1.5"
              onClick={() => void submitCheckin()}
              disabled={submitting || !name.trim() || !phone.trim()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Join the queue
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </section>
        )}
      </div>
    </div>
  );
}
