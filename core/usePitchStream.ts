/**
 * Hook that streams pitch samples from the microphone, reusing the same
 * autocorrelation used everywhere else in the app.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { PitchSample, samplePitch } from './audio';

export interface PitchStreamState {
  isListening: boolean;
  sample: PitchSample | null;
  samples: PitchSample[];
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  clear: () => void;
}

const MAX_SAMPLES = 400;

export const usePitchStream = (): PitchStreamState => {
  const [isListening, setIsListening] = useState(false);
  const [sample, setSample] = useState<PitchSample | null>(null);
  const [samples, setSamples] = useState<PitchSample[]>([]);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number>(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(animationRef.current);
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => undefined);
      ctxRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    setError(null);

    try {
      const constraints = {
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass({ latencyHint: 'interactive' });
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.1;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      setIsListening(true);

      const buffer = new Float32Array(analyser.fftSize);
      const update = () => {
        analyser.getFloatTimeDomainData(buffer);
        const next = samplePitch(buffer, ctx.sampleRate);
        if (next) {
          setSample(next);
          setSamples((prev) => {
            const nextSamples = [...prev, next];
            return nextSamples.length > MAX_SAMPLES
              ? nextSamples.slice(nextSamples.length - MAX_SAMPLES)
              : nextSamples;
          });
        }
        animationRef.current = requestAnimationFrame(update);
      };

      animationRef.current = requestAnimationFrame(update);
    } catch (err) {
      setError(
        `Mikrofon nicht verfügbar. Bitte Audio-Zugriff erlauben. (${(err as Error).message ?? err})`,
      );
      setIsListening(false);
    }
  }, [stop]);

  const clear = useCallback(() => {
    setSample(null);
    setSamples([]);
  }, []);

  useEffect(() => stop, [stop]);

  return { isListening, sample, samples, error, start, stop, clear };
};
