import { beforeEach, describe, expect, it } from 'vitest';
import {
  addSectionXp,
  addXp,
  levelForXp,
  lickStarsForBpm,
  loadProgress,
  resetProgress,
  saveProgress,
  sectionStarsForStreak,
} from '../core/progress';

/** Minimaler localStorage-Stub, damit der Store ohne Browser testbar ist. */
class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length(): number {
    return this.data.size;
  }
  clear(): void {
    this.data.clear();
  }
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
});

describe('levelForXp', () => {
  it('startet auf Level 1 und steigt alle 250 XP', () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(249)).toBe(1);
    expect(levelForXp(250)).toBe(2);
    expect(levelForXp(750)).toBe(4);
  });
});

describe('loadProgress', () => {
  it('liefert ein vollständiges Default-Objekt ohne gespeicherte Daten', () => {
    const p = loadProgress();
    expect(p.xp).toBe(0);
    expect(p.level).toBe(1);
    expect(p.modules.coach.bestBpm).toBe(0);
    expect(p.modules.lickTrainer.licks).toEqual({});
  });

  it('repariert kaputte/teilweise gespeicherte Daten', () => {
    localStorage.setItem(
      'harmonic-scout.progress.v1',
      JSON.stringify({ xp: 120, modules: {} }),
    );
    const p = loadProgress();
    expect(p.xp).toBe(120);
    expect(p.modules.rhythmJam).toEqual({
      bestBpm: 0,
      bestStreak: 0,
      stars: 0,
      totalXp: 0,
      runs: 0,
    });
  });

  it('übersteht ungültiges JSON', () => {
    localStorage.setItem('harmonic-scout.progress.v1', '{ not json');
    expect(loadProgress().xp).toBe(0);
  });
});

describe('addXp / addSectionXp', () => {
  it('schreibt XP, Sterne und Best-BPM pro Lick', () => {
    const fresh = loadProgress();
    const { player, leveledUp } = addXp(fresh, 300, 'blues-1', {
      bestBpm: 120,
      stars: 2,
      cleanRuns: 1,
    });
    expect(leveledUp).toBe(true);
    expect(player.xp).toBe(300);
    expect(player.level).toBe(2);
    expect(player.modules.lickTrainer.licks['blues-1']).toMatchObject({
      bestBpm: 120,
      stars: 2,
      cleanRuns: 1,
      totalXp: 300,
    });
  });

  it('überschreibt Bestwerte nicht mit schlechteren Werten', () => {
    let { player } = addXp(loadProgress(), 50, 'lick-x', { bestBpm: 140, stars: 3 });
    player = addXp(player, 10, 'lick-x', { bestBpm: 90, stars: 1 }).player;
    expect(player.modules.lickTrainer.licks['lick-x'].bestBpm).toBe(140);
    expect(player.modules.lickTrainer.licks['lick-x'].stars).toBe(3);
    expect(player.modules.lickTrainer.licks['lick-x'].totalXp).toBe(60);
  });

  it('führt Sections getrennt (coach vs. rhythmJam)', () => {
    let player = loadProgress();
    player = addSectionXp(player, 'coach', 100, { bestBpm: 110, bestStreak: 8, runs: 1 }).player;
    player = addSectionXp(player, 'rhythmJam', 25, { bestStreak: 4, runs: 1 }).player;
    expect(player.modules.coach.totalXp).toBe(100);
    expect(player.modules.rhythmJam.totalXp).toBe(25);
    expect(player.modules.coach.runs).toBe(1);
    expect(player.modules.rhythmJam.bestBpm).toBe(0);
  });
});

describe('saveProgress / resetProgress', () => {
  it('persistiert und setzt zurück', () => {
    const { player } = addXp(loadProgress(), 500, 'lick-y');
    saveProgress(player);
    expect(loadProgress().xp).toBe(500);

    resetProgress();
    expect(loadProgress().xp).toBe(0);
    expect(loadProgress().modules.lickTrainer.licks).toEqual({});
  });
});

describe('Sterne-Logik', () => {
  it('vergibt Lick-Sterne nach Ziel-BPM', () => {
    expect(lickStarsForBpm(150, 150)).toBe(3);
    expect(lickStarsForBpm(130, 150)).toBe(2);
    expect(lickStarsForBpm(100, 150)).toBe(1);
    expect(lickStarsForBpm(40, 150)).toBe(0);
  });

  it('vergibt Section-Sterne nach Streak', () => {
    expect(sectionStarsForStreak(16, 16)).toBe(3);
    expect(sectionStarsForStreak(8, 16)).toBe(2);
    expect(sectionStarsForStreak(4, 16)).toBe(1);
    expect(sectionStarsForStreak(2, 16)).toBe(0);
  });
});
