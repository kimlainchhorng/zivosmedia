/**
 * VoiceRoomsHubPage — /voice-rooms
 * Live audio rooms (Clubhouse-style).
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import VoiceRoomCard, { type VoiceRoomData } from "@/components/rooms/VoiceRoomCard";
import HubScaffold, { type HubStep } from "@/components/hubs/HubScaffold";
import Mic from "lucide-react/dist/esm/icons/mic";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Radio from "lucide-react/dist/esm/icons/radio";
import Hand from "lucide-react/dist/esm/icons/hand";
import Users from "lucide-react/dist/esm/icons/users";

interface RawRoom {
  id: string;
  topic: string;
  description: string | null;
  is_live: boolean;
  host_id: string;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

const STEPS: HubStep[] = [
  { icon: Radio, title: "Start or join", desc: "Open a room or hop into a live one" },
  { icon: Hand, title: "Raise your hand", desc: "Listen in, or ask to speak" },
  { icon: Users, title: "Talk together", desc: "Real-time audio with your community" },
];

export default function VoiceRoomsHubPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<VoiceRoomData[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: raw } = await (dbFrom("voice_rooms") as { select: (s: string) => { eq: (k: string, v: boolean) => { order: (k: string, o: unknown) => { limit: (n: number) => Promise<{ data: RawRoom[] | null }> } } } })
        .select("id, topic, description, is_live, host_id")
        .eq("is_live", true)
        .order("started_at", { ascending: false })
        .limit(40);
      if (cancelled) return;
      const rows = (raw as RawRoom[] | null) || [];
      if (rows.length === 0) { setRooms([]); return; }
      const hostIds = Array.from(new Set(rows.map((r) => r.host_id)));
      const { data: hosts } = await supabase.from("profiles").select("user_id, full_name, avatar_url").in("user_id", hostIds);
      const hostMap = new Map((hosts || []).map((h) => [h.user_id, h]));
      // Listener counts
      const { data: parts } = await (dbFrom("voice_room_participants") as { select: (s: string) => { in: (k: string, v: string[]) => Promise<{ data: { room_id: string }[] | null }> } })
        .select("room_id")
        .in("room_id", rows.map((r) => r.id));
      const counts = new Map<string, number>();
      (parts || []).forEach((p) => counts.set(p.room_id, (counts.get(p.room_id) || 0) + 1));
      if (!cancelled) {
        setRooms(rows.map((r) => ({
          id: r.id,
          topic: r.topic,
          description: r.description,
          host_name: hostMap.get(r.host_id)?.full_name ?? null,
          host_avatar: hostMap.get(r.host_id)?.avatar_url ?? null,
          listener_count: counts.get(r.id) ?? 0,
          is_live: r.is_live,
        })));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <HubScaffold
      badge="Live audio"
      badgeIcon={Mic}
      title="Voice rooms"
      subtitle="Drop into live audio conversations — or start your own room and gather a crowd."
      primaryCta={{ label: "Go live", onClick: () => navigate("/voice-rooms/create"), icon: Mic }}
      browseLabel="Browse rooms"
      steps={STEPS}
      listingsHeading={`Live rooms${rooms && rooms.length > 0 ? ` (${rooms.length})` : ""}`}
    >
      {rooms == null ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : rooms.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col items-center justify-center py-14 text-center rounded-2xl border border-dashed border-border bg-card/30"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-orange-500/10 border border-border flex items-center justify-center mb-4 text-fuchsia-500">
            <Mic className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold mb-1">No live rooms right now</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-6">
            Be the first to go live — start a room and let people drop in.
          </p>
          <button
            type="button"
            onClick={() => navigate("/voice-rooms/create")}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ig-gradient text-white text-sm font-bold shadow-md shadow-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Mic className="w-4 h-4" /> Go live
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <VoiceRoomCard key={r.id} room={r} onJoin={(id) => navigate(`/voice-rooms/${id}`)} />
          ))}
        </div>
      )}
    </HubScaffold>
  );
}
