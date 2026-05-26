/**
 * StartVoiceRoomPage — /voice-rooms/create
 * Spawn a new live voice room (Clubhouse-style).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Mic from "lucide-react/dist/esm/icons/mic";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export default function StartVoiceRoomPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!user?.id || !topic) { toast.error("Pick a topic"); return; }
    setBusy(true);
    try {
      const { data, error } = await (dbFrom("voice_rooms") as { insert: (p: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string } | null; error: unknown }> } } })
        .insert({ host_id: user.id, topic, description: description || null, is_live: true })
        .select("id").single();
      if (error || !data) throw error || new Error("Failed");
      // Auto-join host as host role
      await (dbFrom("voice_room_participants") as { insert: (p: unknown) => Promise<unknown> }).insert({
        room_id: data.id, user_id: user.id, role: "host", is_muted: false,
      });
      toast.success("Room is live");
      navigate("/voice-rooms");
    } catch {
      toast.error("Couldn't start room");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-md">
        <h1 className="text-2xl font-bold mb-1 inline-flex items-center gap-2"><Mic className="w-6 h-6 text-primary" />Start a voice room</h1>
        <p className="text-sm text-muted-foreground mb-6">Anyone can listen; you control who speaks.</p>
        <div className="space-y-3">
          <input autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What's the topic?" className="w-full px-3 py-3 rounded-xl bg-muted/40 border border-border/30 text-base font-medium outline-none focus:ring-2 focus:ring-primary/30" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description (optional)" rows={3} className="w-full px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          <button type="button" onClick={() => void start()} disabled={busy || !topic} className="w-full inline-flex items-center justify-center gap-1 py-3 rounded-xl text-white font-bold text-base disabled:opacity-50 bg-foreground">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "🎙 Go live"}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
