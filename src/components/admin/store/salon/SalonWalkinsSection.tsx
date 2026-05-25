/**
 * SalonWalkinsSection — quick walk-in capture. Creates a booking with
 * source='walk_in' starting at the current time. Lists today's walk-ins below.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Loader2, AlertCircle, User, Clock,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSalonServices } from "@/hooks/salon/useSalonServices";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

interface SalonWalkinsSectionProps {
  storeId: string;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function SalonWalkinsSection({ storeId }: SalonWalkinsSectionProps) {
  const { services } = useSalonServices(storeId);
  const { stylists } = useSalonStylists(storeId);
  const activeServices = useMemo(() => services.filter((s) => s.is_active), [services]);
  const activeStylists = useMemo(() => stylists.filter((s) => s.is_active), [stylists]);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [stylistId, setStylistId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walkins, setWalkins] = useState<SalonBooking[]>([]);

  useEffect(() => {
    if (activeServices.length > 0 && !serviceId) setServiceId(activeServices[0].id);
  }, [activeServices, serviceId]);

  const load = async () => {
    setLoading(true);
    setError(null);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    const { data, error: err } = await supabase
      .from("salon_bookings")
      .select("*")
      .eq("store_id", storeId)
      .eq("source", "walk_in")
      .gte("start_at", start.toISOString())
      .lt("start_at", end.toISOString())
      .order("start_at", { ascending: false });
    if (err) {
      console.error("[SalonWalkins] load failed", err);
      setError("Couldn't load walk-ins.");
      setLoading(false);
      return;
    }
    setWalkins((data ?? []) as unknown as SalonBooking[]);
    setLoading(false);
  };

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [storeId]);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error("Walk-in name is required.");
      return;
    }
    const svc = activeServices.find((s) => s.id === serviceId);
    if (!svc) {
      toast.error("Pick a service.");
      return;
    }
    const stylist = stylistId ? activeStylists.find((s) => s.id === stylistId) : null;
    setSaving(true);
    const start = new Date();
    const end = new Date(start.getTime() + svc.duration_minutes * 60 * 1000);
    const payload = {
      store_id: storeId,
      client_id: null,
      stylist_id: stylist?.id ?? null,
      service_id: svc.id,
      service_name: svc.name,
      stylist_name: stylist?.display_name ?? null,
      client_name: name.trim(),
      client_phone: phone.trim() || null,
      client_email: null,
      price_cents: svc.price_cents,
      duration_minutes: svc.duration_minutes,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "confirmed" as const,
      source: "walk_in" as const,
    };
    const { error: err } = await supabase
      .from("salon_bookings")
      .insert(payload as never);
    setSaving(false);
    if (err) {
      console.error("[SalonWalkins] insert failed", err);
      if ((err as any).code === "23P01") {
        toast.error("That stylist is busy right now — pick another or leave unassigned.");
      } else {
        toast.error("Couldn't add walk-in.");
      }
      return;
    }
    toast.success("Walk-in added.");
    setName(""); setPhone("");
    await load();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            New walk-in
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wiName">Name *</Label>
              <Input id="wiName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiPhone">Phone (optional)</Label>
              <Input id="wiPhone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="wiService">Service *</Label>
              <select
                id="wiService"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Pick a service…</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min · {formatPrice(s.price_cents)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wiStylist">Stylist</Label>
              <select
                id="wiStylist"
                value={stylistId}
                onChange={(e) => setStylistId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {activeStylists.map((s) => (
                  <option key={s.id} value={s.id}>{s.display_name}</option>
                ))}
              </select>
            </div>
          </div>
          <Button onClick={handleAdd} disabled={saving || activeServices.length === 0} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add walk-in
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-primary" /> Today's walk-ins
            {walkins.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{walkins.length}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
          ) : walkins.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No walk-ins today yet.
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {walkins.map((w) => (
                <li key={w.id} className="flex items-center gap-3 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
                    {formatTime(w.start_at).replace(" ", "")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground" /> {w.client_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {w.service_name}{w.stylist_name ? ` · ${w.stylist_name}` : " · Unassigned"} · {w.duration_minutes} min
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatPrice(w.price_cents)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            Walk-ins are full bookings — manage status (complete, no-show, etc.) from the Bookings tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
