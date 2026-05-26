/**
 * useGroupCall — Manage mesh-topology WebRTC group calls
 * Creates a peer connection per remote participant, coordinated via Supabase Realtime
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { topicForGroupSync } from "@/lib/security/channelName";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export interface GroupParticipant {
  id: string;          // participant row id
  userId: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
}

interface PeerEntry {
  pc: RTCPeerConnection;
  participantId: string;
  userId: string;
}

interface UseGroupCallOptions {
  groupCallId: string;
  userId: string;
  userName: string;
  callType: "voice" | "video";
  onEnded: () => void;
}

export function useGroupCall({
  groupCallId,
  userId,
  userName,
  callType,
  onEnded,
}: UseGroupCallOptions) {
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [callState, setCallState] = useState<"joining" | "connected" | "ended">("joining");

  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, PeerEntry>>(new Map());
  const startedRef = useRef(false);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const getSignalChannel = useCallback(() => {
    if (signalChannelRef.current) return signalChannelRef.current;
    if (!groupCallId) return null;
    const channel = supabase.channel(topicForGroupSync(groupCallId, "group-signal"));
    signalChannelRef.current = channel;
    return channel;
  }, [groupCallId]);

  // Get local media
  const getLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: callType === "video",
    });
    localStreamRef.current = stream;
    return stream;
  }, [callType]);

  // Create a peer connection for a specific participant
  const createPeerConnection = useCallback(
    async (participantId: string, remoteUserId: string, isInitiator: boolean) => {
      if (peersRef.current.has(remoteUserId)) return;

      const localStream = await getLocalStream();
      const pc = new RTCPeerConnection(ICE_SERVERS);

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      const entry: PeerEntry = { pc, participantId, userId: remoteUserId };
      peersRef.current.set(remoteUserId, entry);

      // Handle remote stream
      pc.ontrack = (e) => {
        if (e.streams[0]) {
          setParticipants((prev) => {
            const existing = prev.find((p) => p.userId === remoteUserId);
            if (existing) {
              return prev.map((p) =>
                p.userId === remoteUserId ? { ...p, stream: e.streams[0] } : p
              );
            }
            return [
              ...prev,
              {
                id: participantId,
                userId: remoteUserId,
                name: remoteUserId.slice(0, 8),
                stream: e.streams[0],
                isMuted: false,
                isCameraOff: false,
              },
            ];
          });
        }
      };

      // ICE candidates — broadcast via Supabase Realtime
      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const channel = getSignalChannel();
        if (!channel) return;
        channel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: {
            from: userId,
            to: remoteUserId,
            candidate: e.candidate.toJSON(),
          },
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setCallState("connected");
        }
        if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
          // Remove this peer
          peersRef.current.delete(remoteUserId);
          setParticipants((prev) => prev.filter((p) => p.userId !== remoteUserId));
        }
      };

      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const channel = getSignalChannel();
        if (!channel) return pc;
        channel.send({
          type: "broadcast",
          event: "offer",
          payload: {
            from: userId,
            to: remoteUserId,
            offer: { type: offer.type, sdp: offer.sdp },
          },
        });
      }

      return pc;
    },
    [getLocalStream, groupCallId, userId]
  );

  // Join the group call
  const join = useCallback(async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setCallState("joining");

    try {
      await getLocalStream();

      // Register self as participant
      await (supabase as any)
        .from("group_call_participants")
        .upsert({
          group_call_id: groupCallId,
          user_id: userId,
          status: "joined",
          joined_at: new Date().toISOString(),
          is_muted: false,
          is_camera_off: callType !== "video",
        }, { onConflict: "group_call_id,user_id" });

      // Fetch existing participants
      const { data: existingParticipants } = await (supabase as any)
        .from("group_call_participants")
        .select("id, user_id, is_muted, is_camera_off")
        .eq("group_call_id", groupCallId)
        .eq("status", "joined")
        .neq("user_id", userId);

      if (existingParticipants) {
        for (const p of existingParticipants) {
          setParticipants((prev) => {
            if (prev.find((x) => x.userId === p.user_id)) return prev;
            return [
              ...prev,
              {
                id: p.id,
                userId: p.user_id,
                name: p.user_id.slice(0, 8),
                stream: null,
                isMuted: p.is_muted || false,
                isCameraOff: p.is_camera_off || false,
              },
            ];
          });

          // Initiate connection — higher ID initiates to avoid duplicate offers
          const isInitiator = userId > p.user_id;
          await createPeerConnection(p.id, p.user_id, isInitiator);
        }
      }

      // Update group call status
      await (supabase as any)
        .from("group_calls")
        .update({ status: "active", started_at: new Date().toISOString() })
        .eq("id", groupCallId)
        .eq("status", "pending");

      setCallState("connected");
    } catch (err) {
      console.error("Failed to join group call:", err);
      setCallState("ended");
      onEnded();
    }
  }, [groupCallId, userId, callType, getLocalStream, createPeerConnection, onEnded]);

  // Listen for signaling events via Supabase Realtime broadcast
  useEffect(() => {
    if (!groupCallId || !startedRef.current) return;

    const channel = getSignalChannel();
    if (!channel) return;

    channel
      .on("broadcast", { event: "offer" }, async ({ payload }: any) => {
        if (payload.to !== userId) return;
        const pc = await createPeerConnection(payload.from, payload.from, false);
        if (pc) {
          await pc.setRemoteDescription(payload.offer);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "answer",
            payload: { from: userId, to: payload.from, answer: { type: answer.type, sdp: answer.sdp } },
          });
        }
      })
      .on("broadcast", { event: "answer" }, async ({ payload }: any) => {
        if (payload.to !== userId) return;
        const entry = peersRef.current.get(payload.from);
        if (entry?.pc && !entry.pc.remoteDescription) {
          await entry.pc.setRemoteDescription(payload.answer);
        }
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }: any) => {
        if (payload.to !== userId) return;
        const entry = peersRef.current.get(payload.from);
        if (entry?.pc) {
          try {
            await entry.pc.addIceCandidate(payload.candidate);
          } catch { /* duplicate or invalid */ }
        }
      })
      .on("broadcast", { event: "participant-left" }, ({ payload }: any) => {
        const entry = peersRef.current.get(payload.userId);
        if (entry) {
          entry.pc.close();
          peersRef.current.delete(payload.userId);
        }
        setParticipants((prev) => prev.filter((p) => p.userId !== payload.userId));
      })
      .on("broadcast", { event: "participant-joined" }, async ({ payload }: any) => {
        if (payload.userId === userId) return;
        // Add placeholder and create connection
        setParticipants((prev) => {
          if (prev.find((x) => x.userId === payload.userId)) return prev;
          return [...prev, {
            id: payload.participantId || payload.userId,
            userId: payload.userId,
            name: payload.userName || payload.userId.slice(0, 8),
            stream: null,
            isMuted: false,
            isCameraOff: false,
          }];
        });
        const isInitiator = userId > payload.userId;
        await createPeerConnection(payload.userId, payload.userId, isInitiator);
      })
      .subscribe();

    // Notify others that we joined
    channel.send({
      type: "broadcast",
      event: "participant-joined",
      payload: { userId, userName, participantId: groupCallId },
    });

    return () => {
      if (signalChannelRef.current === channel) {
        supabase.removeChannel(channel);
        signalChannelRef.current = null;
      }
    };
  }, [groupCallId, userId, userName, createPeerConnection, getSignalChannel]);

  // Watch for participant DB changes (join/leave)
  useEffect(() => {
    if (!groupCallId) return;

    const channel = supabase
      .channel(`group-participants-${groupCallId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "group_call_participants",
        filter: `group_call_id=eq.${groupCallId}`,
      }, (payload: any) => {
        const p = payload.new;
        if (p.user_id === userId) return;

        if (p.status === "left") {
          const entry = peersRef.current.get(p.user_id);
          if (entry) {
            entry.pc.close();
            peersRef.current.delete(p.user_id);
          }
          setParticipants((prev) => prev.filter((x) => x.userId !== p.user_id));
        } else {
          setParticipants((prev) =>
            prev.map((x) =>
              x.userId === p.user_id
                ? { ...x, isMuted: p.is_muted || false, isCameraOff: p.is_camera_off || false }
                : x
            )
          );
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [groupCallId, userId]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    await (supabase as any)
      .from("group_call_participants")
      .update({ is_muted: newMuted })
      .eq("group_call_id", groupCallId)
      .eq("user_id", userId);
  }, [isMuted, groupCallId, userId]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    const newOff = !isCameraOff;
    setIsCameraOff(newOff);
    await (supabase as any)
      .from("group_call_participants")
      .update({ is_camera_off: newOff })
      .eq("group_call_id", groupCallId)
      .eq("user_id", userId);
  }, [isCameraOff, groupCallId, userId]);

  // Leave call
  const leaveCall = useCallback(async () => {
    // Notify others
    const channel = getSignalChannel();
    channel?.send({
      type: "broadcast",
      event: "participant-left",
      payload: { userId },
    });

    // Update DB
    await (supabase as any)
      .from("group_call_participants")
      .update({ status: "left", left_at: new Date().toISOString() })
      .eq("group_call_id", groupCallId)
      .eq("user_id", userId);

    // Close all peer connections
    for (const [, entry] of peersRef.current) {
      entry.pc.close();
    }
    peersRef.current.clear();

    // Stop local stream
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }

    setCallState("ended");
    setParticipants([]);
    startedRef.current = false;
    onEnded();
  }, [groupCallId, userId, onEnded, getSignalChannel]);

  // Invite a user to the group call
  const inviteUser = useCallback(async (targetUserId: string) => {
    // Insert a notification/invite — could also be a chat message
    await (supabase as any)
      .from("group_call_participants")
      .upsert({
        group_call_id: groupCallId,
        user_id: targetUserId,
        status: "invited",
        is_muted: false,
        is_camera_off: false,
      }, { onConflict: "group_call_id,user_id" });
  }, [groupCallId]);

  return {
    join,
    leaveCall,
    toggleMute,
    toggleCamera,
    inviteUser,
    participants,
    isMuted,
    isCameraOff,
    callState,
    localStream: localStreamRef,
  };
}
