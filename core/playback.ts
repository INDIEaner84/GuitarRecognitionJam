/**
 * Lick playback using Tone.js.
 *
 * The scheduler only emits timing callbacks; it does not know about the Lick
 * Trainer UI, so it can be reused by any module that wants to hear a lick.
 */
import * as Tone from 'tone';
import { Lick, LickEvent, sortedEvents } from './licks';

export interface PlaybackCallbacks {
  onEventStart?: (event: LickEvent) => void;
  onEventEnd?: (event: LickEvent) => void;
  onComplete?: () => void;
  onTick?: (beat: number, totalBeats: number) => void;
}

export class LickPlayer {
  private synth: Tone.PolySynth | null = null;
  private isPlaying = false;
  private completed = false;

  async startSound() {
    await Tone.start();
    if (!this.synth) {
      this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
      this.synth.set({
        volume: -6,
        envelope: {
          attack: 0.005,
          decay: 0.1,
          sustain: 0.35,
          release: 0.6,
        },
      });
    }
  }

  async play(lick: Lick, bpm: number, callbacks: PlaybackCallbacks = {}) {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.completed = false;

    await this.startSound();
    const events = sortedEvents(lick);
    const totalBeats = Math.max(
      4,
      events.reduce((max, e) => Math.max(max, e.beat + e.durationBeats), 4),
    );

    const transport = Tone.getTransport();
    transport.stop();
    transport.cancel();
    transport.bpm.value = bpm;

    const beatSeconds = 60 / bpm;

    for (const event of events) {
      const at = event.beat * beatSeconds;
      const dur = Math.max(event.durationBeats, 0.05) * beatSeconds;
      const notes = event.notes.length ? event.notes : ['E3'];

      this.synth?.triggerAttackRelease(notes, dur, at);
      transport.scheduleOnce(() => callbacks.onEventStart?.(event), at);
      transport.scheduleOnce(
        () => callbacks.onEventEnd?.(event),
        event.beat * beatSeconds + dur,
      );
    }

    transport.scheduleOnce(() => {
      this.isPlaying = false;
      this.completed = true;
      callbacks.onComplete?.();
    }, totalBeats * beatSeconds);

    transport.start('+0.1');
  }

  async stop() {
    this.isPlaying = false;
    this.completed = false;
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    this.synth?.releaseAll();
  }

  get playing() {
    return this.isPlaying;
  }

  get finished() {
    return this.completed;
  }

  dispose() {
    this.stop();
    this.synth?.dispose();
    this.synth = null;
  }
}
