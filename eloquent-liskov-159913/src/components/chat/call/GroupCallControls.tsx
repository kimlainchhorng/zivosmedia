/**
 * GroupCallControls — Google Meet-style bottom bar for the LiveKit group call.
 *
 * Layout: 3 sections (time/meeting name on the left, primary controls
 * centered, the red End-call pill on the right). Mic / camera toggles turn
 * red when muted / off (Meet parity); other toggles use a subtle filled
 * state to indicate "on".
 */
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff,
  Hand, Circle, Square, PhoneOff,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  micEnabled: boolean;
  camEnabled: boolean;
  isScreenSharing: boolean;
  screenShareBlocked?: boolean;
  handRaised: boolean;
  isHost: boolean;
  isRecording: boolean;
  meetingLabel?: string;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleScreen: () => void;
  onToggleHand: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onLeave: () => void;
}

function useClockHHMM() {
  const [t, setT] = useState(() => formatHHMM(new Date()));
  useEffect(() => {
    const id = window.setInterval(() => setT(formatHHMM(new Date())), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return t;
}
function formatHHMM(d: Date) {
  // 12-hour clock to match Google Meet's bottom-left chip
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, "0")} ${am ? "AM" : "PM"}`;
}

interface BtnProps {
  onClick: () => void;
  active?: boolean;       // "feature ON" — filled white pill (e.g. screen-share, hand-raise)
  muted?: boolean;        // mic / camera is off — red filled
  warning?: boolean;      // permission blocked / needs attention
  children: React.ReactNode;
  label: string;
  shortLabel?: string;
}
function CtrlBtn({ onClick, active, muted, warning, children, label, shortLabel }: BtnProps) {
  return (
    <div className="flex min-w-12 flex-col items-center gap-1">
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className={cn(
          "grid h-11 w-11 sm:h-12 sm:w-12 place-items-center rounded-full transition active:scale-95",
          muted
            ? "bg-rose-500 text-white hover:bg-rose-600"
            : warning
            ? "bg-amber-400/15 text-amber-200 ring-1 ring-amber-300/40 hover:bg-amber-400/25"
            : active
            ? "bg-white text-zinc-900 hover:bg-white/90"
            : "bg-white/10 text-white hover:bg-white/20"
        )}
      >
        {children}
      </button>
      <span className="hidden text-[10px] font-medium leading-none text-white/60 md:block">
        {shortLabel ?? label}
      </span>
    </div>
  );
}

export default function GroupCallControls(props: Props) {
  const clock = useClockHHMM();

  return (
    <div
      className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-end gap-3 bg-black/75 px-3 sm:px-6 backdrop-blur-xl"
      style={{ paddingTop: 14, paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 18px)" }}
    >
      {/* Left: time + meeting label */}
      <div className="flex items-center gap-2 text-[13px] text-white/85 min-w-0">
        <span className="tabular-nums">{clock}</span>
        {props.meetingLabel && (
          <>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:inline truncate text-white/70">{props.meetingLabel}</span>
          </>
        )}
      </div>

      {/* Center: primary controls */}
      <div className="flex items-start gap-1.5 sm:gap-2">
        <CtrlBtn onClick={props.onToggleMic} muted={!props.micEnabled} label="Toggle microphone" shortLabel="Mic">
          {props.micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </CtrlBtn>
        <CtrlBtn onClick={props.onToggleCam} muted={!props.camEnabled} label="Toggle camera" shortLabel="Camera">
          {props.camEnabled ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </CtrlBtn>
        <CtrlBtn
          onClick={props.onToggleScreen}
          active={props.isScreenSharing}
          warning={props.screenShareBlocked}
          label={
            props.screenShareBlocked
              ? "Screen sharing is blocked. Allow screen sharing permission, then try again."
              : "Share screen"
          }
          shortLabel={props.screenShareBlocked ? "Retry" : "Share"}
        >
          {props.isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <MonitorUp className="h-5 w-5" />}
        </CtrlBtn>

        <CtrlBtn onClick={props.onToggleHand} active={props.handRaised} label="Raise hand" shortLabel="Hand">
          <Hand className="h-5 w-5" />
        </CtrlBtn>

        {props.isHost && (
          <CtrlBtn
            onClick={props.isRecording ? props.onStopRecording : props.onStartRecording}
            active={props.isRecording}
            label={props.isRecording ? "Stop recording" : "Start recording"}
            shortLabel={props.isRecording ? "Stop" : "Record"}
          >
            {props.isRecording ? (
              <Square className="h-4 w-4 fill-rose-500 text-foreground" />
            ) : (
              <Circle className="h-5 w-5" />
            )}
          </CtrlBtn>
        )}
      </div>

      {/* Right: End call pill */}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          aria-label="Leave call"
          title="Leave call"
          onClick={props.onLeave}
          className="flex h-11 items-center gap-2 rounded-full bg-rose-500 px-4 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition hover:bg-rose-600 active:scale-95 sm:h-12 sm:px-6"
        >
          <PhoneOff className="h-5 w-5" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}
