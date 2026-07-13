/**
 * Toast popups for incoming car-rental activity:
 *  - New 'pending' reservations (source = 'app')
 *  - New reviews
 *
 * One channel per store; cleans up on unmount.
 *
 * Optional audio cue: when localStorage flag `zivo:car-rental:sound:<storeId>` is "1",
 * a short two-tone beep plays via Web Audio. The flag is read at event time so the
 * operator's preference takes effect immediately without re-subscribing the channel.
 */
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const carRentalSoundStorageKey = (storeId: string) => `zivo:car-rental:sound:${storeId}`;

/**
 * Play a brief synthesized chime. No asset files required.
 * Browsers block AudioContext until a user gesture has occurred — that's fine: the
 * operator must enable the toggle (a click) before this ever fires, which counts.
 */
function playBookingChime() {
  try {
    const AC: typeof AudioContext | undefined = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const playTone = (freq: number, when: number, durationMs: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + when);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + when + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + when + durationMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + when);
      osc.stop(ctx.currentTime + when + durationMs / 1000 + 0.05);
    };
    playTone(660, 0, 140);
    playTone(880, 0.12, 200);
    // Close the context after the tone finishes so we don't leak audio nodes.
    setTimeout(() => { void ctx.close(); }, 600);
  } catch { /* audio not available — silently ignore */ }
}

export function useCarRentalRealtimeNotifications(storeId: string | undefined, enabled: boolean) {
  // Suppress duplicate notifications when the subscription replays on reconnect.
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !storeId) return;
    const seen = seenRef.current;
    const soundKey = carRentalSoundStorageKey(storeId);

    const channel = supabase
      .channel(`car-rental-notif:${storeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row: any = payload.new;
          if (seen.has(`res-${row.id}`)) return;
          seen.add(`res-${row.id}`);
          if (row.source === "app") {
            toast.success("New online booking", {
              description: `${row.customer_name} · ${row.vehicle_label}`,
              duration: 8000,
            });
            try {
              if (localStorage.getItem(soundKey) === "1") playBookingChime();
            } catch { /* localStorage unavailable */ }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "car_rental_reviews", filter: `store_id=eq.${storeId}` },
        (payload) => {
          const row: any = payload.new;
          if (seen.has(`rev-${row.id}`)) return;
          seen.add(`rev-${row.id}`);
          toast.message(`New ${row.rating}-star review`, {
            description: row.customer_name + (row.comment ? ` — "${String(row.comment).slice(0, 80)}"` : ""),
            duration: 8000,
          });
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [storeId, enabled]);
}
