/**
 * Local music-theory helpers for the Improvisation Coach.
 *
 * Kept dependency-free so the coach can run offline and so the same scale
 * data is used by the suggestion panel and the play-along challenge.
 */
export const PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

export interface ScaleDef {
  id: string;
  name: string;
  intervals: number[]; // semitones from the root
  description: string;
}

export const SCALE_DEFS: ScaleDef[] = [
  {
    id: 'major',
    name: 'Major',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    description: 'Helle Ionische Skala — Grundgerüst vieler Pop-/Rock-Tonalitäten.',
  },
  {
    id: 'minor',
    name: 'Natural Minor',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    description: 'Dunkle, klingende Moll-Skala (Aeolisch).',
  },
  {
    id: 'minor-pentatonic',
    name: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    description: 'Die Allround-Improvisationsskala — fast immer sicher.',
  },
  {
    id: 'major-pentatonic',
    name: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    description: 'Sonnige, offene Fünftonskala.',
  },
  {
    id: 'blues',
    name: 'Blues',
    intervals: [0, 3, 5, 6, 7, 10],
    description: 'Minor-Pentatonic plus Blue-Note — perfekt für Blues & Rock.',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    description: 'Moll mit großer Sexte — jazzig und versiert.',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    description: 'Dur mit kleiner Septime — Rock-/Funk-Klassiker.',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    description: 'Moll mit kleiner Sekunde — spanisch/metalisch.',
  },
];

export const pitchIndexOf = (note: string): number => {
  const match = note.replace(/\d+$/, '').match(/^([A-G])(#|b)?$/);
  if (!match) return -1;
  const base = PITCH_CLASSES.indexOf(match[1] as any);
  if (base < 0) return -1;
  const sharp = match[2] === '#';
  const flat = match[2] === 'b';
  let idx = base + (sharp ? 1 : flat ? -1 : 0);
  idx = ((idx % 12) + 12) % 12;
  return idx;
};

export const pitchClassName = (idx: number): string =>
  PITCH_CLASSES[((idx % 12) + 12) % 12];

export const noteClasses = (notes: string[]): number[] =>
  Array.from(new Set(notes.map(pitchIndexOf).filter((n) => n >= 0)));

export const scaleNoteClasses = (root: number, intervals: number[]): number[] =>
  intervals.map((i) => (root + i) % 12);

export const scaleNames = (root: number, intervals: number[]): string[] =>
  scaleNoteClasses(root, intervals).map(pitchClassName);

export interface KeySuggestion {
  key: string;
  rootIndex: number;
  scale: ScaleDef;
  score: number;
}

export const detectBestScale = (detectedNotes: string[]): KeySuggestion | null => {
  if (detectedNotes.length < 1) return null;
  const played = noteClasses(detectedNotes);

  let best: KeySuggestion | null = null;
  for (let root = 0; root < 12; root++) {
    for (const scale of SCALE_DEFS) {
      const inScale = new Set(scaleNoteClasses(root, scale.intervals));
      let hit = 0;
      for (const pc of played) if (inScale.has(pc)) hit++;
      const outside = played.length - hit;
      const score = hit * 2 - outside;
      if (!best || score > best.score) {
        best = {
          key: pitchClassName(root),
          rootIndex: root,
          scale,
          score,
        };
      }
    }
  }
  return best;
};

export const suggestScalesForNotes = (notes: string[]): KeySuggestion[] => {
  if (notes.length === 0) return [];
  const played = noteClasses(notes);
  const suggestions: KeySuggestion[] = [];

  for (let root = 0; root < 12; root++) {
    for (const scale of SCALE_DEFS) {
      const inScale = new Set(scaleNoteClasses(root, scale.intervals));
      let hit = 0;
      for (const pc of played) if (inScale.has(pc)) hit++;
      const outside = played.length - hit;
      if (hit < Math.max(1, Math.ceil(played.length / 2))) continue;
      suggestions.push({
        key: pitchClassName(root),
        rootIndex: root,
        scale,
        score: hit * 2 - outside,
      });
    }
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, 5);
};

export const buildScaleRun = (
  root: number,
  intervals: number[],
  upward: boolean,
  length = 7,
): number[] => {
  const classes = scaleNoteClasses(root, intervals);
  const seq: number[] = [];
  for (let i = 0; i < length; i++) {
    const idx = upward ? i % classes.length : classes.length - 1 - (i % classes.length);
    seq.push(classes[idx]);
  }
  return seq;
};

export const buildTargetSequence = (
  root: number,
  intervals: number[],
  length = 6,
): number[] => {
  const classes = scaleNoteClasses(root, intervals);
  const seq: number[] = [];
  let last = root;
  for (let i = 0; i < length; i++) {
    const options = classes.filter((c) => c !== last);
    // Random walk that stays inside the scale and only moves ≤ 3 semitones
    const near = options.filter((c) => {
      const dist = Math.abs(((c - last + 12) % 12) - 12) ? Math.min((c - last + 12) % 12, (last - c + 12) % 12) : 0;
      return dist <= 4;
    });
    const pool = near.length ? near : options;
    const next = pool[Math.floor(Math.random() * pool.length)];
    seq.push(next);
    last = next;
  }
  return seq;
};

export const shiftOctave = (pitchClass: number, octave = 3): string =>
  `${pitchClassName(pitchClass)}${octave}`;
