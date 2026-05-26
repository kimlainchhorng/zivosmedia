/**
 * LiveLocationMap — show friends sharing live location in a chat.
 *
 * Pure-CSS bounding-box map: not a real Mapbox/Google Map (those require
 * keys + heavyweight SDKs), but lays out pins on a normalized grid so the
 * relative positions of friends are visible at a glance.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MapPin from "lucide-react/dist/esm/icons/map-pin";

interface LiveSharer {
  user_id: string;
  latitude: number;
  longitude: number;
  expires_at: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

interface Props {
  chatKind: "direct" | "group";
  chatKey: string;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function LiveLocationMap({ chatKind, chatKey }: Props) {
  const [sharers, setSharers] = useState<LiveSharer[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data: locs } = await (dbFrom("live_locations") as { select: (s: string) => { eq: (k: string, v: string) => { eq: (k: string, v: string) => { gt: (k: string, v: string) => Promise<{ data: LiveSharer[] | null }> } } } })
        .select("user_id, latitude, longitude, expires_at")
        .eq("chat_kind", chatKind)
        .eq("chat_key", chatKey)
        .gt("expires_at", new Date().toISOString());
      if (cancelled) return;
      const rows = (locs || []) as LiveSharer[];
      if (rows.length === 0) { setSharers([]); return; }
      const ids = rows.map((r) => r.user_id);
      const { data: profs } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", ids);
      const map = new Map((profs || []).map((p) => [p.user_id, p]));
      setSharers(rows.map((r) => ({ ...r, full_name: map.get(r.user_id)?.full_name, avatar_url: map.get(r.user_id)?.avatar_url })));
    };
    void load();
    const channel = supabase
      .channel(`live-loc-${chatKind}-${chatKey}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "live_locations",
        filter: `chat_key=eq.${chatKey}`,
      }, () => void load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [chatKind, chatKey]);

  const bounds = useMemo(() => {
    if (sharers.length === 0) return null;
    const lats = sharers.map((s) => s.latitude);
    const lngs = sharers.map((s) => s.longitude);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const padLat = Math.max(0.001, (maxLat - minLat) * 0.2);
    const padLng = Math.max(0.001, (maxLng - minLng) * 0.2);
    return { minLat: minLat - padLat, maxLat: maxLat + padLat, minLng: minLng - padLng, maxLng: maxLng + padLng };
  }, [sharers]);

  if (sharers.length === 0) return null;

  return (
    <div className="rounded-2xl overflow-hidden border border-border/40 bg-gradient-to-br from-blue-500/10 via-cyan-500/10 to-emerald-500/10 relative h-48">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,white,transparent_70%)] opacity-30 pointer-events-none" />
      <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-card/90 backdrop-blur-sm shadow-sm">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wide">{sharers.length} live</span>
      </div>
      {bounds && sharers.map((s) => {
        const x = ((s.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
        const y = (1 - (s.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;
        return (
          <motion.div
            key={s.user_id}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <Avatar className="h-7 w-7 ring-2 ring-emerald-500 shadow-lg">
              <AvatarImage src={s.avatar_url || undefined} />
              <AvatarFallback className="text-[10px] bg-card">{(s.full_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <MapPin className="w-3 h-3 -mt-1 text-emerald-600 fill-emerald-500/60" />
          </motion.div>
        );
      })}
    </div>
  );
}
