/**
 * useLiveKitCall — Group video call backed by LiveKit Cloud SFU.
 *
 *   - Used when participant count > 4 (mesh becomes inefficient above that).
 *   - Mints a server-issued JWT via the `livekit-token` edge function.
 *   - Surfaces local + remote tracks, screen share, reactions (data channel),
 *     hand-raise (data channel), and recording controls.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteTrack,
  LocalParticipant,
  ParticipantEvent,
  DataPacket_Kind,
  ConnectionState,
  type LocalTrackPublication,
} from "livekit-client";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface LKParticipant {
  identity: string;
  name: string;
  avatarUrl: string | null;
  isLocal: boolean;
  isHost: boolean;
  micEnabled: boolean;
  camEnabled: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  cameraTrack: MediaStreamTrack | null;
  micTrack: MediaStreamTrack | null;
  screenTrack: MediaStreamTrack | null;
}

export interface ReactionEvent {
  id: string;          // unique key for animation
  participantId: string;
  emoji: string;
  ts: number;
}

interface DataMsg {
  type: "reaction" | "hand";
  emoji?: string;
  raised?: boolean;
}

type ParticipantProfile = {
  full_name: string | null;
  avatar_url: string | null;
};

interface UseLiveKitCallOptions {
  roomName: string;
  callType?: "audio" | "video";
  enabled: boolean;
  onEnded?: () => void;
  /** Pre-join intent: start with mic muted */
  startMicMuted?: boolean;
  /** Pre-join intent: start with camera off */
  startCamOff?: boolean;
  /** Host-only: kick off cloud recording immediately after connect */
  autoRecord?: boolean;
}

export function useLiveKitCall({
  roomName,
  callType = "video",
  enabled,
  onEnded,
  startMicMuted = false,
  startCamOff = false,
  autoRecord = false,
}: UseLiveKitCallOptions) {
  const roomRef = useRef<Room | null>(null);
  const [state, setState] = useState<"connecting" | "connected" | "ended" | "error">("connecting");
  const [error, setError] = useState<string | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<LKParticipant[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [isHost, setIsHost] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenShareBlocked, setScreenShareBlocked] = useState(false);
  const [micEnabled, setMicEnabled] = useState(!startMicMuted);
  const [camEnabled, setCamEnabled] = useState(callType === "video" && !startCamOff);
  const [handRaised, setHandRaised] = useState(false);
  const profileMapRef = useRef<Record<string, ParticipantProfile>>({});

  const formatDevicePermissionMessage = useCallback((device: "microphone" | "camera" | "screen") => {
    if (device === "screen") {
      return "Screen sharing is blocked by browser or system permission. Allow screen sharing or Screen Recording permission for this browser, then try again.";
    }
    return `${device[0].toUpperCase()}${device.slice(1)} permission is blocked. Allow browser permission, then try again.`;
  }, []);

  /* ----------------- Refresh participant list ----------------- */
  const refreshParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const list: LKParticipant[] = [];
    const buildOne = (p: LocalParticipant | RemoteParticipant, isLocal: boolean) => {
      const camPub = p.getTrackPublication(Track.Source.Camera);
      const micPub = p.getTrackPublication(Track.Source.Microphone);
      const screenPub = p.getTrackPublication(Track.Source.ScreenShare);
      const profile = profileMapRef.current[p.identity];
      list.push({
        identity: p.identity,
        name: profile?.full_name || p.name || p.identity,
        avatarUrl: profile?.avatar_url ?? null,
        isLocal,
        isHost: p.metadata === "host",
        micEnabled: !(micPub?.isMuted ?? true),
        camEnabled: !(camPub?.isMuted ?? true),
        isScreenSharing: Boolean(screenPub?.track),
        handRaised: false, // updated by data messages
        cameraTrack: (camPub?.track?.mediaStreamTrack as MediaStreamTrack | undefined) ?? null,
        micTrack: (micPub?.track?.mediaStreamTrack as MediaStreamTrack | undefined) ?? null,
        screenTrack: (screenPub?.track?.mediaStreamTrack as MediaStreamTrack | undefined) ?? null,
      });
    };
    buildOne(room.localParticipant, true);
    room.remoteParticipants.forEach((rp) => buildOne(rp, false));
    setParticipants(list);
  }, []);

  useEffect(() => {
    const ids = participants.map((p) => p.identity).filter(Boolean);
    const missingIds = ids.filter((id) => !profileMapRef.current[id]);
    if (missingIds.length === 0) return;

    let cancelled = false;
    (async () => {
      const quotedIds = missingIds.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`id.in.(${quotedIds}),user_id.in.(${quotedIds})`);

      if (cancelled || error || !data) return;

      const next = { ...profileMapRef.current };
      for (const id of missingIds) {
        next[id] = { full_name: null, avatar_url: null };
      }
      for (const row of data as Array<ParticipantProfile & { id?: string | null; user_id?: string | null }>) {
        const profile = { full_name: row.full_name, avatar_url: row.avatar_url };
        if (row.id) next[row.id] = profile;
        if (row.user_id) next[row.user_id] = profile;
      }

      profileMapRef.current = next;
      refreshParticipants();
    })();

    return () => {
      cancelled = true;
    };
  }, [participants, refreshParticipants]);

  /* ----------------- Connect / disconnect ----------------- */
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    roomRef.current = room;

    const wireEvents = () => {
      room.on(RoomEvent.ParticipantConnected, refreshParticipants);
      room.on(RoomEvent.ParticipantDisconnected, refreshParticipants);
      room.on(RoomEvent.TrackSubscribed, refreshParticipants);
      room.on(RoomEvent.TrackUnsubscribed, refreshParticipants);
      room.on(RoomEvent.TrackMuted, refreshParticipants);
      room.on(RoomEvent.TrackUnmuted, refreshParticipants);
      room.on(RoomEvent.LocalTrackPublished, refreshParticipants);
      room.on(RoomEvent.LocalTrackUnpublished, refreshParticipants);
      room.on(RoomEvent.ConnectionStateChanged, (cs) => {
        if (cs === ConnectionState.Disconnected) {
          setState("ended");
          onEnded?.();
        } else if (cs === ConnectionState.Connected) {
          setState("connected");
        }
      });
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        try {
          const msg = JSON.parse(new TextDecoder().decode(payload)) as DataMsg;
          if (msg.type === "reaction" && msg.emoji && participant) {
            setReactions((prev) => [
              ...prev,
              { id: crypto.randomUUID(), participantId: participant.identity, emoji: msg.emoji!, ts: Date.now() },
            ]);
          }
          if (msg.type === "hand" && participant) {
            setParticipants((prev) =>
              prev.map((p) =>
                p.identity === participant.identity ? { ...p, handRaised: Boolean(msg.raised) } : p,
              ),
            );
          }
        } catch {/* ignore */}
      });
    };

    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("livekit-token", {
          body: { roomName, callType },
        });
        if (fnErr) throw fnErr;
        if (!data?.token || !data?.url) throw new Error("Missing token");
        if (cancelled) return;

        setIsHost(Boolean(data.isHost));
        setSessionId(data.sessionId ?? null);

        wireEvents();
        await room.connect(data.url, data.token, {
          autoSubscribe: true,
        });
        if (cancelled) {
          await room.disconnect();
          return;
        }

        // Publish defaults (respect pre-join intent). Media permission
        // failures should not kick the user out of the room: they can still
        // listen, chat with reactions, and retry enabling devices later.
        if (!startMicMuted) {
          try {
            await room.localParticipant.setMicrophoneEnabled(true);
            setMicEnabled(true);
          } catch (mediaErr) {
            setMicEnabled(false);
            setMediaError(formatDevicePermissionMessage("microphone"));
            toast.error("Microphone blocked. You joined muted.");
          }
        }
        if (callType === "video" && !startCamOff) {
          try {
            await room.localParticipant.setCameraEnabled(true);
            setCamEnabled(true);
          } catch (mediaErr) {
            setCamEnabled(false);
            setMediaError(formatDevicePermissionMessage("camera"));
            toast.error("Camera blocked. You joined with camera off.");
          }
        }
        if (data.isHost) {
          try {
            await room.localParticipant.setMetadata("host");
          } catch (metadataErr) {
            console.warn("[livekit] Could not update local metadata", metadataErr);
          }
        }
        refreshParticipants();

        // Auto-record (host only)
        if (autoRecord && data.isHost && data.sessionId) {
          try {
            const { error: recErr } = await supabase.functions.invoke("livekit-recording", {
              body: { sessionId: data.sessionId, action: "start" },
            });
            if (recErr) throw recErr;
            setIsRecording(true);
            toast.success("Recording started");
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            toast.error(`Auto-record failed: ${m}`);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!cancelled) {
          setError(msg);
          setState("error");
          toast.error(`Could not join call: ${msg}`);
        }
      }
    })();

    return () => {
      cancelled = true;
      void room.disconnect();
      roomRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, roomName, formatDevicePermissionMessage]);

  /* ----------------- Auto-prune old reactions ----------------- */
  useEffect(() => {
    if (reactions.length === 0) return;
    const t = setInterval(() => {
      const cutoff = Date.now() - 3500;
      setReactions((prev) => prev.filter((r) => r.ts > cutoff));
    }, 1000);
    return () => clearInterval(t);
  }, [reactions.length]);

  /* ----------------- Controls ----------------- */
  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !micEnabled;
    try {
      await room.localParticipant.setMicrophoneEnabled(next);
      setMicEnabled(next);
      setMediaError(null);
      setScreenShareBlocked(false);
    } catch (e) {
      setMicEnabled(false);
      setMediaError(formatDevicePermissionMessage("microphone"));
      toast.error("Microphone permission is blocked.");
    }
  }, [formatDevicePermissionMessage, micEnabled]);

  const toggleCam = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !camEnabled;
    try {
      await room.localParticipant.setCameraEnabled(next);
      setCamEnabled(next);
      setMediaError(null);
      setScreenShareBlocked(false);
    } catch (e) {
      setCamEnabled(false);
      setMediaError(formatDevicePermissionMessage("camera"));
      toast.error("Camera permission is blocked.");
    }
  }, [camEnabled, formatDevicePermissionMessage]);

  const toggleScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    try {
      const next = !isScreenSharing;
      await room.localParticipant.setScreenShareEnabled(next);
      setIsScreenSharing(next);
      setMediaError(null);
      setScreenShareBlocked(false);
    } catch (e) {
      setIsScreenSharing(false);
      setMediaError(formatDevicePermissionMessage("screen"));
      setScreenShareBlocked(true);
    }
  }, [formatDevicePermissionMessage, isScreenSharing]);

  const sendReaction = useCallback(
    async (emoji: string) => {
      const room = roomRef.current;
      if (!room) return;
      const data = new TextEncoder().encode(JSON.stringify({ type: "reaction", emoji } satisfies DataMsg));
      await room.localParticipant.publishData(data, { reliable: true });
      // Show our own reaction immediately
      setReactions((prev) => [
        ...prev,
        { id: crypto.randomUUID(), participantId: room.localParticipant.identity, emoji, ts: Date.now() },
      ]);
    },
    [],
  );

  const toggleHandRaise = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !handRaised;
    setHandRaised(next);
    const data = new TextEncoder().encode(JSON.stringify({ type: "hand", raised: next } satisfies DataMsg));
    await room.localParticipant.publishData(data, { reliable: true });
  }, [handRaised]);

  const clearMediaError = useCallback(() => {
    setMediaError(null);
  }, []);

  const startRecording = useCallback(async () => {
    if (!sessionId || !isHost) return;
    const { error: e } = await supabase.functions.invoke("livekit-recording", {
      body: { sessionId, action: "start" },
    });
    if (e) {
      toast.error(`Could not start recording: ${e.message}`);
      return;
    }
    setIsRecording(true);
    toast.success("Recording started");
  }, [sessionId, isHost]);

  const stopRecording = useCallback(async () => {
    if (!sessionId || !isHost) return;
    const { error: e } = await supabase.functions.invoke("livekit-recording", {
      body: { sessionId, action: "stop" },
    });
    if (e) {
      toast.error(`Could not stop recording: ${e.message}`);
      return;
    }
    setIsRecording(false);
    toast.success("Recording saved");
  }, [sessionId, isHost]);

  const leave = useCallback(async () => {
    const room = roomRef.current;
    if (room) await room.disconnect();
    setState("ended");
    onEnded?.();
  }, [onEnded]);

  const screenShareSource = useMemo(
    () => participants.find((p) => p.isScreenSharing) ?? null,
    [participants],
  );

  return {
    state,
    error,
    mediaError,
    participants,
    screenShareSource,
    reactions,
    isHost,
    isRecording,
    isScreenSharing,
    screenShareBlocked,
    micEnabled,
    camEnabled,
    handRaised,
    sessionId,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    sendReaction,
    toggleHandRaise,
    clearMediaError,
    startRecording,
    stopRecording,
    leave,
  };
}
