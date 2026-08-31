/**
 * Song / Fake-Book presets.
 *
 * These are stylistic patterns (not full transcriptions) labelled in a
 * descriptive way so they are safe to reference by vibe rather than exact
 * copyrighted charts.
 */
import { JamMode, ProgressionDef } from './harmony';

export interface SongPreset {
  id: string;
  title: string;
  genre: string;
  difficulty: 1 | 2 | 3;
  mode: JamMode;
  progressionId: string;
  description: string;
  defaultKey: number; // pitch-class index (0=C ... 9=A ...)
}

export const SONG_CATALOG: SongPreset[] = [
  {
    id: 'song-90s-pop',
    title: '90s Pop Vibe',
    genre: 'Pop/Rock',
    difficulty: 1,
    mode: 'major',
    progressionId: 'pop-i-v-vi-iv',
    description: 'Catchy 4-Chorders — ideal für Sing-Along-Sessions.',
    defaultKey: 0,
  },
  {
    id: 'song-wonderwall-style',
    title: 'Britpop Ballad',
    genre: 'Britpop',
    difficulty: 1,
    mode: 'major',
    progressionId: 'pop-i-vi-iv-v',
    description: 'Klare Kadenz mit viel Luft für Rhythmus und Melodie.',
    defaultKey: 7,
  },
  {
    id: 'song-12bar',
    title: '12-Bar Blues',
    genre: 'Blues',
    difficulty: 2,
    mode: 'major',
    progressionId: '12-bar-blues',
    description: 'Der Klassiker — jede Taktgruppe ein Akkord, viel Call & Response.',
    defaultKey: 9,
  },
  {
    id: 'song-hotel-style',
    title: 'Desert Ballad',
    genre: 'Folk/Rock',
    difficulty: 1,
    mode: 'minor',
    progressionId: 'minor-i-vi-iii-vii',
    description: 'Am–F–C–G-Gefühl: weich, deutlich, leicht zu jammen.',
    defaultKey: 9,
  },
  {
    id: 'song-jersey-style',
    title: 'Strummer-Style',
    genre: 'Alternative',
    difficulty: 2,
    mode: 'major',
    progressionId: 'song-jersey',
    description: 'G–B–C–Cm: dunkler Dur-Farbwechsel mit einem Moll-Kick.',
    defaultKey: 7,
  },
  {
    id: 'song-reggae-style',
    title: 'Skank & Groove',
    genre: 'Reggae/Ska',
    difficulty: 2,
    mode: 'minor',
    progressionId: 'song-reggae',
    description: 'Am–G–F–E: Reggae-/Ska-Bewegung mit viel Off-Beat-Potenzial.',
    defaultKey: 9,
  },
  {
    id: 'song-dim-goth',
    title: 'Goth Rising',
    genre: 'Dark/Post-Punk',
    difficulty: 2,
    mode: 'minor',
    progressionId: 'song-goth',
    description: 'i–VII–VI–v mit Dominant-Charakter — düster, treibend.',
    defaultKey: 2,
  },
];

export const songById = (id: string): SongPreset | undefined =>
  SONG_CATALOG.find((s) => s.id === id);

// Extra progression definitions referenced by the song catalog.
export const EXTRA_PROGRESSIONS: ProgressionDef[] = [
  {
    id: 'song-jersey',
    label: 'Strummer-Style (I–III–IV–iv)',
    mode: 'major',
    note: 'G–B–C–Cm: der Moll-Kick auf der vi erzeugt Bitter-Sweet-Farbe.',
    steps: [
      { degree: 'I', qualityId: 'maj', beats: 4 },
      { degree: 'III', qualityId: 'maj', beats: 4 },
      { degree: 'IV', qualityId: 'maj', beats: 4 },
      { degree: 'IV', qualityId: 'min', beats: 4 },
    ],
  },
  {
    id: 'song-reggae',
    label: 'Skank & Groove (i–VII–VI–V)',
    mode: 'minor',
    note: 'Am–G–F–E: Off-Beat auf der 2 und 4 fühlt sich sofort nach Reggae/Ska an.',
    steps: [
      { degree: 'i', qualityId: 'min', beats: 4 },
      { degree: 'VII', qualityId: 'maj', beats: 4 },
      { degree: 'VI', qualityId: 'maj', beats: 4 },
      { degree: 'V', qualityId: 'dom7', beats: 4 },
    ],
  },
  {
    id: 'song-goth',
    label: 'Goth Rising (i–VII–VI–v)',
    mode: 'minor',
    note: 'i–bVII–bVI–v: düsterer Post-Punk-Flow mit Dominante.',
    steps: [
      { degree: 'i', qualityId: 'min', beats: 4 },
      { degree: 'VII', qualityId: 'maj', beats: 4 },
      { degree: 'VI', qualityId: 'maj', beats: 4 },
      { degree: 'V', qualityId: 'min', beats: 8 },
    ],
  },
];
