/**
 * Short auditory feedback blips (optional) so players get a sonic cue in
 * addition to the visuals. Reuses Tone's shared context.
 */
import * as Tone from 'tone';

let synth: Tone.PolySynth | null = null;
let lastAt = 0;

const FREQS: Record<string, string> = {
  correct: 'C6',
  guide: 'G5',
  wrong: 'B2',
  early: 'A4',
  late: 'E4',
  miss: 'C3',
  extra: 'F2',
};

const VOL: Record<string, number> = {
  correct: -8,
  guide: -10,
  wrong: -12,
  early: -12,
  late: -12,
  miss: -14,
  extra: -14,
};

export const playFeedback = async (kind: keyof typeof FREQS, mute = false) => {
  if (mute) return;
  const now = Date.now();
  if (now - lastAt < 90) return;
  lastAt = now;

  try {
    await Tone.start();
    if (!synth) {
      synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        envelope: { attack: 0.003, decay: 0.08, sustain: 0.2, release: 0.3 },
      });
    }
    synth.volume.value = VOL[kind] ?? -12;
    synth.triggerAttackRelease(FREQS[kind] ?? 'C4', '16n', Tone.now());
  } catch {
    /* no-op */
  }
};
