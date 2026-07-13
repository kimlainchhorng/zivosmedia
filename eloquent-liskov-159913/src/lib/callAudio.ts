/**
 * callAudio — Modern 2026-style call ringtones
 * Incoming: Melodic chime with harmonics (think: premium phone ringtone)
 * Outgoing: Soft pulsing tone with warm harmonics
 */

type StopTone = () => void;

const SAMPLE_RATE = 44100;

// ── Helpers ──────────────────────────────────────────────────

function clampSample(value: number) {
  return Math.max(-1, Math.min(1, value));
}

function encodeWav(samples: Int16Array, sampleRate: number) {
  const dataLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataLength, true);

  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, samples[i], true);
  }
  return new Uint8Array(buffer);
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Tone Synthesis ──────────────────────────────────────────

interface NoteSpec {
  freq: number;       // Hz (0 = silence)
  dur: number;        // seconds
  gain?: number;      // 0-1
  harmonics?: number; // number of overtones
}

function synthesize(notes: NoteSpec[], sampleRate: number): Int16Array {
  const totalSamples = notes.reduce((s, n) => s + Math.floor(n.dur * sampleRate), 0);
  const pcm = new Int16Array(totalSamples);
  let offset = 0;

  for (const note of notes) {
    const len = Math.floor(note.dur * sampleRate);
    const g = note.gain ?? 0.35;
    const hCount = note.harmonics ?? 3;
    const attackSamples = Math.floor(sampleRate * 0.008);
    const releaseSamples = Math.floor(sampleRate * 0.04);

    for (let i = 0; i < len; i++) {
      // Smooth envelope
      const attack = Math.min(1, i / attackSamples);
      const release = Math.min(1, (len - i) / releaseSamples);
      const env = attack * release;

      let sample = 0;
      if (note.freq > 0) {
        const t = i / sampleRate;
        // Fundamental + harmonics with decreasing amplitude
        for (let h = 1; h <= hCount; h++) {
          const harmGain = 1 / (h * h); // Rapid falloff for warm tone
          sample += Math.sin(2 * Math.PI * note.freq * h * t) * harmGain;
        }
        // Normalize
        let normFactor = 0;
        for (let h = 1; h <= hCount; h++) normFactor += 1 / (h * h);
        sample = (sample / normFactor) * g * env;
      }

      pcm[offset + i] = Math.floor(clampSample(sample) * 32767);
    }
    offset += len;
  }
  return pcm;
}

function toDataUrl(pcm: Int16Array): string {
  const wav = encodeWav(pcm, SAMPLE_RATE);
  return `data:audio/wav;base64,${bytesToBase64(wav)}`;
}

// ── Incoming Ringtone ────────────────────────────────────────
// Modern melodic chime: ascending triad pattern, bright and musical
// Pattern: C5-E5-G5 (arpeggio) × 2 + pause

function createIncomingRingtone(): string {
  const notes: NoteSpec[] = [
    // First phrase — ascending arpeggio
    { freq: 523.25, dur: 0.12, gain: 0.3, harmonics: 4 },  // C5
    { freq: 0, dur: 0.04 },
    { freq: 659.25, dur: 0.12, gain: 0.35, harmonics: 4 }, // E5
    { freq: 0, dur: 0.04 },
    { freq: 783.99, dur: 0.18, gain: 0.38, harmonics: 4 }, // G5
    { freq: 0, dur: 0.08 },
    // Resolve up
    { freq: 1046.5, dur: 0.25, gain: 0.32, harmonics: 3 }, // C6
    { freq: 0, dur: 0.15 },

    // Second phrase — descending variation
    { freq: 783.99, dur: 0.12, gain: 0.3, harmonics: 4 },  // G5
    { freq: 0, dur: 0.04 },
    { freq: 880.0, dur: 0.12, gain: 0.35, harmonics: 4 },  // A5
    { freq: 0, dur: 0.04 },
    { freq: 1046.5, dur: 0.18, gain: 0.38, harmonics: 4 }, // C6
    { freq: 0, dur: 0.06 },
    { freq: 1174.66, dur: 0.3, gain: 0.3, harmonics: 3 },  // D6
    { freq: 0, dur: 0.12 },

    // Third phrase — resolution
    { freq: 1046.5, dur: 0.15, gain: 0.28, harmonics: 4 }, // C6
    { freq: 0, dur: 0.05 },
    { freq: 1318.51, dur: 0.35, gain: 0.32, harmonics: 3 },// E6 (ring out)

    // Long silence before loop
    { freq: 0, dur: 1.8 },
  ];

  return toDataUrl(synthesize(notes, SAMPLE_RATE));
}

// ── Outgoing Ringback ────────────────────────────────────────
// Warm, modern pulse — two gentle tones with soft harmonics

function createOutgoingRingback(): string {
  const notes: NoteSpec[] = [
    { freq: 392.0, dur: 0.6, gain: 0.22, harmonics: 2 },  // G4 — warm fundamental
    { freq: 0, dur: 0.15 },
    { freq: 440.0, dur: 0.5, gain: 0.18, harmonics: 2 },  // A4 — slight rise
    { freq: 0, dur: 2.5 },                                  // Long pause
  ];

  return toDataUrl(synthesize(notes, SAMPLE_RATE));
}

// ── Lazy-generated audio sources ─────────────────────────────

let _incomingSrc: string | null = null;
let _outgoingSrc: string | null = null;

function getIncomingSrc() {
  if (!_incomingSrc) _incomingSrc = createIncomingRingtone();
  return _incomingSrc;
}

function getOutgoingSrc() {
  if (!_outgoingSrc) _outgoingSrc = createOutgoingRingback();
  return _outgoingSrc;
}

// ── Audio Element Management ─────────────────────────────────

let incomingAudio: HTMLAudioElement | null = null;
let outgoingAudio: HTMLAudioElement | null = null;
let primeRegistered = false;
let incomingArmed = false;
let outgoingArmed = false;
let incomingRequested = false;
let outgoingRequested = false;
let armWarningLogged = false;

type BrowserAudioError = {
  name?: string;
  message?: string;
};

function createLoopingAudio(src: string) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.setAttribute("playsinline", "true");
  audio.setAttribute("webkit-playsinline", "true");
  return audio;
}

function getIncomingAudio() {
  if (!incomingAudio) incomingAudio = createLoopingAudio(getIncomingSrc());
  return incomingAudio;
}

function getOutgoingAudio() {
  if (!outgoingAudio) outgoingAudio = createLoopingAudio(getOutgoingSrc());
  return outgoingAudio;
}

function isExpectedArmFailure(error: unknown) {
  const typed = (error && typeof error === "object") ? (error as BrowserAudioError) : { name: undefined, message: String(error) };
  const message = (typed.message ?? "").toLowerCase();
  return typed.name === "NotAllowedError" || typed.name === "AbortError" || message.includes("notallowed") || message.includes("interrupted");
}

function logArmFailure(error: unknown) {
  const expected = isExpectedArmFailure(error);
  if (expected) {
    if (armWarningLogged) return;
    armWarningLogged = true;
    console.info("[callAudio] Audio not yet unlocked by user gesture; ringtone will arm on interaction");
    return;
  }

  console.warn("[callAudio] armAudioElement play() failed:", error);
}

async function armAudioElement(audio: HTMLAudioElement): Promise<boolean> {
  audio.pause();
  audio.currentTime = 0;
  audio.muted = true;
  try {
    await audio.play();
    if (import.meta.env.DEV) console.log("[callAudio] Audio element armed successfully");
    armWarningLogged = false;
    return true;
  } catch (err) {
    logArmFailure(err);
    return false;
  }
}

async function primeIncomingAudio() {
  const audio = getIncomingAudio();
  const armed = await armAudioElement(audio);
  if (armed) {
    incomingArmed = true;
    if (incomingRequested) {
      audio.currentTime = 0;
      audio.muted = false;
    }
  } else {
    incomingArmed = false;
  }
}

async function primeOutgoingAudio() {
  const audio = getOutgoingAudio();
  const armed = await armAudioElement(audio);
  if (armed) {
    outgoingArmed = true;
    if (outgoingRequested) {
      audio.currentTime = 0;
      audio.muted = false;
    }
  } else {
    outgoingArmed = false;
  }
}

export async function primeCallAudio() {
  await Promise.all([primeIncomingAudio(), primeOutgoingAudio()]);
}

export function registerCallAudioUnlock() {
  if (typeof window === "undefined") return () => {};
  if (primeRegistered) return () => {};

  const unlock = () => { void primeCallAudio(); };

  primeRegistered = true;
  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("touchstart", unlock, { capture: true, passive: true });
  window.addEventListener("click", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });

  return () => {};
}

function resetLoop(audio: HTMLAudioElement) {
  audio.muted = true;
  audio.currentTime = 0;
}

function startLoop(audio: HTMLAudioElement) {
  audio.currentTime = 0;
  audio.muted = false;
  if (import.meta.env.DEV) console.log("[callAudio] Ringtone unmuted — should be audible now");
}

function stopLoop(audio: HTMLAudioElement, clearRequested: () => void): StopTone {
  return () => {
    clearRequested();
    resetLoop(audio);
  };
}

export function playIncomingRingtone(): StopTone {
  const audio = getIncomingAudio();
  incomingRequested = true;

  if (!incomingArmed) {
    console.warn("[callAudio] Incoming ringtone not armed yet");
    void primeIncomingAudio();
    return stopLoop(audio, () => { incomingRequested = false; });
  }

  startLoop(audio);
  return stopLoop(audio, () => { incomingRequested = false; });
}

export function playOutgoingRingback(): StopTone {
  const audio = getOutgoingAudio();
  outgoingRequested = true;

  if (!outgoingArmed) {
    console.warn("[callAudio] Outgoing ringback not armed yet");
    void primeOutgoingAudio();
    return stopLoop(audio, () => { outgoingRequested = false; });
  }

  startLoop(audio);
  return stopLoop(audio, () => { outgoingRequested = false; });
}
