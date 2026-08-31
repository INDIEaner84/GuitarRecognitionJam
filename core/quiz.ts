/**
 * Shared helpers for playful Theory Quiz + Ear Training.
 *
 * Generates deterministic-ish multiple-choice questions with explanations so
 * both modules can reuse the same question model and scoring.
 */
import { pitchClassName, SCALE_DEFS, scaleNames } from './theory';

export interface Question<T = unknown> {
  prompt: string;
  options: string[];
  correct: string;
  explanation: string;
  category: string;
  payload?: T;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const random = (n: number) => Math.floor(Math.random() * n);
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = random(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const shuffledOptions = (correct: string, wrong: string[]): string[] =>
  shuffle([correct, ...wrong.slice(0, 3)]);

export const buildIntervalQuestion = (): Question<{ note: string; interval: number }> => {
  const notes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const intervals: Array<{ name: string; semitones: number }> = [
    { name: 'Große Sekunde', semitones: 2 },
    { name: 'Große Terz', semitones: 4 },
    { name: 'Quarte', semitones: 5 },
    { name: 'Quinte', semitones: 7 },
    { name: 'Große Sexte', semitones: 9 },
    { name: 'Kleine Septime', semitones: 10 },
  ];
  const note = notes[random(notes.length)];
  const idx = NOTES.indexOf(note);
  const interval = intervals[random(intervals.length)];
  const target = NOTES[(idx + interval.semitones) % 12];
  const wrong = notes.map((n) => NOTES[(NOTES.indexOf(n) + interval.semitones) % 12]).filter((v) => v !== target);
  return {
    prompt: `Von ${note} aus: ${interval.semitones} Halbtöne (${interval.name})`,
    options: shuffledOptions(target, wrong),
    correct: target,
    category: 'Intervalle',
    explanation: `${note} + ${interval.semitones} Halbtöne = ${target} (${interval.name}).`,
    payload: { note, interval: interval.semitones },
  };
};

export const buildScaleQuestion = (): Question<{ root: number; scaleId: string }> => {
  const root = random(12);
  const scale = SCALE_DEFS[random(SCALE_DEFS.length)];
  const names = scaleNames(root, scale.intervals);
  const wrong = SCALE_DEFS.filter((s) => s.id !== scale.id).slice(0, 4).map((s) => s.name);
  return {
    prompt: `Welche Skala enthält diese Noten? ${names.join(' ')}`,
    options: shuffledOptions(scale.name, wrong),
    correct: scale.name,
    category: 'Skalen',
    explanation: `${names.join(' · ')} sind ${scale.name}: ${scale.description}`,
    payload: { root, scaleId: scale.id },
  };
};

export const buildChordNameQuestion = (): Question<{ root: number; quality: number }> => {
  const root = random(12);
  const quality = random(4); // 0 maj, 1 min, 2 maj7, 3 dom7
  const intervals = quality === 0 ? [0, 4, 7] : quality === 1 ? [0, 3, 7] : quality === 2 ? [0, 4, 7, 11] : [0, 4, 7, 10];
  const chars = quality === 0 ? '' : quality === 1 ? 'm' : quality === 2 ? 'Maj7' : '7';
  const chordNames = intervals.map((i) => NOTES[(root + i) % 12]);
  const wrong = [
    NOTES[random(12)] + (random(2) === 0 ? 'm' : 'Maj7'),
    NOTES[random(12)] + '7',
    NOTES[random(12)] + (random(2) === 0 ? '' : 'm'),
  ].filter((v) => v !== NOTES[root] + chars);
  return {
    prompt: `Welcher Akkord ist das? ${chordNames.join(' ')}`,
    options: shuffledOptions(NOTES[root] + chars, wrong),
    correct: NOTES[root] + chars,
    category: 'Akkorde',
    explanation: `${NOTES[root]}${chars}: ${chordNames.join(' · ')}`,
    payload: { root, quality },
  };
};

export const buildTheoryQuestion = (): Question<unknown> => {
  const pool = [
    buildIntervalQuestion,
    buildScaleQuestion,
    buildChordNameQuestion,
  ];
  return pool[random(pool.length)]() as Question<unknown>;
};
