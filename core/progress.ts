/**
 * Local gamification / progress store (localStorage).
 *
 * No backend. Everything survives reloads and stays on the player device.
 */
import { LickProgress } from './licks';

const STORAGE_KEY = 'harmonic-scout.progress.v1';

export interface SectionProgress {
  bestBpm: number;
  bestStreak: number;
  stars: number;
  totalXp: number;
  runs: number;
}

export interface ModuleProgress {
  lickTrainer: {
    licks: Record<string, LickProgress>;
  };
  coach: SectionProgress;
  rhythmJam: SectionProgress;
}

export interface PlayerProgress {
  xp: number;
  level: number;
  streak: number;
  lastPlayedAt?: string;
  modules: ModuleProgress;
}

const LEVEL_XP = 250;

const emptySection = (): SectionProgress => ({
  bestBpm: 0,
  bestStreak: 0,
  stars: 0,
  totalXp: 0,
  runs: 0,
});

const emptyProgress = (): PlayerProgress => ({
  xp: 0,
  level: 1,
  streak: 0,
  modules: {
    lickTrainer: {
      licks: {},
    },
    coach: emptySection(),
    rhythmJam: emptySection(),
  },
});

export const levelForXp = (xp: number): number => Math.floor(xp / LEVEL_XP) + 1;

export const loadProgress = (): PlayerProgress => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress();
    const parsed = JSON.parse(raw) as PlayerProgress;
    return {
      ...emptyProgress(),
      ...parsed,
      modules: {
        lickTrainer: {
          licks: parsed.modules?.lickTrainer?.licks ?? {},
        },
        coach: { ...emptySection(), ...(parsed.modules?.coach ?? {}) },
        rhythmJam: { ...emptySection(), ...(parsed.modules?.rhythmJam ?? {}) },
      },
    };
  } catch {
    return emptyProgress();
  }
};

export const saveProgress = (progress: PlayerProgress) => {
  progress.level = levelForXp(progress.xp);
  progress.lastPlayedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
};

export type SectionKey = 'coach' | 'rhythmJam';

export const addXp = (
  progress: PlayerProgress,
  amount: number,
  lickId: string,
  extra?: Partial<LickProgress>,
): { player: PlayerProgress; leveledUp: boolean } => {
  const before = progress.level;
  progress.xp += amount;
  progress.level = levelForXp(progress.xp);

  const entry = progress.modules.lickTrainer.licks[lickId] ?? {
    bestBpm: 0,
    cleanRuns: 0,
    stars: 0,
    totalXp: 0,
  };

  entry.totalXp ??= 0;
  entry.totalXp += amount;
  if (extra?.bestBpm && extra.bestBpm > entry.bestBpm) entry.bestBpm = extra.bestBpm;
  if (extra?.stars && extra.stars > entry.stars) entry.stars = extra.stars;
  if (extra?.cleanRuns) entry.cleanRuns += extra.cleanRuns;

  progress.modules.lickTrainer.licks[lickId] = entry;
  return { player: progress, leveledUp: progress.level > before };
};

export const addSectionXp = (
  progress: PlayerProgress,
  section: SectionKey,
  amount: number,
  extra?: Partial<SectionProgress>,
): { player: PlayerProgress; leveledUp: boolean } => {
  const before = progress.level;
  progress.xp += amount;
  progress.level = levelForXp(progress.xp);

  const entry = { ...emptySection(), ...progress.modules[section] };
  entry.totalXp += amount;
  entry.runs += extra?.runs ?? 0;
  if (extra?.bestBpm && extra.bestBpm > entry.bestBpm) entry.bestBpm = extra.bestBpm;
  if (extra?.bestStreak && extra.bestStreak > entry.bestStreak) entry.bestStreak = extra.bestStreak;
  if (extra?.stars && extra.stars > entry.stars) entry.stars = extra.stars;

  progress.modules[section] = entry;
  return { player: progress, leveledUp: progress.level > before };
};

export const resetProgress = () => {
  const fresh = emptyProgress();
  saveProgress(fresh);
  return fresh;
};

export const lickStarsForBpm = (bpm: number, maxBpm: number): number => {
  if (bpm >= maxBpm) return 3;
  const ratio = bpm / Math.max(maxBpm, 1);
  if (ratio >= 0.85) return 2;
  if (ratio >= 0.6) return 1;
  return 0;
};

export const sectionStarsForStreak = (streak: number, target: number): number => {
  if (streak >= target) return 3;
  if (streak >= Math.ceil(target / 2)) return 2;
  if (streak >= Math.ceil(target / 4)) return 1;
  return 0;
};
