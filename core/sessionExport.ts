/**
 * Session export — turns the local progress into a shareable card.
 *
 * Because there is no backend, the "learning card" is a downloadable JSON/markdown
 * summary and a text summary that can be copied to the clipboard.
 */
import { PlayerProgress } from './progress';

export const sessionSummary = (player: PlayerProgress, themeName = 'Neo-Tokyo'): string => {
  const lickVals = Object.values(player.modules.lickTrainer.licks ?? {});
  const bestLickBpm = lickVals.reduce((m, l) => Math.max(m, l.bestBpm ?? 0), 0);
  const totalLickXp = lickVals.reduce((m, l) => m + (l.totalXp ?? 0), 0);

  return [
    'HARMONIC SCOUT — SESSION CARD',
    '──────────────────────────────',
    `Theme:        ${themeName}`,
    `Level:        ${player.level}`,
    `XP:           ${player.xp}`,
    `Streak:       ${player.streak}`,
    `Best Lick BPM: ${bestLickBpm || '—'}`,
    `Lick XP:      ${totalLickXp}`,
    `Coach:        ${player.modules.coach.bestBpm || '—'} BPM · ★${player.modules.coach.stars}`,
    `Rhythm Jam:   ${player.modules.rhythmJam.bestBpm || '—'} BPM · ★${player.modules.rhythmJam.stars}`,
    `Generated:    ${new Date().toISOString()}`,
  ].join('\n');
};

export const downloadSession = (player: PlayerProgress, themeName: string) => {
  const summary = sessionSummary(player, themeName);
  const payload = {
    app: 'Harmonic Scout',
    version: 1,
    exportedAt: new Date().toISOString(),
    theme: themeName,
    progress: player,
    summary,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'harmonic-scout-session.json';
  a.click();
  URL.revokeObjectURL(url);
};

export async function copySessionSummary(player: PlayerProgress, themeName: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(sessionSummary(player, themeName));
    return true;
  } catch {
    return false;
  }
}
