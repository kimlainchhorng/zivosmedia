/**
 * GroupCallScreenV2 — full-screen LiveKit-backed group call.
 * Mount this when participant count is expected to exceed 4
 * (the existing mesh-based GroupCallScreen still handles ≤4).
 *
 * Usage:
 *   <GroupCallScreenV2 roomName="group-<id>" callType="video" onEnded={...} />
 */
import { useEffect } from "react";
import { AlertTriangle, Loader2, Lock, Radio, Users, X } from "lucide-react";
import { useLiveKitCall } from "@/hooks/useLiveKitCall";
import GroupCallGrid from "./GroupCallGrid";
import GroupCallControls from "./GroupCallControls";

interface Props {
  roomName: string;
  callType?: "audio" | "video";
  onEnded?: () => void;
  startMicMuted?: boolean;
  startCamOff?: boolean;
  autoRecord?: boolean;
  /** Human-readable label for the meeting, shown in the bottom-left chip. */
  meetingLabel?: string;
}

export default function GroupCallScreenV2({
  roomName,
  callType = "video",
  onEnded,
  startMicMuted,
  startCamOff,
  autoRecord,
  meetingLabel,
}: Props) {
  // Derive a friendly chip label: "ZIVO class" if provided, otherwise show
  // the raw room slug (after the `group-` prefix) which still beats an empty
  // chip in the bottom-left of the call bar.
  const derivedLabel = meetingLabel ?? roomName.replace(/^group-/, "");
  const call = useLiveKitCall({
    roomName,
    callType,
    enabled: true,
    onEnded,
    startMicMuted,
    startCamOff,
    autoRecord,
  });

  // Auto-bubble out when the room ends.
  useEffect(() => {
    if (call.state === "ended") onEnded?.();
  }, [call.state, onEnded]);

  return (
    <div className="fixed inset-0 z-[1000] flex flex-col bg-zinc-950 text-white">
      {/* Top bar — Google Meet style: minimal chrome, info chips on the right */}
      <header
        className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 pointer-events-none"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)", paddingBottom: 8 }}
      >
        {/* Recording chip — only when active */}
        <div className="pointer-events-auto">
          {call.isRecording && (
            <span
              className="flex items-center gap-1.5 rounded-full bg-rose-500/95 px-2.5 py-1 text-[11px] font-bold tracking-wider text-white shadow-lg"
              title="This call is being recorded"
            >
              <Radio className="h-3 w-3 animate-pulse" /> REC
            </span>
          )}
        </div>

        {/* Right chips: encryption + participant count */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <span
            className="flex items-center justify-center h-9 w-9 rounded-full bg-white/10 backdrop-blur-md text-emerald-400"
            title="End-to-end encrypted"
          >
            <Lock className="h-4 w-4" />
          </span>
          <span
            className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-medium"
            title={`${call.participants.length} in call`}
          >
            <Users className="h-4 w-4" />
            <span className="tabular-nums">{call.participants.length}</span>
          </span>
        </div>
      </header>

      {/* Stage */}
      <div className="relative flex-1 overflow-hidden">
        {call.state === "connecting" && (
          <div className="grid h-full place-items-center text-sm text-white/70">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Connecting…
            </div>
          </div>
        )}

        {call.state === "error" && (
          <div className="grid h-full place-items-center px-6 text-center">
            <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-white">Could not join the call</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">
                {call.error ?? "Something went wrong while connecting."}
              </p>
              <button
                type="button"
                onClick={onEnded}
                className="mt-4 rounded-full bg-white px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-white/90"
              >
                Back to chat
              </button>
            </div>
          </div>
        )}

        {(call.state === "connected" || call.participants.length > 0) && (
          <>
            {call.mediaError && (
              <div className="absolute left-4 top-[calc(var(--zivo-safe-top,0px)+4rem)] z-20 w-[min(calc(100vw-2rem),460px)] rounded-2xl border border-amber-300/25 bg-zinc-950/85 px-4 py-3 text-sm text-white shadow-2xl backdrop-blur sm:left-6">
                <div className="flex gap-3 pr-7">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <p className="font-semibold">
                      {call.screenShareBlocked ? "Screen sharing is blocked" : "Permission is blocked"}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-white/65">{call.mediaError}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={call.clearMediaError}
                  className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full text-white/55 transition hover:bg-white/10 hover:text-white"
                  aria-label="Dismiss permission warning"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <GroupCallGrid
              participants={call.participants}
              screenShareSource={call.screenShareSource}
              isRecording={call.isRecording}
              viewerIsHost={call.isHost}
              roomName={roomName}
            />
          </>
        )}
      </div>

      {/* Controls */}
      <GroupCallControls
        micEnabled={call.micEnabled}
        camEnabled={call.camEnabled}
        isScreenSharing={call.isScreenSharing}
        screenShareBlocked={call.screenShareBlocked}
        handRaised={call.handRaised}
        isHost={call.isHost}
        isRecording={call.isRecording}
        meetingLabel={derivedLabel}
        onToggleMic={call.toggleMic}
        onToggleCam={call.toggleCam}
        onToggleScreen={call.toggleScreenShare}
        onToggleHand={call.toggleHandRaise}
        onStartRecording={call.startRecording}
        onStopRecording={call.stopRecording}
        onLeave={call.leave}
      />
    </div>
  );
}
