/**
 * Shared audio / pitch-detection helpers.
 *
 * This is the single implementation of the autocorrelation pitch detector so
 * both the legacy analysis view and the Lick Trainer use identical results.
 */
import { getNoteFromFrequency } from '../constants';

// Zero-allocation buffer for autocorrelation
export const correlationBuffer = new Float32Array(2048);

export interface PitchSample {
  noteName: string;
  octave: number;
  frequency: number;
  timestamp: number;
}

/**
 * Optimized Autocorrelation with Parabolic Interpolation for higher accuracy
 * and zero allocations in the hot loop.
 */
export const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
  const SIZE = buf.length;

  // Calculate Root Mean Square to detect silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.005) return -1; // Extremely low threshold for higher sensitivity

  // Clear correlation buffer
  correlationBuffer.fill(0);

  // Compute Autocorrelation
  const maxOffset = SIZE / 2;
  for (let offset = 0; offset < maxOffset; offset++) {
    let sum = 0;
    for (let i = 0; i < maxOffset; i++) {
      sum += buf[i] * buf[i + offset];
    }
    correlationBuffer[offset] = sum;
  }

  // Find the first dip (to avoid the zero-lag peak)
  let d = 0;
  while (correlationBuffer[d] > correlationBuffer[d + 1] && d < maxOffset) d++;

  // Find the highest peak after the first dip
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < maxOffset; i++) {
    if (correlationBuffer[i] > maxval) {
      maxval = correlationBuffer[i];
      maxpos = i;
    }
  }

  if (maxpos === -1 || maxpos === 0) return -1;

  // Parabolic interpolation for sub-bin precision frequency detection
  let finalPos = maxpos;
  if (maxpos > 0 && maxpos < maxOffset - 1) {
    const x0 = correlationBuffer[maxpos - 1];
    const x1 = correlationBuffer[maxpos];
    const x2 = correlationBuffer[maxpos + 1];
    const a = (x0 + x2 - 2 * x1) / 2;
    const b = (x2 - x0) / 2;
    if (a !== 0) {
      finalPos = maxpos - b / (2 * a);
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
    octave,
    frequency: freq,
    timestamp: performance.now(),
  };
};
