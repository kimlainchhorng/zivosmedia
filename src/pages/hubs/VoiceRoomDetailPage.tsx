/**
 * VoiceRoomDetailPage — /voice-rooms/:id
 *
 * Two phases:
 *   1. Lobby — topic + host byline + participants list + "Join room" / "End room"
 *   2. Live  — GroupCallLauncher takes over (audio-only LiveKit), portaled
 *              to body. Closing it returns to the lobby.
 *
 * The room metadata (topic, is_live state, host) lives in voice_rooms.
 * The actual audio is a LiveKit room named voice-room-<id> via the
 * existing call infrastructure — no new edge function needed.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import {
  ArrowLeft, Mic, Loader2, Users, Crown, LogOut, StopCircle, Radio,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const GroupCallLauncher = lazy(() => import("@/components/chat/call/GroupCallLauncher"));

type VoiceRoomRow = {
  id: string;
  host_id: string;
  topic: string;
  description: string | null;
  is_live: boolean;
  started_at: string | null;
  ended_at: string | null;
};

type ParticipantRow = {
  user_id: string;
  role: string;
  is_muted: boolean;
  joined_at: string;
};

type ProfileLite = { user_id: string; full_name: string | null; avatar_url: string | null };

export default function VoiceRoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [callActive, setCallActive] = useState(false);

  const { data: room, isLoading } = useQuery({
    queryKey: ["voice-room", id],
    queryFn: async (): Promise<VoiceRoomRow | null> => {
      if (!id) return null;
      const { data, error } = await (supabase as any)
        .from("voice_rooms")
        .select("id, host_id, topic, description, is_live, started_at, ended_at")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data as VoiceRoomRow) ?? null;
    },
    enabled: !!id,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["voice-room-participants", id],
    queryFn: async (): Promise<ParticipantRow[]> => {
      if (!id) return [];
      const { data } = await (supabase as any)
        .from("voice_room_participants")
        .select("user_id, role, is_muted, joined_at")
        .eq("room_id", id)
        .order("joined_at", { ascending: true });
      return (data as ParticipantRow[]) ?? [];
    },
    enabled: !!id,
    refetchInterval: 10_000,
  });

  const participantIds = useMemo(
    () => [...new Set(participants.map((p) => p.user_id).concat(room ? [room.host_id] : []))],
    [participants, room],
  );

  const { data: profiles = {} as Record<string, ProfileLite> } = useQuery({
    queryKey: ["voice-room-profiles", participantIds.sort().join(",")],
    queryFn: async () => {
      if (participantIds.length === 0) return {};
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", participantIds);
      const map: Record<string, ProfileLite> = {};
      ((data as ProfileLite[]) ?? []).forEach((p) => { map[p.user_id] = p; });
      return map;
    },
    enabled: participantIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const isHost = !!user && !!room && room.host_id === user.id;
  const meParticipant = participants.find((p) => p.user_id === user?.id) ?? null;

  const joinMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to join");
      if (!id || !room) throw new Error("Missing room");
      if (!room.is_live) throw new Error("This room has ended");
      // Idempotent: re-upsert to refresh joined_at on rejoin.
      const { error } = await (supabase as any)
        .from("voice_room_participants")
        .upsert(
          { room_id: id, user_id: user.id, role: "listener", is_muted: true },
          { onConflict: "room_id,user_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-room-participants", id] });
      setCallActive(true);
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't join room"),
  });

  const leaveMut = useMutation({
    mutationFn: async () => {
      if (!user || !id) return;
      await (supabase as any)
        .from("voice_room_participants")
        .delete()
        .eq("room_id", id)
        .eq("user_id", user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["voice-room-participants", id] });
      setCallActive(false);
      toast.success("Left the room");
    },
  });

  const endMut = useMutation({
    mutationFn: async () => {
      if (!id) return;
      // Mark room ended. Other listeners' clients will see is_live=false
      // on their next refetch (10s polling) and drop. Removing the
      // participants is a follow-up — we keep the row so /voice-rooms/:id
      // remains useful as a "this room ended" history surface.
      const { error } = await (supabase as any)
        .from("voice_rooms")
        .update({ is_live: false, ended_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Room ended");
      qc.invalidateQueries({ queryKey: ["voice-room", id] });
      setCallActive(false);
      navigate("/voice-rooms");
    },
    onError: (err: any) => toast.error(err?.message ?? "Couldn't end room"),
  });

  // Auto-mount the call for the host if the room is live — they're already
  // in via the create flow's participant insert.
  // (Visitors hit Join button explicitly.)
  // Note: we don't auto-mount even for host on hard-reload to avoid
  // surprise audio. Host gets the same "Join room" button on reload.

  const hostProfile = room ? profiles[room.host_id] : undefined;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-24 container mx-auto px-4 max-w-2xl">
        <button
          type="button"
          onClick={() => navigate("/voice-rooms")}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> All rooms
        </button>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : !room ? (
          <div className="text-center py-20">
            <Mic className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="font-semibold mb-1">Room not found</p>
            <p className="text-sm text-muted-foreground">
              This room may have been removed or is no longer available.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              {room.is_live ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-extrabold uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-foreground text-[10px] font-extrabold uppercase">
                  Ended
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                <Radio className="w-3 h-3" /> Voice room
              </span>
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight">{room.topic}</h1>
            {room.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">{room.description}</p>
            )}

            <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
              <Avatar className="h-10 w-10">
                <AvatarImage src={hostProfile?.avatar_url ?? undefined} />
                <AvatarFallback>{(hostProfile?.full_name ?? "H").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold flex items-center gap-1">
                  {hostProfile?.full_name ?? "Host"}
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </p>
                <p className="text-[11px] text-muted-foreground">Hosting</p>
              </div>
            </div>

            {/* Participants strip */}
            <div>
              <div className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                <Users className="w-3.5 h-3.5" />
                {participants.length} listening
              </div>
              <div className="flex flex-wrap gap-2">
                {participants.map((p) => {
                  const profile = profiles[p.user_id];
                  return (
                    <div
                      key={p.user_id}
                      className="flex flex-col items-center gap-1 w-14"
                      title={profile?.full_name ?? "Listener"}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {(profile?.full_name ?? "?").slice(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-[9px] font-semibold truncate w-full text-center">
                        {p.user_id === room.host_id ? "Host" : profile?.full_name?.split(" ")[0] ?? "Guest"}
                      </p>
                    </div>
                  );
                })}
                {participants.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No one's joined yet.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              {!room.is_live ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  This room has ended.
                </p>
              ) : isHost ? (
                <>
                  <button
                    type="button"
                    onClick={() => joinMut.mutate()}
                    disabled={joinMut.isPending}
                    className={cn(
                      "w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ig-gradient text-white font-extrabold text-sm transition-all active:scale-[0.98] disabled:opacity-60",
                    )}
                  >
                    {joinMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                    Open mic
                  </button>
                  <button
                    type="button"
                    onClick={() => endMut.mutate()}
                    disabled={endMut.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-card border-2 border-rose-500/40 text-rose-600 font-bold text-sm hover:bg-rose-500/5 transition-colors disabled:opacity-60"
                  >
                    {endMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
                    End room
                  </button>
                </>
              ) : meParticipant ? (
                <>
                  <button
                    type="button"
                    onClick={() => setCallActive(true)}
                    className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ig-gradient text-white font-extrabold text-sm transition-all active:scale-[0.98]"
                  >
                    <Mic className="w-4 h-4" />
                    Rejoin audio
                  </button>
                  <button
                    type="button"
                    onClick={() => leaveMut.mutate()}
                    disabled={leaveMut.isPending}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-card border-2 border-border text-foreground font-bold text-sm hover:bg-muted transition-colors disabled:opacity-60"
                  >
                    {leaveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Leave room
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => (user ? joinMut.mutate() : navigate(`/login?redirect=/voice-rooms/${id}`))}
                  disabled={joinMut.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 rounded-xl bg-ig-gradient text-white font-extrabold text-sm transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  {joinMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                  {user ? "Join room" : "Sign in to join"}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
      <Footer />

      {/* Live audio — GroupCallLauncher handles its own lobby + LiveKit
          connect. Closing it returns to this page; we don't remove the
          participant row, so they can rejoin without re-inserting. */}
      {callActive && id && (
        <Suspense fallback={null}>
          <GroupCallLauncher
            roomName={`voice-room-${id}`}
            callType="audio"
            meetingLabel={room?.topic}
            onEnded={() => setCallActive(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
