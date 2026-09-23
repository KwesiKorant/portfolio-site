// Synthesized Web Audio API sound engine - Zero external audio files, Zero 404s
// Produces 60/120 FPS latency-free cybernetic haptics

let audioCtx: AudioContext | null = null;
let isMuted = false;
const listeners = new Set<(muted: boolean) => void>();

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Load muted state from localStorage on init
if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem("audio_muted");
    if (stored !== null) {
      isMuted = stored === "true";
    }
  } catch {
    // Ignore localStorage access issues
  }

  // Pre-unlock audio on first user gesture
  const unlock = () => {
    getAudioContext();
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

export function isSoundMuted(): boolean {
  return isMuted;
}

export function setSoundMuted(muted: boolean): void {
  isMuted = muted;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("audio_muted", String(muted));
    } catch {
      // Ignore
    }
  }
  listeners.forEach((fn) => fn(muted));
}

export function toggleSound(): boolean {
  setSoundMuted(!isMuted);
  return isMuted;
}

export function subscribeSoundMute(fn: (muted: boolean) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Mechanical micro-tick on keyboard triggers (1-5, Esc, ?, Space)
 */
export function playKeyClick(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "triangle";
  osc.frequency.setValueAtTime(2200, now);
  osc.frequency.exponentialRampToValueAtTime(800, now + 0.012);

  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2400, now);
  filter.Q.setValueAtTime(3.0, now);

  gain.gain.setValueAtTime(0.09, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.018);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.02);
}

/**
 * Smooth sub-bass warp whoosh when camera dollies or focuses a node
 */
export function playWarpSound(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.setValueAtTime(65, now);
  osc.frequency.exponentialRampToValueAtTime(190, now + 0.35);
  osc.frequency.exponentialRampToValueAtTime(45, now + 0.65);

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(260, now);
  filter.frequency.exponentialRampToValueAtTime(600, now + 0.25);
  filter.frequency.exponentialRampToValueAtTime(140, now + 0.65);

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.14, now + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.66);
}

/**
 * Resonant electric surge sound on Space (Network Surge trigger)
 */
export function playSurgePulse(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Primary sub-drive
  const subOsc = ctx.createOscillator();
  const subGain = ctx.createGain();
  subOsc.type = "sawtooth";
  subOsc.frequency.setValueAtTime(110, now);
  subOsc.frequency.exponentialRampToValueAtTime(240, now + 0.3);
  subOsc.frequency.exponentialRampToValueAtTime(70, now + 0.85);

  const subFilter = ctx.createBiquadFilter();
  subFilter.type = "lowpass";
  subFilter.frequency.setValueAtTime(400, now);
  subFilter.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
  subFilter.frequency.exponentialRampToValueAtTime(200, now + 0.85);

  subGain.gain.setValueAtTime(0.001, now);
  subGain.gain.linearRampToValueAtTime(0.18, now + 0.08);
  subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

  subOsc.connect(subFilter);
  subFilter.connect(subGain);
  subGain.connect(ctx.destination);

  // High-frequency harmonic ion ping
  const ionOsc = ctx.createOscillator();
  const ionGain = ctx.createGain();
  ionOsc.type = "sine";
  ionOsc.frequency.setValueAtTime(880, now);
  ionOsc.frequency.exponentialRampToValueAtTime(1760, now + 0.18);

  ionGain.gain.setValueAtTime(0.001, now);
  ionGain.gain.linearRampToValueAtTime(0.1, now + 0.04);
  ionGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

  ionOsc.connect(ionGain);
  ionGain.connect(ctx.destination);

  subOsc.start(now);
  ionOsc.start(now);
  subOsc.stop(now + 0.86);
  ionOsc.stop(now + 0.46);
}

/**
 * Micro ping on card hover
 */
export function playCardHover(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(920, now);
  osc.frequency.exponentialRampToValueAtTime(680, now + 0.025);

  gain.gain.setValueAtTime(0.035, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.026);
}

/**
 * Futuristic ascending double-chime on copy snippet or action success
 */
export function playCopySuccess(): void {
  if (isMuted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const freqs = [659.25, 880.0, 1174.66]; // E5, A5, D6

  freqs.forEach((freq, idx) => {
    const t = now + idx * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0.07, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.15);
  });
}
