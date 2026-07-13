/**
 * VideoTile — single participant tile inside the call grid.
 * Shows the camera track (or initials placeholder), name, mute/host badges,
 * a hand-raised indicator, and a "screen sharing" badge.
 */
import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Crown, Hand, MonitorUp, MoreVertical, UserX, VolumeX, Volume2, Loader2 } from "lucide-react";
import type { LKParticipant } from "@/hooks/useLiveKitCall";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  participant: LKParticipant;
  emphasized?: boolean;
  /** When true, every tile shows a small pulsing red dot for privacy disclosure */
  isRecording?: boolean;
  /** True when the local viewer is the host of this room — surfaces the
   *  moderation menu (mute / unmute / kick) on remote tiles. */
  viewerIsHost?: boolean;
  /** LiveKit room name — required for moderation calls. */
  roomName?: string;
}

export default function VideoTile({ participant, emphasized = false, isRecording = false, viewerIsHost = false, roomName }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState<null | "mute" | "unmute" | "kick">(null);

  // Moderation: invokes livekit-moderate edge fn. Only renders for hosts on
  // remote (non-local) tiles. Identity is the LiveKit identity, not name.
  async function moderate(action: "mute" | "unmute" | "kick") {
    if (!roomName) return;
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("livekit-moderate", {
        body: { roomName, participantIdentity: participant.identity, action },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(action === "kick" ? "Removed from call" : action === "mute" ? "Muted" : "Unmuted");
      setMenuOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Action failed");
    } finally {
      setBusy(null);
    }
  }

  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (participant.cameraTrack && participant.camEnabled) {
      const stream = new MediaStream([participant.cameraTrack]);
      el.srcObject = stream;
      void el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [participant.cameraTrack, participant.camEnabled]);

  const initials = (participant.name || "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/10 ${
        emphasized ? "ring-2 ring-emerald-400/70" : ""
      }`}
    >
      {participant.camEnabled && participant.cameraTrack ? (
        <video
	          ref={videoRef}
	          muted={participant.isLocal}
	          playsInline
	          preload="none"
	          className="h-full w-full object-cover"
	        />
      ) : (
        <>
          {participant.avatarUrl && (
            <img
              src={participant.avatarUrl}
	              alt=""
	              aria-hidden="true"
	              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-25 blur-2xl"
	              loading="lazy"
	              decoding="async"
	            />
          )}
          <div className="relative grid h-20 w-20 place-items-center overflow-hidden rounded-full bg-zinc-700 text-2xl font-semibold text-white shadow-2xl ring-2 ring-white/20 sm:h-24 sm:w-24 sm:text-3xl">
            {participant.avatarUrl ? (
	              <img
	                src={participant.avatarUrl}
	                alt=""
	                className="h-full w-full object-cover"
	                loading="lazy"
	                decoding="async"
	              />
            ) : (
              initials
            )}
          </div>
        </>
      )}

      {/* Top-left: REC privacy indicator */}
      {isRecording && (
        <div
          className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow"
          title="This call is being recorded"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          REC
        </div>
      )}

      {/* Top-right: badges + host moderation menu */}
      <div className="absolute right-2 top-2 flex items-center gap-1">
        {participant.isHost && (
          <span className="rounded-full bg-amber-500/90 p-1 text-white" title="Host">
            <Crown className="h-3 w-3" />
          </span>
        )}
        {participant.isScreenSharing && (
          <span className="rounded-full bg-blue-500/90 p-1 text-white" title="Screen sharing">
            <MonitorUp className="h-3 w-3" />
          </span>
        )}
        {viewerIsHost && !participant.isLocal && roomName && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
              className="rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              aria-label="Host actions"
              title="Host actions"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-7 z-10 w-32 rounded-lg bg-black/90 backdrop-blur-md p-1 ring-1 ring-white/10 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                {participant.micEnabled ? (
                  <button
                    type="button"
                    onClick={() => moderate("mute")}
                    disabled={busy !== null}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {busy === "mute" ? <Loader2 className="h-3 w-3 animate-spin" /> : <VolumeX className="h-3 w-3" />}
                    Mute
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => moderate("unmute")}
                    disabled={busy !== null}
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    {busy === "unmute" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Volume2 className="h-3 w-3" />}
                    Unmute
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    toast(`Remove ${participant.name} from the call?`, {
                      action: { label: "Remove", onClick: () => moderate("kick") },
                      cancel: { label: "Cancel", onClick: () => {} },
                    });
                  }}
                  disabled={busy !== null}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-[11px] text-rose-400 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {busy === "kick" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserX className="h-3 w-3" />}
                  Kick
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom-left: name + mic */}
      <div className="absolute bottom-3 left-3 flex max-w-[80%] items-center gap-1.5 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur">
        {participant.micEnabled ? (
          <Mic className="h-3 w-3" />
        ) : (
          <MicOff className="h-3 w-3 text-foreground" />
        )}
        <span className="truncate">{participant.isLocal ? "You" : participant.name}</span>
      </div>

      {/* Hand raise */}
      {participant.handRaised && (
        <div className="absolute left-1/2 top-3 -translate-x-1/2 animate-bounce rounded-full bg-amber-400 p-2 text-amber-900 shadow-lg">
          <Hand className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
