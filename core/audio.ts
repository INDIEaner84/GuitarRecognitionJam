/**
 * Shared audio / pitch-detection helpers.
 *
 * This is the single implementation of the pitch detector so the analysis
 * view, the Lick Trainer, the coach and the rhythm modules all hear the same
 * thing.
 *
 * Der Detektor nutzt die normalisierte Differenzfunktion (NSDF, McLeod):
 * rohe Autokorrelation bewertet jedes Vielfache der echten Periode praktisch
 * gleich gut — bei gehaltenen Tönen gewann deshalb oft ein Oktav- oder gar
 * Quintvielfaches (440 Hz wurden z.B. als 55 Hz erkannt). Die Normalisierung
 * plus „nimm die kürzeste Periode, die fast so stark korreliert“ behebt das.
 */
import { getNoteFromFrequency } from '../constants';

/** Wiederverwendeter Puffer: die NSDF-Kurve pro Frame (keine Allokation). */
export const correlationBuffer = new Float32Array(2048);

/** Wie periodisch ein Signal mindestens sein muss, um als Ton zu gelten. */
const MIN_PERIODICITY = 0.45;

/** Ein Peak gilt als Lösung, wenn er so stark ist wie das beste Maximum. */
const PEAK_RATIO = 0.9;

export interface PitchSample {
  noteName: string;
  /** Note inkl. Oktave, z. B. "E2" — nötig für strenges Oktav-Matching. */
  fullNote: string;
  octave: number;
  frequency: number;
  timestamp: number;
}

/**
 * Schätzt die Grundfrequenz über NSDF + parabolische Interpolation.
 * Liefert -1 bei Stille oder wenn das Signal zu unperiodisch ist.
 */
export const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
  const SIZE = buf.length;
  const maxOffset = SIZE >> 1;

  // Stille / zu leise: RMS als schneller Vortest.
  let energy = 0;
  for (let i = 0; i < SIZE; i++) energy += buf[i] * buf[i];
  const rms = Math.sqrt(energy / SIZE);
  if (rms < 0.005) return -1;

  correlationBuffer.fill(0);

  // Energie des vorderen Fensters ist konstant, die des hinteren lässt sich
  // pro Offset in O(1) fortschreiben → Normalisierung kostet fast nichts.
  let frontEnergy = 0;
  for (let i = 0; i < maxOffset; i++) frontEnergy += buf[i] * buf[i];
  let backEnergy = frontEnergy;

  let maxCorr = 0;
  let maxPos = -1;

  for (let offset = 1; offset < maxOffset; offset++) {
    const leaving = buf[offset - 1];
    const entering = buf[offset + maxOffset - 1];
    backEnergy += entering * entering - leaving * leaving;

    let acf = 0;
    for (let i = 0; i < maxOffset; i++) acf += buf[i] * buf[i + offset];

    const denom = frontEnergy + backEnergy;
    const nsdf = denom > 0 ? (2 * acf) / denom : 0;
    correlationBuffer[offset] = nsdf;

    if (nsdf > maxCorr) {
      maxCorr = nsdf;
      maxPos = offset;
    }
  }

  if (maxPos < 2 || maxCorr < MIN_PERIODICITY) return -1;

  // Kürzeste Periode mit (nahezu) maximaler Korrelation = echte Grundfrequenz.
  let peakPos = maxPos;
  const threshold = maxCorr * PEAK_RATIO;
  for (let offset = 2; offset < maxOffset - 1; offset++) {
    const value = correlationBuffer[offset];
    if (
      value >= threshold &&
      value > correlationBuffer[offset - 1] &&
      value >= correlationBuffer[offset + 1]
    ) {
      peakPos = offset;
      break;
    }
  }

  // Parabolische Interpolation für Sub-Sample-Genauigkeit.
  let finalPos = peakPos;
  if (peakPos > 0 && peakPos < maxOffset - 1) {
    const x0 = correlationBuffer[peakPos - 1];
    const x1 = correlationBuffer[peakPos];
    const x2 = correlationBuffer[peakPos + 1];
    const denom = x0 - 2 * x1 + x2;
    if (denom !== 0) {
      finalPos = peakPos + (0.5 * (x0 - x2)) / denom;
    }
  }

  return sampleRate / finalPos;
};

/**
 * Returns null when the buffer is silence/invalid, otherwise a PitchSample.
 */
export const samplePitch = (
  buffer: Float32Array,
  sampleRate: number,
): PitchSample | null => {
  const freq = autoCorrelate(buffer, sampleRate);
  if (freq === -1 || freq < 20 || freq > 4000) return null;

  const { name, octave } = getNoteFromFrequency(freq);
  return {
    noteName: name,
    fullNote: `${name}${octave}`,
    octave,
    frequency: freq,
    timestamp: performance.now(),
  };
};
