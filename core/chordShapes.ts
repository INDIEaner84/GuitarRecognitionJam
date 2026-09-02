/**
 * Real guitar chord grips.
 *
 * For common keys we use curated standard open/barre shapes so the diagrams
 * look like a real chord book. For every other (key, quality) we generate a
 * valid fretboard voicing so nothing is missing across all twelve keys.
 */
import { ChordDef } from './harmony';

export type StringIndex = 0 | 1 | 2 | 3 | 4 | 5; // 0 = low E ... 5 = high e

export interface FretPosition {
  string: StringIndex;
  fret: number; // -1 = muted, 0 = open, >0 = fretted
  pitchClass: number;
  role: 'root' | 'third' | 'fifth' | 'seventh' | 'color';
}

export interface ChordShape {
  rootClass: number;
  qualityId: string;
  positions: FretPosition[];
  mutedStrings: StringIndex[];
  minFret: number;
  maxFret: number;
  hasBarre: boolean;
  label: string;
  curated: boolean;
}

const TUNING = [4, 9, 2, 7, 11, 4]; // low E -> high e
const STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'e'];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const pcAt = (str: StringIndex, fret: number): number =>
  (TUNING[str] + fret) % 12;

const roleForInterval = (interval: number): FretPosition['role'] => {
  switch (interval) {
    case 0:
      return 'root';
    case 3:
    case 4:
      return 'third';
    case 6:
    case 7:
      return 'fifth';
    case 10:
    case 11:
      return 'seventh';
    default:
      return 'color';
  }
};

// Curated open/barre shapes: [low E, A, D, G, B, high e].
// -1 = muted, 0 = open. Strings with -1 are not played.
const CURATED: Record<string, number[]> = {
  'Cmaj': [ -1, 3, 2, 0, 1, 0 ],
  'Cmaj7': [ -1, 3, 2, 0, 0, 0 ],
  'Cdom7': [ -1, 3, 2, 3, 1, 0 ],
  'Cmin': [ -1, 3, 5, 5, 4, 3 ],
  'Cmin7': [ -1, 3, 5, 3, 4, 3 ],
  'Amaj': [ -1, 0, 2, 2, 2, 0 ],
  'Amaj7': [ -1, 0, 2, 1, 2, 0 ],
  'Adom7': [ -1, 0, 2, 0, 2, 0 ],
  'Amin': [ -1, 0, 2, 2, 1, 0 ],
  'Amin7': [ -1, 0, 2, 0, 1, 0 ],
  'Asus4': [ -1, 0, 2, 2, 3, 0 ],
  'Gmaj': [ 3, 2, 0, 0, 0, 3 ],
  'Gmaj7': [ 3, 0, 0, 0, 2, 3 ],
  'Gdom7': [ 3, 2, 0, 0, 0, 1 ],
  'Dmaj': [ -1, -1, 0, 2, 3, 2 ],
  'Dmaj7': [ -1, -1, 0, 2, 2, 2 ],
  'Ddom7': [ -1, -1, 0, 2, 1, 2 ],
  'Dmin': [ -1, -1, 0, 2, 3, 1 ],
  'Dmin7': [ -1, -1, 0, 2, 1, 1 ],
  'Dsus4': [ -1, -1, 0, 2, 3, 3 ],
  'Emaj': [ 0, 2, 2, 1, 0, 0 ],
  'Emaj7': [ 0, 2, 1, 1, 0, 0 ],
  'Edom7': [ 0, 2, 0, 1, 0, 0 ],
  'Emin': [ 0, 2, 2, 0, 0, 0 ],
  'Emin7': [ 0, 2, 0, 0, 0, 0 ],
  'Esus4': [ 0, 2, 2, 2, 0, 0 ],
  'Fmaj': [ 1, 3, 3, 2, 1, 1 ],
  'Fmaj7': [ 1, 3, 2, 2, 1, 1 ],
  'Fdom7': [ 1, 3, 1, 2, 1, 1 ],
  'Fmin': [ 1, 3, 3, 1, 1, 1 ],
  'Fmin7': [ 1, 3, 1, 1, 1, 1 ],
  'Bmaj': [ -1, 2, 4, 4, 4, 2 ],
  'Bdom7': [ -1, 2, 1, 2, 0, 2 ],
  'Bmin': [ -1, 2, 4, 4, 3, 2 ],
  'Bmin7': [ -1, 2, 4, 2, 3, 2 ],
};

const shapeFromCurated = (
  rootClass: number,
  qualityId: string,
  def: ChordDef,
  frets: number[],
): ChordShape | null => {
  const positions: FretPosition[] = [];
  const mutedStrings: StringIndex[] = [];

  for (let s = 0; s < 6; s++) {
    const f = frets[s];
    if (f === -1) {
      mutedStrings.push(s as StringIndex);
      continue;
    }
    const pc = pcAt(s as StringIndex, f);
    const interval = (pc - rootClass + 12) % 12;
    positions.push({
      string: s as StringIndex,
      fret: f,
      pitchClass: pc,
      role: roleForInterval(interval),
    });
  }

  if (!positions.length) return null;

  const fretted = positions.filter((p) => p.fret > 0);
  const minFret = Math.min(...positions.map((p) => p.fret));
  const maxFret = Math.max(...positions.map((p) => p.fret));

  return {
    rootClass,
    qualityId,
    positions,
    mutedStrings,
    minFret,
    maxFret,
    hasBarre: fretted.length >= 4 && Math.min(...fretted.map((p) => p.fret)) >= 1,
    label: `${NOTE_NAMES[rootClass]}${def.symbol}`,
    curated: true,
    // Note: we keep the curated shape even if it omits the 7th because that is
    // exactly how many players fret the chord; the diagram still reads clearly.
  };
};

/** Kleinerer Wert = griffiger: tiefe Lage, kompakte Spannweite, offene Saiten. */
const shapeScore = (shape: ChordShape): number =>
  shape.maxFret * 10 +
  (shape.maxFret - shape.minFret) * 4 +
  shape.mutedStrings.length * 2 -
  shape.positions.filter((p) => p.fret === 0).length * 3;

const generatedShape = (rootClass: number, def: ChordDef): ChordShape | null => {
  const intervals = def.intervals.map((i) => i % 12);
  const targets = new Set(intervals.map((i) => (rootClass + i) % 12));
  const candidates: ChordShape[] = [];

  for (let str = 0; str < 6; str++) {
    for (let fret = 0; fret <= 12; fret++) {
      if (pcAt(str as StringIndex, fret) !== rootClass) continue;

      const positions: FretPosition[] = [];
      positions.push({ string: str as StringIndex, fret, pitchClass: rootClass, role: 'root' });
      const used = new Set([str]);

      for (let s = 0; s < 6; s++) {
        if (s === str) continue;
        let best: number | null = null;
        let bestDist = 99;
        for (let f = 0; f <= 12; f++) {
          const pc = pcAt(s as StringIndex, f);
          if (!targets.has(pc)) continue;
          const dist = Math.abs(f - fret);
          if (dist < bestDist) {
            bestDist = dist;
            best = f;
          }
        }
        if (best == null || bestDist > 6) continue;
        const pc = pcAt(s as StringIndex, best);
        const interval = (pc - rootClass + 12) % 12;
        positions.push({ string: s as StringIndex, fret: best, pitchClass: pc, role: roleForInterval(interval) });
        used.add(s);
      }

      const covered = new Set(positions.map((p) => (p.pitchClass - rootClass + 12) % 12));
      const ok = [...new Set(intervals)].every((i) => covered.has(i)) && positions.length >= 3;
      if (!ok) continue;

      const frets = positions.map((p) => p.fret);
      const minFret = Math.min(...frets);
      const maxFret = Math.max(...frets);
      const mutedStrings: StringIndex[] = [];
      for (let s = 0; s < 6; s++) if (!used.has(s)) mutedStrings.push(s as StringIndex);

      const barre = positions.some((p) => p.fret > 0 && Math.abs(p.fret - fret) <= 2) && minFret >= 1;

      candidates.push({
        rootClass,
        qualityId: def.id,
        positions,
        mutedStrings,
        minFret,
        maxFret,
        hasBarre: barre,
        label: `${NOTE_NAMES[rootClass]}${def.symbol}`,
        curated: false,
      });
    }
  }

  if (!candidates.length) return null;
  // Niedrige Lagen, wenig Spannweite und viele offene Saiten sind griffiger,
  // deshalb gewinnt der Kandidat mit dem kleinsten Score.
  return candidates
    .map((shape) => ({ shape, score: shapeScore(shape) }))
    .sort((a, b) => a.score - b.score)[0].shape;
};

export const buildChordShape = (
  rootClass: number,
  def: ChordDef,
): ChordShape | null => {
  const key = `${NOTE_NAMES[rootClass]}${def.id}`;
  const curated = CURATED[key];
  if (curated) {
    const shape = shapeFromCurated(rootClass, def.id, def, curated);
    if (shape) return shape;
  }
  return generatedShape(rootClass, def);
};

export const allPositionsForPitch = (pitchClass: number): FretPosition[] => {
  const out: FretPosition[] = [];
  for (let s = 0; s < 6; s++) {
    for (let f = 0; f <= 12; f++) {
      if (pcAt(s as StringIndex, f) === pitchClass) {
        out.push({ string: s as StringIndex, fret: f, pitchClass, role: 'color' });
      }
    }
  }
  return out;
};

export const stringName = (s: StringIndex) => STRING_NAMES[s];
