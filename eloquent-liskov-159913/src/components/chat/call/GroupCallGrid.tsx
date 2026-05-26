/**
 * GroupCallGrid — adaptive FaceTime-style grid (1 → 8 participants).
 * If anyone is sharing their screen, the grid collapses into a sidebar
 * and ScreenShareTile takes the spotlight.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, UserPlus } from "lucide-react";
import VideoTile from "./VideoTile";
import ScreenShareTile from "./ScreenShareTile";
import type { LKParticipant } from "@/hooks/useLiveKitCall";
import { toast } from "sonner";

interface Props {
  participants: LKParticipant[];
  screenShareSource: LKParticipant | null;
  isRecording?: boolean;
  /** Forwarded to each VideoTile so the host sees the moderation menu. */
  viewerIsHost?: boolean;
  /** LiveKit room name — required for moderation actions. */
  roomName?: string;
}

function gridClass(n: number): string {
  if (n <= 1) return "grid-cols-1 grid-rows-1";
  if (n === 2) return "grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1";
  if (n <= 4) return "grid-cols-2 grid-rows-2";
  if (n <= 6) return "grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2";
  return "grid-cols-2 grid-rows-4 md:grid-cols-4 md:grid-rows-2"; // up to 8
}

export default function GroupCallGrid({ participants, screenShareSource, isRecording = false, viewerIsHost = false, roomName }: Props) {
  const [manualInviteUrl, setManualInviteUrl] = useState<string | null>(null);
  const manualInviteRef = useRef<HTMLInputElement | null>(null);
  const orderedParticipants = useMemo(() => {
    // Local first for predictability
    return [...participants].sort((a, b) => Number(b.isLocal) - Number(a.isLocal));
  }, [participants]);

  useEffect(() => {
    if (!manualInviteUrl) return;
    window.requestAnimationFrame(() => {
      manualInviteRef.current?.focus();
      manualInviteRef.current?.select();
    });
  }, [manualInviteUrl]);

  const copyInviteLink = async () => {
    if (!roomName || typeof window === "undefined") return;
    const url = `${window.location.origin}/chat/call/group/${encodeURIComponent(roomName)}`;
    try {
      await navigator.clipboard?.writeText(url);
      setManualInviteUrl(null);
      toast.success("Invite link copied");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        const copied = document.execCommand("copy");
        if (copied) {
          setManualInviteUrl(null);
          toast.success("Invite link copied");
        } else {
          setManualInviteUrl(url);
          toast.message("Copy is blocked. Invite link selected.");
        }
      } finally {
        document.body.removeChild(textarea);
      }
    }
  };

  // SCREEN SHARE LAYOUT: spotlight + horizontal strip
  if (screenShareSource) {
    return (
      <div className="grid h-full grid-rows-[1fr_120px] gap-2 p-2 md:grid-cols-[1fr_220px] md:grid-rows-1">
        <div className="overflow-hidden rounded-2xl">
          <ScreenShareTile participant={screenShareSource} />
        </div>
        <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto">
          {orderedParticipants.map((p) => (
            <div key={p.identity} className="aspect-video h-full shrink-0 md:h-auto md:w-full">
              <VideoTile participant={p} isRecording={isRecording} viewerIsHost={viewerIsHost} roomName={roomName} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // NORMAL GRID
  const n = orderedParticipants.length;
  const isSoloLocal = n === 1 && orderedParticipants[0]?.isLocal;
  return (
    <div className={`relative grid h-full gap-2 p-2 ${gridClass(n)}`}>
      {orderedParticipants.map((p) => (
        <VideoTile key={p.identity} participant={p} isRecording={isRecording} viewerIsHost={viewerIsHost} roomName={roomName} />
      ))}
      {isSoloLocal && (
        <div className="absolute left-1/2 top-8 flex w-[min(88vw,360px)] -translate-x-1/2 flex-col items-center rounded-3xl border border-white/10 bg-zinc-950/30 px-5 py-4 text-center shadow-2xl backdrop-blur-md sm:top-10">
          <div className="mb-2 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white/80">
            <UserPlus className="h-5 w-5" />
          </div>
          <p className="text-lg font-semibold text-white">You are in the call</p>
          <p className="mt-1 text-sm text-white/60">Waiting for others to join.</p>
          {roomName && (
            <button
              type="button"
              onClick={copyInviteLink}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-black/20 transition hover:bg-white/90 active:scale-95"
            >
              <Copy className="h-4 w-4" />
              Copy invite
            </button>
          )}
          {manualInviteUrl && (
            <div className="mt-3 w-full space-y-1.5">
              <input
                ref={manualInviteRef}
                readOnly
                value={manualInviteUrl}
                onFocus={(event) => event.currentTarget.select()}
                onClick={(event) => event.currentTarget.select()}
                className="w-full rounded-xl border border-white/15 bg-black/35 px-3 py-2 text-center text-xs text-white/80 outline-none selection:bg-white selection:text-zinc-950"
                aria-label="Invite link"
              />
              <p className="text-[11px] text-white/50">Press Ctrl+C to copy the selected link.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
