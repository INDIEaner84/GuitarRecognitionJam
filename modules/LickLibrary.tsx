import React, { useMemo, useRef, useState } from 'react';
import { BUILTIN_LICKS, BuiltinLick, totalBeats, cloneLick } from '../core/licks';
import { LICK_CATEGORIES, licksInCategory, genreOfLick } from '../core/library';
import { LickPlayer } from '../core/playback';
import { useProgress } from '../core/useProgress';
import { FretboardMini } from '../components/ScaleVisualizer';
import { useTheme } from '../core/useTheme';

interface LickLibraryProps {
  onBack: () => void;
  onOpenTrainer: (lickId: string) => void;
}

export const LickLibrary: React.FC<LickLibraryProps> = ({ onBack, onOpenTrainer }) => {
  const { player } = useProgress();
  const { current } = useTheme();
  const [category, setCategory] = useState('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const playerRef = useRef<LickPlayer | null>(null);

  const licks = useMemo(() => licksInCategory(category), [category]);
  const active = activeId ? BUILTIN_LICKS.find((l) => l.id === activeId) : null;

  const play = async (lick: BuiltinLick) => {
    setActiveId(lick.id);
    setPlayingId(lick.id);
    if (!playerRef.current) playerRef.current = new LickPlayer();
    await playerRef.current.play(cloneLick(lick), 90, {
      onComplete: () => setPlayingId(null),
    });
  };

  const stopAll = async () => {
    await playerRef.current?.stop();
    setPlayingId(null);
  };

  return (
    <div className="space-y-6 relative">
      <div className="stream-line" />
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="cyber-btn px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
          ← Studio
        </button>
        <h2 data-text="LICK-BIBLIOTHEK" className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(0,240,255,0.5)]">
          LICK-BIBLIOTHEK
        </h2>
        <span className="cyber-mono text-[9px] text-cyan-300/80 uppercase tracking-widest ml-auto hidden md:block">
          {current.name} · {BUILTIN_LICKS.length} Licks
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {LICK_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => { setCategory(c.id); setActiveId(null); stopAll(); }}
            className={`cyber-btn px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded ${category === c.id ? 'cyber-btn-amber' : ''}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {licks.map((lick) => {
          const isActive = lick.id === activeId;
          const prog = player.modules.lickTrainer.licks[lick.id];
          const stars = prog?.stars ?? 0;
          return (
            <button
              key={lick.id}
              onClick={() => setActiveId(lick.id)}
              className={`cyber-card text-left p-5 transition-all ${isActive ? 'ring-2 ring-cyan-400/40' : 'hover:scale-[1.02]'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-black text-white uppercase tracking-widest text-sm">{lick.title}</h4>
                  <span className="cyber-mono text-[9px] text-cyan-300/80 uppercase tracking-widest">
                    {lick.key} · {genreOfLick(lick) || 'all'}
                  </span>
                </div>
                <div className="text-yellow-300 text-sm tracking-wider">{'★'.repeat(stars)}{'☆'.repeat(3 - stars)}</div>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed mb-4">{lick.description}</p>
              <div className="flex gap-2">
                <span
                  onClick={(e) => { e.stopPropagation(); play(lick); }}
                  className={`cyber-btn px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${playingId === lick.id ? 'cyber-btn-green' : ''}`}
                >
                  {playingId === lick.id ? '▶ …' : '▶ Anhören'}
                </span>
                <span
                  onClick={(e) => { e.stopPropagation(); onOpenTrainer(lick.id); }}
                  className="cyber-btn cyber-btn-magenta px-3 py-1.5 text-[9px] font-black uppercase tracking-widest"
                >
                  🎯 Üben
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {active && (
        <div className="cyber-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="hud-label text-[10px] font-black">🎸 {active.title} — Vorschau</h3>
            <div className="cyber-mono text-[9px] text-slate-500">{totalBeats(cloneLick(active))} Beats</div>
          </div>
          <FretboardMini
            scaleNotes={active.events.map((e) => e.notes[0])}
            detectedNotes={active.events.map((e) => e.notes[0])}
          />
          <div className="flex flex-wrap gap-3 mt-4">
            <button onClick={() => play(active)} className="cyber-btn px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              ▶ Vorspielen
            </button>
            <button onClick={() => onOpenTrainer(active.id)} className="cyber-btn cyber-btn-magenta px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              🎯 Im Lick-Trainer üben
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
