import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FretboardMini } from '../components/ScaleVisualizer';
import { ChordDiagram } from '../components/ChordDiagram';
import { buildChordShape, allPositionsForPitch } from '../core/chordShapes';
import { usePitchStream } from '../core/usePitchStream';
import { useProgress } from '../core/useProgress';
import { LickPlayer } from '../core/playback';
import { pitchClassName, scaleNames } from '../core/theory';
import {
  JamMode,
  PROGRESSIONS,
  ProgressionDef,
  ChordInKey,
  chordPitchClasses,
  classifyNote,
  keyScalePitchClasses,
  noteChoicesForChord,
  progressionChords,
  reasonForFit,
  buildRhythmLick,
  CHORD_DEFS,
} from '../core/harmony';
import { sectionStarsForStreak } from '../core/progress';

interface JamCoachProps {
  onBack: () => void;
}

const TEMPO = { startBpm: 80, minBpm: 70, maxBpm: 160, stepBpm: 5 };

export const JamCoach: React.FC<JamCoachProps> = ({ onBack }) => {
  const mic = usePitchStream();
  const { grant } = useProgress();

  const [keyIndex, setKeyIndex] = useState(9); // A
  const [mode, setMode] = useState<JamMode>('major');
  const [progressionId, setProgressionId] = useState('pop-i-vi-iv-v');
  const [selectedStep, setSelectedStep] = useState(0);
  const [bpm, setBpm] = useState(TEMPO.startBpm);
  const [chordBpm, setChordBpm] = useState(TEMPO.startBpm);
  const [isLooping, setIsLooping] = useState(false);
  const [loopTick, setLoopTick] = useState(0);

  const playerRef = useRef<LickPlayer | null>(null);

  const progression: ProgressionDef =
    PROGRESSIONS.find((p) => p.id === progressionId) ?? PROGRESSIONS[0];

  const chords = useMemo(
    () => progressionChords(keyIndex, mode, progression.steps),
    [keyIndex, mode, progression],
  );

  const keyScale = useMemo(
    () => keyScalePitchClasses(keyIndex, mode),
    [keyIndex, mode],
  );

  const selectedChord: ChordInKey = chords[selectedStep] ?? chords[0];

  const scaleNoteNames = useMemo(
    () => keyScale.map(pitchClassName),
    [keyScale],
  );

  const chordNoteNames = useMemo(
    () => selectedChord.pitchClasses.map(pitchClassName),
    [selectedChord],
  );

  const choices = useMemo(
    () => noteChoicesForChord(selectedChord, keyScale),
    [selectedChord, keyScale],
  );

  const activeNote = mic.sample?.noteName ?? null;
  const activePc = mic.sample?.noteName?.replace(/\d+$/, '') ?? null;
  const activeFit = activePc
    ? classifyNote(
        keyScale.findIndex((k) => pitchClassName(k) === activePc.replace(/\d+$/, '')),
        selectedChord,
        keyScale,
      )
    : null;
  const activeReason =
    activeFit && activePc
      ? reasonForFit(keyScale.findIndex((k) => pitchClassName(k) === activePc), activeFit, selectedChord)
      : null;

  const selectedShape = useMemo(
    () => buildChordShape(selectedChord.rootIndex, selectedChord.def),
    [selectedChord],
  );

  const activePcIndex = activePc
    ? ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].indexOf(activePc)
    : null;
  const activePositions = activePcIndex != null ? allPositionsForPitch(activePcIndex) : [];

  // Detected notes panel (uses same pitch stream, just for awareness)
  useEffect(() => {
    // nothing; mic.sample drives activeNote directly
  }, [mic.sample]);

  const playChord = async () => {
    if (!playerRef.current) playerRef.current = new LickPlayer();
    await playerRef.current.play(
      {
        id: `chord-single-${selectedChord.degree}`,
        title: selectedChord.degree,
        events: [
          {
            id: 'chord-1',
            beat: 0,
            durationBeats: 2,
            notes: selectedChord.pitchClasses.map((pc) => `${pitchClassName(pc)}${pc < 7 ? 3 : 4}`),
          },
        ],
      },
      chordBpm,
      {},
    );
  };

  const loopProgression = async () => {
    if (isLooping) {
      await playerRef.current?.stop();
      setIsLooping(false);
      return;
    }
    setIsLooping(true);
    if (!playerRef.current) playerRef.current = new LickPlayer();
    const lick = buildRhythmLick(keyIndex, mode, progression, chordBpm);
    await playerRef.current.play(lick, chordBpm, {
      onEventStart: (event) => {
        const idx = Number(event.id.replace('chord-', ''));
        setSelectedStep(idx);
        setLoopTick((t) => t + 1);
      },
      onEventEnd: () => undefined,
      onComplete: () => {
        setIsLooping(false);
      },
    });
  };

  const stopLoop = async () => {
    await playerRef.current?.stop();
    setIsLooping(false);
  };

  useEffect(
    () => () => {
      playerRef.current?.dispose();
      mic.stop();
    },
    [],
  );

  const fitColor: Record<string, string> = {
    'chord-tone': 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40',
    'guide-tone': 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40',
    'scale-tone': 'bg-blue-500/15 text-blue-200 border-blue-400/30',
    outside: 'bg-red-500/10 text-red-300 border-red-400/30',
  };
  const fitLabel: Record<string, string> = {
    'chord-tone': 'Akkordton ✓',
    'guide-tone': 'Leitton ★',
    'scale-tone': 'Skalen-Ton ≈',
    outside: 'Outside ✗',
  };

  const finaleBpm = Math.min(chordBpm + TEMPO.stepBpm, TEMPO.maxBpm);
  const finale = { hits: chosenHits(), misses: chosenMisses(), bpm: finaleBpm };

  function chosenHits() {
    return choices.filter((c) => c.fit !== 'outside').length;
  }
  function chosenMisses() {
    return 12 - chosenHits();
  }

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
          data-text="JAM-COACH"
          className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(57,255,20,0.5)]"
        >
          RHYTHM-JAM COACH
        </h2>
        <span className="akira-kanji ml-auto text-sm hidden md:block">革命</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Key + mode + progression */}
        <div className="cyber-card p-5">
          <h3 className="hud-label text-[10px] font-black mb-4">🎼 Tonart & Progression</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="block">
              <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Key</span>
              <select
                value={keyIndex}
                onChange={(e) => setKeyIndex(Number(e.target.value))}
                className="mt-1 w-full bg-black/50 border border-green-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-green-400/60"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{pitchClassName(i)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Mode</span>
              <select
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as JamMode);
                  setProgressionId(
                    e.target.value === 'minor' ? 'minor-i-vi-iii-vii' : 'pop-i-vi-iv-v',
                  );
                }}
                className="mt-1 w-full bg-black/50 border border-green-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-green-400/60"
              >
                <option value="major">Dur (Major)</option>
                <option value="minor">Moll (Natural Minor)</option>
              </select>
            </label>
            <label className="block">
              <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">BPM</span>
              <input
                type="number"
                value={chordBpm}
                onChange={(e) => setChordBpm(Math.max(TEMPO.minBpm, Math.min(TEMPO.maxBpm, Number(e.target.value))))}
                className="mt-1 w-full bg-black/50 border border-green-500/20 rounded-lg p-2 text-xs text-white cyber-mono focus:outline-none focus:border-green-400/60"
              />
            </label>
          </div>

          <label className="block mt-4">
            <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Progression</span>
            <select
              value={progressionId}
              onChange={(e) => setProgressionId(e.target.value)}
              className="mt-1 w-full bg-black/50 border border-green-500/20 rounded-lg p-3 text-xs text-white cyber-mono focus:outline-none focus:border-green-400/60"
            >
              {PROGRESSIONS.filter((p) => p.mode === mode).map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </label>
          <p className="cyber-mono text-[10px] text-slate-400 mt-3">{progression.note}</p>

          <div className="flex gap-2 mt-4">
            <button
              onClick={loopProgression}
              className={`cyber-btn px-4 py-2.5 flex-1 text-xs font-black uppercase tracking-widest ${isLooping ? 'cyber-btn-magenta' : ''}`}
            >
              {isLooping ? '■ Stop Loop' : '▶ Loop Progression'}
            </button>
            <button
              onClick={playChord}
              className="cyber-btn px-4 py-2.5 text-xs font-black uppercase tracking-widest"
            >
              ♪ Akkord
            </button>
          </div>
        </div>

        {/* Selected chord details */}
        <div className="cyber-card p-5">
          <h3 className="hud-label text-[10px] font-black mb-4">🎸 {selectedChord.degree} · {selectedChord.noteNames.join(' ')}</h3>
          <div className="text-3xl font-black cyber-display neon-green mb-2">
            {selectedChord.noteNames[0]}{selectedChord.def.symbol}
          </div>
          <p className="cyber-mono text-[10px] text-slate-400 mb-3">
            {selectedChord.def.formula} · {selectedChord.def.label} · {selectedChord.def.character}
          </p>
          <div className="mb-2">
            <span className="cyber-mono text-[9px] uppercase tracking-widest text-slate-500">Funktion</span>
            <p className="text-[11px] text-slate-300">{selectedChord.function}</p>
          </div>

          <ChordDiagram
            shape={selectedShape}
            label={`Griffbild ${selectedShape?.label ?? selectedChord.degree}`}
            highlightPitchClass={activePcIndex}
          />

          {activePositions.length > 0 && (
            <div className="mt-3 border border-green-500/20 bg-green-500/5 rounded-lg p-3">
              <div className="cyber-mono text-[9px] uppercase tracking-widest text-green-300 mb-2">
                ▸ Wo du {activePc} spielst / spielen könntest
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activePositions
                  .filter((p) => selectedShape?.positions.some((sp) => sp.pitchClass === p.pitchClass))
                  .slice(0, 12)
                  .map((p, i) => (
                    <span key={i} className="px-2 py-1 rounded border border-green-500/30 text-[9px] font-mono text-green-200">
                      {p.string + 1}-{p.fret}
                    </span>
                  ))}
              </div>
              <p className="cyber-mono text-[9px] text-slate-400 mt-2">
                Diese Positionen klingen über {selectedChord.degree}. Root/3rd/5th/7th sind im Diagramm farbig markiert.
              </p>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={playChord}
              className="cyber-btn cyber-btn-amber px-3 py-1.5 text-[10px] font-black uppercase tracking-widest"
            >
              ♪ Hör-Test
            </button>
          </div>
        </div>
      </div>

      {/* Fretboard using chord+scale notes */}
      <div className="cyber-card p-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="hud-label text-[10px] font-black">🎸 Wo liegen die Akkordtöne?</h3>
          <span className="cyber-mono text-[9px] text-slate-500">Grün = Akkordtöne · Blau = Skala</span>
        </div>
        <FretboardMini
          scaleNotes={scaleNoteNames}
          chordNotes={chordNoteNames}
          detectedNotes={activeNote ? [activeNote] : []}
          activeNote={activeNote ?? undefined}
          highlightNote={activeNote ?? undefined}
        />
        <div className="flex flex-wrap gap-2 mt-3">
          {keyScale.map((pc) => (
            <span
              key={pc}
              className={`px-2 py-1 rounded border text-[10px] font-mono ${
                selectedChord.pitchClasses.includes(pc)
                  ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40'
                  : 'bg-blue-500/10 text-blue-200 border-blue-400/20'
              }`}
            >
              {pitchClassName(pc)}
            </span>
          ))}
        </div>
      </div>

      {/* Notes over this chord */}
      <div className="cyber-card p-5">
        <h3 className="hud-label text-[10px] font-black mb-4">🎯 Welche Note passt über {selectedChord.degree}? & WARUM</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {choices.map((choice) => (
            <div key={choice.pitchClass} className={`rounded-lg border p-3 ${fitColor[choice.fit]}`}>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-black cyber-display">{choice.noteName}</span>
                <span className="text-[8px] font-black uppercase tracking-widest">{fitLabel[choice.fit]}</span>
              </div>
              <p className="text-[9px] text-slate-300 mt-1 leading-snug">{choice.reason}</p>
            </div>
          ))}
        </div>
        <p className="cyber-mono text-[10px] text-slate-500 mt-4">
          Faustregel: Auf dem Akkordton (Grün) bleiben = sicher. Leitton (Cyan) = Charakter.
          Skalen-Ton (Blau) = Durchgang. Outside (nicht gezeigt) = bewusste Spannung.
        </p>
      </div>

      {/* Live note inspector */}
      <div className="cyber-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="hud-label text-[10px] font-black">📡 Live-Check</h3>
          <span className={`cyber-mono text-[10px] ${mic.isListening ? 'neon-green' : 'text-slate-500'}`}>
            {mic.isListening ? '• ONLINE' : '• OFFLINE'}
          </span>
        </div>
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="text-center min-w-[120px]">
            <div className={`text-6xl font-black cyber-display ${activeNote ? 'neon-green' : 'text-slate-800'}`}>
              {activeNote ? activeNote.replace(/\d+$/, '') : '--'}
            </div>
          </div>
          <div className="flex-1">
            {activeNote && activeFit ? (
              <>
                <div className={`inline-block rounded border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${fitColor[activeFit]}`}>
                  {fitLabel[activeFit]}
                </div>
                <p className="text-[12px] text-slate-300 mt-2 leading-relaxed">{activeReason}</p>
                <p className="cyber-mono text-[9px] text-slate-500 mt-1">
                  {activeNote} → über {selectedChord.degree} ({selectedChord.noteNames.join(' ')})
                </p>
              </>
            ) : (
              <p className="text-slate-400 text-sm">
                Starte das Mikrofon und spiele über den aktuellen Akkord — der Coach sagt dir sofort, ob und warum die Note passt.
              </p>
            )}
          </div>
          <button
            onClick={mic.isListening ? mic.stop : mic.start}
            className={`cyber-btn px-4 py-2.5 text-xs font-black uppercase tracking-widest ${mic.isListening ? 'cyber-btn-magenta' : ''}`}
          >
            {mic.isListening ? 'Stop' : '🎤 Hören'}
          </button>
        </div>
      </div>

      {/* Timeline: which chord when */}
      <div className="cyber-card p-5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="hud-label text-[10px] font-black">⏱ Welcher Akkord wann (Progression-Strip)</h3>
          <span className="cyber-mono text-[9px] text-slate-500">Takt 1 · 2 · 3 · 4</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          {chords.map((chord, idx) => (
            <button
              key={`${idx}-${chord.degree}`}
              onClick={() => setSelectedStep(idx)}
              className={`rounded-lg border p-3 text-left transition-all ${
                idx === selectedStep
                  ? 'border-green-400/60 bg-green-500/10 shadow-[0_0_18px_rgba(57,255,20,0.3)]'
                  : 'border-slate-700/60 hover:border-green-400/40'
              }`}
            >
              <div className="text-[9px] cyber-mono text-slate-500">Takt {idx % 4 + 1}</div>
              <div className="text-xl font-black text-white">{chord.degree}{chord.def.symbol}</div>
              <div className="cyber-mono text-[9px] text-slate-400 mt-1">{chord.noteNames.join(' ')}</div>
              <div className="text-[8px] text-slate-500 mt-1">{chord.def.label} · {chord.function}</div>
            </button>
          ))}
        </div>
        <p className="cyber-mono text-[9px] text-slate-500 mt-3">
          Klicke einen Akkord, um die passenden Noten darüber zu sehen. Loop spielt den ganzen Verlauf ab.
        </p>
      </div>

      {/* Milestone summary */}
      <div className="cyber-card relative overflow-hidden p-6">
        <div className="absolute -right-16 -top-16 w-56 h-56 bg-green-500/10 rounded-full blur-[70px]" />
        <h3 className="hud-label text-[10px] font-black mb-3">🧭 Nächster Meilenstein</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-black text-white">{finaleHitsPct()}%</div>
            <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">Sichere Noten</div>
          </div>
          <div>
            <div className="text-2xl font-black neon-green">{finale.bpm} BPM</div>
            <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">Nächstes Ziel</div>
          </div>
          <div>
            <div className="text-2xl font-black neon-cyan">{chords.length} Akkorde</div>
            <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">Im Loop</div>
          </div>
          <div>
            <div className="text-2xl font-black neon-magenta">{selectedChord.degree}</div>
            <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">Aktiv</div>
          </div>
        </div>
        <button
          onClick={() => grant(10, 'rhythm-jam', { bestBpm: finale.bpm, bestStreak: chords.length, stars: 1, runs: 1 })}
          className="cyber-btn cyber-btn-green absolute top-5 right-5 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest"
        >
          ✓ Meilenstein abhaken
        </button>
      </div>

      {finaleHitsPct() > 0 && (
        <div className="cyber-mono text-[10px] text-slate-500 text-center">
          Tipp: Halte die Grundtöne der Akkordboxen kurz (1 Schlag), spiele auf dem Beat, dann probiere Leittöne als Übergang.
        </div>
      )}
    </div>
  );

  function finaleHitsPct() {
    return Math.round((choices.filter((c) => c.fit !== 'outside').length / 12) * 100);
  }
};
