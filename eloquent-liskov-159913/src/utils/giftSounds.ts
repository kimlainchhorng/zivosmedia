/**
 * Gift sound effects using Web Audio API
 * Tier-based sounds: low-value chime, mid-value sparkle, premium fanfare
 */

let audioCtx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/** Play a coin/chime sound scaled to gift tier */
export function playGiftSound(comboCount: number = 1, coinValue: number = 1) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Tier determines base frequency and richness
    const tier = coinValue >= 5000 ? 3 : coinValue >= 500 ? 2 : coinValue >= 50 ? 1 : 0;
    const baseFreq = [800, 900, 1000, 1100][tier] + Math.min(comboCount, 15) * 40;

    // Main chime
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4 + tier * 0.1);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(baseFreq, now);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.1);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.5 + tier * 0.1);

    // Sparkle overtone for combos >= 3 or mid+ tier
    if (comboCount >= 3 || tier >= 1) {
      const sparkle = ctx.createOscillator();
      sparkle.type = "triangle";
      sparkle.frequency.setValueAtTime(baseFreq * 2, now + 0.05);
      sparkle.frequency.exponentialRampToValueAtTime(baseFreq * 3, now + 0.2);
      const sparkleGain = ctx.createGain();
      sparkleGain.connect(ctx.destination);
      sparkleGain.gain.setValueAtTime(0.08, now + 0.05);
      sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      sparkle.connect(sparkleGain);
      sparkle.start(now + 0.05);
      sparkle.stop(now + 0.35);
    }

    // Extra impact for combos >= 5 or high tier
    if (comboCount >= 5 || tier >= 2) {
      const impact = ctx.createOscillator();
      impact.type = "square";
      impact.frequency.setValueAtTime(200 + tier * 50, now);
      impact.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      const impactGain = ctx.createGain();
      impactGain.connect(ctx.destination);
      impactGain.gain.setValueAtTime(0.06, now);
      impactGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      impact.connect(impactGain);
      impact.start(now);
      impact.stop(now + 0.15);
    }

    // Shimmer for high value
    if (tier >= 2) {
      const shimmer = ctx.createOscillator();
      shimmer.type = "sine";
      shimmer.frequency.setValueAtTime(baseFreq * 3, now + 0.1);
      shimmer.frequency.exponentialRampToValueAtTime(baseFreq * 4, now + 0.3);
      const shimmerGain = ctx.createGain();
      shimmerGain.connect(ctx.destination);
      shimmerGain.gain.setValueAtTime(0.04, now + 0.1);
      shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      shimmer.connect(shimmerGain);
      shimmer.start(now + 0.1);
      shimmer.stop(now + 0.5);
    }
  } catch {
    // Silent fail — audio not critical
  }
}

/** Play a premium gift fanfare — dramatic ascending arpeggio + bass drop */
export function playPremiumGiftSound() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();

    const now = ctx.currentTime;
    // Grand arpeggio: C5, E5, G5, B5, C6, E6
    const notes = [523, 659, 784, 988, 1047, 1319];

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.1 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.55);
      osc.connect(gain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.55);
    });

    // Bass drop rumble
    const bass = ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(80, now);
    bass.frequency.exponentialRampToValueAtTime(40, now + 0.4);
    const bassGain = ctx.createGain();
    bassGain.connect(ctx.destination);
    bassGain.gain.setValueAtTime(0.1, now);
    bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    bass.connect(bassGain);
    bass.start(now);
    bass.stop(now + 0.5);

    // Final shimmer chord
    const chordFreqs = [1047, 1319, 1568]; // C6, E6, G6
    chordFreqs.forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, now + 0.6);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.65);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc.connect(gain);
      osc.start(now + 0.6);
      osc.stop(now + 1.5);
    });
  } catch {
    // Silent fail
  }
}

/** Play legendary gift sound — ultimate fanfare for 20000+ coin gifts */
export function playLegendaryGiftSound() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;

    // Dramatic ascending scale
    const scale = [440, 554, 659, 784, 880, 1047, 1319, 1568, 2093];
    scale.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i < 4 ? "sine" : "triangle";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      const t = now + i * 0.08;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.connect(gain);
      osc.start(t);
      osc.stop(t + 0.6);
    });

    // Deep bass impact
    const bass = ctx.createOscillator();
    bass.type = "sine";
    bass.frequency.setValueAtTime(60, now);
    bass.frequency.exponentialRampToValueAtTime(30, now + 0.6);
    const bg = ctx.createGain();
    bg.connect(ctx.destination);
    bg.gain.setValueAtTime(0.12, now);
    bg.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    bass.connect(bg);
    bass.start(now);
    bass.stop(now + 0.7);

    // Glittering chord sustain
    [1568, 2093, 2637].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.connect(ctx.destination);
      g.gain.setValueAtTime(0, now + 0.8);
      g.gain.linearRampToValueAtTime(0.05, now + 0.9);
      g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc.connect(g);
      osc.start(now + 0.8);
      osc.stop(now + 2.2);
    });
  } catch {
    // Silent fail
  }
}
