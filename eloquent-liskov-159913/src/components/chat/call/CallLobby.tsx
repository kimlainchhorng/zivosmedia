/**
 * CallLobby — Pre-join screen shown before connecting to a LiveKit room.
 * Lets the user enable/disable mic & cam, and (for the host) toggle
 * cloud recording before the call begins.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Mic, MicOff, Video, VideoOff, Radio, X, ArrowRight,
  CheckCircle2, AlertTriangle, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useRecordingPreflight } from "@/hooks/useRecordingPreflight";

export interface CallLobbyResult {
  startMicMuted: boolean;
  startCamOff: boolean;
  autoRecord: boolean;
}

interface Props {
  roomName: string;
  displayName?: string;
  callType?: "audio" | "video";
  /** Suggest record toggle visibility — actual host check still happens server-side */
  canRecord?: boolean;
  onCancel: () => void;
  onJoin: (result: CallLobbyResult) => void;
}

export default function CallLobby({
  roomName,
  displayName,
  callType = "video",
  canRecord = true,
  onCancel,
  onJoin,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(callType === "video");
  const [record, setRecord] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [checkingMedia, setCheckingMedia] = useState(false);
  const { status: bucketStatus, message: bucketMsg } = useRecordingPreflight(canRecord);
  const bucketReady = bucketStatus === "ready";
  const recordDisabled = !bucketReady;
  const recordingRequested = record && bucketReady;
  const title = displayName?.trim() || (roomName.startsWith("group-") ? "Group call" : roomName);
  const showRecordingControls = canRecord && bucketStatus !== "unavailable";

  const stopPreview = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const acquirePreview = useCallback(async () => {
    setCheckingMedia(true);
    setMediaError(null);
    stopPreview();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === "video",
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setMicOn(true);
      setCamOn(callType === "video" && stream.getVideoTracks().length > 0);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      const message = e instanceof Error ? e.message : String(e);
      const denied = name === "NotAllowedError" || /permission denied/i.test(message);
      const friendly = denied
        ? "Camera and microphone are blocked for this browser. You can still join with both off."
        : `Camera/microphone unavailable: ${message}`;
      setMediaError(friendly);
      setMicOn(false);
      setCamOn(false);
      toast.error(denied ? "Camera/mic blocked. Join with both off or allow permission in the browser." : friendly);
    } finally {
      setCheckingMedia(false);
    }
  }, [callType, stopPreview]);

  // Acquire local preview
  useEffect(() => {
    const previewTimer = window.setTimeout(() => {
      void acquirePreview();
    }, 0);
    return () => {
      window.clearTimeout(previewTimer);
      stopPreview();
    };
  }, [acquirePreview, stopPreview]);

  const handleToggleMic = async () => {
    if (!streamRef.current && !checkingMedia) {
      try {
        await acquirePreview();
      } catch {
        return;
      }
    }
    if (streamRef.current?.getAudioTracks().length) setMicOn((v) => !v);
  };

  const handleToggleCam = async () => {
    if (!streamRef.current && !checkingMedia) {
      try {
        await acquirePreview();
      } catch {
        return;
      }
    }
    if (streamRef.current?.getVideoTracks().length) setCamOn((v) => !v);
  };

  // Apply mic/cam preview toggles
  useEffect(() => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn]);
  useEffect(() => {
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn]);

  const handleJoin = () => {
    stopPreview();
    onJoin({
      startMicMuted: !micOn,
      startCamOff: !camOn,
      autoRecord: recordingRequested,
    });
  };

  const handleCancel = () => {
    stopPreview();
    onCancel();
  };

  const lobby = (
    <div className="fixed inset-0 z-[1500] flex flex-col bg-zinc-950 text-white">
      <header
        className="flex shrink-0 items-center justify-between px-4"
        style={{ paddingTop: "calc(var(--zivo-safe-top,0px) + 12px)", paddingBottom: 12 }}
      >
        <div className="min-w-0 pr-2">
          <p className="text-[11px] uppercase tracking-wider text-white/50">Ready to join</p>
          <h2 className="line-clamp-2 break-words text-base font-semibold leading-snug">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Copy invite link — shareable URL recipients can click to land on
              GroupCallEntryPage and join the same LiveKit room. */}
          <button
            type="button"
            onClick={async () => {
              const url = `${window.location.origin}/chat/call/group/${encodeURIComponent(roomName)}${callType === "audio" ? "?audio=1" : ""}`;
              try {
                await navigator.clipboard?.writeText(url);
                const { toast } = await import("sonner");
                toast.success("Invite link copied. Send it to anyone you want to join.");
              } catch {
                /* clipboard blocked */
              }
            }}
            className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 inline-flex items-center gap-1.5"
            aria-label="Copy invite link"
          >
            Copy invite
          </button>
          <button type="button"
            onClick={handleCancel}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Cancel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Self preview */}
      <div className="relative mx-4 flex-1 overflow-hidden rounded-2xl bg-black/60">
        {checkingMedia && (
          <div className="absolute inset-0 z-10 grid place-items-center text-sm text-white/70">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              Checking camera and microphone...
            </div>
          </div>
        )}
        {callType === "video" ? (
          <video
            ref={videoRef}
	            autoPlay
	            playsInline
	            muted
	            preload="none"
	            className={`h-full w-full object-cover ${camOn ? "" : "opacity-0"}`}
	          />
        ) : null}
        {mediaError ? (
          <div className="absolute inset-0 z-20 grid place-items-center px-5 text-center">
            <div className="max-w-md rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-500/15 text-rose-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold text-white">Camera and microphone are off</p>
              <p className="mt-2 text-sm leading-relaxed text-white/65">{mediaError}</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => void acquirePreview()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-white/90"
                >
                  Try permission again
                </button>
                <button
                  type="button"
                  onClick={handleJoin}
                  className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
                >
                  Join with both off
                </button>
              </div>
            </div>
          </div>
        ) : (!camOn || callType === "audio") && (
          <div className="absolute inset-0 grid place-items-center text-sm text-white/60">
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-white/10">
                <VideoOff className="h-8 w-8" />
              </div>
              Camera off
            </div>
          </div>
        )}

        {/* In-preview controls */}
        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
          <button type="button"
            onClick={() => void handleToggleMic()}
            className={`grid h-12 w-12 place-items-center rounded-full ${
              micOn ? "bg-white/15 hover:bg-white/25" : "bg-rose-500 hover:bg-rose-600"
            }`}
            aria-label={micOn ? "Mute mic" : "Unmute mic"}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
          {callType === "video" && (
            <button type="button"
              onClick={() => void handleToggleCam()}
              className={`grid h-12 w-12 place-items-center rounded-full ${
                camOn ? "bg-white/15 hover:bg-white/25" : "bg-rose-500 hover:bg-rose-600"
              }`}
              aria-label={camOn ? "Turn camera off" : "Turn camera on"}
            >
              {camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="mx-4 mt-4 space-y-3">
        {showRecordingControls && (
          <div
            className={`rounded-xl px-4 py-3 transition ${
              recordDisabled ? "bg-white/5 opacity-80" : "bg-white/5"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary">
                  <Radio className="h-4 w-4 text-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">Record this call</p>
                  <p className="text-[11px] text-white/50">
                    Saved privately to the host's recordings
                  </p>
                </div>
              </div>
              <Switch
                checked={recordingRequested}
                onCheckedChange={setRecord}
                disabled={recordDisabled}
                aria-label="Toggle cloud recording"
              />
            </div>

            {/* Pre-call summary: bucket status */}
            <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-black/30 px-3 py-2 text-[11px]">
              <div className="flex min-w-0 items-start gap-2">
                {bucketStatus === "checking" && (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
                    <span className="text-white/70">Checking storage…</span>
                  </>
                )}
                {bucketStatus === "ready" && (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-300">
                      Bucket ready · <span className="text-white/60">call-recordings</span>
                    </span>
                  </>
                )}
                {(bucketStatus as string) === "unavailable" && (
                  <>
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span className="break-words leading-relaxed text-white/65">
                      Recording unavailable
                      {bucketMsg ? ` · ${bucketMsg}` : ""}
                    </span>
                  </>
                )}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${
                  recordingRequested
                    ? "bg-rose-500/20 text-rose-300"
                    : "bg-white/10 text-white/60"
                }`}
              >
                {recordingRequested ? "REC ON" : "REC OFF"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="mx-4 mt-4 flex shrink-0 items-center gap-3"
        style={{ paddingBottom: "calc(var(--zivo-safe-bottom,0px) + 16px)" }}
      >
        <Button variant="secondary" className="flex-1" onClick={handleCancel}>
          Cancel
        </Button>
        <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600" onClick={handleJoin}>
          {mediaError ? "Join with both off" : "Join call"}
          <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(lobby, document.body) : lobby;
}
