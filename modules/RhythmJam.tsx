import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Metronome } from '../core/metronome';
import { usePitchStream } from '../core/usePitchStream';
import { useProgress } from '../core/useProgress';
import { playFeedback } from '../core/feedbackSound';
import { sectionStarsForStreak } from '../core/progress';

interface RhythmJamProps {
  onBack: () => void;
}

type Phase = 'setup' | 'playing' | 'done';
type Cell = 'H' | '-';

interface PatternPreset {
  id: string;
  label: string;
  pattern: Cell[];
}

const PATTERNS: PatternPreset[] = [
  { id: 'steady', label: 'Straight 4/4', pattern: ['H', 'H', 'H', 'H'] },
  { id: 'funk', label: 'Funk', pattern: ['H', '-', 'H', 'H'] },
  { id: 'rock', label: 'Rock', pattern: ['H', 'H', '-', 'H'] },
  { id: 'syncopation', label: 'Syncopation', pattern: ['H', '-', '-', 'H', 'H', '-', 'H', 'H'] },
];

type Quality =
  | 'perfect'
  | 'good'
  | 'early'
  | 'late'
  | 'miss'
  | 'extra'
  | 'rest';

interface BeatResult {
  index: number;
  quality: Quality;
  expected: Cell;
}

const LABEL: Record<Quality, string> = {
  perfect: '🔥 PERFEKT',
  good: '✅ GUT',
  early: '⏱️ ZU FRÜH',
  late: '⏱️ ZU SPÄT',
  miss: '💤 MISS',
  extra: '✗ ZU VIEL',
  rest: '· RUHE OK',
};

interface TempoSettings {
  startBpm: number;
  minBpm: number;
  maxBpm: number;
  stepBpm: number;
}

const DEFAULT_TEMPO: TempoSettings = { startBpm: 80, minBpm: 70, maxBpm: 160, stepBpm: 5 };

export const RhythmJam: React.FC<RhythmJamProps> = ({ onBack }) => {
  const mic = usePitchStream();
  const { grant } = useProgress();

  const [phase, setPhase] = useState<Phase>('setup');
  const [tempo, setTempo] = useState<TempoSettings>(DEFAULT_TEMPO);
  const [patternId, setPatternId] = useState('steady');
  const [noteFilter, setNoteFilter] = useState<'any' | 'A3' | 'E3' | 'G3'>('any');
  const [maxBars, setMaxBars] = useState(6);
  const [adaptive, setAdaptive] = useState(true);
  const [soundOn, setSoundOn] = useState(true);

  const [liveBpm, setLiveBpm] = useState(DEFAULT_TEMPO.startBpm);
  const [currentBeat, setCurrentBeat] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<BeatResult | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [results, setResults] = useState<BeatResult[]>([]);
  const [barCount, setBarCount] = useState(0);
  const [hits, setHits] = useState(0);
  const [perfects, setPerfects] = useState(0);
  const [misses, setMisses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const metronomeRef = useRef<Metronome | null>(null);
  const prevNoteRef = useRef<{ note: string; at: number } | null>(null);
  const beatRef = useRef<{
    index: number;
    expected: Cell;
    atMs: number;
    hitTime: number | null;
    quality: Quality | null;
    resolved: boolean;
  } | null>(null);

  const hitsRef = useRef(0);
  const perfectsRef = useRef(0);
  const missesRef = useRef(0);
  const streakRef = useRef(0);
  const bestStreakRef = useRef(0);
  const barCountRef = useRef(0);
  const resultsRef = useRef<BeatResult[]>([]);
  const liveBpmRef = useRef(DEFAULT_TEMPO.startBpm);

  const pattern = useMemo(
    () => PATTERNS.find((p) => p.id === patternId)?.pattern ?? PATTERNS[0].pattern,
    [patternId],
  );

  const resetStats = () => {
    const start = Math.max(tempo.startBpm, tempo.minBpm);
    setLiveBpm(start);
    setCurrentBeat(null);
    setLastResult(null);
    setResults([]);
    setBarCount(0);
    setHits(0);
    setPerfects(0);
    setMisses(0);
    setStreak(0);
    setBestStreak(0);
    setFeedback(null);
    beatRef.current = null;
    prevNoteRef.current = null;
    hitsRef.current = 0;
    perfectsRef.current = 0;
    missesRef.current = 0;
    streakRef.current = 0;
    bestStreakRef.current = 0;
    barCountRef.current = 0;
    resultsRef.current = [];
    liveBpmRef.current = start;
  };

  const metronome = () => {
    if (!metronomeRef.current) metronomeRef.current = new Metronome();
    return metronomeRef.current;
  };

  const finish = () => {
    metronomeRef.current?.stop();
    mic.stop();
    setPhase('done');
    const stars = sectionStarsForStreak(bestStreakRef.current, Math.max(2, Math.ceil(maxBars / 2)));
    grant(perfectsRef.current * 3 + hitsRef.current * 2, 'rhythm-jam', {
      bestBpm: liveBpmRef.current,
      bestStreak: bestStreakRef.current,
      stars,
      runs: 1,
    });
    setHits(hitsRef.current);
    setPerfects(perfectsRef.current);
    setMisses(missesRef.current);
    setStreak(streakRef.current);
    setBestStreak(bestStreakRef.current);
    setBarCount(barCountRef.current);
  };

  const resolveBeat = () => {
    const b = beatRef.current;
    if (!b || b.resolved) return;
    b.resolved = true;

    let quality: Quality;
    if (b.expected === 'H') {
      if (b.hitTime != null && b.quality) {
        quality = b.quality;
        hitsRef.current += 1;
        if (quality === 'perfect') perfectsRef.current += 1;
        streakRef.current += 1;
        bestStreakRef.current = Math.max(bestStreakRef.current, streakRef.current);
      } else {
        quality = 'miss';
        missesRef.current += 1;
        streakRef.current = 0;
      }
    } else {
      if (b.hitTime != null) {
        quality = 'extra';
        missesRef.current += 1;
        streakRef.current = 0;
      } else {
        quality = 'rest';
      }
    }

    const result: BeatResult = { index: b.index, quality, expected: b.expected };
    resultsRef.current.push(result);
    setLastResult(result);
    setResults([...resultsRef.current]);
    setHits(hitsRef.current);
    setPerfects(perfectsRef.current);
    setMisses(missesRef.current);
    setStreak(streakRef.current);
    setBestStreak(bestStreakRef.current);

    if (soundOn) playFeedback(quality).catch(() => undefined);

    const isBarEnd = (b.index + 1) % pattern.length === 0;
    if (isBarEnd) {
      const barResults = resultsRef.current.slice(-pattern.length);
      const barClean =
        barResults.length === pattern.length &&
        barResults.every((r) => r.quality === 'perfect' || r.quality === 'good' || r.quality === 'rest');
      barCountRef.current += 1;
      setBarCount(barCountRef.current);

      const barMisses = barResults.filter((r) => r.quality === 'miss' || r.quality === 'extra').length;
      if (barClean) {
        const next = Math.min(liveBpmRef.current + tempo.stepBpm, tempo.maxBpm);
        liveBpmRef.current = next;
        setLiveBpm(next);
        metronomeRef.current?.setBpm(next);
        grant(12, 'rhythm-jam');
      } else if (adaptive && barMisses >= 2) {
        const next = Math.max(tempo.minBpm, liveBpmRef.current - tempo.stepBpm);
        liveBpmRef.current = next;
        setLiveBpm(next);
        metronomeRef.current?.setBpm(next);
        setFeedback(`Adaptive: Fehler im Takt → Tempo leicht gesenkt auf ${next} BPM`);
      }
    }
  };

  const markHit = (note: string, at: number) => {
    const b = beatRef.current;
    if (!b || b.resolved) return;
    if (b.hitTime != null) return;

    const flatNote = note.replace(/\d+$/, '');
    if (noteFilter !== 'any' && flatNote !== noteFilter.replace(/\d+$/, '')) return;

    const delta = at - b.atMs;
    if (delta > 110) return;

    b.hitTime = at;
    b.quality = Math.abs(delta) <= 45 ? 'perfect' : delta < 0 ? 'early' : 'late';

    if (b.expected === 'H') {
      setLastResult({ index: b.index, quality: b.quality!, expected: b.expected });
    } else {
      setLastResult({ index: b.index, quality: 'extra', expected: b.expected });
    }
  };

  const start = async () => {
    resetStats();
    setPhase('playing');
    await mic.start();
    await metronome().start(Math.max(tempo.startBpm, tempo.minBpm), pattern.length, (info) => {
      if (beatRef.current) resolveBeat();
      const expected: Cell = pattern[info.index % pattern.length];
      setCurrentBeat(info.beatInBar);
      beatRef.current = {
        index: info.index,
        expected,
        atMs: info.atMs,
        hitTime: null,
        quality: null,
        resolved: false,
      };
      if (info.bar > 0 && info.bar >= maxBars && info.beatInBar === 0) {
        finish();
      }
    });
  };

  const stop = () => {
    metronomeRef.current?.stop();
    mic.stop();
    setPhase('setup');
    resetStats();
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const sample = mic.sample;
    if (!sample) return;

    const note = sample.noteName.replace(/\d+$/, '');
    const at = performance.now();
    const prev = prevNoteRef.current;
    const isNew = !prev || prev.note !== note || at - prev.at > 340;
    prevNoteRef.current = { note, at };
    if (isNew) markHit(note, at);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.sample]);

  useEffect(
    () => () => {
      metronomeRef.current?.dispose();
      mic.stop();
    },
    [],
  );

  const noteFilterLabel =
    noteFilter === 'any' ? 'Beliebige Note' : noteFilter;

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
          data-text="RHYTHM-JAM"
          className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(249,240,2,0.5)]"
        >
          RHYTHM-JAM
        </h2>
        <span className="akira-kanji ml-auto text-sm hidden md:block">温リズム</span>
      </div>

      {phase === 'setup' && (
        <div className="space-y-6">
          <div className="cyber-card p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <span className="hud-label text-[10px] font-black mb-2 block">Tempo</span>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Start" value={tempo.startBpm} onChange={(v) => setTempo({ ...tempo, startBpm: v })} />
                  <NumberField label="Max" value={tempo.maxBpm} onChange={(v) => setTempo({ ...tempo, maxBpm: v })} />
                  <NumberField label="Step" value={tempo.stepBpm} onChange={(v) => setTempo({ ...tempo, stepBpm: v })} />
                  <NumberField label="Min" value={tempo.minBpm} onChange={(v) => setTempo({ ...tempo, minBpm: v })} />
                </div>
              </div>
              <div>
                <span className="hud-label text-[10px] font-black mb-2 block">Pattern</span>
                <div className="flex flex-wrap gap-2">
                  {PATTERNS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPatternId(p.id)}
                      className={`cyber-btn px-3 py-2 text-[10px] font-black uppercase tracking-widest rounded ${
                        patternId === p.id ? 'cyber-btn-amber' : ''
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block">
                  <span className="hud-label text-[10px] font-black mb-2 block">Auslösende Note</span>
                  <select
                    value={noteFilter}
                    onChange={(e) => setNoteFilter(e.target.value as any)}
                    className="w-full bg-black/50 border border-amber-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-amber-400/60"
                  >
                    <option value="any">Beliebige Note (Timing)</option>
                    <option value="A3">A3</option>
                    <option value="E3">E3</option>
                    <option value="G3">G3</option>
                  </select>
                </label>
                <label className="block mt-3">
                  <span className="hud-label text-[10px] font-black mb-2 block">Ziel-Takte</span>
                  <NumberField label="Bars" value={maxBars} onChange={(v) => setMaxBars(Math.max(2, Math.min(16, Math.round(v))))} />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setAdaptive((a) => !a)}
                className={`cyber-btn px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${adaptive ? 'cyber-btn-green' : ''}`}
              >
                {adaptive ? '● ADAPTIV' : '○ FIX'}
              </button>
              <button
                onClick={() => setSoundOn((s) => !s)}
                className={`cyber-btn px-3 py-1.5 text-[9px] font-black uppercase tracking-widest ${soundOn ? 'cyber-btn-amber' : ''}`}
              >
                {soundOn ? '🔔 TON' : '🔕 STUMM'}
              </button>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={start}
                className="cyber-btn cyber-btn-amber px-6 py-3 flex-1 text-xs font-black uppercase tracking-widest"
              >
                ▶ Start Jam
              </button>
            </div>
            <p className="cyber-mono text-[10px] text-slate-400 mt-4">
              Spiele <span className="neon-amber">{noteFilterLabel}</span> genau auf dem Beat.
              Nach jedem sauberen Takt +{tempo.stepBpm} BPM bis {tempo.maxBpm} BPM.
              {adaptive && ' · Fehler senken das Tempo automatisch.'}
            </p>
          </div>
          <div className="space-y-5">
            <div className="flex gap-2">
              {pattern.map((c, i) => (
                <div key={i} className={`flex-1 h-14 rounded-lg border flex items-center justify-center text-lg font-black ${c === 'H' ? 'bg-amber-500/10 border-amber-500/40 text-amber-200' : 'bg-slate-900 border-slate-700 text-slate-600'}`}>
                  {c === 'H' ? '●' : '—'}
                </div>
              ))}
            </div>
            <p className="cyber-mono text-[10px] text-slate-500">
              ● = spielen · — = Pause. Nur der richtige Puls zählt.
            </p>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <div className="cyber-card p-6">
          <div className="flex justify-between items-center mb-5">
            <span className="cyber-mono text-[10px] uppercase tracking-widest text-amber-300">
              {mic.isListening ? '🎤 MIC ONLINE' : '🎤 MIC STANDBY'}
            </span>
            <span className="cyber-display text-2xl font-black neon-amber">{liveBpm} BPM</span>
          </div>

          <div className="flex gap-2 mb-6">
            {pattern.map((c, i) => {
              const isCurrent = currentBeat === i;
              return (
                <div
                  key={i}
                  className={`flex-1 h-16 rounded-lg border flex flex-col items-center justify-center transition-all ${
                    isCurrent
                      ? c === 'H'
                        ? 'bg-amber-500/30 border-amber-300 shadow-[0_0_20px_rgba(249,240,2,0.5)]'
                        : 'bg-slate-800 border-slate-600'
                      : c === 'H'
                        ? 'bg-amber-500/5 border-amber-500/20'
                        : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <span className={`text-xl font-black ${isCurrent && c === 'H' ? 'neon-amber' : ''}`}>
                    {c === 'H' ? '●' : '—'}
                  </span>
                  <span className="cyber-mono text-[8px] text-slate-500">{i + 1}</span>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <Stat label="Hits" value={hits} />
            <Stat label="Perfect" value={perfects} />
            <Stat label="Miss" value={misses} />
            <Stat label="Streak" value={streak} />
            <Stat label="Bars" value={barCount} />
          </div>

          {lastResult && (
            <div
              className={`p-4 rounded-xl border cyber-mono text-sm font-black uppercase tracking-widest mb-6 ${
                lastResult.quality === 'perfect' || lastResult.quality === 'good' || lastResult.quality === 'rest'
                  ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-400/40 text-amber-300'
              }`}
            >
              <span className="pulse-dot mr-2 bg-current text-current" />
              {LABEL[lastResult.quality]}
              <span className="block mt-1 text-[10px] text-slate-400 normal-case">
                Beat {lastResult.index + 1} · erwartet {lastResult.expected === 'H' ? 'spielen' : 'Pause'}
              </span>
            </div>
          )}
          {feedback && (
            <div className="cyber-mono text-[10px] text-amber-200 mb-6">{feedback}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={stop}
              className="cyber-btn cyber-btn-magenta px-6 py-3 text-xs font-black uppercase tracking-widest"
            >
              ■ Stop
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="cyber-card relative overflow-hidden p-8 md:p-10 text-center">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px]" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
          <div className="text-4xl mb-4 relative">🔊</div>
          <h3 data-text="JAM COMPLETE" className="glitch cyber-display text-2xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_20px_rgba(249,240,2,0.5)]">
            JAM COMPLETE
          </h3>
          <p className="cyber-mono text-slate-300 mt-3 text-sm relative">
            Best BPM: <span className="neon-amber font-black">{liveBpm}</span> · Streak{' '}
            <span className="neon-cyan font-black">{bestStreak}</span> · {hits} Hits ·{' '}
            {perfects} Perfect · {misses} Miss
          </p>
          <div className="flex flex-wrap gap-3 mt-6 justify-center relative">
            <button
              onClick={start}
              className="cyber-btn cyber-btn-amber px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              ↔ Nochmal
            </button>
            <button
              onClick={stop}
              className="cyber-btn px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="cyber-card p-3 text-center">
    <div className="text-xl font-black text-white cyber-display">{value}</div>
    <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">{label}</div>
  </div>
);

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
