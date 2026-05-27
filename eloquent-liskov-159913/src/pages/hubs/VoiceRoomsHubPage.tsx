/**
 * VoiceRoomsHubPage — /voice-rooms
 * Live audio rooms (Clubhouse-style).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import VoiceRoomCard, { type VoiceRoomData } from "@/components/rooms/VoiceRoomCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Mic from "lucide-react/dist/esm/icons/mic";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { useNavigate } from "react-router-dom";

interface RawRoom {
  id: string;
  topic: string;
  description: string | null;
  is_live: boolean;
  host_id: string;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

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
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold inline-flex items-center gap-2"><Mic className="w-6 h-6 text-primary" />Voice rooms</h1>
            <p className="text-sm text-muted-foreground">Drop into live audio conversations.</p>
          </div>
          <button type="button" onClick={() => navigate("/voice-rooms/create")} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-white text-sm font-bold bg-foreground">
            <Mic className="w-4 h-4" /> Go live
          </button>
        </div>

        {rooms == null ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : rooms.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-16">No live rooms right now. Be the first to start one.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((r) => <VoiceRoomCard key={r.id} room={r} />)}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
