/**
 * StartVoiceRoomPage — /voice-rooms/create
 * Spawn a new live voice room (Clubhouse-style).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import HubFormShell, { Field, fieldClass } from "@/components/hubs/HubFormShell";
import Mic from "lucide-react/dist/esm/icons/mic";

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
      navigate(`/voice-rooms/${data.id}`);
    } catch {
      toast.error("Couldn't start room");
    }
    setBusy(false);
  };

  return (
    <HubFormShell
      backTo="/voice-rooms"
      backLabel="Voice rooms"
      badge="Go live"
      badgeIcon={Mic}
      title="Start a voice room"
      subtitle="Anyone can listen; you control who speaks."
      submitLabel="Go live"
      onSubmit={() => void start()}
      busy={busy}
      canSubmit={!!topic}
    >
      <Field label="Topic" htmlFor="vr-topic" required>
        <input id="vr-topic" autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What's the topic?" className={fieldClass} />
      </Field>
      <Field label="Description" htmlFor="vr-desc" optional>
        <textarea id="vr-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add a description" rows={3} className={`${fieldClass} resize-none`} />
      </Field>
    </HubFormShell>
  );
}
