
import React from 'react';
import { Scale, Mode } from '../types';

interface ScaleVisualizerProps {
  scale: Scale;
}

export const ScaleVisualizer: React.FC<ScaleVisualizerProps> = ({ scale }) => {
  return (
    <div className="bg-slate-900/80 rounded-lg p-4 border border-slate-700/50 mb-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-white font-bold group-hover:text-blue-400 transition-colors">{scale.name}</h4>
        <div className="flex gap-1">
          {scale.intervals.map((int, idx) => (
            <span key={idx} className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30 uppercase font-mono">
              {int}
            </span>
          ))}
        </div>
      </div>
      
      <div className="flex items-end gap-1 h-12">
        {scale.notes.map((note, idx) => (
          <div key={idx} className="group/note relative flex-1 flex flex-col items-center">
            <div className="w-full bg-blue-500/10 border-b-2 border-blue-500 h-8 flex items-center justify-center rounded-t-sm group-hover/note:bg-blue-500/30 transition-all cursor-default">
              <span className="text-xs font-bold text-white">{note}</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1 font-mono">
              {idx + 1}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400 leading-relaxed italic">
        {scale.description}
      </p>
    </div>
  );
};

interface ModeVisualizerProps {
  mode: Mode;
  scaleNotes: string[];
  detectedNotes: string[];
  activeNote?: string;
}

export const ModeVisualizer: React.FC<ModeVisualizerProps> = ({ mode, scaleNotes, detectedNotes, activeNote }) => {
  return (
    <div className="group p-5 bg-slate-900/50 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all relative overflow-hidden">
      {/* Visual background flair for the mode */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[40px] rounded-full pointer-events-none" />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <h4 className="font-black text-indigo-400 tracking-tight text-xl">{mode.name}</h4>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[9px] font-mono text-slate-500 bg-slate-800/80 px-2 py-0.5 rounded uppercase border border-slate-700">Formula: {mode.formula}</span>
          
          {/* Distinct Characteristic Note Display */}
          <div className="relative">
            <div className="absolute inset-0 bg-amber-500/20 blur-md rounded-full animate-pulse" />
            <span className="relative flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-black text-[9px] font-black rounded-full uppercase tracking-widest shadow-[0_0_15px_rgba(245,158,11,0.4)] border border-white/20">
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              Key Interval: {mode.characteristicNote}
            </span>
          </div>
        </div>
      </div>
      
      <p className="text-xs text-slate-400 leading-relaxed mb-6 relative z-10">
        {mode.description}
      </p>
      
      <FretboardMini 
        scaleNotes={scaleNotes} 
        detectedNotes={detectedNotes}
        highlightNote={mode.characteristicNote} 
        activeNote={activeNote}
        highlightPosition={mode.characteristicNotePosition}
      />
    </div>
  );
};

interface FretboardProps {
  scaleNotes?: string[];
  detectedNotes?: string[];
  chordNotes?: string[];
  highlightNote?: string;
  activeNote?: string;
  highlightPosition?: { string: number; fret: number };
}

export const FretboardMini: React.FC<FretboardProps> = ({ 
  scaleNotes = [], 
  detectedNotes = [], 
  chordNotes = [],
  highlightNote, 
  activeNote, 
  highlightPosition 
}) => {
  const strings = ['e', 'B', 'G', 'D', 'A', 'E']; // High to Low
  const frets = Array.from({ length: 13 }, (_, i) => i);

  const getNoteNameAt = (stringIndex: number, fret: number) => {
    const baseNotes = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
    const startingNotes = [4, 11, 7, 2, 9, 4]; // E, B, G, D, A, E indices
    const noteIndex = (startingNotes[stringIndex] + fret) % 12;
    return baseNotes[noteIndex];
  };

  return (
    <div className="mt-4 p-4 bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-x-auto relative">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guitar Fretboard (0-12)</span>
          {highlightPosition && (
            <span className="text-[9px] text-amber-500/70 font-mono mt-0.5 uppercase">
              Focus: String {highlightPosition.string}, Fret {highlightPosition.fret}
            </span>
          )}
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
             <span className="text-[8px] font-bold text-slate-500 uppercase">Played</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
             <span className="text-[8px] font-bold text-slate-500 uppercase">Chord</span>
          </div>
          {activeNote && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-white animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              <span className="text-[9px] font-bold text-white uppercase tracking-widest">Live: {activeNote}</span>
            </div>
          )}
        </div>
      </div>

      <div className="relative min-w-[600px] h-36 bg-[#0a0c10] p-2 rounded border border-slate-800/50">
        {/* Fret Markers */}
        <div className="absolute inset-0 flex justify-between px-8 pointer-events-none">
          {frets.map(f => (
            <div key={f} className="flex flex-col items-center">
              <div className="h-full w-[1px] bg-slate-900" />
              <span className="text-[8px] font-mono text-slate-700 mt-1">{f}</span>
            </div>
          ))}
        </div>

        {/* Inlay dots */}
        {[3, 5, 7, 9, 12].map(f => (
           <div key={f} className={`absolute w-1.5 h-1.5 bg-slate-800/30 rounded-full`} style={{ 
             left: `${(f / 12) * 92 + 4}%`, 
             top: '50%',
             transform: 'translateY(-50%)'
           }} />
        ))}

        {/* Strings */}
        <div className="flex flex-col justify-between h-full relative z-10">
          {strings.map((str, sIdx) => (
            <div key={sIdx} className="group relative flex items-center w-full h-5">
              <span className="w-6 text-[10px] font-black text-slate-600 font-mono">{str}</span>
              <div className="flex-1 h-[1px] bg-gradient-to-r from-slate-700/50 via-slate-800 to-slate-700/50 relative flex justify-between px-2">
                {frets.map(f => {
                  const noteAt = getNoteNameAt(sIdx, f);
                  const normalizedNoteAt = noteAt.toUpperCase();
                  
                  const isScaleNote = scaleNotes.some(n => normalizedNoteAt === n.toUpperCase());
                  const isDetectedNote = detectedNotes.some(n => normalizedNoteAt === n.toUpperCase());
                  const isChordNote = chordNotes.some(n => normalizedNoteAt === n.toUpperCase());
                  const isLiveActive = activeNote && normalizedNoteAt === activeNote.toUpperCase();
                  
                  const isSpecificPosition = highlightPosition && highlightPosition.string === (6 - sIdx) && highlightPosition.fret === f;
                  const isHighlightNoteName = highlightNote && noteAt === highlightNote;
                  const isHighlight = isSpecificPosition || isHighlightNoteName;

                  const hasState = isScaleNote || isDetectedNote || isChordNote || isLiveActive || isHighlight;

                  if (!hasState) return <div key={f} className="w-0 h-0" />;

                  return (
                    <div key={f} className="relative flex items-center justify-center w-0 h-0">
                        <div 
                          className={`absolute w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black transition-all duration-150 cursor-default shadow-lg
                            ${isLiveActive
                              ? 'bg-white text-black scale-150 z-50 shadow-[0_0_15px_rgba(255,255,255,1)] border-2 border-emerald-400 ring-2 ring-white/20 animate-in zoom-in-50'
                              : isSpecificPosition
                                ? 'bg-amber-400 text-black scale-150 z-40 animate-[pulse_1s_infinite] shadow-[0_0_15px_rgba(251,191,36,0.8)] border-2 border-white'
                                : isChordNote
                                  ? 'bg-emerald-500 text-white z-30 shadow-emerald-500/30 scale-110'
                                  : isDetectedNote
                                    ? 'bg-blue-600 text-white z-20 shadow-blue-500/30'
                                    : isHighlight 
                                      ? 'bg-amber-600/90 text-white scale-110 z-20 shadow-amber-500/40 border border-amber-400/50' 
                                      : 'bg-transparent text-slate-500 z-10 border border-slate-700 font-normal'
                            }`}
                        >
                          {isSpecificPosition ? '★' : noteAt}
                          
                          {isSpecificPosition && (
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-amber-500 text-black text-[7px] font-black rounded uppercase whitespace-nowrap pointer-events-none shadow-xl border border-white/20">
                              Mode Target
                            </div>
                          )}
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
