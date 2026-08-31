import React, { useRef, useState } from 'react';
import * as Tone from 'tone';
import {
  EarQuestion,
  buildNoteQuestion,
  buildIntervalQuestion,
  buildChordQuestion,
} from '../core/ear';
import { useProgress } from '../core/useProgress';
import { playFeedback } from '../core/feedbackSound';

interface EarTrainingProps {
  onBack: () => void;
}

type Kind = 'note' | 'interval' | 'chord';

const OPTION_LABEL: Record<Kind, string> = {
  note: 'Noten',
  interval: 'Intervalle',
  chord: 'Akkorde',
};

export const EarTraining: React.FC<EarTrainingProps> = ({ onBack }) => {
  const { grant } = useProgress();
  const [kind, setKind] = useState<Kind>('note');
  const [question, setQuestion] = useState<EarQuestion>(() => buildNoteQuestion());
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);

  const synthRef = useRef<Tone.PolySynth | null>(null);

  const playQuestion = async () => {
    setPlaying(true);
    try {
      await Tone.start();
      if (!synthRef.current) {
        synthRef.current = new Tone.PolySynth(Tone.Synth).toDestination();
        synthRef.current.set({
          volume: -6,
          envelope: { attack: 0.01, decay: 0.12, sustain: 0.4, release: 0.8 },
        });
      }
      const now = Tone.now();
      const notes = question.kind === 'chord'
        ? question.noteNames
        : question.noteNames.map((n, i) => (i === question.noteNames.length - 1 ? n : n));
      if (question.kind === 'note') {
        synthRef.current?.triggerAttackRelease(notes[0], '4n', now);
      } else if (question.kind === 'interval') {
        synthRef.current?.triggerAttackRelease(notes[0], '4n', now);
        synthRef.current?.triggerAttackRelease(notes[1], '4n', now + 0.4);
      } else {
        synthRef.current?.triggerAttackRelease(notes, '2n', now);
      }
      setTimeout(() => setPlaying(false), 1200);
    } catch {
      setPlaying(false);
    }
  };

  const next = (kindValue?: Kind) => {
    const nextKind = kindValue ?? kind;
    let q: EarQuestion;
    if (nextKind === 'interval') q = buildIntervalQuestion();
    else if (nextKind === 'chord') q = buildChordQuestion();
    else q = buildNoteQuestion();
    setQuestion(q);
    setSelected(null);
    playQuestion();
  };

  const switchKind = (k: Kind) => {
    setKind(k);
    next(k);
  };

  const answer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    setAnswered((a) => a + 1);
    const ok = opt === question.correct;
    setLastCorrect(ok);
    if (ok) {
      setScore((s) => s + 10);
      setStreak((s) => s + 1);
      grant(10, 'ear-training');
      playFeedback('correct').catch(() => undefined);
    } else {
      setStreak(0);
      playFeedback('wrong').catch(() => undefined);
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="stream-line" />
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="cyber-btn px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
          ← Studio
        </button>
        <h2 data-text="EAR-TRAINING" className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(0,240,255,0.5)]">
          GEHÖRBILDUNG
        </h2>
        <span className="akira-kanji ml-auto text-sm hidden md:block">耳</span>
      </div>

      <div className="cyber-card p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['note', 'interval', 'chord'] as Kind[]).map((k) => (
            <button
              key={k}
              onClick={() => switchKind(k)}
              className={`cyber-btn px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded ${kind === k ? 'cyber-btn-green' : ''}`}
            >
              {OPTION_LABEL[k]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button onClick={playQuestion} className="cyber-btn cyber-btn-amber px-5 py-3 text-xs font-black uppercase tracking-widest">
            {playing ? '▶ …' : '▶ Anhören'}
          </button>
          <span className="cyber-mono text-[10px] text-slate-400">{question.prompt}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Punkte" value={score} />
        <Stat label="Streak" value={streak} />
        <Stat label="Beantwortet" value={answered} />
        <Stat label="Kategorie" value={undefined} text={OPTION_LABEL[kind]} />
      </div>

      <div className="cyber-card p-6">
        <div className="flex flex-wrap gap-3 mt-2">
          {question.options.map((opt) => {
            const isPick = selected === opt;
            const isCorrect = opt === question.correct;
            const wrongPick = isPick && !isCorrect;
            return (
              <button
                key={opt}
                onClick={() => answer(opt)}
                className={`cyber-btn px-6 py-4 rounded-lg text-lg font-black uppercase ${isCorrect && (selected || lastCorrect) ? 'cyber-btn-green' : wrongPick ? 'cyber-btn-magenta' : ''}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className={`mt-5 p-4 rounded-lg border cyber-mono text-[11px] ${lastCorrect ? 'border-green-400/40 text-green-200' : 'border-fuchsia-500/40 text-fuchsia-200'}`}>
            <span className="font-black uppercase">{lastCorrect ? '✔ Richtig!' : `✘ Richtig wäre: ${question.correct}`}</span>
            <div className="mt-1 text-slate-300 normal-case">
              Gespielt: {question.noteNames.join(' · ')}
            </div>
            <button onClick={() => next()} className="cyber-btn mt-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              → Neue Hör-Frage
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value?: number; text?: string }> = ({ label, value, text }) => (
  <div className="cyber-card p-3 text-center">
    <div className="text-xl font-black text-white cyber-display">{value ?? text ?? '—'}</div>
    <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">{label}</div>
  </div>
);
