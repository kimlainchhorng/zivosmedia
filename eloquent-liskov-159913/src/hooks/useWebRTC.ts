/**
 * useWebRTC — Manages a WebRTC peer connection with Supabase Realtime signaling
 */
import { useRef, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

function getIceServers(): RTCIceServer[] {
  const defaultServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  const turnUrls = import.meta.env.VITE_WEBRTC_TURN_URLS
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!turnUrls?.length) {
    return defaultServers;
  }

  const turnServer: RTCIceServer = {
    urls: turnUrls,
  };

  if (import.meta.env.VITE_WEBRTC_TURN_USERNAME) {
    turnServer.username = import.meta.env.VITE_WEBRTC_TURN_USERNAME;
  }

  if (import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL) {
    turnServer.credential = import.meta.env.VITE_WEBRTC_TURN_CREDENTIAL;
  }

  return [...defaultServers, turnServer];
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: getIceServers(),
};

export type CallRole = "caller" | "callee";

export interface WebRTCFailure {
  code: "permissions" | "devices_unavailable" | "device_busy" | "connection" | "unknown";
  title: string;
  description: string;
}

function getRequestedDeviceLabel(callType: "voice" | "video") {
  return callType === "video" ? "camera and microphone" : "microphone";
}

export function classifyWebRTCFailure(error: unknown, callType: "voice" | "video"): WebRTCFailure {
  const normalizedError = error as DOMException | Error | undefined;
  const errorName = normalizedError?.name || "UnknownError";
  const requestedDeviceLabel = getRequestedDeviceLabel(callType);

  if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError" || errorName === "SecurityError") {
    return {
      code: "permissions",
      title: "Permission required",
      description: `Allow ${requestedDeviceLabel} access to answer calls.`,
    };
  }

  if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError" || errorName === "OverconstrainedError") {
    return {
      code: "devices_unavailable",
      title: "Device unavailable",
      description: `Your ${requestedDeviceLabel} is unavailable for this call.`,
    };
  }

  if (errorName === "NotReadableError" || errorName === "TrackStartError") {
    return {
      code: "device_busy",
      title: "Device busy",
      description: `Another app may already be using your ${requestedDeviceLabel}.`,
    };
  }

  if (
    errorName === "OperationError"
    || errorName === "InvalidStateError"
    || errorName === "NetworkError"
    || errorName === "AbortError"
  ) {
    return {
      code: "connection",
      title: "Connection problem",
      description: "Call setup did not complete. Check network quality and try again.",
    };
  }

  return {
    code: "unknown",
    title: "Call failed",
    description: "The call could not start. Try again in a moment.",
  };
}

interface UseWebRTCOptions {
  callId: string;
  role: CallRole;
  callType: "voice" | "video";
  userId: string;
  onRemoteStream: (stream: MediaStream) => void;
  onEnded: () => void;
  onFailure?: (failure: WebRTCFailure) => void;
}

interface CallSignalData {
  offer?: RTCSessionDescriptionInit | null;
  answer?: RTCSessionDescriptionInit | null;
  caller_ice_candidates?: RTCIceCandidateInit[] | null;
  callee_ice_candidates?: RTCIceCandidateInit[] | null;
  status?: string | null;
}

const PRE_CONNECT_GRACE_MS = 30000;
const POST_CONNECT_GRACE_MS = 10000;
const CALLEE_TERMINATION_GUARD_MS = 8000;

export function useWebRTC({
  callId,
  role,
  callType,
  userId,
  onRemoteStream,
  onEnded,
  onFailure,
}: UseWebRTCOptions) {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [callState, setCallState] = useState<"ringing" | "connected" | "ended">("ringing");
  const addedCandidatesCount = useRef(0);
  const startedRef = useRef(false);
  const hasEverConnectedRef = useRef(false);
  const failureReportedRef = useRef(false);
  const disconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartIceAttemptedRef = useRef(false);
  const callStartAtRef = useRef(0);
  const terminalCheckTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectionPromotedRef = useRef(false);

  const reportFailure = useCallback((error: unknown) => {
    if (failureReportedRef.current) return;
    failureReportedRef.current = true;
    onFailure?.(classifyWebRTCFailure(error, callType));
  }, [callType, onFailure]);

  const clearDisconnectTimeout = useCallback(() => {
    if (!disconnectTimeoutRef.current) return;
    clearTimeout(disconnectTimeoutRef.current);
    disconnectTimeoutRef.current = null;
  }, []);

  const markConnected = useCallback((activeCallId: string) => {
    clearDisconnectTimeout();
    hasEverConnectedRef.current = true;
    restartIceAttemptedRef.current = false;
    setIsReconnecting(false);
    setCallState("connected");

    if (connectionPromotedRef.current) return;
    connectionPromotedRef.current = true;

    (supabase as any).from("call_signals")
      .update({ status: "answered", started_at: new Date().toISOString() })
      .eq("id", activeCallId)
      .in("status", ["ringing", "answered"])
      .then(() => {});
  }, [clearDisconnectTimeout]);

  const cleanup = useCallback(() => {
    clearDisconnectTimeout();
    if (terminalCheckTimerRef.current) {
      clearTimeout(terminalCheckTimerRef.current);
      terminalCheckTimerRef.current = null;
    }
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    addedCandidatesCount.current = 0;
    hasEverConnectedRef.current = false;
    failureReportedRef.current = false;
    restartIceAttemptedRef.current = false;
    callStartAtRef.current = 0;
    connectionPromotedRef.current = false;
    setIsReconnecting(false);
    setCallState("ended");
    startedRef.current = false;
  }, [clearDisconnectTimeout]);

  const shouldDelayTerminalForCallee = useCallback((status: string | null | undefined) => {
    if (role !== "callee") return false;
    if (hasEverConnectedRef.current) return false;
    if (!callStartAtRef.current) return false;
    if (status === "declined") return false;
    return Date.now() - callStartAtRef.current < CALLEE_TERMINATION_GUARD_MS;
  }, [role]);

  const confirmTerminalStatus = useCallback(async (status: string) => {
    try {
      const { data } = await (supabase as any)
        .from("call_signals")
        .select("status")
        .eq("id", callId)
        .maybeSingle();

      return data?.status === status;
    } catch {
      return false;
    }
  }, [callId]);

  const handleTerminalStatus = useCallback(async (status: string) => {
    // "missed" is meaningful for caller no-answer flow. For callee, it can be
    // a stale race artifact right after acceptance, so ignore it.
    if (status === "missed" && role === "callee") {
      return;
    }

    if (shouldDelayTerminalForCallee(status)) {
      if (terminalCheckTimerRef.current) return;

      terminalCheckTimerRef.current = setTimeout(() => {
        terminalCheckTimerRef.current = null;
        void (async () => {
          const stillTerminal = await confirmTerminalStatus(status);
          if (!stillTerminal) return;
          cleanup();
          onEnded();
        })();
      }, 1200);
      return;
    }

    cleanup();
    onEnded();
  }, [cleanup, confirmTerminalStatus, onEnded, role, shouldDelayTerminalForCallee]);

  const scheduleDisconnectTimeout = useCallback((pc: RTCPeerConnection, timeoutMs: number) => {
    if (disconnectTimeoutRef.current) return;

    disconnectTimeoutRef.current = setTimeout(() => {
      if (pcRef.current !== pc) return;
      if (
        pc.connectionState === "connected"
        || pc.iceConnectionState === "connected"
        || pc.iceConnectionState === "completed"
        || hasEverConnectedRef.current
      ) return;

      reportFailure(new DOMException("Connection timed out", "NetworkError"));
      cleanup();
      onEnded();
    }, timeoutMs);
  }, [cleanup, onEnded, reportFailure]);

  const processSignalData = useCallback(async (data: CallSignalData) => {
    // IMPORTANT: Check termination status BEFORE the pc null guard.
    // If the other side ends/declines while our PeerConnection hasn't been
    // created yet, we must still honor the termination signal.
    if (data.status === "ended" || data.status === "declined" || data.status === "missed") {
      await handleTerminalStatus(data.status);
      return;
    }

    const pc = pcRef.current;
    if (!pc) return;

    if (role === "callee" && data.offer && !pc.remoteDescription) {
      try {
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        scheduleDisconnectTimeout(pc, PRE_CONNECT_GRACE_MS);
        await (supabase as any)
          .from("call_signals")
          .update({ answer: { type: answer.type, sdp: answer.sdp } })
          .eq("id", callId);
      } catch (e) {
        console.error("Error handling offer:", e);
      }
    }

    if (role === "caller" && data.answer && !pc.remoteDescription) {
      try {
        await pc.setRemoteDescription(data.answer);
        scheduleDisconnectTimeout(pc, PRE_CONNECT_GRACE_MS);
      } catch (e) {
        console.error("Error handling answer:", e);
      }
    }

    const remoteCandidates = role === "caller" ? data.callee_ice_candidates : data.caller_ice_candidates;
    if (remoteCandidates?.length && pc.remoteDescription) {
      const newCandidates = remoteCandidates.slice(addedCandidatesCount.current);
      for (const candidate of newCandidates) {
        try {
          await pc.addIceCandidate(candidate);
          addedCandidatesCount.current += 1;
        } catch {
          // duplicate or invalid candidate, skip
        }
      }
    }
  }, [callId, handleTerminalStatus, role, scheduleDisconnectTimeout]);

  const syncExistingSignal = useCallback(async (activeCallId: string) => {
    try {
      const { data } = await (supabase as any)
        .from("call_signals")
        .select("offer, answer, caller_ice_candidates, callee_ice_candidates, status")
        .eq("id", activeCallId)
        .single();

      if (data) {
        await processSignalData(data);
      }
    } catch (err) {
      console.warn("Signal sync failed:", err);
    }
  }, [processSignalData]);

  const start = useCallback(async (activeCallId: string) => {
    if (startedRef.current || !activeCallId) return null;
    startedRef.current = true;
    callStartAtRef.current = Date.now();
    setCallState("ringing");
    setIsReconnecting(false);
    clearDisconnectTimeout();
    hasEverConnectedRef.current = false;
    failureReportedRef.current = false;
    restartIceAttemptedRef.current = false;
    connectionPromotedRef.current = false;

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: callType === "video",
      };

      let localStream: MediaStream;
      try {
        localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (initialMediaError) {
        if (callType !== "video") throw initialMediaError;

        // If camera is unavailable/blocked for a video call, fall back to audio
        // so users can still answer instead of dropping the call entirely.
        localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setIsCameraOff(true);
        console.warn("[WebRTC] Video capture unavailable, continuing as audio-only", initialMediaError);
      }

      localStreamRef.current = localStream;

      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.ontrack = (e) => {
        if (e.streams[0]) onRemoteStream(e.streams[0]);

        const promoteConnection = () => {
          markConnected(activeCallId);
        };

        e.track?.addEventListener("unmute", promoteConnection, { once: true });

        if (e.track && !e.track.muted && e.track.readyState === "live") {
          promoteConnection();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          markConnected(activeCallId);
        }
      };

      pc.onicecandidate = async (e) => {
        if (!e.candidate) return;
        const field = role === "caller" ? "caller_ice_candidates" : "callee_ice_candidates";
        try {
          await (supabase as any).rpc("append_ice_candidate", {
            p_call_id: activeCallId,
            p_field: field,
            p_candidate: e.candidate.toJSON(),
          });
        } catch (err: any) {
          console.warn("ICE candidate append failed:", err);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          markConnected(activeCallId);
          return;
        }

        if (pc.connectionState === "disconnected") {
          setIsReconnecting(true);
          scheduleDisconnectTimeout(
            pc,
            hasEverConnectedRef.current ? POST_CONNECT_GRACE_MS : PRE_CONNECT_GRACE_MS,
          );
          return;
        }

        if (pc.connectionState === "failed") {
          setIsReconnecting(true);

          if (!restartIceAttemptedRef.current && typeof pc.restartIce === "function") {
            restartIceAttemptedRef.current = true;
            try {
              pc.restartIce();
              scheduleDisconnectTimeout(
                pc,
                hasEverConnectedRef.current ? POST_CONNECT_GRACE_MS : PRE_CONNECT_GRACE_MS,
              );
              return;
            } catch (err) {
              console.warn("ICE restart failed:", err);
            }
          }

          // During the initial accept/connect phase some browsers can briefly
          // surface `failed` before negotiation fully stabilizes. Give the call
          // a grace window instead of ending immediately.
          if (!hasEverConnectedRef.current) {
            scheduleDisconnectTimeout(pc, PRE_CONNECT_GRACE_MS);
            return;
          }

          clearDisconnectTimeout();
          cleanup();
          onEnded();
          return;
        }

        if (pc.connectionState === "closed") {
          if (!hasEverConnectedRef.current) {
            setIsReconnecting(true);
            scheduleDisconnectTimeout(pc, PRE_CONNECT_GRACE_MS);
            return;
          }

          clearDisconnectTimeout();
          cleanup();
          onEnded();
        }
      };

      if (role === "caller") {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await (supabase as any).from("call_signals")
          .update({ offer: { type: offer.type, sdp: offer.sdp } })
          .eq("id", activeCallId);
      }

      await syncExistingSignal(activeCallId);
      return localStream;
    } catch (err) {
      console.error("WebRTC start failed:", err);

      // If local setup fails (permissions/device/network), immediately end
      // the signaling row so the remote side does not keep ringing.
      try {
        await (supabase as any)
          .from("call_signals")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", activeCallId)
          .in("status", ["ringing", "answered"]);
      } catch {
        // non-blocking; local cleanup still proceeds
      }

      reportFailure(err);
      cleanup();
      onEnded();
      return null;
    }
  }, [callType, cleanup, clearDisconnectTimeout, markConnected, onEnded, onRemoteStream, reportFailure, role, scheduleDisconnectTimeout, syncExistingSignal]);

  useEffect(() => {
    if (!callId) return;

    const channel = supabase
      .channel(`call-signal-${callId}-${crypto.randomUUID()}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "call_signals",
        filter: `id=eq.${callId}`,
      }, (payload: any) => {
        void processSignalData(payload.new);
      })
      .subscribe();

    // Polling fallback: periodically sync full signal data in case realtime
    // misses an update (e.g., network hiccup, subscription gap on mobile).
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await (supabase as any)
          .from("call_signals")
          .select("offer, answer, caller_ice_candidates, callee_ice_candidates, status")
          .eq("id", callId)
          .maybeSingle();

        if (data) {
          void processSignalData(data);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [callId, processSignalData]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  }, []);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCameraOff((c) => !c);
  }, []);

  const endCall = useCallback(async () => {
    await (supabase as any).from("call_signals")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", callId);
    cleanup();
    onEnded();
  }, [callId, cleanup, onEnded]);

  return {
    start,
    endCall,
    toggleMute,
    toggleCamera,
    isMuted,
    isCameraOff,
    isReconnecting,
    callState,
    localStream: localStreamRef,
    peerConnection: pcRef,
  };
}
