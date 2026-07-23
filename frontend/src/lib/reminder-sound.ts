/**
 * A synthesized reminder chime built on the Web Audio API — no asset file, so
 * it works offline and we control pitch/length directly.
 *
 * Browser autoplay policy only lets audio start after a user gesture, so
 * `unlockReminderSound()` must run inside the "Enable notifications" click.
 * After that the shared, resumed AudioContext lets `playReminderChime()` fire
 * later from the (gesture-less) polling loop.
 */

type AudioContextCtor = typeof AudioContext;

/** Safari still only exposes the prefixed constructor. */
function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext ??
    null
  );
}

// One context for the page lifetime — created lazily on the unlock gesture.
let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/**
 * Prime audio during a user gesture so later playback isn't blocked. Creating
 * and resuming the context inside the click is what satisfies autoplay policy.
 */
export function unlockReminderSound(): void {
  const context = ensureContext();
  if (!context) return;
  if (context.state === "suspended") void context.resume();
}

/** A two-note chime (C6 → E6) with a short fade so it doesn't click. */
export function playReminderChime(): void {
  const context = ensureContext();
  if (!context) return;
  // A tab re-suspends its context in the background; nudge it awake first.
  if (context.state === "suspended") void context.resume();

  const now = context.currentTime;
  const notes = [
    { freq: 1046.5, start: 0 }, // C6
    { freq: 1318.5, start: 0.12 }, // E6
  ];

  for (const { freq, start } of notes) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    const t0 = now + start;
    // Quick attack, gentle exponential release.
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.2, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

    osc.connect(gain).connect(context.destination);
    osc.start(t0);
    osc.stop(t0 + 0.4);
  }
}
