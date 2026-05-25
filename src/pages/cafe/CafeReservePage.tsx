/**
 * Public reservation page at /cafe/:slug/reserve. Lets a customer request a
 * table — the booking lands as 'pending' so the owner can confirm. Anon-
 * friendly: backed by the SECURITY DEFINER cafe_public_create_reservation
 * RPC; the page itself only reads the store name and active flag.
 */
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Coffee, Loader2, AlertCircle, CheckCircle2, ChevronLeft, CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

interface StoreLite { id: string; name: string; slug: string; is_active: boolean }

const pad = (n: number) => n.toString().padStart(2, "0");
const toLocal = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

export default function CafeReservePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [store, setStore] = useState<StoreLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [duration, setDuration] = useState("60");
  const [reservedFor, setReservedFor] = useState("");
  const [notes, setNotes] = useState("");

  // Default reserved_for = next round hour at least 1h out
  const { minIso, maxIso } = useMemo(() => {
    const min = new Date(Date.now() + 30 * 60 * 1000);
    const max = new Date(Date.now() + 60 * 86_400_000);
    return { minIso: toLocal(min), maxIso: toLocal(max) };
  }, []);

  useEffect(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    setReservedFor(toLocal(d));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id,name,slug,is_active")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) { setLoadError("This cafe couldn't be found."); setLoading(false); return; }
      const s = data as StoreLite;
      if (!s.is_active) { setLoadError("This cafe isn't accepting reservations right now."); setLoading(false); return; }
      setStore(s);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const submit = async () => {
    if (!store) return;
    if (!name.trim()) { toast.error("Please enter your name."); return; }
    if (!reservedFor) { toast.error("Pick a date and time."); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc("cafe_public_create_reservation" as never, {
      p_store_id: store.id,
      p_customer_name: name,
      p_customer_phone: phone,
      p_party_size: Math.max(1, parseInt(partySize, 10) || 1),
      p_reserved_for: new Date(reservedFor).toISOString(),
      p_duration_minutes: Math.max(15, parseInt(duration, 10) || 60),
      p_notes: notes,
    } as never);
    setSubmitting(false);
    if (error) {
      console.error("[reserve]", error);
      // Surface the RPC's specific error if useful (e.g. "reserved_for must be at least 30 minutes from now").
      toast.error(error.message.replace(/^.*reserved_for/i, "Pick a time") .replace(/^.*party size/i, "Party size") || "Couldn't book that time.");
      return;
    }
    setConfirmed(true);
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>;
  }
  if (loadError || !store) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-2">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
            <p className="text-sm text-muted-foreground">{loadError ?? "Cafe unavailable."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Helmet><title>Reservation requested · {store.name}</title></Helmet>
        <div className="max-w-md mx-auto">
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
              <h1 className="text-xl font-bold">Reservation requested</h1>
              <p className="text-sm text-muted-foreground">
                We&rsquo;ve sent your request to {store.name}. They&rsquo;ll confirm shortly{phone ? ` — keep an eye on your phone (${phone})` : ""}.
              </p>
              <Button asChild variant="outline" className="mt-2">
                <a href={`/cafe/${store.slug}`}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Back to menu
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <Helmet><title>Reserve a table · {store.name}</title></Helmet>
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <CalendarClock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Reserve a table</h1>
            <p className="text-sm text-muted-foreground">at {store.name}</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-3">
            <div>
              <Label htmlFor="resv-name">Your name *</Label>
              <Input id="resv-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Pisey" />
            </div>
            <div>
              <Label htmlFor="resv-phone">Phone</Label>
              <Input id="resv-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+855 12 …" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="resv-party">Party size *</Label>
                <Input id="resv-party" type="number" min="1" max="50" value={partySize} onChange={(e) => setPartySize(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="resv-dur">Duration (min)</Label>
                <Input id="resv-dur" type="number" min="15" step="15" value={duration} onChange={(e) => setDuration(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="resv-when">When *</Label>
              <Input
                id="resv-when" type="datetime-local"
                min={minIso} max={maxIso}
                value={reservedFor} onChange={(e) => setReservedFor(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground mt-1">At least 30 minutes from now, up to 60 days out.</p>
            </div>
            <div>
              <Label htmlFor="resv-notes">Notes (optional)</Label>
              <Textarea id="resv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Birthday, dietary needs, etc." />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="flex-1">
            <a href={`/cafe/${store.slug}`}><ChevronLeft className="h-4 w-4 mr-1" /> Back</a>
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim() || !reservedFor} className="flex-1">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Coffee className="h-4 w-4 mr-1" />}
            Request reservation
          </Button>
        </div>
      </div>
    </div>
  );
}
