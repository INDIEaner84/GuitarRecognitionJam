/**
 * Lick library taxonomy — works on top of BUILTIN_LICKS.
 */
import { BUILTIN_LICKS, BuiltinLick } from './licks';

export interface LickCategory {
  id: string;
  label: string;
  icon: string;
  blurb: string;
}

export const LICK_CATEGORIES: LickCategory[] = [
  { id: 'all', label: 'Alle', icon: '🎸', blurb: 'Alle Licks in der Bibliothek.' },
  { id: 'blues', label: 'Blues', icon: '🎷', blurb: 'Phrasen mit Blue-Note und Call & Response.' },
  { id: 'rock', label: 'Rock', icon: '🎤', blurb: 'Power-Riffs und kraftvolle Muster.' },
  { id: 'jazz', label: 'Jazz', icon: '🎺', blurb: 'Bebop-Flair, ii–V–I und Chromatik.' },
  { id: 'folk', label: 'Folk', icon: '🪕', blurb: 'Offene, singbare Melodien.' },
  { id: 'metal', label: 'Metal', icon: '⚡', blurb: 'Phrygisch, Drones und Tension.' },
  { id: 'reggae', label: 'Reggae', icon: '🌴', blurb: 'Off-Beat-, Skank- und Groove-Motive.' },
  { id: 'pentatonic', label: 'Pentatonic', icon: '🎯', blurb: 'Die immer-sichere Improvisationsskala.' },
];

export const genreOfLick = (lick: BuiltinLick): string => {
  if (lick.genre) return lick.genre;
  if (/pent/i.test(lick.title ?? '')) return 'pentatonic';
  if (/blues/i.test(lick.id ?? '')) return 'blues';
  return 'all';
};

export const licksInCategory = (category: string): BuiltinLick[] =>
  category === 'all'
    ? BUILTIN_LICKS
    : BUILTIN_LICKS.filter((l) => genreOfLick(l) === category);

export const libraryCount = (): number => BUILTIN_LICKS.length;
