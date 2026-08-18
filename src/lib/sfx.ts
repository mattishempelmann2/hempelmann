let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new Ctx();
  }
  return ctx;
}

function getNoiseBuffer(c: AudioContext): AudioBuffer {
  if (!noiseBuffer) {
    const length = Math.ceil(c.sampleRate * 0.08);
    noiseBuffer = c.createBuffer(1, length, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

export function setSfxMuted(value: boolean) {
  muted = value;
}

/** Must be called from a user gesture handler to unlock audio on mobile/Safari. */
export function unlockSfx() {
  const c = getCtx();
  if (c && c.state === "suspended") c.resume();
}

// --- Real recorded samples (tick.mp3 / click.mp3 in public/sfx), decoded
// once and reused. Falls back to the synthesized click()/thunk() below if
// they haven't loaded yet (or fail to load) so sound never just goes silent.

const sampleBuffers: Record<"tick" | "click", AudioBuffer | null> = {
  tick: null,
  click: null,
};

function loadSample(name: "tick" | "click") {
  if (typeof window === "undefined") return;
  const c = getCtx();
  if (!c) return;
  fetch(`/sfx/${name}.mp3`)
    .then((res) => res.arrayBuffer())
    .then((data) => c.decodeAudioData(data))
    .then((buffer) => {
      sampleBuffers[name] = buffer;
    })
    .catch(() => {
      // stays null — callers fall back to the synth
    });
}

if (typeof window !== "undefined") {
  loadSample("tick");
  loadSample("click");
}

type PlaySampleOptions = {
  gain?: number;
  /** playback rate jitter — e.g. 0.08 means +/-8% random pitch variation */
  rateJitter?: number;
  rate?: number;
  /** lowpass cutoff in Hz — rounds off the sharp/bright edge of a raw
   * transient so it reads as smooth rather than harsh. Omit for no filter. */
  lowpassFreq?: number;
  /** linear gain fade-in, in seconds, instead of an instant hard onset */
  attack?: number;
};

function playSample(
  name: "tick" | "click",
  { gain = 0.7, rateJitter = 0, rate = 1, lowpassFreq, attack = 0.004 }: PlaySampleOptions
): boolean {
  if (muted) return true; // muted counts as "handled", don't fall back to synth
  const buffer = sampleBuffers[name];
  const c = getCtx();
  if (!buffer || !c || c.state === "suspended") return false;

  const source = c.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rateJitter
    ? rate + (Math.random() * 2 - 1) * rateJitter
    : rate;

  const g = c.createGain();
  g.gain.setValueAtTime(0, c.currentTime);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + attack);

  let node: AudioNode = source;
  if (lowpassFreq) {
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(lowpassFreq, c.currentTime);
    node.connect(filter);
    node = filter;
  }

  node.connect(g).connect(c.destination);
  source.start();
  return true;
}

type ClickOptions = {
  /** center frequency of the bandpass filter */
  freq?: number;
  /** filter Q — higher is a thinner, more resonant, more "tuned" click */
  q?: number;
  duration?: number;
  gain?: number;
  /** if set, the filter's center frequency sweeps down to this over duration —
   * gives a mechanical "detent settling" feel instead of a flat click */
  pitchBendTo?: number;
};

/** A short filtered-noise click — a tuned resonant tick, not a synth bleep. */
function click({
  freq = 3500,
  q = 4,
  duration = 0.02,
  gain = 0.06,
  pitchBendTo,
}: ClickOptions) {
  if (muted) return;
  const c = getCtx();
  if (!c || c.state === "suspended") return;

  const source = c.createBufferSource();
  source.buffer = getNoiseBuffer(c);

  const filter = c.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(freq, c.currentTime);
  if (pitchBendTo) {
    filter.frequency.exponentialRampToValueAtTime(
      pitchBendTo,
      c.currentTime + duration
    );
  }
  filter.Q.setValueAtTime(q, c.currentTime);

  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);

  source.connect(filter).connect(g).connect(c.destination);
  source.start();
  source.stop(c.currentTime + duration);
}

type ThunkOptions = {
  freq?: number;
  duration?: number;
  gain?: number;
  delay?: number;
};

/** A low, short tone with a fast decay — the mechanical "body" under a click. */
function thunk({ freq = 200, duration = 0.05, gain = 0.05, delay = 0 }: ThunkOptions) {
  if (muted) return;
  const c = getCtx();
  if (!c || c.state === "suspended") return;

  const start = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, start + duration);
  g.gain.setValueAtTime(gain, start);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration);
}

// Fast scrolling can cross many day-ticks per animation frame; without a
// floor on the real-time gap between plays, that turns into a machine-gun
// burst. These cap how often the tick sound can actually fire, independent
// of how many ruler ticks the timeline logic says crossed the playhead.
let lastTickPlayedAt = 0;
const MIN_TICK_INTERVAL_MS = 45;
let lastMajorTickPlayedAt = 0;
const MIN_MAJOR_TICK_INTERVAL_MS = 70;

/**
 * Day-tick passing the playhead while scrubbing the timeline. Uses the
 * recorded scroll-knob sample (public/sfx/tick.mp3) with slight pitch
 * jitter so rapid repeats don't sound machine-gunned; falls back to a
 * synthesized detent click if the sample isn't loaded yet.
 */
export function playTick() {
  const now = performance.now();
  if (now - lastTickPlayedAt < MIN_TICK_INTERVAL_MS) return;
  lastTickPlayedAt = now;

  if (
    playSample("tick", {
      gain: 0.16,
      rate: 1,
      rateJitter: 0.05,
      lowpassFreq: 6500,
      attack: 0.006,
    })
  )
    return;
  click({
    freq: 3000 + Math.random() * 300,
    q: 6,
    duration: 0.016,
    gain: 0.012,
    pitchBendTo: 2200,
  });
}

/**
 * Slightly heavier mark for month/major ruler marks — same sample as the
 * regular tick, just a touch louder and barely pitched down, so it stays in
 * the tick family instead of drifting toward sounding like a click.
 */
export function playMajorTick() {
  const now = performance.now();
  if (now - lastMajorTickPlayedAt < MIN_MAJOR_TICK_INTERVAL_MS) return;
  lastMajorTickPlayedAt = now;

  if (
    playSample("tick", {
      gain: 0.22,
      rate: 0.92,
      rateJitter: 0.02,
      lowpassFreq: 5500,
      attack: 0.007,
    })
  )
    return;
  click({ freq: 2600, q: 6, duration: 0.018, gain: 0.016, pitchBendTo: 1800 });
}

/**
 * Click/select sound. Uses the recorded click sample (public/sfx/click.mp3);
 * falls back to a synthesized "mouse click + cassette thunk" blend.
 */
export function playClick() {
  if (playSample("click", { gain: 0.4 })) return;
  click({ freq: 4500, q: 5, duration: 0.01, gain: 0.025 });
  thunk({ freq: 190, duration: 0.055, gain: 0.028, delay: 0.004 });
}
