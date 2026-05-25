/**
 * CafeKdsSection — kitchen display. Tile-style cards for tickets in
 * pending/accepted/preparing/ready buckets, color-coded by wait time.
 */
import { useEffect, useRef, useState } from "react";
import { ChefHat, Clock, ArrowRight, Loader2, CheckCheck, Bell, BellOff, Printer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCafeOrders, type CafeOrderStatus } from "@/hooks/cafe/useCafeOrders";
import { cn } from "@/lib/utils";

interface Props { storeId: string }

const NEXT: Partial<Record<CafeOrderStatus, CafeOrderStatus>> = {
  pending: "accepted", accepted: "preparing", preparing: "ready", ready: "served",
};

const ageMins = (iso: string, now: number) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));

const SOUND_PREF_KEY = "cafe-kds-sound-enabled";

// Short bell tone (700 ms) encoded as a tiny base64 WAV — no external file
// needed. Generated client-side once via the WebAudio API so even browsers
// without the audio asset still chime.
function playChime() {
  try {
    const Ctx = window.AudioContext || (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.65);
    // Close once stopped to release the audio context.
    osc.onended = () => { void ctx.close().catch(() => {}); };
  } catch {
    // Audio is best-effort — never blocks UI.
  }
}

export default function CafeKdsSection({ storeId }: Props) {
  const { orders, itemsByOrder, modifiersByItem, loading, setStatus } = useCafeOrders(storeId);
  const [now, setNow] = useState(Date.now());
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try { return localStorage.getItem(SOUND_PREF_KEY) !== "0"; } catch { return true; }
  });
  // Track active-ticket IDs we've already seen so the chime only fires for
  // genuinely new ones, not on first paint.
  const seenIdsRef = useRef<Set<string>>(new Set());
  const primedRef = useRef(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  // Bell on new active tickets (only after the initial mount has primed
  // the seen set — otherwise opening the KDS would chime for every
  // existing pending order).
  useEffect(() => {
    if (loading) return;
    const activeIds = new Set(
      orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status)).map((o) => o.id),
    );
    if (!primedRef.current) {
      seenIdsRef.current = activeIds;
      primedRef.current = true;
      return;
    }
    let chime = false;
    for (const id of activeIds) {
      if (!seenIdsRef.current.has(id)) { chime = true; }
    }
    seenIdsRef.current = activeIds;
    if (chime && soundOn) playChime();
  }, [orders, loading, soundOn]);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try { localStorage.setItem(SOUND_PREF_KEY, next ? "1" : "0"); } catch { /* noop */ }
    if (next) playChime(); // preview tone
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const active = orders.filter((o) => ["pending", "accepted", "preparing", "ready"].includes(o.status));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/8 via-card to-card p-4 sm:p-5 flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-700 dark:text-orange-300">
          <ChefHat className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">Kitchen display</h2>
          <p className="text-sm text-muted-foreground">{active.length} active ticket{active.length === 1 ? "" : "s"}.</p>
        </div>
        <Button
          size="sm"
          variant={soundOn ? "default" : "outline"}
          onClick={toggleSound}
          title={soundOn ? "Mute new-order chime" : "Unmute new-order chime"}
          className="shrink-0"
        >
          {soundOn ? <Bell className="h-4 w-4 mr-1" /> : <BellOff className="h-4 w-4 mr-1" />}
          {soundOn ? "Sound on" : "Muted"}
        </Button>
      </div>

      {active.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            <CheckCheck className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
            All caught up.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {active.map((o) => {
            const age = ageMins(o.placed_at, now);
            const accent =
              age >= 10 ? "border-destructive/40 bg-destructive/5" :
              age >= 5  ? "border-orange-500/40 bg-orange-500/5" :
              "border-border bg-card";
            const next = NEXT[o.status];
            return (
              <Card key={o.id} className={cn("transition-colors", accent)}>
                <CardContent className="pt-4 pb-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">#{o.ticket_number}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5",
                      age >= 10 ? "bg-destructive/15 text-destructive" :
                      age >= 5 ? "bg-orange-500/15 text-orange-700" :
                      "bg-emerald-500/15 text-emerald-700"
                    )}>
                      <Clock className="h-3 w-3" /> {age}m
                    </span>
                  </div>
                  <div className="text-sm font-semibold">
                    {o.customer_name || o.channel.replace("_", " ")}
                  </div>
                  {o.scheduled_for && (
                    <div className="rounded-md bg-violet-500/10 border border-violet-500/30 px-2 py-1 text-[11px] text-violet-700 dark:text-violet-300 flex items-center gap-1">
                      📅 Pickup {new Date(o.scheduled_for).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </div>
                  )}
                  <ul className="text-sm space-y-1">
                    {(itemsByOrder[o.id] ?? []).map((it) => (
                      <li key={it.id}>
                        <span className="font-medium">{it.quantity}× {it.item_name}</span>
                        {(modifiersByItem[it.id] ?? []).length > 0 && (
                          <span className="block text-[11px] text-muted-foreground pl-4">
                            {(modifiersByItem[it.id] ?? []).map((m) => m.modifier_name).join(" · ")}
                          </span>
                        )}
                        {it.notes && <span className="block text-[11px] italic text-muted-foreground pl-4">"{it.notes}"</span>}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 flex items-center justify-between gap-1">
                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide">{o.status}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm" variant="ghost" className="h-8 w-8 p-0"
                        title="Print kitchen ticket"
                        onClick={() => window.open(`/cafe/kitchen-ticket/${o.id}`, "_blank", "noopener,noreferrer")}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      {next && (
                        <Button size="sm" className="h-8 text-xs" onClick={() => setStatus(o.id, next)}>
                          {next === "ready" ? "Ready" : next === "served" ? "Served" : next === "preparing" ? "Start" : "Accept"}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
