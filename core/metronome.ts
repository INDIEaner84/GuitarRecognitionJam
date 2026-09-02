/**
 * Simple Tone.js metronome used by the Rhythm Jam and the coach challenge.
 *
 * It resets the shared Tone.Transport, so it should only be running from one
 * module at a time.
 */
import * as Tone from 'tone';

export interface MetronomeBeatInfo {
  index: number;
  bar: number;
  beatInBar: number;
  isDownbeat: boolean;
  atMs: number;
  bpm: number;
}

export interface MetronomeCallbacks {
  onBeat: (info: MetronomeBeatInfo) => void;
}

export class Metronome {
  private synth: Tone.MembraneSynth | null = null;
  private running = false;
  private bpm = 80;
  private beatsPerBar = 4;
  private beatIndex = 0;
  private callbacks: MetronomeCallbacks | null = null;

  async start(
    bpm: number,
    beatsPerBar: number,
    callbacks: MetronomeCallbacks,
  ) {
    if (this.running) return;
    await Tone.start();
    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.callbacks = callbacks;
    this.beatIndex = 0;
    this.running = true;

    if (!this.synth) {
      this.synth = new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: 2,
        oscillator: { type: 'sine' },
      }).toDestination();
      this.synth.volume.value = -10;
    }

    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.bpm.value = this.bpm;

    const interval = '4n';
    transport.scheduleRepeat((time) => {
      const isDownbeat = this.beatIndex % this.beatsPerBar === 0;
      this.synth?.triggerAttackRelease(isDownbeat ? 'C3' : 'G2', '32n', time);
      Tone.Draw.schedule(() => {
        const info: MetronomeBeatInfo = {
          index: this.beatIndex,
          bar: Math.floor(this.beatIndex / this.beatsPerBar),
          beatInBar: this.beatIndex % this.beatsPerBar,
          isDownbeat,
          atMs: performance.now(),
          bpm: this.bpm,
        };
        this.callbacks?.onBeat(info);
        this.beatIndex++;
      }, time);
    }, interval);

    transport.start();
  }

  setBpm(bpm: number) {
    this.bpm = bpm;
    if (this.running) {
      Tone.getTransport().bpm.rampTo(bpm, 0.5);
    }
  }

  get isRunning() {
    return this.running;
  }

  stop() {
    this.running = false;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
  }

  dispose() {
    this.stop();
    this.synth?.dispose();
    this.synth = null;
  }
}
