/**
 * GroupCallLauncher — Convenience wrapper that runs the pre-join lobby
 * and then mounts the LiveKit group call screen with the chosen settings.
 *
 * Usage:
 *   <GroupCallLauncher roomName="group-<id>" callType="video" onEnded={...} />
 */
import { lazy, Suspense, useState } from "react";
import { createPortal } from "react-dom";
import CallLobby, { type CallLobbyResult } from "./CallLobby";

const GroupCallScreenV2 = lazy(() => import("./GroupCallScreenV2"));

interface Props {
  roomName: string;
  callType?: "audio" | "video";
  meetingLabel?: string;
  onEnded?: () => void;
}

export default function GroupCallLauncher({ roomName, callType = "video", meetingLabel, onEnded }: Props) {
  const [joined, setJoined] = useState<CallLobbyResult | null>(null);

  if (!joined) {
    const lobby = (
      <CallLobby
        roomName={roomName}
        displayName={meetingLabel}
        callType={callType}
        canRecord
        onCancel={() => onEnded?.()}
        onJoin={setJoined}
      />
    );
    return typeof document === "undefined" ? lobby : createPortal(lobby, document.body);
  }

  const callScreen = (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-[1000] grid place-items-center bg-zinc-950 text-sm text-white/70">
          Connecting…
        </div>
      }
    >
    <GroupCallScreenV2
      roomName={roomName}
      callType={callType}
      meetingLabel={meetingLabel}
      onEnded={onEnded}
      startMicMuted={joined.startMicMuted}
      startCamOff={joined.startCamOff}
      autoRecord={joined.autoRecord}
    />
    </Suspense>
  );
  return typeof document === "undefined" ? callScreen : createPortal(callScreen, document.body);
}
