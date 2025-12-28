
import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import { FretboardMini } from './ScaleVisualizer';

interface SpeedTrainerProps {
  activeNote: string | undefined;
}

type ComplexityMode = 'simple' | 'balanced' | 'complex';

const COMPLEXITY_CONFIG = {
  simple: { min: 2, max: 4, label: 'Simple' },
  balanced: { min: 3, max: 6, label: 'Balanced' },
  complex: { min: 4, max: 10, label: 'Complex' }
};

export const SpeedTrainer: React.FC<SpeedTrainerProps> = ({ activeNote }) => {
  const [isActive, setIsActive] = useState(false);
  const [isMetronomeAudioEnabled, setIsMetronomeAudioEnabled] = useState(false);
  const [trainingState, setTrainingState] = useState<'idle' | 'learning' | 'locked' | 'training'>('idle');
  const [complexity, setComplexity] = useState<ComplexityMode>('balanced');
  
  // Learning Logic
  const [noteHistory, setNoteHistory] = useState<string[]>([]);
  const [learnedPattern, setLearnedPattern] = useState<string[]>([]);
  const [patternMatches, setPatternMatches] = useState(0);
  
  // Trainer Config
  const [startBpm, setStartBpm] = useState(80);
  const [bpm, setBpm] = useState(80);
  const [targetBpm, setTargetBpm] = useState(140);
  const [increment, setIncrement] = useState(5);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [lastBeatTime, setLastBeatTime] = useState(0);
  
  // Feedback System
  const [feedback, setFeedback] = useState<{ 
    msg: string; 
    color: string; 
    offset?: number; 
    hitType: 'perfect' | 'good' | 'fair' | 'miss' | 'none';
    timestamp: number;
  } | null>(null);

  const loopRef = useRef<Tone.Loop | null>(null);
  const synthRef = useRef<Tone.MembraneSynth | null>(null);
  const streakRef = useRef(0);
  const hasPlayedOnThisBeatRef = useRef(false);
  const currentPatternProgressRef = useRef<number>(0);

  // Sync refs
  useEffect(() => {
    streakRef.current = streak;
  }, [streak]);

  const stopAllAudio = () => {
    Tone.Transport.stop();
    if (loopRef.current) {
      loopRef.current.stop();
      loopRef.current = null;
    }
    setCurrentBeat(0);
    setIsActive(false);
    setIsMetronomeAudioEnabled(false);
    setTrainingState('idle');
    setLearnedPattern([]);
    setPatternMatches(0);
    setNoteHistory([]);
    setFeedback(null);
  };

  const ensureAudioInit = async () => {
    if (Tone.Transport.state !== "started") {
      await Tone.start();
      if (!synthRef.current) {
        synthRef.current = new Tone.MembraneSynth({
          pitchDecay: 0.05,
          octaves: 2,
          oscillator: { type: "sine" }
        }).toDestination();
      }
      
      if (!loopRef.current) {
        loopRef.current = new Tone.Loop((time) => {
          Tone.Draw.schedule(() => {
            setCurrentBeat(prev => (prev + 1) % 4);
            setLastBeatTime(Date.now());
            
            // In training mode, check if they missed a window
            if (trainingState === 'training' && !hasPlayedOnThisBeatRef.current && streakRef.current > 0) {
              setStreak(0);
              setFeedback({ 
                msg: "Missed Beat!", 
                color: "text-red-500", 
                offset: 0, 
                hitType: 'miss',
                timestamp: Date.now() 
              });
            }
            hasPlayedOnThisBeatRef.current = false;
          }, time);
        }, "4n").start(0);
      }
      
      Tone.Transport.bpm.value = bpm;
      Tone.Transport.start();
    }
  };

  useEffect(() => {
    if (isMetronomeAudioEnabled && lastBeatTime > 0) {
      const frequency = currentBeat === 0 ? "C3" : "C2";
      synthRef.current?.triggerAttackRelease(frequency, "16n");
    }
  }, [currentBeat, lastBeatTime, isMetronomeAudioEnabled]);

  // Main Listening Logic
  useEffect(() => {
    if (trainingState === 'idle' || !activeNote) return;

    // LEARNING PHASE
    if (trainingState === 'learning') {
      const config = COMPLEXITY_CONFIG[complexity];
      setNoteHistory(prev => {
        const next = [...prev, activeNote].slice(-20); // Longer history for complex patterns
        for (let len = config.min; len <= config.max; len++) {
          if (next.length < len * 2) continue;
          const currentSeq = next.slice(-len);
          const prevSeq = next.slice(-len * 2, -len);
          if (JSON.stringify(currentSeq) === JSON.stringify(prevSeq)) {
            setLearnedPattern(currentSeq);
            setPatternMatches(1);
            setTrainingState('locked');
            setFeedback({ 
              msg: `${len}-Note Lick Found! Confirm 5 times.`, 
              color: "text-blue-400", 
              hitType: 'good',
              timestamp: Date.now() 
            });
            return [];
          }
        }
        return next;
      });
    }

    // LOCKED PHASE
    else if (trainingState === 'locked') {
      const expectedNote = learnedPattern[currentPatternProgressRef.current];
      if (activeNote === expectedNote) {
        currentPatternProgressRef.current++;
      } else if (currentPatternProgressRef.current + 1 < learnedPattern.length && activeNote === learnedPattern[currentPatternProgressRef.current + 1]) {
        currentPatternProgressRef.current += 2;
      } else {
        return;
      }

      if (currentPatternProgressRef.current >= learnedPattern.length) {
        currentPatternProgressRef.current = 0;
        setPatternMatches(prev => {
          const next = prev + 1;
          if (next >= 5) {
             setTrainingState('training');
             setIsMetronomeAudioEnabled(true);
             ensureAudioInit();
             setFeedback({ 
               msg: "READY... GO!", 
               color: "text-emerald-400", 
               hitType: 'perfect',
               timestamp: Date.now() 
             });
          }
          return next;
        });
      }
    }

    // TRAINING PHASE
    else if (trainingState === 'training') {
      const now = Date.now();
      const currentBpm = Tone.Transport.bpm.value;
      const period = 60000 / currentBpm;
      const timeSinceLastBeat = now - lastBeatTime;
      const tolerance = period * 0.4;
      
      let diff = timeSinceLastBeat;
      if (timeSinceLastBeat > period / 2) {
        diff = timeSinceLastBeat - period; 
      }
      
      const normalizedOffset = diff / (period / 2);
      const isValidTime = Math.abs(diff) < tolerance;
      const expectedNote = learnedPattern[currentPatternProgressRef.current];

      if (activeNote === expectedNote && isValidTime && !hasPlayedOnThisBeatRef.current) {
        hasPlayedOnThisBeatRef.current = true;
        currentPatternProgressRef.current++;
        
        let msg = "Perfect!";
        let color = "text-emerald-400";
        let hitType: 'perfect' | 'good' | 'fair' | 'miss' = 'perfect';
        const absDiff = Math.abs(diff);

        if (absDiff > period * 0.15) {
          msg = diff > 0 ? "Late" : "Early";
          color = "text-amber-500";
          hitType = 'fair';
        } else if (absDiff > period * 0.05) {
          msg = diff > 0 ? "Slightly Late" : "Slightly Early";
          color = "text-blue-400";
          hitType = 'good';
        }

        if (currentPatternProgressRef.current === 0) {
          setStreak(prev => {
            const next = prev + 1;
            if (next > bestStreak) setBestStreak(next);
            if (next % 3 === 0) {
              setBpm(curr => Math.min(curr + increment, targetBpm));
              setFeedback({ 
                msg: `LEVEL UP!`, 
                color: "text-emerald-400", 
                offset: normalizedOffset, 
                hitType: 'perfect',
                timestamp: Date.now() 
              });
            } else {
              setFeedback({ 
                msg, 
                color, 
                offset: normalizedOffset, 
                hitType,
                timestamp: Date.now() 
              });
            }
            return next;
          });
        } else {
          setFeedback({ 
            msg, 
            color, 
            offset: normalizedOffset, 
            hitType,
            timestamp: Date.now() 
          });
        }
      }
    }
  }, [activeNote, trainingState, lastBeatTime, complexity]);

  const startLearning = () => {
    setTrainingState('learning');
    setIsActive(true);
    setLearnedPattern([]);
    setPatternMatches(0);
    setStreak(0);
    setBpm(startBpm);
  };

  const getGlowColor = () => {
    if (!feedback) return 'transparent';
    if (feedback.hitType === 'perfect') return 'rgba(52, 211, 153, 0.15)';
    if (feedback.hitType === 'good') return 'rgba(96, 165, 250, 0.15)';
    if (feedback.hitType === 'fair') return 'rgba(245, 158, 11, 0.15)';
    if (feedback.hitType === 'miss') return 'rgba(239, 68, 68, 0.15)';
    return 'transparent';
  };

  return (
    <div 
      className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-xl transition-all duration-300"
      style={{ boxShadow: `inset 0 0 40px ${getGlowColor()}` }}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
          <h2 className="text-sm font-black text-blue-400 uppercase tracking-[0.2em]">Adaptive Lick Trainer</h2>
          <span className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Dynamic Rhythmic Analysis</span>
        </div>
        <div className="flex gap-2">
           <button 
            onClick={() => setIsMetronomeAudioEnabled(!isMetronomeAudioEnabled)}
            className={`p-2 rounded-lg border transition-all ${isMetronomeAudioEnabled ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </svg>
          </button>
          <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${trainingState !== 'idle' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${trainingState !== 'idle' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
            {trainingState.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Pattern Complexity Setting */}
      <div className="mb-6 flex items-center gap-3">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">Detection Mode</span>
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-1">
          {(Object.keys(COMPLEXITY_CONFIG) as ComplexityMode[]).map((mode) => (
            <button
              key={mode}
              disabled={trainingState !== 'idle'}
              onClick={() => setComplexity(mode)}
              className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all ${
                complexity === mode 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-600 hover:text-slate-400 disabled:opacity-50'
              }`}
            >
              {COMPLEXITY_CONFIG[mode].label}
            </button>
          ))}
        </div>
      </div>

      {/* Timing Meter UI */}
      <div className="mb-6 h-14 bg-slate-950 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-y-0 left-[48%] right-[48%] bg-emerald-500/10 z-0" />
        <div className="absolute inset-y-0 left-[35%] right-[35%] bg-blue-500/5 z-0 border-x border-slate-800/50" />
        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-slate-800 z-0" />
        
        {trainingState === 'training' && feedback?.offset !== undefined && (
          <div 
            key={feedback.timestamp}
            className={`absolute w-1 h-8 rounded-full shadow-[0_0_15px_currentColor] animate-in fade-in zoom-in duration-200 z-20 ${feedback.color.replace('text-', 'bg-')}`}
            style={{ 
              left: `${50 + (feedback.offset * 40)}%`,
            }}
          />
        )}
        
        {trainingState === 'training' && feedback?.offset !== undefined && (
           <div 
             className={`absolute w-1 h-4 rounded-full opacity-20 z-10 blur-[1px] transition-all duration-700 ${feedback.color.replace('text-', 'bg-')}`}
             style={{ left: `${50 + (feedback.offset * 40)}%` }}
           />
        )}
        
        <div className="absolute bottom-1.5 left-3 text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">Early</div>
        <div className="absolute bottom-1.5 right-3 text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">Late</div>
        
        {trainingState === 'idle' && (
          <span className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em] z-10">Waiting for detection</span>
        )}
      </div>

      {/* State Specific UI */}
      <div className="mb-6">
        {trainingState === 'learning' && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-center animate-pulse">
            <span className="text-[10px] font-black text-blue-300/80 uppercase tracking-widest">
              Lick Detection Active... (Complexity: {complexity})
            </span>
            <div className="flex gap-2 justify-center mt-3 h-6">
              {noteHistory.map((n, i) => (
                <span key={i} className="text-xs font-black text-white bg-blue-600/40 px-2 py-0.5 rounded border border-blue-500/30">{n}</span>
              ))}
            </div>
          </div>
        )}

        {learnedPattern.length > 0 && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
             <div 
               className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${feedback ? 'opacity-10' : 'opacity-0'} ${feedback?.color.replace('text-', 'bg-')}`}
             />
             
             <div className="flex justify-between items-center mb-4 relative z-10">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Sequence ({learnedPattern.length} Notes)</span>
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                  {trainingState === 'training' ? `Full Loops: ${streak}` : `Verification: ${patternMatches}/5`}
                </span>
             </div>
             <div className="flex gap-2.5 flex-wrap mb-5 relative z-10">
                {learnedPattern.map((note, idx) => {
                  const isCurrent = currentPatternProgressRef.current === idx;
                  const isLastHit = currentPatternProgressRef.current === (idx + 1) % learnedPattern.length || (currentPatternProgressRef.current === 0 && idx === learnedPattern.length - 1);
                  
                  return (
                    <div 
                      key={idx} 
                      className={`w-9 h-9 flex items-center justify-center rounded-xl border font-black text-xs transition-all duration-150 relative
                        ${isCurrent 
                          ? 'bg-white text-black border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.3)] z-20' 
                          : 'bg-slate-900 text-slate-500 border-slate-800 opacity-60'}`}
                    >
                      {note}
                      {isLastHit && feedback && feedback.hitType !== 'none' && (
                        <div className={`absolute inset-0 rounded-xl animate-ping border-2 opacity-0 ${feedback.color.replace('text-', 'border-')}`} style={{ animationIterationCount: 1 }} />
                      )}
                    </div>
                  );
                })}
             </div>
             <FretboardMini chordNotes={learnedPattern} activeNote={activeNote} />
          </div>
        )}
      </div>

      {/* Metronome Beat Strip */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((beat) => (
          <div 
            key={beat} 
            className={`h-2 rounded-full transition-all duration-150 ${
              trainingState === 'training' && currentBeat === beat 
                ? (beat === 0 ? 'bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.7)] scale-y-125' : 'bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.7)] scale-y-110') 
                : 'bg-slate-800'
            }`} 
          />
        ))}
      </div>

      <div className="flex flex-col items-center py-7 bg-gradient-to-b from-slate-800/30 to-transparent rounded-3xl border border-white/5 mb-6 relative overflow-hidden">
        <div className={`absolute -top-10 w-24 h-24 blur-[50px] transition-colors duration-500 ${feedback?.color.replace('text-', 'bg-') || 'bg-blue-500/10'}`} />
        
        <div className="flex items-end gap-2 mb-2 relative z-10">
          <span className="text-6xl font-black text-white tracking-tighter">{bpm}</span>
          <span className="text-slate-500 font-bold mb-2 uppercase text-[10px] tracking-[0.2em]">BPM</span>
        </div>
        <div className="h-6 flex items-center relative z-10">
          {feedback && (
            <span 
              key={feedback.timestamp}
              className={`text-[10px] font-black uppercase tracking-[0.3em] animate-in fade-in slide-in-from-top-2 duration-300 ${feedback.color} drop-shadow-[0_0_10px_currentColor]`}
            >
              {feedback.msg}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-6">
        <button 
          onClick={trainingState === 'idle' ? startLearning : stopAllAudio}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.4em] text-[10px] transition-all shadow-xl active:scale-95 ${
            trainingState !== 'idle'
              ? 'bg-red-600/20 text-red-500 border border-red-600/30 hover:bg-red-600/30' 
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-500/20'
          }`}
        >
          {trainingState === 'idle' ? 'START ADAPTIVE TRAINING' : 'RESET SESSION'}
        </button>
      </div>

      <div className="mt-6 space-y-4 px-2">
        <div className="flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest">
          <span>Base Tempo: <span className="text-blue-400">{startBpm}</span></span>
          <span>Target Speed: <span className="text-slate-400">{targetBpm}</span></span>
        </div>
        <div className="flex gap-6">
          <div className="flex-1 flex flex-col gap-2">
            <input 
              type="range" min="40" max="240" value={startBpm} 
              disabled={trainingState !== 'idle'}
              onChange={(e) => setStartBpm(Number(e.target.value))}
              className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <input 
              type="range" min="40" max="240" value={targetBpm} 
              disabled={trainingState !== 'idle'}
              onChange={(e) => setTargetBpm(Number(e.target.value))}
              className="w-full accent-slate-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
        <div className="flex justify-between text-[9px] font-bold text-slate-700 uppercase tracking-widest pt-2 border-t border-slate-800/50">
          <span>BPM STEP: +{increment} every 3 loops</span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
            Active Precision Engine
          </span>
        </div>
      </div>
    </div>
  );
};
