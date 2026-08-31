import React, { useCallback, useState } from 'react';
import { Question, buildTheoryQuestion } from '../core/quiz';
import { useProgress } from '../core/useProgress';
import { playFeedback } from '../core/feedbackSound';

interface TheoryQuizProps {
  onBack: () => void;
}

export const TheoryQuiz: React.FC<TheoryQuizProps> = ({ onBack }) => {
  const { grant } = useProgress();
  const [question, setQuestion] = useState<Question>(() => buildTheoryQuestion());
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [lastCorrect, setLastCorrect] = useState(false);

  const next = useCallback(() => {
    setQuestion(buildTheoryQuestion());
    setSelected(null);
  }, []);

  const answer = (option: string) => {
    if (selected) return;
    setSelected(option);
    setAnswered((a) => a + 1);
    const ok = option === question.correct;
    setLastCorrect(ok);
    if (ok) {
      setScore((s) => s + 10);
      setStreak((s) => s + 1);
      grant(10, 'theory-quiz');
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
        <h2 data-text="THEORY-QUIZ" className="glitch cyber-display text-lg font-black uppercase tracking-wider text-white drop-shadow-[0_0_14px_rgba(157,0,255,0.5)]">
          THEORIE-QUIZ
        </h2>
        <span className="akira-kanji ml-auto text-sm hidden md:block">理論</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Punkte" value={score} />
        <Stat label="Level" value={1 + Math.floor(score / 100)} />
        <Stat label="Streak" value={streak} />
        <Stat label="Beantwortet" value={answered} />
      </div>

      <div className="cyber-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="cyber-mono text-[9px] uppercase tracking-widest neon-purple">{question.category}</span>
          <span className="px-2 py-0.5 rounded border border-purple-500/30 text-purple-200 text-[8px] font-black uppercase">FRAGE</span>
        </div>
        <h3 className="text-xl font-black text-white cyber-display">{question.prompt}</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-6">
          {question.options.map((opt) => {
            const isPick = selected === opt;
            const isCorrect = opt === question.correct;
            const wrongPick = isPick && !isCorrect;
            return (
              <button
                key={opt}
                onClick={() => answer(opt)}
                className={`cyber-btn text-left px-5 py-4 rounded-lg text-sm font-black uppercase tracking-wide transition-all ${
                  isCorrect && (selected || lastCorrect)
                    ? 'cyber-btn-green'
                    : wrongPick
                      ? 'cyber-btn-magenta'
                      : ''
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {selected && (
          <div className={`mt-5 p-4 rounded-lg border cyber-mono text-[11px] ${lastCorrect ? 'border-green-400/40 text-green-200' : 'border-fuchsia-500/40 text-fuchsia-200'}`}>
            <span className="font-black uppercase">{lastCorrect ? '✔ Richtig!' : `✘ Richtig wäre: ${question.correct}`}</span>
            <div className="mt-1 text-slate-300 normal-case">{question.explanation}</div>
            <button onClick={next} className="cyber-btn mt-4 px-4 py-2 text-[10px] font-black uppercase tracking-widest">
              → Nächste Frage
            </button>
          </div>
        )}
      </div>

      <p className="cyber-mono text-[10px] text-slate-500 text-center">
        Intervall-, Skalen- und Akkord-Fragen. Jede richtige Antwort = +10 XP.
      </p>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="cyber-card p-3 text-center">
    <div className="text-xl font-black text-white cyber-display">{value}</div>
    <div className="cyber-mono text-[8px] uppercase tracking-widest text-slate-500">{label}</div>
  </div>
);
