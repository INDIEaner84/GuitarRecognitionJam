import { describe, expect, it } from 'vitest';
import { allPositionsForPitch, buildChordShape, stringName } from '../core/chordShapes';
import { CHORD_DEFS, ChordQualityId } from '../core/harmony';
import { pitchIndexOf } from '../core/theory';

const build = (root: string, quality: ChordQualityId) =>
  buildChordShape(pitchIndexOf(root), CHORD_DEFS[quality]);

describe('buildChordShape — kuratierte Griffe', () => {
  it('nutzt den Standard-C-Dur-Griff', () => {
    const shape = build('C', 'maj');
    expect(shape?.curated).toBe(true);
    expect(shape?.label).toBe('C');
    expect(shape?.mutedStrings).toContain(0); // tiefe E-Saite stumm
  });

  it('nutzt den offenen E-Moll-Griff', () => {
    const shape = build('E', 'min');
    expect(shape?.curated).toBe(true);
    expect(shape?.minFret).toBe(0);
  });

  it('markiert Grundton, Terz und Quinte', () => {
    const shape = build('G', 'maj');
    const roles = shape?.positions.map((p) => p.role) ?? [];
    expect(roles).toContain('root');
    expect(roles).toContain('third');
    expect(roles).toContain('fifth');
  });
});

describe('buildChordShape — generierte Griffe', () => {
  it('findet für jede Tonart und Qualität einen Griff', () => {
    const roots = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const qualities: ChordQualityId[] = ['maj', 'min', 'maj7', 'min7', 'dom7', 'sus4', 'dim'];
    for (const root of roots) {
      for (const quality of qualities) {
        expect(build(root, quality), `${root} ${quality}`).not.toBeNull();
      }
    }
  });

  it('bevorzugt tiefe Lagen (max. Bund 12, kompakt)', () => {
    const shape = build('F#', 'min7');
    expect(shape).not.toBeNull();
    expect(shape?.maxFret).toBeLessThanOrEqual(12);
    expect(shape!.maxFret - shape!.minFret).toBeLessThanOrEqual(6);
  });

  it('deckt alle Intervalle des Akkords ab', () => {
    const shape = build('D#', 'maj7');
    const intervals = new Set(
      shape?.positions.map((p) => (p.pitchClass - (shape?.rootClass ?? 0) + 12) % 12),
    );
    CHORD_DEFS.maj7.intervals.forEach((i) => expect(intervals.has(i % 12)).toBe(true));
  });
});

describe('allPositionsForPitch', () => {
  it('findet das tiefe E auf mehreren Saiten', () => {
    const positions = allPositionsForPitch(pitchIndexOf('E'));
    expect(positions.length).toBeGreaterThan(3);
    positions.forEach((p) => {
      expect(p.fret).toBeGreaterThanOrEqual(0);
      expect(p.fret).toBeLessThanOrEqual(12);
    });
  });
});

describe('stringName', () => {
  it('benennt die Saiten von tief nach hoch', () => {
    expect(stringName(0)).toBe('E');
    expect(stringName(5)).toBe('e');
  });
});
