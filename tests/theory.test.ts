import { describe, expect, it } from 'vitest';
import {
  PITCH_CLASSES,
  buildScaleRun,
  detectBestScale,
  noteClasses,
  pitchClassName,
  pitchIndexOf,
  scaleNames,
  suggestScalesForNotes,
} from '../core/theory';

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

describe('pitchIndexOf', () => {
  it('mappt Kreuz- und B-Töne', () => {
    expect(pitchIndexOf('C')).toBe(0);
    expect(pitchIndexOf('C#')).toBe(1);
    expect(pitchIndexOf('Bb')).toBe(10);
    expect(pitchIndexOf('A#')).toBe(10);
  });

  it('ignoriert Oktavzahlen', () => {
    expect(pitchIndexOf('E3')).toBe(4);
    expect(pitchIndexOf('G4')).toBe(7);
  });

  it('gibt -1 für Unsinn zurück', () => {
    expect(pitchIndexOf('H')).toBe(-1);
    expect(pitchIndexOf('')).toBe(-1);
  });
});

describe('scaleNames', () => {
  it('liefert C-Dur', () => {
    expect(scaleNames(0, MAJOR)).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B']);
  });

  it('liefert A-Moll-Pentatonik', () => {
    expect(scaleNames(9, MINOR_PENTATONIC)).toEqual(['A', 'C', 'D', 'E', 'G']);
  });

  it('bleibt innerhalb der 12 Pitch-Classes', () => {
    for (const name of scaleNames(11, MAJOR)) {
      expect(PITCH_CLASSES).toContain(name);
    }
  });
});

describe('noteClasses', () => {
  it('entfernt Duplikate und Oktaven', () => {
    expect(noteClasses(['C4', 'C2', 'E3'])).toEqual([0, 4]);
  });
});

describe('detectBestScale', () => {
  it('findet C-Dur für C-E-G', () => {
    const best = detectBestScale(['C', 'E', 'G']);
    expect(best?.key).toBe('C');
    expect(best?.scale.id).toBe('major');
  });

  it('findet eine pentatonische Tonart für A-C-D-E-G', () => {
    // A-Moll-Pentatonik und C-Dur-Pentatonik passen gleich gut (relative
    // Tonarten) — bei Gleichstand gewinnt der tiefste Root.
    const best = detectBestScale(['A', 'C', 'D', 'E', 'G']);
    expect(['A', 'C']).toContain(best?.key);
    expect(best?.score).toBeGreaterThan(0);
  });

  it('gibt null ohne Input', () => {
    expect(detectBestScale([])).toBeNull();
  });
});

describe('suggestScalesForNotes', () => {
  it('liefert maximal fünf Vorschläge, sortiert nach Score', () => {
    const suggestions = suggestScalesForNotes(['E', 'G', 'A', 'B', 'D']);
    expect(suggestions.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < suggestions.length; i++) {
      expect(suggestions[i - 1].score).toBeGreaterThanOrEqual(suggestions[i].score);
    }
  });
});

describe('buildScaleRun', () => {
  it('läuft aufwärts durch die Skala', () => {
    expect(buildScaleRun(0, MAJOR, true, 7)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('läuft abwärts und bricht um', () => {
    const run = buildScaleRun(0, MINOR_PENTATONIC, false, 6);
    expect(run).toEqual([10, 7, 5, 3, 0, 10]);
  });
});

describe('pitchClassName', () => {
  it('normalisiert negative und überlaufende Werte', () => {
    expect(pitchClassName(-1)).toBe('B');
    expect(pitchClassName(12)).toBe('C');
  });
});
