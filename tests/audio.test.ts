import { describe, expect, it } from 'vitest';
import { autoCorrelate, samplePitch } from '../core/audio';
import { getNoteFromFrequency, identifyChord } from '../constants';

const sine = (freq: number, sampleRate: number, size = 2048): Float32Array => {
  const buf = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    buf[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return buf;
};

describe('autoCorrelate', () => {
  it('erkennt die Grundfrequenz eines Sinustons', () => {
    const detected = autoCorrelate(sine(440, 44100), 44100);
    expect(detected).toBeGreaterThan(435);
    expect(detected).toBeLessThan(445);
  });

  it('erkennt tiefe Gitarrentöne (E2 ≈ 82 Hz)', () => {
    const detected = autoCorrelate(sine(82.41, 44100), 44100);
    expect(detected).toBeGreaterThan(80);
    expect(detected).toBeLessThan(85);
  });

  it('meldet -1 bei Stille', () => {
    expect(autoCorrelate(new Float32Array(2048), 44100)).toBe(-1);
  });
});

describe('samplePitch', () => {
  it('lieferte Note, Oktave und Frequenz', () => {
    const sample = samplePitch(sine(440, 44100), 44100);
    expect(sample).not.toBeNull();
    expect(sample?.noteName).toBe('A');
    expect(sample?.octave).toBe(4);
    expect(sample?.frequency).toBeCloseTo(440, 0);
  });

  it('liefert null bei Stille', () => {
    expect(samplePitch(new Float32Array(2048), 44100)).toBeNull();
  });
});

describe('getNoteFromFrequency', () => {
  it('rechnet 440 Hz auf A4', () => {
    expect(getNoteFromFrequency(440)).toMatchObject({ name: 'A', octave: 4 });
  });

  it('rechnet die leere E-Saite (82.41 Hz) auf E2', () => {
    expect(getNoteFromFrequency(82.41)).toMatchObject({ name: 'E', octave: 2 });
  });
});

describe('identifyChord', () => {
  it('erkennt C-Dur', () => {
    expect(identifyChord(['C', 'E', 'G'])?.name).toBe('C');
  });

  it('erkennt Moll über den Dur-Vergleich heraus', () => {
    const chord = identifyChord(['E', 'G', 'B']);
    expect(chord?.root).toBe('E');
    expect(chord?.type).toBe('Minor');
  });

  it('liefert null bei zu wenig Tönen', () => {
    expect(identifyChord(['C'])).toBeNull();
  });
});

describe('autoCorrelate — Oktavfestigkeit', () => {
  it('verwechselt einen gehaltenen Ton nicht mit einem Vielfachen', () => {
    for (const freq of [110, 146.83, 196, 220, 293.66, 440, 587.33]) {
      const detected = autoCorrelate(sine(freq, 44100), 44100);
      expect(Math.abs(detected - freq), `${freq} Hz -> ${detected} Hz`).toBeLessThan(1.5);
    }
  });

  it('erkennt die Grundfrequenz eines obertonreichen Signals', () => {
    const size = 2048;
    const buf = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      // Gitarrennahes Spektrum: Grundton + Obertöne mit abfallender Amplitude
      buf[i] =
        1.0 * Math.sin((2 * Math.PI * 196 * i) / 44100) +
        0.5 * Math.sin((2 * Math.PI * 392 * i) / 44100) +
        0.3 * Math.sin((2 * Math.PI * 588 * i) / 44100) +
        0.15 * Math.sin((2 * Math.PI * 784 * i) / 44100);
    }
    const detected = autoCorrelate(buf, 44100);
    expect(Math.abs(detected - 196)).toBeLessThan(2);
  });

  it('verwirft Rauschen statt eine Frequenz zu raten', () => {
    const buf = new Float32Array(2048);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.random() * 2 - 1;
    expect(autoCorrelate(buf, 44100)).toBe(-1);
  });
});
