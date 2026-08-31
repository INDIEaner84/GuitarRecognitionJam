import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FretboardMini } from '../components/ScaleVisualizer';
import { usePitchStream } from '../core/usePitchStream';
import { useProgress } from '../core/useProgress';
import { LickPlayer } from '../core/playback';
import {
  SCALE_DEFS,
  pitchClassName,
  buildTargetSequence,
  detectBestScale,
  suggestScalesForNotes,
  scaleNames,
} from '../core/theory';

interface CoachProps {
  onBack: () => void;
}

type CoachMode = 'free' | 'challenge';

const octaveForClass = (pc: number): number => (pc < 7 ? 3 : 2);

const noteForPlayback = (pc: number): string => `${pitchClassName(pc)}${octaveForClass(pc)}`;

export const ImprovisationCoach: React.FC<CoachProps> = ({ onBack }) => {
  const mic = usePitchStream();
  const { player, grant } = useProgress();

  const [mode, setMode] = useState<CoachMode>('free');
  const [detectedNotes, setDetectedNotes] = useState<string[]>([]);
  const [rootIdx, setRootIdx] = useState(9); // A
  const [scaleId, setScaleId] = useState('minor-pentatonic');
  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const playerRef = useRef<LickPlayer | null>(null);
  const lastProcessedRef = useRef<{ classIdx: number; at: number } | null>(null);

  const selectedScale = SCALE_DEFS.find((s) => s.id === scaleId) ?? SCALE_DEFS[3];

  const best = useMemo(() => detectBestScale(detectedNotes), [detectedNotes]);
  const suggestions = useMemo(() => suggestScalesForNotes(detectedNotes), [detectedNotes]);

  const activeNote = mic.sample?.noteName ?? null;

  useEffect(() => {
    if (detectedNotes.length === 0 && mic.sample) {
      setDetectedNotes((prev) => (prev.includes(mic.sample!.noteName) ? prev : [...prev, mic.sample!.noteName]));
    }
  }, [mic.sample]);

  const startChallenge = async () => {
    const seq = buildTargetSequence(rootIdx, selectedScale.intervals, 6);
    setTargetSequence(seq);
    setTargetIndex(0);
    setHits(0);
    setMisses(0);
    setStreak(0);
    setFeedback('Höre zu und spiele die Ziel-Noten nach…');
    setIsRunning(true);
    setMode('challenge');

    const lick = {
      id: 'coach-demo',
      title: 'Coach Sequence',
      events: seq.map((pc, i) => ({
        id: `seq-${i}`,
        beat: i * 0.5,
        durationBeats: 0.45,
        notes: [noteForPlayback(pc)],
      })),
    };

    if (!playerRef.current) playerRef.current = new LickPlayer();
    await playerRef.current.play(lick, 80, {});
  };

  const stopChallenge = async () => {
    setIsRunning(false);
    setFeedback(null);
    if (playerRef.current) await playerRef.current.stop();
  };

  const completeChallenge = () => {
    setIsRunning(false);
    setFeedback(`SEQ CLEAR — ${hits} Treffer · ${misses} Fehlversuche`);
    grant(50, 'coach', { bestBpm: 0, stars: Math.min(3, 1 + Math.floor(hits / 4)), cleanRuns: 1 });
  };

  useEffect(() => {
    if (!isRunning || mode !== 'challenge') {
      return;
    }
    if (targetIndex >= targetSequence.length) {
      completeChallenge();
      return;
    }
    if (!mic.sample) return;

    const playedNote = mic.sample.noteName;
    const normalizedPlayed = playedNote.replace(/\d+$/, '');
    const targetName = pitchClassName(targetSequence[targetIndex]);

    // Debounce repeated samples of the note we just processed.
    const now = performance.now();
    if (
      lastProcessedRef.current &&
      lastProcessedRef.current.classIdx === normalizedPlayed &&
      now - lastProcessedRef.current.at < 220
    ) {
      return;
    }
    lastProcessedRef.current = { classIdx: normalizedPlayed, at: now };

    if (normalizedPlayed === targetName) {
      setHits((h) => h + 1);
      setStreak((s) => s + 1);
      setFeedback(`✔ ${targetName} — weiter!`);
      grant(2, 'coach');
      if (targetIndex + 1 >= targetSequence.length) {
        completeChallenge();
        return;
      }
      setTargetIndex((i) => i + 1);
    } else {
      setMisses((m) => m + 1);
      setStreak(0);
      setFeedback(`✘ ${normalizedPlayed} — gesucht: ${targetName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.sample, isRunning, mode, targetIndex, targetSequence]);

  const scaleNamesForSelected = scaleNames(rootIdx, selectedScale.intervals);
  const target = targetSequence[targetIndex] ?? null;

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
          data-text="IMPROV-COACH"
          className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(157,0,255,0.55)]"
        >
          IMPROVISATIONS-COACH
        </h2>
        <span className="akira-kanji ml-auto text-sm hidden md:block">即興</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="cyber-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="hud-label text-[10px] font-black">📡 Live-Detektor</h3>
            <span className={`cyber-mono text-[10px] ${mic.isListening ? 'neon-green' : 'text-slate-500'}`}>
              {mic.isListening ? '• ONLINE' : '• OFFLINE'}
            </span>
          </div>
          <div className="text-center py-6">
            <div className={`text-7xl font-black cyber-display tracking-tighter ${activeNote ? 'neon-cyan' : 'text-slate-800'}`}>
              {activeNote ? activeNote.replace(/\d+$/, '') : '--'}
            </div>
            <p className="cyber-mono text-[10px] text-slate-500 mt-2 uppercase tracking-widest">
              {mic.sample ? `${mic.sample.frequency.toFixed(1)} Hz` : 'Warte auf Signal…'}
            </p>
          </div>
          <button
            onClick={mic.isListening ? mic.stop : mic.start}
            className={`cyber-btn w-full px-4 py-3 text-xs font-black uppercase tracking-widest ${mic.isListening ? 'cyber-btn-magenta' : ''}`}
          >
            {mic.isListening ? 'Stop' : '🎤 Mic Start'}
          </button>
          {mic.error && (
            <p className="cyber-mono text-[10px] text-red-300 mt-3">{mic.error}</p>
          )}
        </div>

        <div className="cyber-card p-5">
          <h3 className="hud-label text-[10px] font-black mb-4">🎯 Challenge</h3>
          <label className="block mb-3">
            <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Root</span>
            <select
              value={rootIdx}
              onChange={(e) => setRootIdx(Number(e.target.value))}
              className="mt-1 w-full bg-black/50 border border-purple-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-purple-400/60"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{pitchClassName(i)}</option>
              ))}
            </select>
          </label>
          <label className="block mb-4">
            <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Scale</span>
            <select
              value={scaleId}
              onChange={(e) => setScaleId(e.target.value)}
              className="mt-1 w-full bg-black/50 border border-purple-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-purple-400/60"
            >
              {SCALE_DEFS.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              onClick={startChallenge}
              className="cyber-btn cyber-btn-magenta px-4 py-2.5 flex-1 text-xs font-black uppercase tracking-widest"
            >
              ▶ Start
            </button>
            <button
              onClick={stopChallenge}
              className="cyber-btn px-4 py-2.5 text-xs font-black uppercase tracking-widest"
            >
              ■ Stop
            </button>
          </div>
        </div>
      </div>

      <div className="cyber-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="hud-label text-[10px] font-black">🎸 Spielbare Skala</h3>
          <div className="flex gap-2 cyber-mono text-[9px]">
            <span className="text-cyan-300">{pitchClassName(rootIdx)} {selectedScale.name}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {scaleNamesForSelected.map((n) => (
            <span key={n} className="px-2 py-1 rounded border border-cyan-500/20 bg-cyan-500/5 text-cyan-200 text-[10px] font-mono">
              {n}
            </span>
          ))}
        </div>
        <FretboardMini
          scaleNotes={scaleNamesForSelected}
          detectedNotes={detectedNotes}
          activeNote={activeNote}
          highlightNote={activeNote ?? undefined}
        />
        <p className="text-[11px] text-slate-400 mt-3 italic">{selectedScale.description}</p>
      </div>

      <div className="cyber-card p-5">
        <h3 className="hud-label text-[10px] font-black mb-4">🧠 Erkennung</h3>
        {best ? (
          <div>
            <div className="text-4xl font-black cyber-display neon-magenta mb-2">
              {best.key} {best.scale.name}
            </div>
            <p className="cyber-mono text-[10px] text-slate-400 mb-3">
              Wahrscheinliche Tonart aus {detectedNotes.length} erkannten Noten · Score {best.score}
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedNotes.map((n) => (
                <span key={n} className="px-2 py-1 rounded border border-purple-500/20 text-purple-200 text-[10px] font-mono">
                  {n}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">Spiele Noten, damit der Coach eine Tonart und Skalen vorschlagen kann.</p>
        )}
        {suggestions.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {suggestions.map((s, i) => (
              <button
                key={`${s.key}-${s.scale.id}`}
                onClick={() => {
                  setRootIdx(s.rootIndex);
                  setScaleId(s.scale.id);
                }}
                className="text-left px-4 py-3 rounded-lg border border-slate-700/60 hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all"
              >
                <span className="font-black text-white text-sm">{s.key} {s.scale.name}</span>
                <span className="cyber-mono text-[9px] text-slate-500 block mt-1">Score {s.score} · {s.scale.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {mode === 'challenge' && (
        <div className="cyber-card p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="hud-label text-[10px] font-black">🎯 Target {targetIndex + 1}/{targetSequence.length}</h3>
            <div className="cyber-mono text-[10px] text-slate-400">
              Hits {hits} · Miss {misses} · Streak {streak}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-5xl font-black cyber-display ${target != null ? 'neon-purple' : 'text-slate-800'}`}>
              {target != null ? pitchClassName(target) : '--'}
            </div>
            <div className="flex-1">
              <div className="flex gap-1">
                {targetSequence.map((pc, i) => (
                  <div
                    key={i}
                    className={`flex-1 h-3 rounded ${i < targetIndex ? 'bg-emerald-500/70' : i === targetIndex ? 'bg-fuchsia-500/70 animate-pulse' : 'bg-slate-800'}`}
                  />
                ))}
              </div>
            </div>
          </div>
          {feedback && <p className="cyber-mono text-[10px] text-amber-200 mt-3">{feedback}</p>}
        </div>
      )}
    </div>
  );
};
