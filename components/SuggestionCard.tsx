
import React, { useState } from 'react';
import * as Tone from 'tone';
import { PlaybackNote, ChordPlayback } from '../types';

interface CardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const SuggestionCard: React.FC<CardProps> = ({ title, icon, children }) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 backdrop-blur-sm hover:border-blue-500/50 transition-colors shadow-xl">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="text-lg font-semibold text-blue-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export const Tablature: React.FC<{ code: string }> = ({ code }) => (
  <pre className="bg-black/60 p-4 rounded-lg text-[10px] md:text-xs font-mono text-emerald-400 overflow-x-auto whitespace-pre leading-tight border border-slate-800 shadow-inner">
    {code}
  </pre>
);

export const PlayRiffButton: React.FC<{ sequence: PlaybackNote[] }> = ({ sequence }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const playRiff = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      await Tone.start();
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.3,
          release: 1
        }
      });

      let now = Tone.now();
      sequence.forEach((item) => {
        synth.triggerAttackRelease(item.note, item.duration, now);
        now += Tone.Time(item.duration).toSeconds();
      });

      setTimeout(() => {
        synth.dispose();
        setIsPlaying(false);
      }, (now - Tone.now()) * 1000 + 500);
      
    } catch (error) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
    }
  };

  return (
    <button
      onClick={playRiff}
      disabled={isPlaying}
      className={`flex items-center gap-2 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
        isPlaying 
          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
          : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
      }`}
    >
      {isPlaying ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          Playing...
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Hear Riff
        </>
      )}
    </button>
  );
};

export const PlayProgressionButton: React.FC<{ sequence: ChordPlayback[] }> = ({ sequence }) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const playProgression = async () => {
    if (isPlaying) return;
    setIsPlaying(true);

    try {
      await Tone.start();
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      synth.set({
        volume: -10, // Slightly quieter for chords
        envelope: {
          attack: 0.1,
          decay: 0.3,
          sustain: 0.4,
          release: 2
        }
      });

      let now = Tone.now();
      sequence.forEach((chord) => {
        synth.triggerAttackRelease(chord.notes, chord.duration, now);
        now += Tone.Time(chord.duration).toSeconds();
      });

      setTimeout(() => {
        synth.dispose();
        setIsPlaying(false);
      }, (now - Tone.now()) * 1000 + 1000);
      
    } catch (error) {
      console.error("Progression playback error:", error);
      setIsPlaying(false);
    }
  };

  return (
    <button
      onClick={playProgression}
      disabled={isPlaying}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${
        isPlaying 
          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
          : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600'
      }`}
    >
      {isPlaying ? (
        <span className="animate-pulse">Playing...</span>
      ) : (
        <>
          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play Progression
        </>
      )}
    </button>
  );
};
