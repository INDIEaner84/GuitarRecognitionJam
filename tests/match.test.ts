import { describe, expect, it } from 'vitest';
import { describeGating, matchPlayedEvent } from '../core/match';
import { MatchSettings } from '../core/licks';

const SETTINGS: MatchSettings = {
  variable: 'both',
  octaveTolerance: true,
  perfectWindowMs: 45,
  graceWindowMs: 110,
};

describe('matchPlayedEvent — Gating "both"', () => {
  it('richtige Note + perfektes Timing = perfect', () => {
    const result = matchPlayedEvent(['E3'], ['E3'], 1, 1, SETTINGS);
    expect(result.passed).toBe(true);
    expect(result.feedback).toBe('perfect');
  });

  it('falsche Note = wrong-note', () => {
    const result = matchPlayedEvent(['F3'], ['E3'], 1, 1, SETTINGS);
    expect(result.passed).toBe(false);
    expect(result.feedback).toBe('wrong-note');
  });

  it('zu früh (innerhalb der Grace-Zeit) = early', () => {
    const result = matchPlayedEvent(['E3'], ['E3'], 1, 0.95, SETTINGS);
    expect(result.deltaMs).toBeCloseTo(-50, 5);
    expect(result.feedback).toBe('early');
    expect(result.passed).toBe(false);
  });

  it('zu spät (außerhalb der Grace-Zeit) = late', () => {
    const result = matchPlayedEvent(['E3'], ['E3'], 1, 1.4, SETTINGS);
    expect(result.feedback).toBe('late');
  });

  it('akzeptiert Oktaven bei aktivierter Oktavtoleranz', () => {
    const withOctave = matchPlayedEvent(['E2'], ['E3'], 1, 1, SETTINGS);
    const withoutOctave = matchPlayedEvent(
      ['E2'],
      ['E3'],
      1,
      1,
      { ...SETTINGS, octaveTolerance: false },
    );
    expect(withOctave.noteCorrect).toBe(true);
    expect(withoutOctave.noteCorrect).toBe(false);
  });
});

describe('matchPlayedEvent — Gating-Modi', () => {
  it('Modus "note": Timing ist egal', () => {
    const result = matchPlayedEvent(['E3'], ['E3'], 1, 1.8, { ...SETTINGS, variable: 'note' });
    expect(result.passed).toBe(true);
  });

  it('Modus "timing": falsche Note bei perfektem Timing zählt trotzdem', () => {
    const result = matchPlayedEvent(['F3'], ['E3'], 1, 1, { ...SETTINGS, variable: 'timing' });
    expect(result.passed).toBe(true);
    expect(result.feedback).toBe('on-time-note-only');
  });

  it('Modus "timing": Nothing played = missed', () => {
    const result = matchPlayedEvent(['E3'], ['E3'], 1, 3, { ...SETTINGS, variable: 'timing' });
    expect(result.passed).toBe(false);
  });
});

describe('describeGating', () => {
  it('beschreibt alle drei Modi', () => {
    expect(describeGating('note')).toMatch(/richtige Note/);
    expect(describeGating('timing')).toMatch(/Timing/);
    expect(describeGating('both')).toMatch(/UND/);
  });
});
