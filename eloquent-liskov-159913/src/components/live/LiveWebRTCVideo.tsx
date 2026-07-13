/**
 * LiveWebRTCVideo — Mesh-WebRTC viewer for any live_streams row.
 *
 * Same handshake as PairedStreamViewer, but reusable for the public watcher
 * page (LiveStreamPage). One <RTCPeerConnection> per viewer, signaled through
 * the existing `live_stream_signals` table + Supabase Realtime.
 *
 * Topology: 1 publisher (phone) → N viewers, mesh. Practical cap ~3-5 viewers
 * before the publisher's upstream bandwidth saturates. For larger audiences
 * an SFU is required.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ICE_SERVERS,
  getIceServers,
  logSelectedCandidatePair,
  sendSignal,
  subscribeSignals,
} from "@/lib/liveWebrtc";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  streamId: string;
  /** Visual class for the underlying <video>. */
  className?: string;
  /** Whether to start audio muted (TikTok-style autoplay default). */
  muted?: boolean;
  /** Optional callback when the connection becomes "live". */
  onLive?: () => void;
};

type State =
  | "waiting-for-offer"
  | "negotiating"
  | "connecting"
  | "live"
  | "disconnected";

export default function LiveWebRTCVideo({
  streamId,
  className = "absolute inset-0 w-full h-full object-cover bg-black",
  muted = true,
  onLive,
}: Props) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [state, setState] = useState<State>("waiting-for-offer");

  useEffect(() => {
    if (!streamId) return;

    let active = true;
    let restartTimer: ReturnType<typeof setTimeout> | null = null;
    let restartAttempted = false;
    const pendingIce: RTCIceCandidateInit[] = [];

    setState("waiting-for-offer");
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    getIceServers().then((servers) => {
      if (!active) return;
      try {
        pc.setConfiguration({ iceServers: servers });
      } catch (e) {
        console.warn("[live-viewer] setConfiguration failed", e);
      }
    });

    const flushIce = async () => {
      while (pendingIce.length) {
        const c = pendingIce.shift()!;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        } catch (e) {
          console.warn("[live-viewer] queued ICE failed", e);
        }
      }
    };

    pc.ontrack = (ev) => {
      if (videoRef.current && ev.streams[0]) {
        videoRef.current.srcObject = ev.streams[0];
        videoRef.current.muted = muted;
        void videoRef.current.play().catch((e) => {
          console.warn("[live-viewer] autoplay blocked", e);
        });
        setState("live");
        onLive?.();
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate && active) {
        sendSignal(streamId, "viewer", "publisher", "ice", ev.candidate.toJSON());
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (import.meta.env.DEV) console.log("[live-viewer] iceConnectionState=", pc.iceConnectionState);
    };

    pc.onconnectionstatechange = () => {
      const next = pc.connectionState;
      if (import.meta.env.DEV) console.log("[live-viewer] connectionState=", next);
      if (next === "connected") {
        setState("live");
        restartAttempted = false;
        if (restartTimer) {
          clearTimeout(restartTimer);
          restartTimer = null;
        }
        logSelectedCandidatePair(pc, "live-viewer");
        return;
      }
      if (next === "connecting") {
        setState((s) => (s === "live" ? s : "connecting"));
        return;
      }
      if (next === "failed" || next === "disconnected") {
        setState("disconnected");
        if (!restartAttempted) {
          restartAttempted = true;
          try {
            pc.restartIce();
          } catch (e) {
            console.warn("[live-viewer] restartIce failed", e);
          }
          sendSignal(streamId, "viewer", "publisher", "join", {});
          if (restartTimer) clearTimeout(restartTimer);
          restartTimer = setTimeout(() => {
            if (!active) return;
            if (pc.connectionState === "connected") return;
            if (videoRef.current) videoRef.current.srcObject = null;
          }, 6000);
        }
      }
    };

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    const unsub = subscribeSignals(streamId, "viewer", async (row) => {
      try {
        if (row.type === "offer") {
          if (pc.signalingState !== "stable") return;
          setState("negotiating");
          await pc.setRemoteDescription(new RTCSessionDescription(row.payload));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendSignal(streamId, "viewer", "publisher", "answer", {
            type: answer.type,
            sdp: answer.sdp,
          });
          await flushIce();
        } else if (row.type === "ice" && row.payload) {
          if (!pc.remoteDescription) {
            pendingIce.push(row.payload);
            return;
          }
          try {
            await pc.addIceCandidate(new RTCIceCandidate(row.payload));
          } catch (e) {
            console.warn("[live-viewer] addIceCandidate failed", e);
          }
        } else if (row.type === "bye") {
          if (videoRef.current) videoRef.current.srcObject = null;
          setState("disconnected");
        }
      } catch (e) {
        console.warn("[live-viewer] signal handling error", e);
      }
    });

    sendSignal(streamId, "viewer", "publisher", "join", {});
    const joinRetry = setInterval(() => {
      if (!active) return;
      if (pc.remoteDescription) return;
      if (pc.connectionState === "connected") return;
      sendSignal(streamId, "viewer", "publisher", "join", {});
    }, 2000);

    return () => {
      active = false;
      clearInterval(joinRetry);
      if (restartTimer) clearTimeout(restartTimer);
      if (videoRef.current) videoRef.current.srcObject = null;
      try {
        unsub();
      } catch {}
      try {
        pc.close();
      } catch {}
      pcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId, user?.id]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = muted;
      if (videoRef.current.srcObject) {
        void videoRef.current.play().catch((e) => {
          console.warn("[live-viewer] play() after mute toggle failed", e);
        });
      }
    }
  }, [muted]);

  return (
    <video
      ref={videoRef}
	      autoPlay
	      playsInline
	      muted={muted}
	      preload="none"
	      className={className}
      data-state={state}
    />
  );
}
