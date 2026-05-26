/**
 * useScreenShare — Add screen sharing to a WebRTC peer connection
 */
import { useState, useRef, useCallback, type RefObject } from "react";

export function useScreenShare(pcRef: RefObject<RTCPeerConnection | null>) {
  const [isSharing, setIsSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const originalTrackRef = useRef<MediaStreamTrack | null>(null);

  const startSharing = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || isSharing) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      const screenTrack = screenStream.getVideoTracks()[0];
      screenStreamRef.current = screenStream;

      // Find the existing video sender and replace its track
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        originalTrackRef.current = videoSender.track;
        await videoSender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, screenStream);
      }

      setIsSharing(true);

      // Auto-stop when user clicks "Stop sharing" in browser UI
      screenTrack.onended = () => {
        stopSharing();
      };
    } catch {
      // User cancelled or not supported
    }
  }, [pcRef, isSharing]);

  const stopSharing = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !isSharing) return;

    // Restore original camera track
    if (originalTrackRef.current) {
      const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(originalTrackRef.current);
      }
    }

    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    originalTrackRef.current = null;
    setIsSharing(false);
  }, [pcRef, isSharing]);

  const toggleSharing = useCallback(async () => {
    if (isSharing) {
      await stopSharing();
    } else {
      await startSharing();
    }
  }, [isSharing, startSharing, stopSharing]);

  return { isSharing, startSharing, stopSharing, toggleSharing };
}