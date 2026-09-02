/**
 * Rhythm-guitar / jam theory engine.
 *
 * Answers three questions:
 *  1. Which chords fit together in a key?
 *  2. Which notes work over a given chord, and when?
 *  3. WHY do they work?  -> chord tones = stable, scale tones = colour,
 *     outside = tension/passing.
 *
 * Everything is pitch-class based so the UI (fretboard, chips, playback) and
 * the piano/keyboard display share one source of truth.
 */
import { pitchClassName } from './theory';

export type ChordQualityId = 'maj' | 'min' | 'maj7' | 'min7' | 'dom7' | 'sus4' | 'dim';
export type JamMode = 'major' | 'minor';

export interface ChordDef {
  id: ChordQualityId;
  label: string;
  symbol: string;
  intervals: number[];
  formula: string;
  character: string;
}

export const CHORD_DEFS: Record<ChordQualityId, ChordDef> = {
  maj: { id: 'maj', label: 'Dur', symbol: '', intervals: [0, 4, 7], formula: '1 · 3 · 5', character: 'sonnig, stabil' },
  min: { id: 'min', label: 'Moll', symbol: 'm', intervals: [0, 3, 7], formula: '1 · b3 · 5', character: 'dunkler, emotional' },
  maj7: { id: 'maj7', label: 'Dur 7', symbol: 'Maj7', intervals: [0, 4, 7, 11], formula: '1 · 3 · 5 · 7', character: 'schwebend, jazzy' },
  min7: { id: 'min7', label: 'Moll 7', symbol: 'm7', intervals: [0, 3, 7, 10], formula: '1 · b3 · 5 · b7', character: 'weich, funky' },
  dom7: { id: 'dom7', label: 'Dominant 7', symbol: '7', intervals: [0, 4, 7, 10], formula: '1 · 3 · 5 · b7', character: 'rockig, bluesig, zieht weiter' },
  sus4: { id: 'sus4', label: 'Sus 4', symbol: 'sus4', intervals: [0, 5, 7], formula: '1 · 4 · 5', character: 'schwebend, offen' },
  dim: { id: 'dim', label: 'Vermindert', symbol: 'dim', intervals: [0, 3, 6], formula: '1 · b3 · b5', character: 'angespannt, wird meist aufgelöst' },
};

export interface ChordInKey {
  degree: string;
  rootIndex: number;
  qualityId: ChordQualityId;
  def: ChordDef;
  pitchClasses: number[];
  noteNames: string[];
  function: string;
}

export interface ProgressionStep {
  degree: string;
  qualityId: ChordQualityId;
  beats: number;
}

export interface ProgressionDef {
  id: string;
  label: string;
  mode: JamMode;
  steps: ProgressionStep[];
  note: string;
}

const MAJOR_OFFSETS: Record<string, number> = {
  I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11,
};
const MINOR_OFFSETS: Record<string, number> = {
  i: 0, ii: 2, III: 3, IV: 5, V: 7, VI: 8, VII: 10,
};

const CHORD_FUNCTION: Record<ChordQualityId, string> = {
  maj: 'Tonika/Ausgangspunkt — klingt stabil',
  min: 'Tonika (moll) — stabil, melancholisch',
  maj7: 'Tonika 7 — luftig, schwebend',
  min7: 'Subdominante/Farbe — weich, jazzy',
  dom7: 'Dominante — zieht zum I-Akkord',
  sus4: 'Vorbereitung — löst häufig auf',
  dim: 'Spannung — leitet zur Tonika',
};

export const PROGRESSIONS: ProgressionDef[] = [
  {
    id: 'pop-i-vi-iv-v',
    label: 'Pop / Emo  (I–vi–IV–V)',
    mode: 'major',
    note: 'Der absolute Allrounder. Hört sich sofort „fertig“ an.',
    steps: [
      { degree: 'I', qualityId: 'maj', beats: 4 },
      { degree: 'VI', qualityId: 'min', beats: 4 },
      { degree: 'IV', qualityId: 'maj', beats: 4 },
      { degree: 'V', qualityId: 'maj', beats: 4 },
    ],
  },
  {
    id: 'pop-i-v-vi-iv',
    label: 'Pop / Ballad  (I–V–vi–IV)',
    mode: 'major',
    note: 'Klingt melodisch/verspielt — „4 Chords“-Klassiker.',
    steps: [
      { degree: 'I', qualityId: 'maj', beats: 4 },
      { degree: 'V', qualityId: 'maj', beats: 4 },
      { degree: 'VI', qualityId: 'min', beats: 4 },
      { degree: 'IV', qualityId: 'maj', beats: 4 },
    ],
  },
  {
    id: 'doo-wop',
    label: 'Doo-Wop/Doowop (I–vi–IV–V)',
    mode: 'major',
    note: 'Retro, catchy — ideal zum Ausprobieren von Melodien.',
    steps: [
      { degree: 'I', qualityId: 'maj', beats: 4 },
      { degree: 'VI', qualityId: 'min', beats: 4 },
      { degree: 'IV', qualityId: 'maj', beats: 4 },
      { degree: 'V', qualityId: 'maj', beats: 4 },
    ],
  },
  {
    id: 'two-five-one',
    label: 'Jazz  (ii–V–I)',
    mode: 'major',
    note: 'Das Herz des Jazz. Lernt das „Ziehen“ von V zu I.',
    steps: [
      { degree: 'II', qualityId: 'min7', beats: 4 },
      { degree: 'V', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'maj7', beats: 8 },
    ],
  },
  {
    id: '12-bar-blues',
    label: '12-Bar Blues (I7–IV7–V7)',
    mode: 'major',
    note: 'Der Klassiker für Rhythmus-Jam. Starke „call & response“-Struktur.',
    steps: [
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'IV', qualityId: 'dom7', beats: 4 },
      { degree: 'IV', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'V', qualityId: 'dom7', beats: 4 },
      { degree: 'IV', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'I', qualityId: 'dom7', beats: 4 },
      { degree: 'V', qualityId: 'dom7', beats: 4 },
    ],
  },
  {
    id: 'minor-i-vi-iii-vii',
    label: 'Moll-Folk (i–VI–III–VII)',
    mode: 'minor',
    note: 'Klassischer Moll-Flow, viel Raum für Sologitarre.',
    steps: [
      { degree: 'i', qualityId: 'min', beats: 4 },
      { degree: 'VI', qualityId: 'maj', beats: 4 },
      { degree: 'III', qualityId: 'maj', beats: 4 },
      { degree: 'VII', qualityId: 'maj', beats: 4 },
    ],
  },
  {
    id: 'minor-i-iv-v',
    label: 'Moll-Power (i–iv–v)',
    mode: 'minor',
    note: 'Kraftvoll, rockig — ideal für Riffs.',
    steps: [
      { degree: 'i', qualityId: 'min', beats: 4 },
      { degree: 'iv', qualityId: 'min', beats: 4 },
      { degree: 'v', qualityId: 'min', beats: 4 },
      { degree: 'v', qualityId: 'min', beats: 4 },
    ],
  },
];

export const keyScalePitchClasses = (keyIndex: number, mode: JamMode): number[] => {
  const offsets = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  return offsets.map((o) => (keyIndex + o) % 12);
};

export const chordPitchClasses = (rootIndex: number, def: ChordDef): number[] =>
  def.intervals.map((i) => (rootIndex + i) % 12);

export const chordInKey = (
  keyIndex: number,
  mode: JamMode,
  degree: string,
  qualityId: ChordQualityId,
): ChordInKey => {
  const offsets = mode === 'major' ? MAJOR_OFFSETS : MINOR_OFFSETS;
  const rootIndex = (keyIndex + (offsets[degree] ?? 0)) % 12;
  const def = CHORD_DEFS[qualityId];
  return {
    degree,
    rootIndex,
    qualityId,
    def,
    pitchClasses: chordPitchClasses(rootIndex, def),
    noteNames: chordPitchClasses(rootIndex, def).map(pitchClassName),
    function: CHORD_FUNCTION[qualityId],
  };
};

export const progressionChords = (
  keyIndex: number,
  mode: JamMode,
  steps: ProgressionStep[],
): ChordInKey[] => steps.map((s) => chordInKey(keyIndex, mode, s.degree, s.qualityId));

export type NoteFit = 'chord-tone' | 'guide-tone' | 'scale-tone' | 'outside';

export interface NoteChoice {
  pitchClass: number;
  noteName: string;
  fit: NoteFit;
  reason: string;
}

export const classifyNote = (
  pitchClass: number,
  chord: ChordInKey,
  keyScale: number[],
): NoteFit => {
  const inChord = chord.pitchClasses.includes(pitchClass);
  const inScale = keyScale.includes(pitchClass);
  if (inChord) {
    const isGuide = pitchClass === (chord.rootIndex + (chord.qualityId.includes('7') ? 10 : chord.qualityId === 'sus4' ? 5 : 3)) % 12;
    return isGuide ? 'guide-tone' : 'chord-tone';
  }
  if (inScale) return 'scale-tone';
  return 'outside';
};

export const noteChoicesForChord = (
  chord: ChordInKey,
  keyScale: number[],
): NoteChoice[] => {
  const all = Array.from({ length: 12 }, (_, i) => i);
  return all
    .map((pc) => {
      const fit = classifyNote(pc, chord, keyScale);
      return {
        pitchClass: pc,
        noteName: pitchClassName(pc),
        fit,
        reason: reasonForFit(pc, fit, chord),
      };
    })
    .filter((n) => n.fit !== 'outside');
};

export const reasonForFit = (
  pitchClass: number,
  fit: NoteFit,
  chord: ChordInKey,
): string => {
  const name = pitchClassName(pitchClass);
  const third = (chord.rootIndex + (chord.qualityId === 'maj' || chord.qualityId === 'maj7' || chord.qualityId === 'dom7' ? 4 : 3)) % 12;

  switch (fit) {
    case 'chord-tone':
      if (pitchClass === chord.rootIndex) return `Grundton von ${chord.degree}. Gibt dem Akkord das Fundament — sicherster Startpunkt.`;
      if (pitchClass === (chord.rootIndex + 4) % 12 && ['maj', 'maj7', 'dom7'].includes(chord.qualityId)) return `${name} ist die Dur-Terz: macht den Akkord hell/fröhlich (${chord.degree} = ${chord.def.label}).`;
      if (pitchClass === (chord.rootIndex + 3) % 12 && ['min', 'min7'].includes(chord.qualityId)) return `${name} ist die Moll-Terz: macht den Akkord dunkel/emotional (${chord.degree} = ${chord.def.label}).`;
      if (pitchClass === (chord.rootIndex + 7) % 12) return `Quinte: klingt neutral/offen — passt fast immer, ohne zu viel Farbe.`;
      return `${name} ist Akkordton von ${chord.degree}${chord.def.symbol}. Klingt sicher, weil er im Akkord selbst steckt.`;
    case 'guide-tone':
      if (pitchClass === third) return `${name} ist die Terz: sie definiert, ob der Akkord dur oder moll ist. Sehr charakteristisch.`;
      return `Leitton (Septime): erzeugt Bewegung und „zieht“ zum nächsten Akkord.`;
    case 'scale-tone':
      return `Tonleiter-Ton: liegt in der Tonart, gehört aber nicht zum Akkord → farbiger, aber weniger stabil. Als Durchgangs-/Füllnote super.`;
    default:
      return `Nicht in Tonart: Spannung/Passing-Note. Klingt „draußen“ — absichtlich als Chromatik einsetzen, nicht lange halten.`;
  }
};

export interface GuideTone {
  pitchClass: number;
  noteName: string;
  label: string;
  reason: string;
}

export const guideToneForChord = (chord: ChordInKey): GuideTone => {
  const isDominant = chord.qualityId === 'dom7';
  const isMin = chord.qualityId.startsWith('min');
  const thirdInterval = isMin ? 3 : 4;
  const pitchClass =
    isDominant
      ? (chord.rootIndex + 10) % 12
      : (chord.rootIndex + thirdInterval) % 12;
  return {
    pitchClass,
    noteName: pitchClassName(pitchClass),
    label: isDominant ? 'b7' : isMin ? 'b3' : '3',
    reason: isDominant
      ? `Dominante von ${chord.degree} → b7 zieht kraftvoll zurück zur Tonika.`
      : `Terz von ${chord.degree} → definiert Dur/Moll und klingt charakteristisch.`,
  };
};

export const buildRhythmLick = (
  keyIndex: number,
  mode: JamMode,
  progression: ProgressionDef,
) => {
  const chords = progressionChords(keyIndex, mode, progression.steps);
  const events = chords.map((chord, i) => ({
    id: `chord-${i}`,
    beat: progression.steps.slice(0, i).reduce((sum, s) => sum + s.beats, 0),
    durationBeats: progression.steps[i].beats,
    notes: chord.noteNames.map((n) => `${n}${n.charCodeAt(0) < 70 ? 3 : 4}`),
  }));
  return {
    id: `rhythm-${progression.id}`,
    title: progression.label,
    events,
  };
};
