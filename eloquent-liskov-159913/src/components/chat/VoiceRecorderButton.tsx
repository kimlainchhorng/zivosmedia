/**
 * VoiceRecorderButton — Hold-to-record mic with swipe-up cancel
 */
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Mic from "lucide-react/dist/esm/icons/mic";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { useVoiceRecorder, type VoiceRecording } from "@/hooks/useVoiceRecorder";

interface Props {
  onRecorded: (rec: VoiceRecording) => void;
  className?: string;
}

const fmt = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function VoiceRecorderButton({ onRecorded, className }: Props) {
  const { isRecording, elapsedMs, start, stop, cancel } = useVoiceRecorder();
  const [willCancel, setWillCancel] = useState(false);
  const startY = useRef(0);

  const onDown = async (e: React.PointerEvent) => {
    e.preventDefault();
    startY.current = e.clientY;
    setWillCancel(false);
    await start();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!isRecording) return;
    setWillCancel(startY.current - e.clientY > 60);
  };

  const onUp = async () => {
    if (!isRecording) return;
    if (willCancel) {
      await cancel();
    } else {
      const rec = await stop();
      if (rec && rec.durationMs > 500) onRecorded(rec);
    }
    setWillCancel(false);
  };

  return (
    <>
      <button
        type="button"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
          isRecording ? "bg-destructive text-destructive-foreground" : "hover:bg-muted"
        } ${className ?? ""}`}
        aria-label="Hold to record voice"
      >
        <Mic className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-[calc(var(--zivo-safe-bottom,0px)+6rem)] left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3"
          >
            <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm font-mono">{fmt(elapsedMs)}</span>
            <span className={`text-xs flex items-center gap-1 ${willCancel ? "text-destructive" : "text-muted-foreground"}`}>
              {willCancel ? (<><Trash2 className="w-3 h-3" /> Release to cancel</>) : "Slide up to cancel"}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
