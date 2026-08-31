import React from 'react';
import { ChordShape, stringName } from '../core/chordShapes';

interface ChordDiagramProps {
  shape: ChordShape | null;
  label?: string;
  highlightPitchClass?: number | null;
}

/**
 * A real fretboard grip diagram: vertical grid, fret numbers, root/role dots,
 * open markers (O) and muted markers (X).
 */
export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  shape,
  label = 'Akkord',
  highlightPitchClass = null,
}) => {
  if (!shape) {
    return (
      <div className="cyber-card p-5 text-center text-slate-400 text-sm">
        Kein Griffbild verfügbar.
      </div>
    );
  }

  const frets = Array.from(
    { length: shape.maxFret - shape.minFret + 1 },
    (_, i) => shape.minFret + i,
  );
  const strings = [0, 1, 2, 3, 4, 5] as const;
  const fretMarks = [3, 5, 7, 9, 12];

  const posFor = (string: number, fret: number) =>
    shape.positions.find((p) => p.string === string && p.fret === fret);

  const roleLabel: Record<string, string> = {
    root: 'R',
    third: '3',
    fifth: '5',
    seventh: '7',
    color: 'c',
  };
  const roleColor: Record<string, string> = {
    root: 'bg-fuchsia-500 text-black shadow-[0_0_12px_rgba(255,42,109,0.8)]',
    third: 'bg-cyan-400 text-black shadow-[0_0_10px_rgba(0,240,255,0.8)]',
    fifth: 'bg-emerald-400 text-black shadow-[0_0_10px_rgba(57,255,20,0.7)]',
    seventh: 'bg-amber-400 text-black shadow-[0_0_10px_rgba(249,240,2,0.7)]',
    color: 'bg-slate-500 text-black',
  };

  return (
    <div className="bg-black/40 border border-green-500/20 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="hud-label text-[10px] font-black">{label}</span>
        <span className="cyber-mono text-[9px] text-slate-400">
          {shape.hasBarre ? 'Barre' : shape.curated ? 'Open' : 'Voicing'}
          {shape.maxFret > 4 ? ` · ab Bund ${shape.minFret}` : ''}
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="relative min-w-[280px]">
          {/* Fret numbers row (top) */}
          <div className="flex" style={{ paddingLeft: 26 }}>
            {frets.map((f) => (
              <div key={f} className="flex-1 text-center cyber-mono text-[9px] text-slate-500">
                {f}
              </div>
            ))}
          </div>

          <div className="relative">
            {/* Vertical string lines */}
            <div className="absolute inset-y-0 left-[26px] right-0 flex">
              {strings.map((str) => (
                <div key={`vline-${str}`} className="flex-1 border-r border-slate-700/50" />
              ))}
            </div>
            {/* Horizontal fret lines */}
            <div className="relative flex flex-col">
              {frets.map((fret, i) => (
                <div key={fret} className="relative flex h-11 items-center border-b border-slate-700/70">
                  {/* fret marker on the left */}
                  <div className="absolute left-0 w-[26px] text-right pr-2 cyber-mono text-[9px] text-slate-600">
                    {fretMarks.includes(fret) ? (
                      <span className="text-slate-400 font-bold">{fret}</span>
                    ) : null}
                  </div>
                  {strings.map((str) => {
                    const pos = posFor(str, fret);
                    const isMuted = shape.mutedStrings.includes(str as 0 | 1 | 2 | 3 | 4 | 5);
                    return (
                      <div key={`${str}-${fret}`} className="flex-1 flex items-center justify-center relative">
                        {pos ? (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                              roleColor[pos.role]
                            } ${highlightPitchClass != null && pos.pitchClass === highlightPitchClass ? 'ring-2 ring-white scale-110' : ''}`}
                            title={`${stringName(str as 0) } • Bund ${fret}`}
                          >
                            {roleLabel[pos.role]}
                          </div>
                        ) : isMuted && i === 0 ? (
                          <span className="cyber-mono text-[10px] text-slate-600 font-bold">X</span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Open strings / bottom labels */}
          <div className="flex" style={{ paddingLeft: 26, marginTop: 4 }}>
            {strings.map((str) => {
              const openPos = shape.positions.find((p) => p.string === str && p.fret === 0);
              const muted = shape.mutedStrings.includes(str as 0 | 1 | 2 | 3 | 4 | 5);
              return (
                <div key={str} className="flex-1 text-center">
                  {openPos ? (
                    <span className={`cyber-mono text-[11px] font-black ${openPos.role === 'root' ? 'text-fuchsia-300' : 'text-cyan-300'}`}>
                      O
                    </span>
                  ) : muted ? (
                    <span className="cyber-mono text-[11px] text-slate-600 font-black">X</span>
                  ) : (
                    <span className="cyber-mono text-[11px] text-slate-700">·</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 cyber-mono text-[9px] uppercase tracking-widest">
        <span className="text-fuchsia-300">● Root</span>
        <span className="text-cyan-300">● 3rd</span>
        <span className="text-emerald-300">● 5th</span>
        <span className="text-amber-300">● 7th</span>
      </div>
    </div>
  );
};
