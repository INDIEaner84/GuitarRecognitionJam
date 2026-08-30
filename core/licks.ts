/**
 * Lick model + sample licks.
 *
 * This is the musical single source of truth shared by:
 *  - manual lick editor
 *  - playback scheduler
 *  - microphone matching / gating logic
 *  - timeline + fretboard visualisation
 */

export interface LickEvent {
  id: string;
  /** Start position in beats (0 = first beat). */
  beat: number;
  /** Duration in beats. */
  durationBeats: number;
  /** Pitches for playback, e.g. ["E3"]. */
  notes: string[];
  /** Guitar string (1 = high e, 6 = low E) when known. */
  string?: number;
  /** Guitar fret when known. */
  fret?: number;
}

export interface Lick {
  id: string;
  title: string;
  key?: string;
  description?: string;
  events: LickEvent[];
}

export interface TempoSettings {
  startBpm: number;
  minBpm: number;
  maxBpm: number;
  stepBpm: number;
}

export type GatingVariable = 'note' | 'timing' | 'both';

export interface MatchSettings {
  variable: GatingVariable;
  /** Ignore octaves when comparing played notes. */
  octaveTolerance: boolean;
  /** "Perfekt" timing window (ms). */
  perfectWindowMs: number;
  /** Grace window (ms) before the run is considered missed/too early/too late. */
  graceWindowMs: number;
}

export type FeedbackKind =
  | 'perfect'
  | 'good'
  | 'early'
  | 'late'
  | 'wrong-note'
  | 'missed'
  | 'on-time-note-only';

export interface RunResult {
  noteCorrect: boolean;
  timingCorrect: boolean;
  passed: boolean;
  deltaMs: number;
  feedback: FeedbackKind;
  note: string;
}

export interface LickProgress {
  bestBpm: number;
  cleanRuns: number;
  stars: number;
  totalXp: number;
}

export const normalizeNoteName = (note: string): string =>
  String(note).replace(/\d+$/, '');

export const noteClass = (note: string): string =>
  normalizeNoteName(note).replace(/#/g, '#');

export const samePitch = (a: string, b: string): boolean =>
  noteClass(a) === noteClass(b);

export const eventById = (lick: Lick, id: string): LickEvent | undefined =>
  lick.events.find((e) => e.id === id);

export const sortedEvents = (lick: Lick): LickEvent[] =>
  [...lick.events].sort((a, b) => a.beat - b.beat);

export const totalBeats = (lick: Lick): number =>
  sortedEvents(lick).reduce((max, e) => Math.max(max, e.beat + e.durationBeats), 0);

export const cloneLick = (lick: Lick): Lick => JSON.parse(JSON.stringify(lick));

let idCounter = 1000;
export const nextLickEventId = (): string => `evt-${++idCounter}`;

export const makeEvent = (
  partial: Partial<LickEvent> = {},
): LickEvent => ({
  id: partial.id ?? nextLickEventId(),
  beat: partial.beat ?? 0,
  durationBeats: partial.durationBeats ?? 0.5,
  notes: partial.notes ?? ['E3'],
  string: partial.string,
  fret: partial.fret,
});

export interface BuiltinLick extends Lick {
  builtin?: boolean;
}

export const BUILTIN_LICKS: BuiltinLick[] = [
  {
    id: 'lick-em-blues',
    title: 'E Minor Blues Run',
    key: 'E minor',
    description: 'A small pentatonic/blues run around the 5th fret (clean pick).',
    builtin: true,
    events: [
      { id: 'b1', beat: 0, durationBeats: 0.5, notes: ['G3'], string: 1, fret: 3 },
      { id: 'b2', beat: 0.5, durationBeats: 0.5, notes: ['A3'], string: 2, fret: 3 },
      { id: 'b3', beat: 1, durationBeats: 0.5, notes: ['B3'], string: 2, fret: 5 },
      { id: 'b4', beat: 1.5, durationBeats: 0.5, notes: ['D4'], string: 2, fret: 7 },
      { id: 'b5', beat: 2, durationBeats: 0.5, notes: ['E4'], string: 1, fret: 7 },
      { id: 'b6', beat: 2.5, durationBeats: 1, notes: ['D4'], string: 2, fret: 7 },
    ],
  },
  {
    id: 'lick-g-major',
    title: 'G Major Pentatonic Warm-up',
    key: 'G major',
    description: 'Open-position G major pentatonic shape, one note per beat.',
    builtin: true,
    events: [
      { id: 'g1', beat: 0, durationBeats: 0.5, notes: ['G3'], string: 6, fret: 3 },
      { id: 'g2', beat: 0.5, durationBeats: 0.5, notes: ['A3'], string: 5, fret: 0 },
      { id: 'g3', beat: 1, durationBeats: 0.5, notes: ['B3'], string: 5, fret: 2 },
      { id: 'g4', beat: 1.5, durationBeats: 0.5, notes: ['D4'], string: 4, fret: 0 },
      { id: 'g5', beat: 2, durationBeats: 0.5, notes: ['G4'], string: 1, fret: 3 },
      { id: 'g6', beat: 2.5, durationBeats: 1, notes: ['D4'], string: 4, fret: 0 },
    ],
  },
  {
    id: 'lick-a-minor-octave',
    title: 'A Minor Two-Octave Idea',
    key: 'A minor',
    description: 'Climbs from open-position A to the next octave.',
    builtin: true,
    events: [
      { id: 'a1', beat: 0, durationBeats: 0.5, notes: ['A2'], string: 6, fret: 0 },
      { id: 'a2', beat: 0.5, durationBeats: 0.5, notes: ['C3'], string: 5, fret: 3 },
      { id: 'a3', beat: 1, durationBeats: 0.5, notes: ['D3'], string: 4, fret: 0 },
      { id: 'a4', beat: 1.5, durationBeats: 0.5, notes: ['E3'], string: 4, fret: 2 },
      { id: 'a5', beat: 2, durationBeats: 0.5, notes: ['A3'], string: 3, fret: 2 },
      { id: 'a6', beat: 2.5, durationBeats: 1, notes: ['C4'], string: 2, fret: 1 },
    ],
  },
];

/** Convert an ASCII-ish textual event list (for the manual editor). */
export const parseEventText = (lines: string[]): LickEvent[] =>
  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [noteSpec, beatSpec, durSpec, posSpec] = line.split(/\s+/);
      const notes = noteSpec
        ? noteSpec.split('/')
        : ['E3'];
      const match = posSpec?.match(/(\d+)[- ](\d+)/);
      return makeEvent({
        beat: Number(beatSpec ?? index),
        durationBeats: Number(durSpec ?? 0.5),
        notes,
        string: match ? Number(match[1]) : undefined,
        fret: match ? Number(match[2]) : undefined,
      });
    });
