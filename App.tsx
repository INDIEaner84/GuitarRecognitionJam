
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Visualizer } from './components/Visualizer';
import { SuggestionCard, Tablature, PlayRiffButton, PlayProgressionButton } from './components/SuggestionCard';
import { ScaleVisualizer, ModeVisualizer, FretboardMini } from './components/ScaleVisualizer';
import { SpeedTrainer } from './components/SpeedTrainer';
import { getNoteFromFrequency, identifyChord } from './constants';
import { analyzeMusicalContext } from './services/geminiService';
import { NoteData, ScaleAnalysis } from './types';

// Zero-allocation buffer for autocorrelation
const correlationBuffer = new Float32Array(2048);

/**
 * Optimized Autocorrelation with Parabolic Interpolation for higher accuracy
 * and zero allocations in the hot loop.
 */
const autoCorrelate = (buf: Float32Array, sampleRate: number): number => {
  const SIZE = buf.length;
  
  // Calculate Root Mean Square to detect silence
  let rms = 0;
  for (let i = 0; i < SIZE; i++) {
    rms += buf[i] * buf[i];
  }
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.005) return -1; // Extremely low threshold for higher sensitivity

  // Clear correlation buffer
  correlationBuffer.fill(0);

  // Compute Autocorrelation
  const maxOffset = SIZE / 2; 
  for (let offset = 0; offset < maxOffset; offset++) {
    let sum = 0;
    for (let i = 0; i < maxOffset; i++) {
      sum += buf[i] * buf[i + offset];
    }
    correlationBuffer[offset] = sum;
  }

  // Find the first dip (to avoid the zero-lag peak)
  let d = 0;
  while (correlationBuffer[d] > correlationBuffer[d + 1] && d < maxOffset) d++;
  
  // Find the highest peak after the first dip
  let maxval = -1;
  let maxpos = -1;
  for (let i = d; i < maxOffset; i++) {
    if (correlationBuffer[i] > maxval) {
      maxval = correlationBuffer[i];
      maxpos = i;
    }
  }

  if (maxpos === -1 || maxpos === 0) return -1;

  // Parabolic interpolation for sub-bin precision frequency detection
  let finalPos = maxpos;
  if (maxpos > 0 && maxpos < maxOffset - 1) {
    const x0 = correlationBuffer[maxpos - 1];
    const x1 = correlationBuffer[maxpos];
    const x2 = correlationBuffer[maxpos + 1];
    const a = (x0 + x2 - 2 * x1) / 2;
    const b = (x2 - x0) / 2;
    if (a !== 0) {
      finalPos = maxpos - b / (2 * a);
    }
  }

  return sampleRate / finalPos;
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'trainer'>('analysis');
  const [isListening, setIsListening] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [currentNote, setCurrentNote] = useState<NoteData | null>(null);
  const [detectedNotes, setDetectedNotes] = useState<Set<string>>(new Set());
  const [analysis, setAnalysis] = useState<ScaleAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLiveUpdating, setIsLiveUpdating] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeNoteName = currentNote?.note.replace(/\d+/, '');

  // Real-time chord identification
  const detectedChord = useMemo(() => {
    return identifyChord(Array.from(detectedNotes));
  }, [detectedNotes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  // Background AI updating logic
  useEffect(() => {
    if (!isListening || detectedNotes.size < 3) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      if (isAnalyzing || isLiveUpdating) return;
      setIsLiveUpdating(true);
      try {
        const result = await analyzeMusicalContext(Array.from(detectedNotes));
        setAnalysis(result);
      } catch (err) {
        console.error("Background analysis failed:", err);
      } finally {
        setIsLiveUpdating(false);
      }
    }, 4000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [detectedNotes, isListening]);

  const startListening = async () => {
    try {
      stopListening();

      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latency: 0
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const audioCtx = new AudioContextClass({ latencyHint: 'interactive' });
      audioContextRef.current = audioCtx;

      const analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserNode.smoothingTimeConstant = 0.1;
      
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyserNode);
      sourceRef.current = source;
      
      setAnalyser(analyserNode);
      setIsListening(true);
      detectPitch(analyserNode, audioCtx.sampleRate);
    } catch (err) {
      console.error("Failed to start listening:", err);
      alert("Microphone access is required to use this application.");
    }
  };

  const stopListening = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
    
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    setIsListening(false);
    setAnalyser(null);
    setCurrentNote(null);
  };

  const detectPitch = (node: AnalyserNode, sampleRate: number) => {
    const buffer = new Float32Array(node.fftSize);
    
    const update = () => {
      if (!node) return;
      
      node.getFloatTimeDomainData(buffer);
      const freq = autoCorrelate(buffer, sampleRate);
      
      if (freq !== -1 && freq > 20 && freq < 4000) {
        const { name, octave } = getNoteFromFrequency(freq);
        
        setCurrentNote(prev => {
          if (prev && prev.note === `${name}${octave}` && Math.abs(prev.frequency - freq) < 1) {
            return prev;
          }
          return { 
            note: `${name}${octave}`, 
            frequency: freq, 
            confidence: 0.9, 
            timestamp: Date.now() 
          };
        });
        
        setDetectedNotes(prev => {
          if (prev.has(name)) return prev;
          return new Set(prev).add(name);
        });
      }
      
      animationRef.current = requestAnimationFrame(update);
    };
    
    animationRef.current = requestAnimationFrame(update);
  };

  const runAnalysis = async () => {
    if (detectedNotes.size < 2) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeMusicalContext(Array.from(detectedNotes));
      setAnalysis(result);
    } catch (err) {
      console.error("Manual analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-slate-100 p-4 md:p-8 selection:bg-blue-500/30">
      <header className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-800 pb-6">
        <div className="group cursor-default text-center md:text-left">
          <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent tracking-tighter">
            HARMONIC SCOUT
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1 group-hover:text-blue-400 transition-colors">AI Musical Intelligence</p>
        </div>
        
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
           <button 
             onClick={() => setActiveTab('analysis')}
             className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'analysis' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Analysis
           </button>
           <button 
             onClick={() => setActiveTab('trainer')}
             className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeTab === 'trainer' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Speed Trainer
           </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => { setDetectedNotes(new Set()); setAnalysis(null); }} 
            className="px-4 py-2 text-xs font-bold border border-slate-800 rounded-md hover:bg-slate-900 transition-all uppercase tracking-widest text-slate-400"
          >
            Reset
          </button>
          {!isListening ? (
            <button 
              onClick={startListening} 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-md shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all flex items-center gap-2 uppercase tracking-widest"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Listen
            </button>
          ) : (
            <button 
              onClick={stopListening} 
              className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-md shadow-[0_0_20px_rgba(220,38,38,0.3)] transition-all uppercase tracking-widest flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Stop
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isListening ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} /> 
              {isListening ? 'Live Signal Active' : 'Signal Inactive'}
            </h2>
            <Visualizer analyser={analyser} />
            
            <div className="mt-8 grid grid-cols-1 gap-4">
              <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-slate-800/30 to-transparent rounded-2xl border border-slate-800/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                <span className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">Pitch</span>
                <span className={`text-6xl font-black tracking-tighter transition-all duration-300 ${currentNote ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]' : 'text-slate-800'}`}>
                  {activeNoteName || '--'}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-6 bg-gradient-to-b from-slate-800/30 to-transparent rounded-2xl border border-slate-800/50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                <span className="text-[10px] text-slate-500 uppercase font-black mb-1 tracking-widest">Harmonic Context</span>
                <span className={`text-4xl font-black tracking-tighter transition-all duration-300 ${detectedChord ? 'text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.2)]' : 'text-slate-800'}`}>
                  {detectedChord?.name || 'Searching...'}
                </span>
                {detectedChord && (
                  <div className="mt-3 flex gap-2">
                    {detectedChord.notes.map(n => (
                      <span key={n} className="text-[9px] font-bold bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/20">{n}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Real-time Fretboard Map</h3>
              <FretboardMini 
                detectedNotes={Array.from(detectedNotes)} 
                chordNotes={detectedChord?.notes || []}
                activeNote={activeNoteName}
              />
            </div>
            
            {activeTab === 'trainer' && (
              <div className="mt-8">
                <SpeedTrainer activeNote={activeNoteName} />
              </div>
            )}

            <div className="mt-8">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Frequency History</h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(detectedNotes).map(note => {
                  const isPartOfChord = detectedChord?.notes.includes(note);
                  return (
                    <span 
                      key={note} 
                      className={`px-3 py-1 text-xs font-black rounded border transition-all duration-300 
                        ${activeNoteName === note ? 'bg-white text-black border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10' : 
                          isPartOfChord ? 'bg-emerald-600/40 text-emerald-100 border-emerald-500/50' :
                          'bg-slate-800 text-slate-200 border-slate-700 hover:border-blue-500/50'}`}
                    >
                      {note}
                    </span>
                  );
                })}
              </div>
            </div>

            <button
              disabled={detectedNotes.size < 2 || isAnalyzing}
              onClick={runAnalysis}
              className="w-full mt-10 py-4 bg-white text-black disabled:bg-slate-800 disabled:text-slate-600 font-black rounded-xl shadow-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-95"
            >
              {isAnalyzing ? 'Processing...' : 'Analyze DNA'}
            </button>
            {isLiveUpdating && (
              <p className="mt-4 text-[10px] text-center text-blue-400 font-bold uppercase tracking-widest animate-pulse">
                Updating AI context in background...
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-8">
          {activeTab === 'analysis' ? (
            analysis ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                <div className="bg-gradient-to-br from-blue-900/20 to-slate-900/40 border border-blue-500/20 rounded-3xl p-10 relative overflow-hidden">
                  <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
                  <h2 className="text-blue-400 font-black uppercase tracking-[0.3em] text-[10px] mb-4">Detected Tonal Center</h2>
                  <div className="flex items-end gap-4">
                    <p className="text-7xl font-black text-white leading-none tracking-tighter">{analysis.detectedKey}</p>
                    <div className="mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">AI Certainty</span>
                      <div className="h-1.5 w-32 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                        <div className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" style={{ width: analysis.confidence }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SuggestionCard title="Scale Explorations">
                    {analysis.scales.map((s, i) => (
                      <ScaleVisualizer key={`scale-${i}`} scale={s} />
                    ))}
                    <FretboardMini 
                      scaleNotes={analysis.scales[0]?.notes || []} 
                      detectedNotes={Array.from(detectedNotes)}
                      chordNotes={detectedChord?.notes || []}
                      activeNote={activeNoteName}
                    />
                  </SuggestionCard>

                  <SuggestionCard title="Modal Structures">
                    <div className="space-y-6">
                      {analysis.modes.map((m, i) => (
                        <ModeVisualizer 
                          key={`mode-${i}`} 
                          mode={m} 
                          scaleNotes={analysis.scales[0]?.notes || []}
                          detectedNotes={Array.from(detectedNotes)}
                          activeNote={activeNoteName}
                        />
                      ))}
                    </div>
                  </SuggestionCard>

                  <SuggestionCard title="Harmonic Progressions">
                    <div className="grid grid-cols-1 gap-6">
                      {analysis.chordProgressions.map((cp, i) => {
                        const allProgressionNotes = Array.from(new Set(cp.playbackSequence.flatMap(step => step.notes)));
                        return (
                          <div key={`prog-${i}`} className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden group hover:border-emerald-500/30 transition-all shadow-lg">
                            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                              <span className="text-sm font-black text-emerald-400 uppercase tracking-widest">{cp.name}</span>
                              <PlayProgressionButton sequence={cp.playbackSequence} />
                            </div>
                            <div className="p-4 bg-black/20">
                               <Tablature code={cp.tablature} />
                               <div className="mt-4">
                                  <FretboardMini 
                                    chordNotes={allProgressionNotes}
                                    activeNote={activeNoteName}
                                  />
                               </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </SuggestionCard>

                  <SuggestionCard 
                    title="Riff DNA"
                    icon={isLiveUpdating && (
                      <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-[10px] text-blue-400 font-bold tracking-widest animate-pulse">SYNCING</span>
                      </div>
                    )}
                  >
                    {analysis.riffs.map((r, i) => (
                      <div key={`riff-${i}`} className="space-y-3 bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 relative overflow-hidden group/riff shadow-md">
                        <div className="flex justify-between items-center relative">
                          <h4 className="font-black text-xs text-white uppercase tracking-widest">{r.title}</h4>
                          <PlayRiffButton sequence={r.playbackSequence} />
                        </div>
                        <p className="text-[10px] text-slate-500 italic leading-snug relative">{r.context}</p>
                        <Tablature code={r.tablature} />
                      </div>
                    ))}
                  </SuggestionCard>
                </div>
              </div>
            ) : (
              <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-slate-950/50 border-2 border-dashed border-slate-900 rounded-[2rem] text-slate-500 p-12 text-center group">
                <div className="w-20 h-20 mb-8 rounded-full bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-blue-500/50 group-hover:bg-blue-500/5 transition-all duration-500">
                  <svg className="w-8 h-8 text-slate-700 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-black text-slate-300 tracking-tight uppercase">Waiting for input</h3>
                <p className="mt-4 text-xs font-bold text-slate-600 uppercase tracking-widest">Play some notes to begin the AI analysis</p>
              </div>
            )
          ) : (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="bg-gradient-to-br from-emerald-900/20 to-slate-900/40 border border-emerald-500/20 rounded-3xl p-10 relative overflow-hidden">
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
                <h2 className="text-emerald-400 font-black uppercase tracking-[0.3em] text-[10px] mb-4">Practice Mode</h2>
                <h3 className="text-4xl font-black text-white leading-none tracking-tighter mb-4">Master Your Rhythm</h3>
                <p className="text-slate-400 text-sm max-w-xl leading-relaxed">
                  The speed trainer helps you develop perfect timing. Choose a target note, set your tempo, and play along with the beat. 
                  Your BPM will increase automatically as you build a streak.
                </p>
              </div>
              
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">How it works</h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                       <span className="text-2xl font-black text-blue-500">01</span>
                       <h5 className="font-bold text-white text-sm">Pick a target</h5>
                       <p className="text-[11px] text-slate-500 leading-relaxed">Select the note you want to practice. The engine will listen specifically for this tone.</p>
                    </div>
                    <div className="space-y-2">
                       <span className="text-2xl font-black text-emerald-500">02</span>
                       <h5 className="font-bold text-white text-sm">Find the groove</h5>
                       <p className="text-[11px] text-slate-500 leading-relaxed">Play exactly on the metronome click. The visual feedback will tell you if you're early or late.</p>
                    </div>
                    <div className="space-y-2">
                       <span className="text-2xl font-black text-amber-500">03</span>
                       <h5 className="font-bold text-white text-sm">Progress</h5>
                       <p className="text-[11px] text-slate-500 leading-relaxed">Build a streak! Reaching your target count increases the BPM automatically.</p>
                    </div>
                 </div>
              </div>
              
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8">
                 <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Visual Rhythm Guide</h4>
                 <div className="h-24 w-full bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-around px-10">
                    {[1, 2, 3, 4].map(b => (
                      <div key={b} className="flex flex-col items-center gap-3">
                        <div className="w-4 h-4 rounded-full bg-slate-800 border-2 border-slate-700" />
                        <span className="text-[10px] font-mono text-slate-600">Beat {b}</span>
                      </div>
                    ))}
                 </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
