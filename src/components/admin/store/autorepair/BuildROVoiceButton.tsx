/**
 * Build R.O. — voice dictation button (VSM's mic on the notes panel).
 * Uses the browser Web Speech API to transcribe speech and hand the text back
 * via onTranscript, so a writer can dictate the complaint / diagnosis instead
 * of typing. Renders nothing when the browser has no SpeechRecognition.
 */
import { useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { toast } from "sonner";

interface Props {
  onTranscript: (text: string) => void;
  title?: string;
}

export default function BuildROVoiceButton({ onTranscript, title }: Props) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
    setSupported(!!SR);
    return () => { try { recRef.current?.abort(); } catch { /* noop */ } };
  }, []);

  const toggle = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("Voice input isn't supported in this browser"); return; }
    if (listening) { try { recRef.current?.stop(); } catch { /* noop */ } return; }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: any) => {
      const text = Array.from(e.results).map((r: any) => r[0]?.transcript ?? "").join(" ").replace(/\s+/g, " ").trim();
      if (text) onTranscript(text);
    };
    rec.onerror = (e: any) => {
      if (e?.error && e.error !== "aborted" && e.error !== "no-speech") toast.error(`Voice input: ${e.error}`);
      setListening(false);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    try { rec.start(); setListening(true); }
    catch { /* start() throws if already running — ignore */ }
  };

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={title || (listening ? "Stop dictation" : "Dictate with your voice")}
      aria-label="Voice dictation"
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition ${
        listening ? "animate-pulse bg-red-500/15 text-red-600" : "text-primary hover:bg-primary/10"
      }`}
    >
      {listening ? <Square className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
      {listening ? "Stop" : "Voice"}
    </button>
  );
}
