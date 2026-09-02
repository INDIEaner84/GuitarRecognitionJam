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

/**
 * Strenger Vergleich: haben beide Noten eine Oktavangabe, müssen die Oktaven
 * übereinstimmen. Damit wirkt die „Oktav-Toleranz aus“-Option im Trainer.
 */
export const samePitchStrict = (a: string, b: string): boolean => {
  const octaveA = /\d+$/.exec(a)?.[0];
  const octaveB = /\d+$/.exec(b)?.[0];
  if (octaveA && octaveB && octaveA !== octaveB) return false;
  return noteClass(a) === noteClass(b);
};

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
  genre?: string;
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
  {
    id: 'lick-rock-e-riff',
    title: 'Rock Power Riff',
    key: 'E minor',
    description: 'Palm-muted power-chord style riff on the low strings.',
    genre: 'rock',
    builtin: true,
    events: [
      { id: 'r1', beat: 0, durationBeats: 0.25, notes: ['E2'], string: 6, fret: 0 },
      { id: 'r2', beat: 0.25, durationBeats: 0.25, notes: ['G2'], string: 6, fret: 3 },
      { id: 'r3', beat: 0.5, durationBeats: 0.25, notes: ['A2'], string: 5, fret: 0 },
      { id: 'r4', beat: 0.75, durationBeats: 0.25, notes: ['G2'], string: 6, fret: 3 },
      { id: 'r5', beat: 1, durationBeats: 0.5, notes: ['E2'], string: 6, fret: 0 },
      { id: 'r6', beat: 2, durationBeats: 0.5, notes: ['D2'], string: 4, fret: 0 },
      { id: 'r7', beat: 2.5, durationBeats: 0.25, notes: ['E2'], string: 6, fret: 0 },
      { id: 'r8', beat: 2.75, durationBeats: 0.25, notes: ['C3'], string: 5, fret: 3 },
    ],
  },
  {
    id: 'lick-blues-bb',
    title: 'BB-Style Turnaround',
    key: 'Bb major',
    description: 'A classic blues turnaround phrase in ninth position.',
    genre: 'blues',
    builtin: true,
    events: [
      { id: 'bb1', beat: 0, durationBeats: 0.5, notes: ['F3'], string: 1, fret: 3 },
      { id: 'bb2', beat: 0.5, durationBeats: 0.5, notes: ['G3'], string: 1, fret: 5 },
      { id: 'bb3', beat: 1, durationBeats: 0.5, notes: ['F3'], string: 1, fret: 3 },
      { id: 'bb4', beat: 1.5, durationBeats: 0.5, notes: ['D3'], string: 2, fret: 5 },
      { id: 'bb5', beat: 2, durationBeats: 0.5, notes: ['Bb2'], string: 3, fret: 0 },
      { id: 'bb6', beat: 2.5, durationBeats: 1, notes: ['A2'], string: 5, fret: 0 },
    ],
  },
  {
    id: 'lick-jazz-ii-v',
    title: 'Jazz ii-V Lick',
    key: 'C major',
    description: 'A bebop-flavoured phrase over the ii–V–I progression.',
    genre: 'jazz',
    builtin: true,
    events: [
      { id: 'j1', beat: 0, durationBeats: 0.5, notes: ['D4'], string: 2, fret: 3 },
      { id: 'j2', beat: 0.5, durationBeats: 0.5, notes: ['F4'], string: 1, fret: 3 },
      { id: 'j3', beat: 1, durationBeats: 0.5, notes: ['A4'], string: 1, fret: 7 },
      { id: 'j4', beat: 1.5, durationBeats: 0.5, notes: ['G4'], string: 1, fret: 5 },
      { id: 'j5', beat: 2, durationBeats: 0.5, notes: ['E4'], string: 2, fret: 5 },
      { id: 'j6', beat: 2.5, durationBeats: 1, notes: ['C4'], string: 2, fret: 1 },
    ],
  },
  {
    id: 'lick-folk-g',
    title: 'Folk G-Pentatonic',
    key: 'G major',
    description: 'Open-voiced folk melody, gentle and singable.',
    genre: 'folk',
    builtin: true,
    events: [
      { id: 'f1', beat: 0, durationBeats: 0.5, notes: ['D4'], string: 2, fret: 3 },
      { id: 'f2', beat: 0.5, durationBeats: 0.5, notes: ['B3'], string: 3, fret: 2 },
      { id: 'f3', beat: 1, durationBeats: 0.5, notes: ['G3'], string: 6, fret: 3 },
      { id: 'f4', beat: 1.5, durationBeats: 0.5, notes: ['A3'], string: 5, fret: 0 },
      { id: 'f5', beat: 2, durationBeats: 1, notes: ['G3'], string: 6, fret: 3 },
      { id: 'f6', beat: 3, durationBeats: 1, notes: ['D4'], string: 2, fret: 3 },
    ],
  },
  {
    id: 'lick-metal-phrygian',
    title: 'Metal Phrygian',
    key: 'E phrygian',
    description: 'Tension-heavy phrygian run with the low E drone.',
    genre: 'metal',
    builtin: true,
    events: [
      { id: 'm1', beat: 0, durationBeats: 0.25, notes: ['E2'], string: 6, fret: 0 },
      { id: 'm2', beat: 0.25, durationBeats: 0.25, notes: ['F2'], string: 6, fret: 1 },
      { id: 'm3', beat: 0.5, durationBeats: 0.25, notes: ['G2'], string: 6, fret: 3 },
      { id: 'm4', beat: 0.75, durationBeats: 0.25, notes: ['F2'], string: 6, fret: 1 },
      { id: 'm5', beat: 1, durationBeats: 0.5, notes: ['E2'], string: 6, fret: 0 },
      { id: 'm6', beat: 2, durationBeats: 0.5, notes: ['B2'], string: 5, fret: 2 },
      { id: 'm7', beat: 2.5, durationBeats: 0.25, notes: ['C3'], string: 5, fret: 3 },
      { id: 'm8', beat: 2.75, durationBeats: 0.25, notes: ['B2'], string: 5, fret: 2 },
    ],
  },
  {
    id: 'lick-reggae-offbeat',
    title: 'Reggae Offbeat',
    key: 'A minor',
    description: 'Off-beat skank phrase between chord stabs.',
    genre: 'reggae',
    builtin: true,
    events: [
      { id: 're1', beat: 0, durationBeats: 0.5, notes: ['A3'], string: 3, fret: 2 },
      { id: 're2', beat: 1, durationBeats: 0.5, notes: ['C4'], string: 2, fret: 1 },
      { id: 're3', beat: 2, durationBeats: 0.5, notes: ['E3'], string: 4, fret: 2 },
      { id: 're4', beat: 3, durationBeats: 0.5, notes: ['A3'], string: 3, fret: 2 },
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
