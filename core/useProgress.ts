/**
 * React hook around the local progress store.
 */
import { useCallback, useState } from 'react';
import {
  loadProgress,
  saveProgress,
  addXp,
  addSectionXp,
  SectionKey,
  PlayerProgress,
} from './progress';
import { LickProgress } from './licks';

export const useProgress = () => {
  const [player, setPlayer] = useState<PlayerProgress>(() => loadProgress());

  const update = useCallback(
    (fn: (p: PlayerProgress) => PlayerProgress) => {
      setPlayer((prev) => {
        const next = fn({ ...prev });
        saveProgress(next);
        return next;
      });
    },
    [],
  );

  const grant = useCallback(
    (amount: number, targetKey: string, extra?: Partial<LickProgress> & Record<string, number>) => {
      const p = loadProgress();
      const section: SectionKey | null =
        targetKey === 'coach' ? 'coach' : targetKey === 'rhythm-jam' ? 'rhythmJam' : null;

      const result = section
        ? addSectionXp(p, section, amount, extra as any)
        : addXp(p, amount, targetKey, extra as Partial<LickProgress>);

      setPlayer(result.player);
      saveProgress(result.player);
      return result.leveledUp;
    },
    [],
  );

  const reset = useCallback(() => {
    saveProgress({ xp: 0, level: 1, streak: 0, modules: { lickTrainer: { licks: {} }, coach: { bestBpm: 0, bestStreak: 0, stars: 0, totalXp: 0, runs: 0 }, rhythmJam: { bestBpm: 0, bestStreak: 0, stars: 0, totalXp: 0, runs: 0 } } });
    setPlayer(loadProgress());
  }, []);

  return { player, update, grant, reset };
};
