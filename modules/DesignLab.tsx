import React from 'react';
import { useTheme } from '../core/useTheme';
import { ThemeDef } from '../core/themes';

interface DesignLabProps {
  onBack: () => void;
}

export const DesignLab: React.FC<DesignLabProps> = ({ onBack }) => {
  const { themeId, current, all, setThemeId } = useTheme();

  return (
    <div className="space-y-6 relative">
      <div className="stream-line" />
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="cyber-btn px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
        >
          ← Studio
        </button>
        <h2
          data-text="DESIGN-LAB"
          className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(0,240,255,0.5)]"
        >
          DESIGN-LAB
        </h2>
        <span className="akira-kanji ml-auto text-sm hidden md:block">設計</span>
      </div>

      <div className="cyber-card p-5">
        <h3 className="hud-label text-[10px] font-black">🖌 Interaktive Design-Prototypen</h3>
        <p className="text-slate-300 text-sm mt-2">
          Klicke eine Karte an, um das Design sofort in der ganzen App zu sehen. Die
          Vorschau ist mit echten Akkord-, Rhythmus- und Live-Elementen gebaut — nichts
          ist nur Fake-CSS.
        </p>
        <p className="cyber-mono text-[10px] text-cyan-300/80 mt-2">
          Aktiv: {current.name} · {current.tagline}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {all.map((theme) => (
          <ThemePrototypeCard
            key={theme.id}
            theme={theme}
            active={theme.id === themeId}
            onActivate={() => setThemeId(theme.id)}
            allThemes={all}
            onSelectTheme={setThemeId}
          />
        ))}
      </div>
    </div>
  );
};

const ThemePrototypeCard: React.FC<{
  theme: ThemeDef;
  active: boolean;
  onActivate: () => void;
  allThemes: ThemeDef[];
  onSelectTheme: (id: string) => void;
}> = ({ theme, active, onActivate, allThemes, onSelectTheme }) => {
  const c = theme.colors;
  return (
    <div
      onClick={onActivate}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onActivate(); }}
      className={`cyber-card relative p-5 transition-all cursor-pointer ${
        active ? 'ring-2 ring-white/40 shadow-[0_0_28px_rgba(0,240,255,0.25)]' : 'hover:scale-[1.02]'
      }`}
      style={{ background: `linear-gradient(160deg, ${c.bg} 0%, #0b071a 100%)` }}
    >
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${c.cyan}, ${c.magenta}, transparent)` }} />
      <div className="flex items-center justify-between mb-4">
        <span className="cyber-mono text-[9px] uppercase tracking-widest" style={{ color: c.cyan }}>
          {theme.tagline}
        </span>
        {active && (
          <span className="px-2 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-widest" style={{ borderColor: c.green, color: c.green }}>
            ● LIVE
          </span>
        )}
      </div>

      {/* Live prototype mock */}
      <div className="rounded-xl border p-4 mb-4" style={{ borderColor: `${c.cyan}33`, backgroundColor: `${c.bg}cc` }}>
        <div className="text-2xl font-black cyber-display" style={{ color: c.cyan, textShadow: `0 0 12px ${c.cyan}88` }}>
          {theme.prototype.title}
        </div>
        <div className="cyber-mono text-[8px] uppercase tracking-widest mt-1" style={{ color: c.magenta }}>
          {theme.prototype.subtitle}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="text-xl font-black" style={{ color: c.green }}>{theme.prototype.chord}</div>
          <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
            <div className="h-full w-2/3 rounded-full" style={{ background: `linear-gradient(90deg, ${c.cyan}, ${c.purple}, ${c.magenta})` }} />
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {['●', '—', '●', '●'].map((b, i) => (
            <div key={i} className="flex-1 h-8 rounded border flex items-center justify-center text-xs font-black" style={{ borderColor: `${c.amber}44`, color: c.amber }}>
              {b}
            </div>
          ))}
        </div>
        <div className="cyber-mono text-[8px] mt-2 uppercase tracking-widest" style={{ color: c.amber }}>
          {theme.prototype.mode}
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        {allThemes.map((t) => (
          <button
            key={t.id}
            onClick={(e) => { e.stopPropagation(); onSelectTheme(t.id); }}
            className={`w-5 h-5 rounded-full ring-2 transition-all ${theme.id === t.id ? 'ring-white scale-110' : 'ring-transparent opacity-60 hover:opacity-100'}`}
            style={{ background: `linear-gradient(135deg, ${t.colors.cyan}, ${t.colors.magenta})` }}
            title={t.name}
          />
        ))}
      </div>

      <button
        onClick={onActivate}
        className={`cyber-btn w-full mt-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${
          active ? 'cyber-btn-green' : ''
        }`}
        style={!active ? { borderColor: `${c.cyan}88`, color: c.cyan } : undefined}
      >
        {active ? '✓ Aktiviert' : '→ Direkt aktivieren'}
      </button>
    </div>
  );
};
