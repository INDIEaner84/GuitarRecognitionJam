import React, { useState } from 'react';
import { ModuleHub } from './ModuleHub';
import { LickTrainer } from './LickTrainer';
import { useProgress } from '../core/useProgress';
import { LickProgress } from '../core/licks';

export const ImprovisationStudio: React.FC = () => {
  const { player, reset } = useProgress();
  const [view, setView] = useState<'hub' | 'lick-trainer'>('hub');

  const lickProgress = player.modules.lickTrainer.licks;
  const lickValues: LickProgress[] = Object.values(lickProgress);
  const lickProgressRatio = lickValues.length
    ? lickValues.reduce((sum, l) => sum + Math.min(l.stars, 3) / 3, 0) /
      Math.max(lickValues.length, 1)
    : 0;

  const modules: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    available: boolean;
    progress: number;
    onClick: () => void;
  }> = [
    {
      id: 'lick-trainer',
      title: 'Lick-Trainer',
      description:
        'Lick anhören, Noten sehen, mit Mikrofon nachspielen. Nur korrekte Note + perfektes Timing erhöhen das Tempo bis Max BPM.',
      icon: '🎵',
      available: true,
      progress: lickProgressRatio,
      onClick: () => setView('lick-trainer'),
    },
    {
      id: 'improvise',
      title: 'Improvisations-Coach',
      description: 'Tonart & Skala live erkennen und auf dem Fretboard führen.',
      icon: '🎸',
      available: false,
      progress: 0,
      onClick: () => undefined,
    },
    {
      id: 'theory',
      title: 'Theorie-Quiz',
      description: 'Noten, Intervalle, Akkorde und Skalen spielerisch lernen.',
      icon: '🎯',
      available: false,
      progress: 0,
      onClick: () => undefined,
    },
    {
      id: 'ear',
      title: 'Gehörbildung',
      description: 'Intervalle und Akkorde hören und korrekt benennen.',
      icon: '👂',
      available: false,
      progress: 0,
      onClick: () => undefined,
    },
    {
      id: 'rhythm',
      title: 'Rhythm Jam',
      description: 'Timing und Groove gegen Metronom-Targets trainieren.',
      icon: '🥁',
      available: false,
      progress: 0,
      onClick: () => undefined,
    },
    {
      id: 'library',
      title: 'Lick-Bibliothek',
      description: 'Fertige Licks für Blues, Rock, Jazz und Country.',
      icon: '📚',
      available: false,
      progress: lickValues.length > 0 ? 1 : 0.1,
      onClick: () => undefined,
    },
  ];

  if (view === 'lick-trainer') {
    return <LickTrainer onBack={() => setView('hub')} />;
  }

  return <ModuleHub modules={modules} player={player} onReset={reset} />;
};
