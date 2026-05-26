/**
 * GroupCallScreen — Multi-party video/voice call with participant grid (FaceTime 2026 style)
 */
import { useState, useEffect, useRef, useCallback } from "react";
import PhoneOff from "lucide-react/dist/esm/icons/phone-off";
import Mic from "lucide-react/dist/esm/icons/mic";
import MicOff from "lucide-react/dist/esm/icons/mic-off";
import Video from "lucide-react/dist/esm/icons/video";
import VideoOff from "lucide-react/dist/esm/icons/video-off";
import Monitor from "lucide-react/dist/esm/icons/monitor";
import Users from "lucide-react/dist/esm/icons/users";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import MonitorOff from "lucide-react/dist/esm/icons/monitor-off";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import CallQualityBadge from "./CallQualityBadge";
import CallReactions from "./CallReactions";
import AudioVisualizer from "./AudioVisualizer";
import type { CallQualityStats } from "@/hooks/useCallQuality";

interface Participant {
  id: string;
  userId: string;
  name: string;
  stream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
}

interface GroupCallScreenProps {
  callType: "voice" | "video";
  participants: Participant[];
  localStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  duration: number;
  quality?: CallQualityStats;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onEndCall: () => void;
  onInvite: () => void;
}

export default function GroupCallScreen({
  callType,
  participants,
  localStream,
  isMuted,
  isCameraOff,
  isScreenSharing,
  duration,
  quality,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onEndCall,
  onInvite,
}: GroupCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const formatDur = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const totalParticipants = participants.length + 1;
  const gridCols = totalParticipants <= 2 ? 1 : totalParticipants <= 4 ? 2 : 3;

  // Find active speaker for spotlight
  const activeSpeaker = participants.find((p) => p.isSpeaking);

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        paddingTop: "max(var(--zivo-safe-top,0px), 1rem)",
        paddingBottom: "max(var(--zivo-safe-bottom,0px), 1rem)",
        background: callType === "video"
          ? "#000"
          : "linear-gradient(165deg, hsl(var(--background)) 0%, hsl(var(--muted) / 0.4) 50%, hsl(var(--primary) / 0.08) 100%)",
      }}
    >
      {/* Header — glassmorphic */}
      <div className="px-4 py-2 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2 bg-foreground/[0.04] backdrop-blur-xl rounded-full px-3 py-1.5 border border-border/10">
          <Users className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-foreground">Group Call</span>
          <span className="text-[10px] text-muted-foreground">· {totalParticipants}</span>
        </div>
        <div className="flex items-center gap-2">
          {quality && <CallQualityBadge stats={quality} />}
          <span className="text-[11px] font-mono text-muted-foreground tabular-nums bg-foreground/[0.04] backdrop-blur-xl rounded-full px-2.5 py-1 border border-border/10">
            {formatDur(duration)}
          </span>
        </div>
      </div>

      {/* Participant grid */}
      <div className="flex-1 p-2 grid gap-2" style={{
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gridAutoRows: "1fr",
      }}>
        {/* Self tile */}
        <div className={`relative rounded-2xl overflow-hidden border-2 transition-colors ${
          !isMuted ? "border-primary/40" : "border-white/5"
        } bg-muted/20`}>
          {callType === "video" && !isCameraOff ? (
            <video
	              ref={localVideoRef}
	              autoPlay
	              playsInline
	              muted
	              preload="none"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Avatar className="h-16 w-16 border-2 border-primary/10">
                <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">You</AvatarFallback>
              </Avatar>
              <AudioVisualizer isActive={!isMuted} barCount={5} />
            </div>
          )}
          <div className="absolute bottom-2 left-2 flex items-center gap-1">
            <span className="px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-md text-[10px] font-medium text-foreground border border-border/10">You</span>
            {isMuted && <span className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center"><MicOff className="w-3 h-3 text-destructive" /></span>}
          </div>
        </div>

        {/* Remote participants */}
        {participants.map((p) => (
          <ParticipantTile key={p.id} participant={p} isVideo={callType === "video"} />
        ))}

        {/* Add participant tile */}
        {totalParticipants < 8 && (
          <button type="button"
            onClick={onInvite}
            className="rounded-2xl border-2 border-dashed border-border/20 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors backdrop-blur-sm"
          >
            <div className="h-12 w-12 rounded-full bg-primary/5 flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium">Add</span>
          </button>
        )}
      </div>

      {/* Controls — glassmorphic pill */}
      <div className="px-4 pb-2 relative z-10">
        <div className={`${callType === "video" ? "bg-white/10 border-white/10" : "bg-foreground/[0.04] border-border/10"} backdrop-blur-2xl rounded-[28px] border px-4 py-4 shadow-xl`}>
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onToggleMute}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                  isMuted
                    ? callType === "video" ? "bg-white/25 text-white" : "bg-foreground/90 text-background"
                    : callType === "video" ? "bg-white/10 text-white/80" : "bg-foreground/[0.06] text-foreground/60"
                }`}
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </motion.button>
              <span className={`text-[10px] font-medium ${callType === "video" ? "text-white/50" : "text-muted-foreground/70"}`}>
                {isMuted ? "Unmute" : "Mute"}
              </span>
            </div>

            {callType === "video" && (
              <div className="flex flex-col items-center gap-1.5">
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={onToggleCamera}
                  className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                    isCameraOff ? "bg-white/25 text-white" : "bg-white/10 text-white/80"
                  }`}
                >
                  {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
                </motion.button>
                <span className="text-[10px] text-white/50 font-medium">{isCameraOff ? "Start" : "Stop"}</span>
              </div>
            )}

            {/* Reactions */}
            <div className="flex flex-col items-center gap-1.5">
              <CallReactions variant={callType === "video" ? "dark" : "light"} />
              <span className={`text-[10px] font-medium ${callType === "video" ? "text-white/50" : "text-muted-foreground/70"}`}>React</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={onToggleScreenShare}
                className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                  isScreenSharing
                    ? "bg-primary/20 text-primary"
                    : callType === "video" ? "bg-white/10 text-white/80" : "bg-foreground/[0.06] text-foreground/60"
                }`}
              >
                {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
              </motion.button>
              <span className={`text-[10px] font-medium ${callType === "video" ? "text-white/50" : "text-muted-foreground/70"}`}>Screen</span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={onEndCall}
                className="h-14 w-14 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-lg shadow-destructive/30"
              >
                <PhoneOff className="h-6 w-6" />
              </motion.button>
              <span className={`text-[10px] font-medium ${callType === "video" ? "text-white/50" : "text-muted-foreground/70"}`}>End</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ParticipantTile({ participant, isVideo }: { participant: Participant; isVideo: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
      void videoRef.current.play().catch(() => {});
    }
  }, [participant.stream]);

  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
      participant.isSpeaking ? "border-primary/50 shadow-lg shadow-primary/10" : "border-white/5"
    } bg-muted/20`}>
      {isVideo && !participant.isCameraOff && participant.stream ? (
	        <video ref={videoRef} autoPlay playsInline preload="none" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2">
          <Avatar className="h-16 w-16 border-2 border-muted/20">
            <AvatarFallback className="text-lg font-bold bg-muted text-muted-foreground">
              {participant.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {participant.isSpeaking && (
            <AudioVisualizer isActive barCount={5} />
          )}
        </div>
      )}
      <div className="absolute bottom-2 left-2 flex items-center gap-1">
        <span className="px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-md text-[10px] font-medium text-foreground truncate max-w-[80px] border border-border/10">
          {participant.name}
        </span>
        {participant.isMuted && <span className="h-5 w-5 rounded-full bg-destructive/20 flex items-center justify-center"><MicOff className="w-3 h-3 text-destructive" /></span>}
      </div>
      {/* Speaking glow border */}
      {participant.isSpeaking && (
        <motion.div
          className="absolute inset-0 border-2 border-primary/30 rounded-2xl pointer-events-none"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
    </div>
  );
}
