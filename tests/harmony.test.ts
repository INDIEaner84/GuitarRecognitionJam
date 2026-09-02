import { describe, expect, it } from 'vitest';
import {
  CHORD_DEFS,
  PROGRESSIONS,
  buildRhythmLick,
  chordInKey,
  classifyNote,
  guideToneForChord,
  keyScalePitchClasses,
  noteChoicesForChord,
  progressionChords,
  reasonForFit,
} from '../core/harmony';
import { pitchIndexOf } from '../core/theory';

const A_MAJOR = 9;

describe('keyScalePitchClasses', () => {
  it('liefert A-Dur und A-Moll', () => {
    expect(keyScalePitchClasses(A_MAJOR, 'major')).toEqual([9, 11, 1, 2, 4, 6, 8]);
    expect(keyScalePitchClasses(A_MAJOR, 'minor')).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });
});

describe('chordInKey', () => {
  it('baut die Stufen einer Dur-Tonart', () => {
    const I = chordInKey(0, 'major', 'I', 'maj');
    expect(I.rootIndex).toBe(0);
    expect(I.noteNames).toEqual(['C', 'E', 'G']);

    const V = chordInKey(0, 'major', 'V', 'dom7');
    expect(V.noteNames).toEqual(['G', 'B', 'D', 'F']);
  });

  it('liefert eine Funktion je Qualität', () => {
    expect(chordInKey(0, 'major', 'I', 'maj').function).toBeTruthy();
  });
});

describe('progressionChords', () => {
  it('liefert für jede Stufe einen Akkord', () => {
    const progression = PROGRESSIONS[0];
    const chords = progressionChords(0, 'major', progression.steps);
    expect(chords).toHaveLength(progression.steps.length);
    chords.forEach((chord) => expect(chord.noteNames.length).toBeGreaterThanOrEqual(3));
  });
});

describe('classifyNote', () => {
  const key = keyScalePitchClasses(A_MAJOR, 'major');
  const chord = chordInKey(A_MAJOR, 'major', 'V', 'dom7'); // E7

  it('erkennt Akkordtöne', () => {
    expect(classifyNote(pitchIndexOf('E'), chord, key)).toBe('chord-tone');
  });

  it('erkennt Leittöne (Septime bei 7er-Akkorden)', () => {
    expect(classifyNote(pitchIndexOf('D'), chord, key)).toBe('guide-tone');
  });

  it('erkennt tonartfremde Töne als outside', () => {
    expect(classifyNote(pitchIndexOf('A#'), chord, key)).toBe('outside');
  });

  it('erkennt übrige Tonleitertöne als scale-tone', () => {
    expect(classifyNote(pitchIndexOf('A'), chord, key)).toBe('scale-tone');
  });
});

describe('noteChoicesForChord', () => {
  it('sortiert Akkordtöne nach oben und blendet Outside-Töne aus', () => {
    const chord = chordInKey(A_MAJOR, 'major', 'I', 'maj');
    const choices = noteChoicesForChord(chord, keyScalePitchClasses(A_MAJOR, 'major'));
    expect(choices.length).toBeGreaterThan(0);
    expect(choices.every((c) => c.fit !== 'outside')).toBe(true);
    expect(choices[0].fit).toBe('chord-tone');
    choices.forEach((c) => expect(c.reason.length).toBeGreaterThan(0));
  });
});

describe('reasonForFit', () => {
  const chord = chordInKey(A_MAJOR, 'major', 'I', 'maj');

  it('erklärt Akkordtöne konkret', () => {
    expect(reasonForFit(pitchIndexOf('A'), 'chord-tone', chord)).toMatch(/Grundton/);
    expect(reasonForFit(pitchIndexOf('E'), 'chord-tone', chord)).toMatch(/Quinte/);
  });

  it('nennt den Notennamen', () => {
    expect(reasonForFit(pitchIndexOf('C#'), 'chord-tone', chord)).toMatch(/C#/);
  });
});

describe('guideToneForChord', () => {
  it('liefert Zielintervall und Notennamen', () => {
    const chord = chordInKey(A_MAJOR, 'major', 'V', 'dom7');
    const guide = guideToneForChord(chord);
    expect(guide.noteName).toBeTruthy();
    expect(guide.pitchClass).toBeGreaterThanOrEqual(0);
    expect(guide.pitchClass).toBeLessThan(12);
  });
});

describe('buildRhythmLick', () => {
  it('baut einen Loop mit einem Event pro Stufe', () => {
    const progression = PROGRESSIONS[0];
    const lick = buildRhythmLick(0, 'major', progression);
    expect(lick.events).toHaveLength(progression.steps.length);
    expect(lick.events[0].beat).toBe(0);
    expect(lick.events[0].notes.length).toBeGreaterThan(0);
  });

  it('setzt die Beats entsprechend der Taktlängen', () => {
    const progression = PROGRESSIONS[0];
    const lick = buildRhythmLick(0, 'major', progression);
    const expectedBeat = progression.steps[0].beats;
    expect(lick.events[1].beat).toBe(expectedBeat);
  });
});

describe('CHORD_DEFS', () => {
  it('sind vollständig definiert', () => {
    Object.values(CHORD_DEFS).forEach((def) => {
      expect(def.intervals.length).toBeGreaterThanOrEqual(3);
      expect(def.label).toBeTruthy();
      expect(def.symbol).toBeDefined();
    });
  });
});
