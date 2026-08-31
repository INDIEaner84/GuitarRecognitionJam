/**
 * Design themes / prototypes.
 *
 * Theming is CSS-variable driven. Switching `data-cyber-theme` on <html>
 * instantly recolours the whole app (cards, neon, glows, background).
 */
export interface ThemeColors {
  cyan: string;
  magenta: string;
  amber: string;
  purple: string;
  green: string;
  bg: string;
}

export interface ThemeDef {
  id: string;
  name: string;
  tagline: string;
  description: string;
  font: string;
  colors: ThemeColors;
  prototype: {
    title: string;
    subtitle: string;
    chord: string;
    mode: string;
  };
}

export const THEMES: ThemeDef[] = [
  {
    id: 'neon-tokyo',
    name: 'Neo-Tokyo',
    tagline: 'AKIRA CYBER',
    description: 'Der Original-Cyberpunk: Cyan + Magenta auf dunklem Neon, Grid und Scanlines.',
    font: 'Orbitron',
    colors: { cyan: '#00f0ff', magenta: '#ff2a6d', amber: '#f9f002', purple: '#9d00ff', green: '#39ff14', bg: '#04060f' },
    prototype: { title: 'HARMONIC SCOUT', subtitle: 'AI MUSICAL INTELLIGENCE', chord: 'Amaj7', mode: 'LIVE SYNTH' },
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    tagline: 'PASTEL DREAMS',
    description: 'Lila/Pink/Aqua auf Night-Purple. Vorbei an der 80er — weich, schwebend, träumerisch.',
    font: 'Rajdhani',
    colors: { cyan: '#00e5ff', magenta: '#ff66d9', amber: '#ffcc00', purple: '#8a2be2', green: '#00ffc3', bg: '#120a2a' },
    prototype: { title: 'DREAM LOOP', subtitle: 'VAPOR JAM SYSTEM', chord: 'Emin7', mode: 'PASTEL MODE' },
  },
  {
    id: 'retro-crt',
    name: 'Retro CRT',
    tagline: 'GREEN PHOSPHOR',
    description: 'Schwarz mit Grün/Amber — wie ein alter Monitor. Maximale Arcade-Atmosphäre.',
    font: 'Share Tech Mono',
    colors: { cyan: '#39ff14', magenta: '#c6ff00', amber: '#f9f002', purple: '#39ff14', green: '#39ff14', bg: '#020802' },
    prototype: { title: 'PIXEL RHYTHM', subtitle: 'CRT SOUND UNIT', chord: 'G7', mode: 'ARCADE' },
  },
  {
    id: 'midnight-jazz',
    name: 'Midnight Jazz',
    tagline: 'GOLD SMOKE',
    description: 'Nachtnavy mit Gold/Amber — dunkel, edel, wie ein Jazz-Club um Mitternacht.',
    font: 'Rajdhani',
    colors: { cyan: '#5d6d7e', magenta: '#d4a017', amber: '#ffb347', purple: '#b8860b', green: '#c0c0c0', bg: '#0a0a12' },
    prototype: { title: 'SMOKE & GOLD', subtitle: 'LATE NIGHT JAM', chord: 'Dmin7', mode: 'DAJOR' },
  },
  {
    id: 'miami',
    name: 'Miami Sunset',
    tagline: 'BLURRED NEON',
    description: 'Cyan-Teal + Hot Pink auf Deep Purple — Sommer, Palmen, Synthwave-Sonnenuntergang.',
    font: 'Orbitron',
    colors: { cyan: '#00e5ff', magenta: '#ff007f', amber: '#ffd166', purple: '#7b2ff7', green: '#00ffd5', bg: '#1a0b2e' },
    prototype: { title: 'SUNSET DRIVE', subtitle: 'MIAMI NEON SYSTEM', chord: 'Bmaj7', mode: 'DRIVE' },
  },
];

export const DEFAULT_THEME = THEMES[0].id;

export const themeById = (id: string): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
