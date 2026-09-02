import { PlayerProgress } from '../../core/progress';

/** Baustein für Tests: vollständiger PlayerProgress mit überschreibbaren Werten. */
export const emptyProgressLike = (
  overrides: Partial<PlayerProgress> = {},
): PlayerProgress => ({
  xp: 0,
  level: 1,
  streak: 0,
  modules: {
    lickTrainer: { licks: {} },
    coach: { bestBpm: 0, bestStreak: 0, stars: 0, totalXp: 0, runs: 0 },
    rhythmJam: { bestBpm: 0, bestStreak: 0, stars: 0, totalXp: 0, runs: 0 },
  },
  ...overrides,
});
