import React, { useState } from 'react';
import { ModuleHub } from './ModuleHub';
import { LickTrainer } from './LickTrainer';
import { ImprovisationCoach } from './ImprovisationCoach';
import { RhythmJam } from './RhythmJam';
import { JamCoach } from './JamCoach';
import { DesignLab } from './DesignLab';
import { TheoryQuiz } from './TheoryQuiz';
import { EarTraining } from './EarTraining';
import { LickLibrary } from './LickLibrary';
import { useProgress } from '../core/useProgress';
import { useTheme } from '../core/useTheme';
import { LickProgress, BUILTIN_LICKS } from '../core/licks';

export const ImprovisationStudio: React.FC = () => {
  const { player, reset } = useProgress();
  const { current } = useTheme();
  const [view, setView] = useState<
    'hub' | 'lick-trainer' | 'coach' | 'rhythm-jam' | 'jam-coach' | 'design-lab' | 'theory-quiz' | 'ear-training' | 'lick-library'
  >('hub');
  const [trainerLickId, setTrainerLickId] = useState<string | null>(null);

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
      description: 'Tonart & Skala live erkennen, Fretboard-Führung und eine Tempo-Ramp-Challenge.',
      icon: '🎸',
      available: true,
      progress: player.modules.coach.bestStreak ? Math.min(player.modules.coach.stars / 3, 1) : 0,
      onClick: () => setView('coach'),
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
      description: 'Spiele auf den Beat, halte das Muster, steigere das Tempo bis Max BPM.',
      icon: '🥁',
      available: true,
      progress: player.modules.rhythmJam.bestBpm
        ? Math.min(player.modules.rhythmJam.bestBpm / 160, 1)
        : 0,
      onClick: () => setView('rhythm-jam'),
    },
    {
      id: 'jam-coach',
      title: 'Rhythm-Guitar Coach',
      description:
        'Welche Akkorde passen, wie sie klingen, und welche Noten wann — mit Fretboard, Live-Check und Erklärung.',
      icon: '🎼',
      available: true,
      progress: 0.3,
      onClick: () => setView('jam-coach'),
    },
    {
      id: 'theory-quiz',
      title: 'Theorie-Quiz',
      description: 'Intervalle, Skalen und Akkorde spielerisch abfragen mit Erklärung und XP.',
      icon: '🎯',
      available: true,
      progress: 0,
      onClick: () => setView('theory-quiz'),
    },
    {
      id: 'ear-training',
      title: 'Gehörbildung',
      description: 'Note/Intervall/Akkord hören und dann erkennen — dein Ohr trainieren.',
      icon: '👂',
      available: true,
      progress: 0,
      onClick: () => setView('ear-training'),
    },
    {
      id: 'design-lab',
      title: 'Design-Lab',
      description: `Interaktive Design-Prototypen wählen — aktuell: ${current.name}.`,
      icon: '🎨',
      available: true,
      progress: 1,
      onClick: () => setView('design-lab'),
    },
    {
      id: 'library',
      title: 'Lick-Bibliothek',
      description: `Fertige Licks für Blues, Rock, Jazz, Folk, Metal und Reggae — ${BUILTIN_LICKS.length} Stück mit Vorschau.`,
      icon: '📚',
      available: true,
      progress: Math.min(1, (Object.keys(player.modules.lickTrainer.licks).length || 0) / Math.max(BUILTIN_LICKS.length, 1)),
      onClick: () => setView('lick-library'),
    },
  ];

  if (view === 'lick-trainer') {
    return <LickTrainer onBack={() => setView('hub')} initialLickId={trainerLickId ?? undefined} />;
  }

  if (view === 'lick-library') {
    return (
      <LickLibrary
        onBack={() => setView('hub')}
        onOpenTrainer={(lickId) => {
          setTrainerLickId(lickId);
          setView('lick-trainer');
        }}
      />
    );
  }

  if (view === 'coach') {
    return <ImprovisationCoach onBack={() => setView('hub')} />;
  }

  if (view === 'rhythm-jam') {
    return <RhythmJam onBack={() => setView('hub')} />;
  }

  if (view === 'jam-coach') {
    return <JamCoach onBack={() => setView('hub')} />;
  }

  if (view === 'design-lab') {
    return <DesignLab onBack={() => setView('hub')} />;
  }

  if (view === 'theory-quiz') {
    return <TheoryQuiz onBack={() => setView('hub')} />;
  }

  if (view === 'ear-training') {
    return <EarTraining onBack={() => setView('hub')} />;
  }

  return <ModuleHub modules={modules} player={player} onReset={reset} />;
};
