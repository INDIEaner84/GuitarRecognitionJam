/**
 * Note + timing matching for the Lick Trainer's gating logic.
 */
import {
  MatchSettings,
  RunResult,
  FeedbackKind,
  samePitch,
  samePitchStrict,
} from './licks';

export function matchPlayedEvent(
  detectedNotes: string[],
  expectedNotes: string[],
  expectedBeat: number,
  playedBeat: number,
  settings: MatchSettings,
): RunResult {
  const noteCorrect = expectedNotes.some((expected) =>
    detectedNotes.some((played) =>
      settings.octaveTolerance
        ? samePitch(played, expected)
        : samePitchStrict(played, expected),
    ),
  );

  const t = settings.perfectWindowMs / 1000;
  const grace = settings.graceWindowMs / 1000;
  const deltaBeats = playedBeat - expectedBeat;
  const deltaMs = deltaBeats * 1000;

  let timingCorrect = false;
  let feedback: FeedbackKind = 'missed';

  if (Math.abs(deltaMs) <= t) {
    timingCorrect = true;
    feedback = 'perfect';
  } else if (Math.abs(deltaMs) <= grace) {
    timingCorrect = false;
    if (settings.variable === 'timing' && !noteCorrect) {
      feedback = 'wrong-note';
    } else {
      feedback = settings.variable === 'timing' ? 'on-time-note-only' : deltaMs < 0 ? 'early' : 'late';
    }
  } else if (deltaMs < 0) {
    feedback = 'early';
  } else {
    feedback = 'late';
  }

  if (noteCorrect && timingCorrect) {
    feedback = 'perfect';
  } else if (noteCorrect && !timingCorrect) {
    feedback = settings.variable === 'timing' ? 'good' : feedback === 'early' ? 'early' : feedback === 'late' ? 'late' : 'on-time-note-only';
  } else if (!noteCorrect && timingCorrect) {
    // Im Timing-Modus zählt der Treffer — das Feedback muss dazu passen.
    feedback = settings.variable === 'timing' ? 'on-time-note-only' : 'wrong-note';
  }

  const passed =
    settings.variable === 'note'
      ? noteCorrect
      : settings.variable === 'timing'
        ? timingCorrect
        : noteCorrect && timingCorrect;

  return {
    noteCorrect,
    timingCorrect,
    passed,
    deltaMs,
    feedback,
    note: detectedNotes[0] ?? '-',
  };
}

export const describeGating = (variable: MatchSettings['variable']): string => {
  switch (variable) {
    case 'note':
      return 'Nur die richtige Note zählt (Timing wird ignoriert).';
    case 'timing':
      return 'Nur perfektes Timing zählt (die Note muss nicht stimmen).';
    default:
      return 'Nur die richtige Note UND perfektes Timing schalten weiter.';
  }
};
