import React, { useState } from 'react';
import { PlayerProgress } from '../core/progress';
import { useTheme } from '../core/useTheme';
import { downloadSession, copySessionSummary } from '../core/sessionExport';

export interface StudioModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  available: boolean;
  progress: number; // 0..1
  onClick: () => void;
}

interface ModuleHubProps {
  modules: StudioModule[];
  player: PlayerProgress;
  onReset: () => void;
}

export const ModuleHub: React.FC<ModuleHubProps> = ({ modules, player, onReset }) => {
  const { current } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copySessionSummary(player, current.name);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="space-y-8 relative">
      <div className="stream-line" />
      <div className="akira-stripe akira-stripe--top" />

      <div className="cyber-card float-soft p-8 md:p-10 relative overflow-hidden">
        <div className="akira-stripe akira-stripe--bottom" />
        <div className="radar-ring absolute right-6 top-4 w-24 h-24 opacity-40" style={{ right: '2rem', top: '1rem' }} />
        <div className="absolute -right-20 -top-20 w-72 h-72 bg-fuchsia-500/10 rounded-full blur-[90px]" />
        <div className="absolute -left-20 -bottom-20 w-72 h-72 bg-cyan-500/10 rounded-full blur-[90px]" />
        <div className="akira-kanji absolute right-3 top-0 text-lg h-full max-h-[90px] overflow-hidden">楽譜を発見せよ</div>
        <div className="japan-label absolute right-0 top-1/2 -translate-y-1/2 text-sm hidden md:block">NEO•TOKYO//SOUND.LAB</div>
        <div className="flex items-center justify-between flex-wrap gap-4 relative">
          <div>
            <h2 className="hud-label text-[10px] font-black mb-2">
              // Improvisations-System v1.3
            </h2>
            <h3
              data-text="IMPROVISATIONS-STUDIO"
              className="glitch cyber-display text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-[0_0_18px_rgba(255,42,109,0.5)]"
            >
              IMPROVISATIONS-STUDIO
            </h3>
            <p className="text-cyan-200/70 text-sm max-w-xl mt-3 leading-relaxed cyber-mono">
              <span className="neon-cyan">▸ LIVE</span> Licks üben · Timing schärfen ·
              Fortschritt lokal gespeichert. Kein Server. Keine Kompromisse.
            </p>
          </div>
          <div className="cyber-card rounded-2xl border border-fuchsia-500/30 p-5 text-center min-w-[180px]">
            <div className="hud-label text-[9px] font-black mb-2">PLAYER BIO-CHIP</div>
            <div className="text-3xl font-black text-white">
              LV.{player.level}
            </div>
            <div className="cyber-mono text-[10px] text-cyan-300/80 mt-1">
              {player.xp} XP
            </div>
            <div className="mt-3 text-xl font-black neon-magenta">
              {player.streak} 🔥
            </div>
            <div className="cyber-mono text-[9px] text-slate-400 uppercase tracking-widest">Streak</div>
            <div className="mt-4 flex gap-2 justify-center flex-wrap">
              <button
                onClick={() => downloadSession(player, current.name)}
                className="cyber-btn text-[9px] font-bold uppercase tracking-widest px-3 py-1.5"
              >
                ⬇ Session
              </button>
              <button
                onClick={handleCopy}
                className="cyber-btn cyber-btn-amber text-[9px] font-bold uppercase tracking-widest px-3 py-1.5"
              >
                {copied ? '✓ Kopiert' : '⬜ Lernkarte'}
              </button>
              <button
                onClick={onReset}
                className="cyber-btn cyber-btn-magenta text-[9px] font-bold uppercase tracking-widest px-3 py-1.5"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {modules.map((mod, idx) => (
          <button
            key={mod.id}
            onClick={mod.onClick}
            style={{ animationDelay: `${idx * 0.08}s` }}
            className={`cyber-card group text-left p-6 transition-all hover:scale-[1.02] active:scale-[0.98] ${
              mod.available
                ? 'cursor-pointer'
                : 'opacity-60 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-4xl">{mod.icon}</span>
              <span className={`cyber-mono text-[9px] uppercase tracking-widest ${mod.available ? 'neon-cyan' : 'text-slate-600'}`}>
                {mod.available ? 'ONLINE' : 'STANDBY'}
                {!mod.available && <span className="ml-1 text-[8px] text-slate-500">(BALD)</span>}
              </span>
            </div>
            <h4 className={`cyber-display font-black uppercase tracking-widest text-sm ${mod.available ? 'text-white' : 'text-slate-500'}`}>
              {mod.title}
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed mt-2">
              {mod.description}
            </p>
            {mod.available && (
              <div className="mt-5">
                <div className="flex justify-between cyber-mono text-[8px] uppercase tracking-widest text-slate-500 mb-1">
                  <span>Sync</span>
                  <span>{Math.round(mod.progress * 100)}%</span>
                </div>
                <div className="h-1.5 bg-slate-950 rounded-full overflow-hidden border border-cyan-500/10">
                  <div
                    className="cyber-progress h-full"
                    style={{ width: `${Math.max(0, Math.min(100, mod.progress * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
