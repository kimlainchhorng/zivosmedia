/**
 * useSpeakerDetection — Detect which participants are actively speaking
 * Uses Web Audio API to analyze audio levels from MediaStreams
 */
import { useState, useEffect, useRef, useCallback } from "react";

interface SpeakerState {
  [participantId: string]: boolean;
}

const SPEAKING_THRESHOLD = 15; // RMS amplitude threshold
const SILENCE_DELAY = 600; // ms before marking as not speaking

export function useSpeakerDetection(
  streams: Map<string, MediaStream | null>
) {
  const [speakers, setSpeakers] = useState<SpeakerState>({});
  const analyzersRef = useRef<Map<string, { ctx: AudioContext; analyser: AnalyserNode; source: MediaStreamAudioSourceNode }>>(new Map());
  const silenceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Clean up a single participant's analyzer
  const cleanupParticipant = useCallback((id: string) => {
    const entry = analyzersRef.current.get(id);
    if (entry) {
      try {
        entry.source.disconnect();
        entry.ctx.close();
      } catch { /* already closed */ }
      analyzersRef.current.delete(id);
    }
    const timer = silenceTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      silenceTimers.current.delete(id);
    }
  }, []);

  useEffect(() => {
    // Set up analyzers for new streams, remove old ones
    const currentIds = new Set(streams.keys());

    // Remove analyzers for streams no longer present
    for (const id of analyzersRef.current.keys()) {
      if (!currentIds.has(id)) {
        cleanupParticipant(id);
      }
    }

    // Create analyzers for new streams
    for (const [id, stream] of streams.entries()) {
      if (!stream || analyzersRef.current.has(id)) continue;
      if (stream.getAudioTracks().length === 0) continue;

      try {
        const ctx = new AudioContext();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.5;
        source.connect(analyser);
        analyzersRef.current.set(id, { ctx, analyser, source });
      } catch {
        // AudioContext not available
      }
    }

    // Poll audio levels
    const interval = setInterval(() => {
      const newState: SpeakerState = {};
      let changed = false;

      for (const [id, entry] of analyzersRef.current.entries()) {
        const dataArray = new Uint8Array(entry.analyser.frequencyBinCount);
        entry.analyser.getByteFrequencyData(dataArray);

        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);
        const isSpeaking = rms > SPEAKING_THRESHOLD;

        if (isSpeaking) {
          // Clear silence timer
          const timer = silenceTimers.current.get(id);
          if (timer) {
            clearTimeout(timer);
            silenceTimers.current.delete(id);
          }
          newState[id] = true;
        } else {
          // Use delayed silence
          if (!silenceTimers.current.has(id)) {
            silenceTimers.current.set(id, setTimeout(() => {
              setSpeakers((prev) => ({ ...prev, [id]: false }));
              silenceTimers.current.delete(id);
            }, SILENCE_DELAY));
          }
          // Keep previous state until timer fires
          newState[id] = undefined as any; // will merge with prev
        }
      }

      setSpeakers((prev) => {
        const merged = { ...prev };
        for (const [id, val] of Object.entries(newState)) {
          if (val !== undefined) {
            if (merged[id] !== val) changed = true;
            merged[id] = val;
          }
        }
        return changed ? merged : prev;
      });
    }, 150);

    return () => {
      clearInterval(interval);
    };
  }, [streams, cleanupParticipant]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      for (const id of analyzersRef.current.keys()) {
        cleanupParticipant(id);
      }
    };
  }, [cleanupParticipant]);

  return speakers;
}
