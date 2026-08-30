/**
 * React hook around the local progress store.
 */
import { useCallback, useState } from 'react';
import {
  loadProgress,
  saveProgress,
  addXp,
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
    (amount: number, lickId: string, extra?: Partial<LickProgress>) => {
      const { player: next, leveledUp } = addXp(loadProgress(), amount, lickId, extra);
      setPlayer(next);
      saveProgress(next);
      return leveledUp;
    },
    [],
  );

  const reset = useCallback(() => {
    saveProgress({ xp: 0, level: 1, streak: 0, modules: { lickTrainer: { licks: {} } } });
    setPlayer(loadProgress());
  }, []);

  return { player, update, grant, reset };
};
