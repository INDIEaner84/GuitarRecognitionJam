/**
 * Ear-training helpers: play a note/interval/chord with Tone and ask the
 * player to identify it. Pure logic — playback uses the shared LickPlayer.
 */
import { pitchClassName } from './theory';

export interface EarQuestion<K = 'note' | 'interval' | 'chord'> {
  kind: K;
  prompt: string;
  options: string[];
  correct: string;
  pitchClasses: number[];
  noteNames: string[];
  difficulty: number;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const noteName = (pc: number, octave = 4) => `${NOTES[pc]}${octave}`;

export const buildNoteQuestion = (difficulty = 1): EarQuestion<'note'> => {
  const pc = Math.floor(Math.random() * 12);
  const wrong = NOTES.filter((n) => n !== NOTES[pc]).slice(0, 12);
  return {
    kind: 'note',
    prompt: 'Welche Note wurde gespielt?',
    options: shuffle([NOTES[pc], ...wrong]).slice(0, 4),
    correct: NOTES[pc],
    pitchClasses: [pc],
    noteNames: [noteName(pc)],
    difficulty,
  };
};

export const buildIntervalQuestion = (difficulty = 1): EarQuestion<'interval'> => {
  const root = Math.floor(Math.random() * 12);
  const intervals = [
    { name: 'Sekunde', semis: 2 },
    { name: 'Terz', semis: 4 },
    { name: 'Quarte', semis: 5 },
    { name: 'Quinte', semis: 7 },
    { name: 'Sexte', semis: 9 },
    { name: 'Septime', semis: 10 },
    { name: 'Oktave', semis: 12 },
  ];
  const sel = intervals[Math.floor(Math.random() * intervals.length)];
  const wrong = intervals.filter((i) => i.name !== sel.name).map((i) => i.name).slice(0, 6);
  return {
    kind: 'interval',
    prompt: 'Wie groß ist das Intervall?',
    options: shuffle([sel.name, ...wrong]).slice(0, 4),
    correct: sel.name,
    pitchClasses: [root, (root + sel.semis) % 12],
    noteNames: [noteName(root), noteName((root + sel.semis) % 12)],
    difficulty,
  };
};

export const buildChordQuestion = (difficulty = 1): EarQuestion<'chord'> => {
  const root = Math.floor(Math.random() * 12);
  const kinds = ['Dur', 'Moll', 'Dur7', 'Moll7'] as const;
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const intervals: Record<string, number[]> = {
    Dur: [0, 4, 7],
    Moll: [0, 3, 7],
    Dur7: [0, 4, 7, 10],
    Moll7: [0, 3, 7, 10],
  };
  const wrong = kinds.filter((k) => k !== kind).map((k) => k);
  const pcs = intervals[kind].map((i) => (root + i) % 12);
  return {
    kind: 'chord',
    prompt: 'Welcher Akkord klingt? (begleitet vom Grundton)',
    options: shuffle([kind, ...wrong]).slice(0, 4),
    correct: kind,
    pitchClasses: pcs,
    noteNames: pcs.map((pc) => noteName(pc)),
    difficulty,
  };
};

export const buildEarQuestion = (difficulty = 1): EarQuestion =>
  Math.random() < 0.5
    ? buildNoteQuestion(difficulty)
    : Math.random() < 0.5
      ? buildIntervalQuestion()
      : buildChordQuestion();
