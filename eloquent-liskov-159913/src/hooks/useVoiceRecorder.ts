/**
 * useVoiceRecorder — Hold-to-record voice notes with waveform sampling
 */
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export interface VoiceRecording {
  blob: Blob;
  durationMs: number;
  waveform: number[];
  mimeType: string;
}

const voiceMimeCandidates = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/ogg",
] as const;

const VOICE_AUDIO_BITS_PER_SECOND = 32_000;

function getSupportedVoiceMimeType() {
  if (typeof MediaRecorder === "undefined") return null;
  const isTypeSupported = MediaRecorder.isTypeSupported?.bind(MediaRecorder);
  if (!isTypeSupported) return null;
  return voiceMimeCandidates.find((candidate) => isTypeSupported(candidate)) ?? null;
}

async function requestMicrophonePermission(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return true; // Assume granted if we can't query
  }
  try {
    const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return result?.state !== "denied";
  } catch {
    return true; // Assume granted if query fails
  }
}

/** Number of most-recent amplitude samples to expose for live waveforms.
 *  At ~80ms per sample, 32 samples ≈ 2.5s of trailing audio history. */
const LEVELS_BUFFER_SIZE = 32;

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  // Live mic amplitude (0..1) ring buffer — newest at the end. Pumped from
  // the AnalyserNode tick so consumers can render reactive waveforms instead
  // of fake-randomized ones.
  const [levels, setLevels] = useState<number[]>(() => new Array(LEVELS_BUFFER_SIZE).fill(0));
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const stream = useRef<MediaStream | null>(null);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafId = useRef<number | null>(null);
  const samples = useRef<number[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const sampleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelled = useRef(false);

  const stopAll = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null; }
    if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    if (sampleTimer.current) { clearInterval(sampleTimer.current); sampleTimer.current = null; }
    stream.current?.getTracks().forEach((t) => t.stop());
    audioCtx.current?.close().catch(() => {});
    stream.current = null;
    audioCtx.current = null;
    analyser.current = null;
    setLevels(new Array(LEVELS_BUFFER_SIZE).fill(0));
  }, []);

  const start = useCallback(async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const msg = "Microphone recording is not supported on this device";
        console.error("[useVoiceRecorder]", msg);
        toast.error(msg);
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        const msg = "Voice notes are not supported on this device";
        console.error("[useVoiceRecorder]", msg);
        toast.error(msg);
        return;
      }

      // Pre-check the Permissions API where supported. If permission is
      // already denied, surface an actionable toast with a deep-link to
      // Settings instead of triggering yet another silent prompt that the
      // browser/OS has remembered as denied.
      try {
        const perms = (navigator as any).permissions;
        if (perms && typeof perms.query === "function") {
          const status = await perms.query({ name: "microphone" as PermissionName }).catch(() => null);
          if (status && status.state === "denied") {
            const isCapacitor = (window as any).Capacitor?.isNativePlatform?.() === true;
            const settingsHint = isCapacitor
              ? "Open Settings → Privacy → Microphone → enable Zivo"
              : "Click the lock icon in the address bar → Site settings → Allow Microphone";
            // Note: deep-linking to native Settings would require the
            // `capacitor-native-settings` plugin (not installed in this build).
            // We surface a clear, actionable message instead so the user knows
            // exactly where to go without us pulling in another native dep.
            toast.error("Microphone access is blocked", {
              description: settingsHint,
              duration: 6000,
            });
            return;
          }
        }
      } catch {
        /* Permissions API not available or threw — fall through to getUserMedia */
      }

      if (import.meta.env.DEV) console.log("[useVoiceRecorder] Requesting microphone access...");

      cancelled.current = false;
      chunks.current = [];
      samples.current = [];
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (import.meta.env.DEV) console.log("[useVoiceRecorder] Microphone access granted");
      stream.current = s;

      const mimeType = getSupportedVoiceMimeType();
      if (import.meta.env.DEV) console.log("[useVoiceRecorder] Using MIME type:", mimeType);
      const rec = mimeType
        ? new MediaRecorder(s, { mimeType, audioBitsPerSecond: VOICE_AUDIO_BITS_PER_SECOND })
        : new MediaRecorder(s, { audioBitsPerSecond: VOICE_AUDIO_BITS_PER_SECOND });
      recorder.current = rec;
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
      rec.start(100);

      if (import.meta.env.DEV) console.log("[useVoiceRecorder] Recording started, listening to audio stream");

      // Waveform sampling
      const ctx = new AudioContext();
      audioCtx.current = ctx;
      const src = ctx.createMediaStreamSource(s);
      const an = ctx.createAnalyser();
      an.fftSize = 256;
      src.connect(an);
      analyser.current = an;
      const buf = new Uint8Array(an.frequencyBinCount);
      sampleTimer.current = setInterval(() => {
        an.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buf.length);
        const sample = Math.min(1, rms * 2);
        samples.current.push(sample);
        // Push newest sample into the live buffer; drop oldest. New array
        // identity each tick so React notices and re-renders the waveform.
        setLevels((prev) => {
          const next = prev.length >= LEVELS_BUFFER_SIZE ? prev.slice(1) : prev.slice();
          next.push(sample);
          return next;
        });
      }, 80);

      startedAt.current = Date.now();
      setIsRecording(true);
      setElapsedMs(0);
      // Smooth rAF tick — paints from frame 1 instead of waiting 100ms.
      const tick = () => {
        setElapsedMs(Date.now() - startedAt.current);
        rafId.current = requestAnimationFrame(tick);
      };
      rafId.current = requestAnimationFrame(tick);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      const code = (e as any)?.code;
      console.error("[useVoiceRecorder] error:", { name, code, error: e });
      
      let message = "Could not start voice recording";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || code === "permission-denied") {
        message = "Microphone permission denied. Go to Settings app → Privacy → Microphone and enable Zivo";
      } else if (name === "NotFoundError" || code === "no-microphone") {
        message = "No microphone found on this device";
      } else if (name === "NotReadableError" || code === "device-not-readable") {
        message = "Microphone is unavailable or blocked by another app";
      } else if (name === "SecurityError") {
        message = "Microphone access blocked by browser security policy";
      }
      
      toast.error(message);
      stopAll();
    }
  }, [stopAll]);

  const stop = useCallback(async (): Promise<VoiceRecording | null> => {
    return new Promise((resolve) => {
      const rec = recorder.current;
      if (!rec || rec.state === "inactive") {
        stopAll();
        setIsRecording(false);
        resolve(null);
        return;
      }
      rec.onstop = () => {
        const duration = Date.now() - startedAt.current;
        const mimeType = rec.mimeType || getSupportedVoiceMimeType() || "audio/webm";
        const blob = new Blob(chunks.current, { type: mimeType });
        // Downsample waveform to 64 bins
        const src = samples.current;
        const bins = 64;
        const out: number[] = [];
        if (src.length > 0) {
          const step = src.length / bins;
          for (let i = 0; i < bins; i++) {
            const start = Math.floor(i * step);
            const end = Math.max(start + 1, Math.floor((i + 1) * step));
            let m = 0;
            for (let j = start; j < end && j < src.length; j++) m = Math.max(m, src[j]);
            out.push(Number(m.toFixed(3)));
          }
        }
        stopAll();
        setIsRecording(false);
        if (cancelled.current) {
          setAudioBlob(null);
          setDuration(0);
          setDurationMs(0);
          resolve(null);
        } else {
          setAudioBlob(blob);
          setDuration(Math.floor(duration / 1000));
          setDurationMs(duration);
          resolve({ blob, durationMs: duration, waveform: out, mimeType });
        }
      };
      rec.stop();
    });
  }, [stopAll]);

  const cancel = useCallback(async () => {
    cancelled.current = true;
    await stop();
    setAudioBlob(null);
    setDuration(0);
    setDurationMs(0);
  }, [stop]);

  const pause = useCallback(() => {
    const rec = recorder.current;
    if (rec && rec.state === "recording") {
      try { rec.pause(); } catch { /* noop */ }
      if (rafId.current !== null) { cancelAnimationFrame(rafId.current); rafId.current = null; }
    }
  }, []);

  const resume = useCallback(() => {
    const rec = recorder.current;
    if (rec && rec.state === "paused") {
      try { rec.resume(); } catch { /* noop */ }
      const baseElapsed = elapsedMs;
      const resumedAt = Date.now();
      const tick = () => {
        setElapsedMs(baseElapsed + (Date.now() - resumedAt));
        rafId.current = requestAnimationFrame(tick);
      };
      rafId.current = requestAnimationFrame(tick);
    }
  }, [elapsedMs]);

  const clearBlob = useCallback(() => {
    setAudioBlob(null);
    setDuration(0);
    setDurationMs(0);
  }, []);

  return {
    isRecording,
    elapsedMs,
    audioBlob,
    duration,
    durationMs,
    levels,
    start,
    stop,
    cancel,
    pause,
    resume,
    clearBlob,
    // Legacy aliases used by PersonalChat / GroupChat
    startRecording: start,
    stopRecording: stop,
    cancelRecording: cancel,
    pauseRecording: pause,
    resumeRecording: resume,
  };
}
