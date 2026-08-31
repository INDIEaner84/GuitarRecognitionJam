import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FretboardMini } from '../components/ScaleVisualizer';
import { usePitchStream } from '../core/usePitchStream';
import { useProgress } from '../core/useProgress';
import { LickPlayer } from '../core/playback';
import {
  SCALE_DEFS,
  pitchClassName,
  buildTargetSequence,
  buildScaleRun,
  detectBestScale,
  suggestScalesForNotes,
  scaleNames,
} from '../core/theory';
import { sectionStarsForStreak } from '../core/progress';

interface CoachProps {
  onBack: () => void;
}

type CoachMode = 'free' | 'challenge' | 'done';
type ChallengeStyle = 'random' | 'scale-up' | 'scale-down';

interface CoachTempo {
  startBpm: number;
  minBpm: number;
  maxBpm: number;
  stepBpm: number;
}

const DEFAULT_TEMPO: CoachTempo = { startBpm: 70, minBpm: 60, maxBpm: 150, stepBpm: 5 };
const octaveForClass = (pc: number): number => (pc < 7 ? 3 : 2);
const noteForPlayback = (pc: number): string => `${pitchClassName(pc)}${octaveForClass(pc)}`;

const clampBpm = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const ImprovisationCoach: React.FC<CoachProps> = ({ onBack }) => {
  const mic = usePitchStream();
  const { player, grant } = useProgress();

  const [mode, setMode] = useState<CoachMode>('free');
  const [detectedNotes, setDetectedNotes] = useState<string[]>([]);
  const [rootIdx, setRootIdx] = useState(9); // A
  const [scaleId, setScaleId] = useState('minor-pentatonic');
  const [challengeStyle, setChallengeStyle] = useState<ChallengeStyle>('random');
  const [seqLength, setSeqLength] = useState(6);
  const [tempo, setTempo] = useState<CoachTempo>(DEFAULT_TEMPO);

  const [targetSequence, setTargetSequence] = useState<number[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [challengeBpm, setChallengeBpm] = useState(DEFAULT_TEMPO.startBpm);
  const [concluded, setConcluded] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const playerRef = useRef<LickPlayer | null>(null);
  const lastProcessedRef = useRef<{ classIdx: string; at: number } | null>(null);
  const statsRef = useRef({ hits: 0, misses: 0, streak: 0 });

  const selectedScale = SCALE_DEFS.find((s) => s.id === scaleId) ?? SCALE_DEFS[3];
  const best = useMemo(() => detectBestScale(detectedNotes), [detectedNotes]);
  const suggestions = useMemo(() => suggestScalesForNotes(detectedNotes), [detectedNotes]);
  const activeNote = mic.sample?.noteName ?? null;

  useEffect(() => {
    if (detectedNotes.length === 0 && mic.sample) {
      const note = mic.sample.noteName;
      setDetectedNotes((prev) => (prev.includes(note) ? prev : [...prev, note]));
    }
  }, [mic.sample]);

  const buildSequence = (): number[] => {
    if (challengeStyle === 'scale-up' || challengeStyle === 'scale-down') {
      return buildScaleRun(rootIdx, selectedScale.intervals, challengeStyle === 'scale-up', seqLength);
    }
    return buildTargetSequence(rootIdx, selectedScale.intervals, seqLength);
  };

  const startChallenge = async (bpmOverride?: number) => {
    const seq = buildSequence();
    const nextBpm = clampBpm(bpmOverride ?? tempo.startBpm, tempo.minBpm, tempo.maxBpm);
    statsRef.current = { hits: 0, misses: 0, streak: 0 };
    setTargetSequence(seq);
    setTargetIndex(0);
    setFeedback(bpmOverride ? `Neuer Lauf bei ${nextBpm} BPM…` : 'Höre zu und spiele die Ziel-Noten nach…');
    setConcluded(false);
    setMode('challenge');
    setChallengeBpm(nextBpm);
    setIsRunning(true);

    const lick = {
      id: 'coach-sequence',
      title: 'Coach Sequence',
      events: seq.map((pc, i) => ({
        id: `seq-${i}`,
        beat: i * 0.5,
        durationBeats: 0.45,
        notes: [noteForPlayback(pc)],
      })),
    };

    if (!playerRef.current) playerRef.current = new LickPlayer();
    await playerRef.current.play(lick, nextBpm, {});
  };

  const stopChallenge = async () => {
    setIsRunning(false);
    setFeedback(null);
    if (playerRef.current) await playerRef.current.stop();
  };

  const completeChallenge = () => {
    const stats = statsRef.current;
    const clean = stats.misses === 0;
    const nextBpm = clean
      ? clampBpm(challengeBpm + tempo.stepBpm, tempo.minBpm, tempo.maxBpm)
      : challengeBpm;

    setIsRunning(false);
    setConcluded(true);
    setMode('done');
    setChallengeBpm(nextBpm);
    setFeedback(
      clean
        ? `SEQ CLEAR — sauber bei ${challengeBpm} BPM → weiter mit ${nextBpm} BPM`
        : `SEQ CLEAR — ${stats.hits} Treffer · ${stats.misses} Fehler · nächster Versuch bei ${nextBpm} BPM`,
    );

    grant(clean ? 30 : 12, 'coach', {
      bestBpm: nextBpm,
      bestStreak: stats.streak,
      stars: sectionStarsForStreak(stats.streak, Math.max(2, Math.ceil(seqLength / 2))),
      runs: 1,
    });
  };

  useEffect(() => {
    if (!isRunning || mode !== 'challenge') return;
    if (targetIndex >= targetSequence.length) {
      completeChallenge();
      return;
    }
    if (!mic.sample) return;

    const playedNote = mic.sample.noteName;
    const normalizedPlayed = playedNote.replace(/\d+$/, '');
    const targetName = pitchClassName(targetSequence[targetIndex]);

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
      statsRef.current.hits += 1;
      statsRef.current.streak += 1;
      setFeedback(`✔ ${targetName} — weiter!`);
      grant(2, 'coach');
      if (targetIndex + 1 >= targetSequence.length) {
        completeChallenge();
        return;
      }
      setTargetIndex((i) => i + 1);
    } else {
      statsRef.current.misses += 1;
      statsRef.current.streak = 0;
      setFeedback(`✘ ${normalizedPlayed} — gesucht: ${targetName}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.sample, isRunning, mode, targetIndex, targetSequence]);

  const scaleNamesForSelected = scaleNames(rootIdx, selectedScale.intervals);
  const target = targetSequence[targetIndex] ?? null;
  const coachProgress = player.modules.coach;

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

      <div className="flex flex-wrap gap-3 cyber-mono text-[9px] uppercase tracking-widest">
        <span className="text-slate-500">Best BPM <span className="neon-cyan">{coachProgress.bestBpm}</span></span>
        <span className="text-slate-500">Best Streak <span className="neon-green">{coachProgress.bestStreak}</span></span>
        <span className="text-slate-500">★ <span className="neon-magenta">{coachProgress.stars}</span></span>
        <span className="text-slate-500">🏆 <span className="neon-amber">{coachProgress.totalXp} XP</span></span>
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
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
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
            <label className="block">
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
            <label className="block">
              <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Modus</span>
              <select
                value={challengeStyle}
                onChange={(e) => setChallengeStyle(e.target.value as ChallengeStyle)}
                className="mt-1 w-full bg-black/50 border border-purple-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-purple-400/60"
              >
                <option value="random">Random Walk</option>
                <option value="scale-up">Skala aufwärts</option>
                <option value="scale-down">Skala abwärts</option>
              </select>
            </label>
            <label className="block">
              <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Noten</span>
              <select
                value={seqLength}
                onChange={(e) => setSeqLength(Number(e.target.value))}
                className="mt-1 w-full bg-black/50 border border-purple-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-purple-400/60"
              >
                {[4, 6, 8, 12].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
            <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-400">Tempo-Ramp</span>
            <div className="grid grid-cols-4 gap-2 mt-2">
              <NumberField label="Start" value={tempo.startBpm} onChange={(v) => setTempo({ ...tempo, startBpm: v })} />
              <NumberField label="Min" value={tempo.minBpm} onChange={(v) => setTempo({ ...tempo, minBpm: v })} />
              <NumberField label="Max" value={tempo.maxBpm} onChange={(v) => setTempo({ ...tempo, maxBpm: v })} />
              <NumberField label="Step" value={tempo.stepBpm} onChange={(v) => setTempo({ ...tempo, stepBpm: v })} />
            </div>
            <p className="cyber-mono text-[9px] text-slate-500 mt-2">Sauberer Lauf → +{tempo.stepBpm} BPM bis {tempo.maxBpm}.</p>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => startChallenge()}
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
              {challengeBpm} BPM · Hits {targetIndex} · Streak {statsRef.current.streak}
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
          <div className="cyber-mono text-[10px] text-amber-200 mt-3">{feedback}</div>
        </div>
      )}

      {mode === 'done' && (
        <div className="cyber-card relative overflow-hidden p-8 text-center">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
          <div className="text-4xl relative mb-4">🎯</div>
          <h3 data-text="SEQUENCE CLEAR" className="glitch cyber-display text-2xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_20px_rgba(157,0,255,0.5)]">
            SEQUENCE CLEAR
          </h3>
          <p className="cyber-mono text-slate-300 mt-3 text-sm relative">
            {statsRef.current.hits} Treffer · {statsRef.current.misses} Fehler ·{' '}
            <span className="neon-purple font-black">{challengeBpm} BPM</span>
          </p>
          {feedback && <p className="cyber-mono text-[10px] text-amber-200 mt-2 relative">{feedback}</p>}
          <div className="flex flex-wrap gap-3 mt-6 justify-center relative">
            <button
              onClick={() => startChallenge(challengeBpm)}
              className="cyber-btn cyber-btn-magenta px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              ↔ Repeat @ {challengeBpm} BPM
            </button>
            <button
              onClick={() => setMode('free')}
              className="cyber-btn px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Free Play
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const NumberField: React.FC<{ label: string; value: number; onChange: (v: number) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <label className="flex-1">
    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400/60"
    />
  </label>
);
