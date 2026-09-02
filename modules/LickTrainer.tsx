import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BUILTIN_LICKS,
  Lick,
  LickEvent,
  MatchSettings,
  TempoSettings,
  RunResult,
  cloneLick,
  parseEventText,
  sortedEvents,
  totalBeats,
} from '../core/licks';
import { LickPlayer } from '../core/playback';
import { usePitchStream } from '../core/usePitchStream';
import { useProgress } from '../core/useProgress';
import { matchPlayedEvent, describeGating } from '../core/match';
import { lickStarsForBpm } from '../core/progress';
import { parsePdfFile } from '../core/pdf';

interface LickTrainerProps {
  onBack: () => void;
  initialLickId?: string;
}

type Phase = 'setup' | 'editing' | 'review' | 'practice' | 'done';

const DEFAULT_TEMPO: TempoSettings = {
  startBpm: 70,
  minBpm: 60,
  maxBpm: 150,
  stepBpm: 5,
};

const DEFAULT_MATCH: MatchSettings = {
  variable: 'both',
  octaveTolerance: true,
  perfectWindowMs: 45,
  graceWindowMs: 110,
};

const feedbackLabel: Record<RunResult['feedback'], string> = {
  perfect: '🔥 Perfekt',
  good: '✅ Gut',
  early: '⏱️ Zu früh',
  late: '⏱️ Zu spät',
  'wrong-note': '🎵 Falsche Note',
  missed: '💤 Nichts gehört',
  'on-time-note-only': '🕒 Note egal — Timing passt',
};

export const LickTrainer: React.FC<LickTrainerProps> = ({ onBack, initialLickId }) => {
  const { player: progress, grant } = useProgress();
  const mic = usePitchStream();

  const [phase, setPhase] = useState<Phase>('setup');
  const [lickId, setLickId] = useState<string>(BUILTIN_LICKS[0].id);
  const [lick, setLick] = useState<Lick>(() => cloneLick(BUILTIN_LICKS[0]));
  const [editingText, setEditingText] = useState('');
  const [tempo, setTempo] = useState<TempoSettings>(DEFAULT_TEMPO);
  const [match, setMatch] = useState<MatchSettings>(DEFAULT_MATCH);
  const [currentBpm, setCurrentBpm] = useState(DEFAULT_TEMPO.startBpm);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [hit, setHit] = useState<RunResult | null>(null);
  const [history, setHistory] = useState<RunResult[]>([]);
  const [runCount, setRunCount] = useState(0);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfWarnings, setPdfWarnings] = useState<string[]>([]);
  const [isPdfParsing, setIsPdfParsing] = useState(false);

  const playerRef = useRef<LickPlayer | null>(null);
  const practiceStartRef = useRef(0);
  const eventIndexRef = useRef(0);
  const hitThisEventRef = useRef(false);
  const lastProcessedRef = useRef(0);

  const events = useMemo(() => sortedEvents(lick), [lick]);

  const lickProgress = progress.modules.lickTrainer.licks[lickId] ?? {
    bestBpm: 0,
    cleanRuns: 0,
    stars: 0,
    totalXp: 0,
  };

  const beatSeconds = 60 / currentBpm;

  useEffect(() => {
    setLick(cloneLick(BUILTIN_LICKS.find((l) => l.id === lickId) ?? BUILTIN_LICKS[0]));
    setEditingText(BUILTIN_LICKS.find((l) => l.id === lickId)?.events.map(evtToLine).join('\n') ?? '');
    setCurrentBpm(DEFAULT_TEMPO.startBpm);
    setPhase('review');
    setActiveEventId(null);
    setHit(null);
    setHistory([]);
    setRunCount(0);
  }, [lickId]);

  useEffect(() => {
    if (initialLickId && initialLickId !== lickId) setLickId(initialLickId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLickId]);

  const player = () => {
    if (!playerRef.current) playerRef.current = new LickPlayer();
    return playerRef.current;
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(null);
    setPdfWarnings([]);
    setIsPdfParsing(true);
    try {
      const result = await parsePdfFile(file);
      setLick(result.lick);
      setEditingText(
        result.lick.events.map((evt) =>
          `${evt.notes.join('/')} ${evt.beat} ${evt.durationBeats}${evt.string && evt.fret ? ` ${evt.string}-${evt.fret}` : ''}`,
        ).join('\n'),
      );
      setPdfWarnings(result.warnings);
      setPhase('review');
    } catch (err) {
      setPdfError((err as Error).message);
    } finally {
      setIsPdfParsing(false);
      e.target.value = '';
    }
  };

  const applyEditing = () => {
    const parsed = parseEventText(editingText.split('\n'));
    if (parsed.length === 0) return;
    setLick({ ...lick, events: parsed });
    setPhase('review');
  };

  const playLick = async () => {
    if (events.length === 0) return;
    setHit(null);
    setPhase('review');
    setActiveEventId(null);
    await player().play(lick, currentBpm, {
      onEventStart: (event) => setActiveEventId(event.id),
      onEventEnd: (event) => {
        if (event.id === activeEventId) setActiveEventId(null);
      },
      onComplete: () => setActiveEventId(null),
    });
  };

  const stopPlayback = async () => {
    await player().stop();
    setActiveEventId(null);
  };

  const startPractice = async () => {
    if (events.length === 0) return;
    setPhase('practice');
    setHit(null);
    setHistory([]);
    eventIndexRef.current = 0;
    hitThisEventRef.current = false;
    lastProcessedRef.current = 0;
    practiceStartRef.current = performance.now();
    await player().play(lick, currentBpm, {
      onEventStart: (event) => setActiveEventId(event.id),
    });
    await mic.start();
  };

  const stopPractice = async () => {
    mic.stop();
    await player().stop();
    setActiveEventId(null);
    setPhase('review');
  };

  const completeRun = async () => {
    mic.stop();
    await player().stop();
    setActiveEventId(null);

    const clean = history.every((h) => h.feedback === 'perfect' && h.passed);
    const newBpm = Math.min(currentBpm + tempo.stepBpm, tempo.maxBpm);
    setCurrentBpm(newBpm);
    setRunCount((c) => c + 1);

    const stars = lickStarsForBpm(newBpm, tempo.maxBpm);
    grant(clean ? 50 : 20, lickId, {
      bestBpm: newBpm,
      stars,
      cleanRuns: clean ? 1 : 0,
    });

    setPhase('done');
  };

  const processSample = (noteName: string, timestamp: number) => {
    if (!hitThisEventRef.current) {
      // process each event once per attempt window
    } else if (timestamp - lastProcessedRef.current < 120) {
      return;
    }

    const event = events[eventIndexRef.current];
    if (!event) return;

    const deltaBeats = (timestamp - practiceStartRef.current) / 1000 / beatSeconds;
    const deltaMs = (deltaBeats - event.beat) * 1000;

    if (Math.abs(deltaMs) > match.graceWindowMs + 250) return;

    lastProcessedRef.current = timestamp;

    const result = matchPlayedEvent(
      [noteName],
      event.notes,
      event.beat,
      deltaBeats,
      match,
    );

    setHit(result);
    setHistory((prev) => [...prev, result]);

    if (result.passed && !hitThisEventRef.current) {
      hitThisEventRef.current = true;
      eventIndexRef.current += 1;
      if (eventIndexRef.current >= events.length) {
        completeRun();
      }
    } else {
      hitThisEventRef.current = false;
    }
  };

  useEffect(() => {
    if (phase !== 'practice' || !mic.sample) return;
    processSample(
      match.octaveTolerance ? mic.sample.noteName : mic.sample.fullNote,
      mic.sample.timestamp,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mic.sample]);

  const currentEvent = events[eventIndexRef.current] ?? null;

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
          data-text="LICK-TRAINER"
          className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(0,240,255,0.5)]"
        >
          LICK-TRAINER
        </h2>
        <span className="cyber-mono text-[9px] font-bold text-cyan-300/80 uppercase tracking-widest">
          Best {lickProgress.bestBpm} BPM · ★{lickProgress.stars} · 🏆 {lickProgress.totalXp} XP
        </span>
        <span className="akira-kanji ml-auto text-sm hidden md:block">音</span>
      </div>

      {phase === 'setup' && (
        <div className="cyber-card p-6 space-y-5">
          <p className="text-slate-300 text-sm leading-relaxed">
            Wähle einen Lick, importiere eine PDF mit Text-Ebene (ASCII-Tab bzw.
            Notennamen) oder erfasse ihn manuell — alles landet im selben
            Lick-Datenmodell.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="cyber-card p-5 cursor-pointer hover:border-fuchsia-400/40 block">
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={handlePdfUpload}
                className="hidden"
              />
              <span className="cyber-mono text-[9px] uppercase tracking-widest neon-magenta block mb-2">
                ⬇ PDF-IMPORT
              </span>
              <span className="text-sm font-black text-white block">Lick aus PDF laden</span>
              <span className="text-[10px] text-slate-400 mt-2 block leading-relaxed">
                {isPdfParsing
                  ? 'Analysiere Text-Ebene…'
                  : 'Digitale PDFs mit Text: ASCII-Tab oder Notennamen + Dauer.'}
              </span>
            </label>
            <div className="cyber-card p-5">
              <span className="cyber-mono text-[9px] uppercase tracking-widest neon-cyan block mb-2">
                ⚡ QUICK-SELECT
              </span>
              <span className="text-sm font-black text-white block">Start-Lick wählen</span>
              <div className="mt-3">
                <LickPicker value={lickId} onChange={setLickId} />
              </div>
            </div>
          </div>

          {pdfError && (
            <div className="cyber-mono text-[10px] text-red-300 bg-red-500/10 border border-fuchsia-500/30 rounded-lg p-3">
              ⚠ {pdfError}
            </div>
          )}
          {pdfWarnings.length > 0 && (
            <div className="cyber-mono text-[10px] text-amber-200/80 bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
              {pdfWarnings.map((w, i) => (
                <div key={i}>▸ {w}</div>
              ))}
            </div>
          )}

          <button
            onClick={() => setPhase('editing')}
            className="cyber-btn px-5 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest transition-all"
          >
            Lick bearbeiten (manuell)
          </button>
        </div>
      )}

      {phase === 'editing' && (
        <div className="cyber-card p-6 space-y-4">
          <div>
            <h3 className="hud-label text-[10px] font-black mb-2">
              Lick-Editor — Zeile: Note beat dauer string-fret (z. B. E3 0 0.5 6-3)
            </h3>
            <textarea
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              rows={10}
              className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-4 font-mono text-sm text-emerald-300 focus:outline-none focus:border-cyan-400/60 shadow-[inset_0_0_20px_rgba(0,240,255,0.05)]"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={applyEditing}
              className="cyber-btn px-5 py-2.5 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Übernehmen
            </button>
            <button
              onClick={() => setPhase('review')}
              className="cyber-btn cyber-btn-magenta px-5 py-2.5 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="space-y-6">
          <SettingsPanel
            tempo={tempo}
            setTempo={setTempo}
            currentBpm={currentBpm}
            match={match}
            setMatch={setMatch}
          />

          <div className="cyber-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="cyber-display font-black text-white uppercase tracking-widest text-sm">
                  {lick.title}
                </h3>
                {lick.key && (
                  <span className="cyber-mono text-[10px] font-bold neon-cyan uppercase tracking-widest">
                    KEY: {lick.key}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="cyber-display text-2xl font-black neon-magenta">{currentBpm} BPM</span>
              </div>
            </div>

            <LickTimeline events={events} activeEventId={activeEventId} total={totalBeats(lick)} />

            <LickFretboard current={currentEvent} />

            {lick.description && (
              <p className="text-[11px] text-slate-400 italic">{lick.description}</p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={playLick}
              className="cyber-btn px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest hover:scale-[1.02] transition-all"
            >
              ▶ Vorspielen
            </button>
            <button
              onClick={startPractice}
              className="cyber-btn cyber-btn-magenta px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest flex items-center gap-2"
            >
              <span className="pulse-dot bg-fuchsia-400 text-fuchsia-400" />
              🎤 Üben
            </button>
            <button
              onClick={() => setPhase('editing')}
              className="cyber-btn cyber-btn-amber px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Bearbeiten
            </button>
            <button
              onClick={stopPlayback}
              className="cyber-btn px-6 py-3 text-slate-400 hover:text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Stopp
            </button>
          </div>

          {mic.error && (
            <div className="text-xs text-red-400 font-bold bg-red-500/10 border border-fuchsia-500/30 rounded-lg p-3 cyber-mono">
              ⚠ {mic.error}
            </div>
          )}
        </div>
      )}

      {phase === 'practice' && (
        <div className="space-y-6">
          <SettingsPanel
            tempo={tempo}
            setTempo={setTempo}
            currentBpm={currentBpm}
            match={match}
            setMatch={setMatch}
          />

          <div className="cyber-card p-6">
            <div className="flex justify-between items-center mb-4">
              <span className="cyber-mono text-[10px] font-black uppercase tracking-widest text-cyan-300">
                {mic.isListening ? '🎤 MIC ONLINE' : '🎤 MIC STANDBY'}
              </span>
              <span className="cyber-mono text-sm font-black text-white">
                SEQ {eventIndexRef.current + 1}/{events.length}
              </span>
            </div>
            <LickTimeline events={events} activeEventId={currentEvent?.id ?? null} total={totalBeats(lick)} />
            <LickFretboard current={currentEvent} playedNote={mic.sample?.noteName} />
          </div>

          {hit && (
            <div
              className={`p-4 rounded-xl border cyber-mono text-sm font-black uppercase tracking-widest ${
                hit.passed
                  ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-300 shadow-[0_0_22px_rgba(57,255,20,0.2)]'
                  : 'bg-amber-500/10 border-amber-400/40 text-amber-300 shadow-[0_0_22px_rgba(249,240,2,0.16)]'
              }`}
            >
              <span className="pulse-dot mr-2 bg-current text-current" />
              {feedbackLabel[hit.feedback]} {formatDelta(hit.deltaMs)}
              {!hit.passed && (
                <span className="block mt-1 text-[10px] text-slate-400 font-normal normal-case tracking-normal">
                  {describeGating(match.variable)}
                </span>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={stopPractice}
              className="cyber-btn cyber-btn-magenta px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Übung beenden
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && (
        <div className="cyber-card relative overflow-hidden p-8 md:p-10 text-center">
          <div className="absolute -left-20 -top-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]" />
          <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px]" />
          <div className="text-4xl mb-4 relative">🎉</div>
          <h3
            data-text="SEQ CLEAR"
            className="glitch cyber-display text-2xl font-black text-white uppercase tracking-wider drop-shadow-[0_0_20px_rgba(57,255,20,0.5)]"
          >
            SEQ CLEAR
          </h3>
          <p className="cyber-mono text-slate-400 mt-3 text-sm relative">
            Durchlauf {runCount} synchronisiert · BPM:{' '}
            <span className="neon-magenta font-black text-base">{currentBpm}</span>
            {' '}· {history.length} Signals · {history.filter((h) => h.passed).length} PERFECT
          </p>
          <div className="flex flex-wrap gap-3 mt-6 justify-center relative">
            <button
              onClick={() => setPhase('review')}
              className="cyber-btn px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Zurück zum Lick
            </button>
            <button
              onClick={() => setPhase('setup')}
              className="cyber-btn cyber-btn-magenta px-6 py-3 text-white text-xs font-black rounded-lg uppercase tracking-widest"
            >
              Anderer Lick
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const LickPicker: React.FC<{ value: string; onChange: (id: string) => void }> = ({
  value,
  onChange,
}) => (
  <label className="block">
    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 block">
      Lick auswählen
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-black/50 border border-cyan-500/20 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-cyan-400/60 cyber-mono"
    >
      {BUILTIN_LICKS.map((l) => (
        <option key={l.id} value={l.id}>
          {l.title} ({l.key})
        </option>
      ))}
    </select>
  </label>
);

const SettingsPanel: React.FC<{
  tempo: TempoSettings;
  setTempo: (t: TempoSettings) => void;
  currentBpm: number;
  match: MatchSettings;
  setMatch: (m: MatchSettings) => void;
}> = ({ tempo, setTempo, currentBpm, match, setMatch }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="cyber-card p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cyan-300/80 hover:text-white transition-colors"
      >
        ⚙️ Tempo & Gating {open ? '▾' : '▸'}
      </button>
      {open && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Start / Min / Max / Step BPM
            </span>
            <div className="mt-2 flex gap-2">
              <NumberField label="Start" value={tempo.startBpm} onChange={(v) => setTempo({ ...tempo, startBpm: v })} />
              <NumberField label="Min" value={tempo.minBpm} onChange={(v) => setTempo({ ...tempo, minBpm: v })} />
              <NumberField label="Max" value={tempo.maxBpm} onChange={(v) => setTempo({ ...tempo, maxBpm: v })} />
              <NumberField label="Step" value={tempo.stepBpm} onChange={(v) => setTempo({ ...tempo, stepBpm: v })} />
            </div>
          </div>
          <div>
            <span className="hud-label text-[10px] font-bold mb-1">
              Fortschritts-Variable
            </span>
            <select
              value={match.variable}
              onChange={(e) => setMatch({ ...match, variable: e.target.value as MatchSettings['variable'] })}
              className="mt-2 w-full bg-black/50 border border-cyan-500/20 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-400/60"
            >
              <option value="both">Note + perfektes Timing</option>
              <option value="note">Nur Note</option>
              <option value="timing">Nur Timing</option>
            </select>
          </div>
          <div className="flex gap-3">
            <NumberField label="Perfekt ±ms" value={match.perfectWindowMs} onChange={(v) => setMatch({ ...match, perfectWindowMs: v })} />
            <NumberField label="Grace ±ms" value={match.graceWindowMs} onChange={(v) => setMatch({ ...match, graceWindowMs: v })} />
          </div>
          <p className="text-[10px] text-slate-500 col-span-full">{describeGating(match.variable)}</p>
          <p className="text-[10px] text-slate-500 col-span-full">
            Aktuell: {currentBpm} BPM → nach sauberem Durchlauf +{tempo.stepBpm} bis Max {tempo.maxBpm} BPM.
          </p>
        </div>
      )}
    </div>
  );
};

const NumberField: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
}> = ({ label, value, onChange }) => (
  <label className="flex-1">
    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-1">
      {label}
    </span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-black/50 border border-cyan-500/20 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400/60"
    />
  </label>
);

const LickTimeline: React.FC<{
  events: LickEvent[];
  activeEventId: string | null;
  total: number;
}> = ({ events, activeEventId, total }) => (
  <div className="relative h-16 bg-black/40 rounded-xl border border-cyan-500/20 overflow-hidden shadow-[inset_0_0_24px_rgba(0,240,255,0.06)]">
    {events.map((event) => {
      const left = (event.beat / Math.max(total, 1)) * 100;
      const width = (event.durationBeats / Math.max(total, 1)) * 100;
      const isActive = event.id === activeEventId;
      return (
        <div
          key={event.id}
          title={event.notes.join('/')}
          className={`absolute top-2 bottom-2 rounded-md border transition-all ${
            isActive
              ? 'bg-cyan-500/40 border-cyan-300 shadow-[0_0_18px_rgba(0,240,255,0.55)]'
              : 'bg-slate-800/80 border-cyan-500/10'
          }`}
          style={{ left: `${left}%`, width: `${Math.max(width, 1.5)}%` }}
        >
          <span className="cyber-mono text-[9px] text-slate-400 absolute top-1 left-1.5 truncate">
            {event.notes.join('/')}
          </span>
        </div>
      );
    })}
    <div className="absolute top-0 bottom-0 right-2 flex items-center">
      <span className="cyber-mono text-[9px] text-slate-600">beats</span>
    </div>
  </div>
);

const LickFretboard: React.FC<{
  current: LickEvent | null;
  playedNote?: string;
}> = ({ current, playedNote }) => {
  const strings = ['e', 'B', 'G', 'D', 'A', 'E'];
  const currentString = current?.string ?? null;
  const currentFret = current?.fret ?? null;

  return (
    <div className="bg-black/40 rounded-xl border border-cyan-500/20 p-4 space-y-2 shadow-[inset_0_0_24px_rgba(0,240,255,0.06)]">
      <div className="flex justify-between">
        <span className="hud-label text-[10px] font-black">
          Ziel: {current ? current.notes.join('/') : '—'}
          {current?.string && current?.fret && (
            <span className="neon-cyan ml-2">S{current.string} · F{current.fret}</span>
          )}
        </span>
        {playedNote && (
          <span className="cyber-mono text-[10px] font-black uppercase tracking-widest neon-magenta">
            Live: {playedNote}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {strings.map((s) => (
          <div key={s} className="flex items-center gap-2">
            <span className="cyber-mono w-4 text-[10px] text-cyan-300/60 text-right">{s}</span>
            <div className="flex-1 h-8 bg-slate-900/80 rounded border border-cyan-500/10 relative">
              {currentString === strings.indexOf(s) + 1 && currentFret != null ? (
                <div
                  className="absolute top-1 bottom-1 w-6 rounded bg-cyan-500/70 border border-cyan-300 shadow-[0_0_14px_rgba(0,240,255,0.6)] flex items-center justify-center"
                  style={{ left: `${(currentFret / 12) * 100}%` }}
                >
                  <span className="cyber-display text-[10px] font-black text-black">{currentFret}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const formatDelta = (ms: number) => (Math.abs(ms) < 20 ? '· exakt' : `· ${Math.round(ms)} ms ${ms < 0 ? 'früh' : 'spät'}`);

const evtToLine = (e: LickEvent) =>
  `${e.notes.join('/')} ${e.beat} ${e.durationBeats}${e.string && e.fret ? ` ${e.string}-${e.fret}` : ''}`;
