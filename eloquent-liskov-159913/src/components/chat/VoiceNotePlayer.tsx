/**
 * VoiceNotePlayer — Bubble player with waveform + transcript toggle
 *
 * If `transcript` isn't provided up-front, the player exposes a "Transcribe"
 * action that calls the `voice-transcribe` edge function. Results are cached
 * on the server (`voice_transcriptions` table) so subsequent taps from any
 * device hit the cache for free.
 */
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import Play from "lucide-react/dist/esm/icons/play";
import Pause from "lucide-react/dist/esm/icons/pause";
import Languages from "lucide-react/dist/esm/icons/languages";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { toast } from "sonner";

interface Props {
  audioUrl: string;
  durationMs?: number;
  waveform?: number[];
  transcript?: string | null;
  isSignedPath?: boolean; // if true, audioUrl is a storage path that needs signing
  /** Stable message id used as the transcription cache key. Required to enable
   *  the on-demand "Transcribe" button. Pass the chat message UUID. */
  messageId?: string;
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function VoiceNotePlayer({ audioUrl, durationMs = 0, waveform = [], transcript: initialTranscript, isSignedPath, messageId }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(initialTranscript ?? null);
  const [transcribing, setTranscribing] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  async function transcribe() {
    if (!messageId || transcribing) return;
    setTranscribing(true);
    try {
      // Resolve a fetchable URL the edge fn can read. For signed-path mode we
      // need to mint a fresh signed URL; otherwise pass the public URL through.
      let voiceUrl = audioUrl;
      if (isSignedPath) {
        const { data } = await supabase.storage
          .from("voice-notes")
          .createSignedUrl(audioUrl, 600);
        if (!data?.signedUrl) throw new Error("Could not sign voice URL");
        voiceUrl = data.signedUrl;
      }
      const { data, error } = await supabase.functions.invoke("voice-transcribe", {
        body: { messageId, voiceUrl },
      });
      if (error) throw error;
      const text = (data as any)?.text as string | undefined;
      if (!text) {
        const reason = (data as any)?.reason ?? "No transcript available";
        throw new Error(reason);
      }
      setTranscript(text);
      setShowTranscript(true);
    } catch (e: any) {
      toast.error(e?.message || "Could not transcribe");
    } finally {
      setTranscribing(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (isSignedPath) {
        const { data } = await supabase.storage.from("voice-notes").createSignedUrl(audioUrl, 3600);
        if (mounted) setSrc(data?.signedUrl ?? null);
      } else {
        setSrc(audioUrl);
      }
    })();
    return () => { mounted = false; };
  }, [audioUrl, isSignedPath]);

  const toggle = () => {
    if (!audio.current) return;
    if (playing) audio.current.pause(); else audio.current.play();
  };

  const bins = waveform.length > 0 ? waveform : Array(40).fill(0.3);

  return (
    <div className="flex flex-col gap-1 max-w-[280px]">
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={toggle}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        <div className="flex-1 flex items-center gap-[2px] h-8">
          {bins.map((h, i) => {
            const active = i / bins.length <= progress;
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors ${active ? "bg-primary" : "bg-muted-foreground/40"}`}
                style={{ height: `${Math.max(15, h * 100)}%` }}
              />
            );
          })}
        </div>
        <span className="text-xs text-muted-foreground font-mono shrink-0">{fmt(durationMs / 1000)}</span>
      </div>
      {transcript ? (
        <>
          <button type="button"
            onClick={() => setShowTranscript((s) => !s)}
            className="self-start text-xs text-primary flex items-center gap-1 mt-1 hover:underline"
          >
            <Languages className="w-3 h-3" />
            {showTranscript ? "Hide" : "Show"} transcript
          </button>
          {showTranscript && (
            <p className="text-sm text-foreground/90 bg-muted/40 rounded-lg px-2 py-1 mt-1">{transcript}</p>
          )}
        </>
      ) : (
        messageId && (
          <button type="button"
            onClick={transcribe}
            disabled={transcribing}
            className="self-start text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-1 disabled:opacity-50"
            title="Generate text transcript with Whisper"
          >
            {transcribing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Languages className="w-3 h-3" />
            )}
            {transcribing ? "Transcribing…" : "Transcribe"}
          </button>
        )
      )}
      {src && (
        <audio
          ref={audio}
          src={src}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); }}
          onTimeUpdate={(e) => {
            const a = e.currentTarget;
            setProgress(a.duration > 0 ? a.currentTime / a.duration : 0);
          }}
          preload="metadata"
        />
      )}
    </div>
  );
}
