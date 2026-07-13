/**
 * ScreenShareTile — full-bleed video tile dedicated to the active screen share.
 */
import { useEffect, useRef } from "react";
import { MonitorUp } from "lucide-react";
import type { LKParticipant } from "@/hooks/useLiveKitCall";

interface Props {
  participant: LKParticipant;
}

export default function ScreenShareTile({ participant }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (participant.screenTrack) {
      const stream = new MediaStream([participant.screenTrack]);
      el.srcObject = stream;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [participant.screenTrack]);

  return (
    <div className="relative h-full w-full bg-black">
      <video
	        ref={videoRef}
	        playsInline
	        muted={participant.isLocal}
	        preload="none"
	        className="h-full w-full object-contain"
	      />
      <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur">
        <MonitorUp className="h-3 w-3 text-blue-400" />
        <span>{participant.isLocal ? "You" : participant.name} is sharing</span>
      </div>
    </div>
  );
}
