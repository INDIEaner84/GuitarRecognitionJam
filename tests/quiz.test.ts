import { describe, expect, it } from 'vitest';
import {
  buildChordNameQuestion,
  buildIntervalQuestion as buildTheoryIntervalQuestion,
  buildScaleQuestion,
  buildTheoryQuestion,
} from '../core/quiz';
import {
  buildChordQuestion,
  buildEarQuestion,
  buildIntervalQuestion as buildEarIntervalQuestion,
  buildNoteQuestion,
} from '../core/ear';
import { sessionSummary } from '../core/sessionExport';
import { emptyProgressLike } from './helpers/progressFactory';

const expectValidQuestion = (q: {
  options: string[];
  correct: string;
  explanation: string;
  prompt: string;
}) => {
  expect(q.options.length).toBeGreaterThanOrEqual(2);
  expect(q.options).toContain(q.correct);
  expect(new Set(q.options).size).toBe(q.options.length);
  expect(q.prompt.length).toBeGreaterThan(0);
  expect(q.explanation.length).toBeGreaterThan(0);
};

describe('Theorie-Quiz', () => {
  it('Intervallfragen sind lösbar und erklärt', () => {
    for (let i = 0; i < 25; i++) expectValidQuestion(buildTheoryIntervalQuestion());
  });

  it('Skalenfragen nennen die richtige Skala', () => {
    for (let i = 0; i < 25; i++) expectValidQuestion(buildScaleQuestion());
  });

  it('Akkordfragen enthalten den Akkordnamen', () => {
    for (let i = 0; i < 25; i++) expectValidQuestion(buildChordNameQuestion());
  });

  it('der Mix liefert alle Kategorien', () => {
    const categories = new Set<string>();
    for (let i = 0; i < 120; i++) categories.add(buildTheoryQuestion().category);
    expect(categories.size).toBeGreaterThan(1);
  });
});

describe('Gehörbildung', () => {
  it('Notenfragen haben vier Optionen und den Ton', () => {
    for (let i = 0; i < 25; i++) {
      const q = buildNoteQuestion();
      expect(q.options).toHaveLength(4);
      expect(q.options).toContain(q.correct);
      expect(q.pitchClasses).toHaveLength(1);
      expect(q.noteNames[0]).toMatch(/^[A-G]#?4$/);
    }
  });

  it('Intervallfragen liefern zwei Töne', () => {
    for (let i = 0; i < 25; i++) {
      const q = buildEarIntervalQuestion();
      expect(q.pitchClasses).toHaveLength(2);
      expect(q.options).toContain(q.correct);
    }
  });

  it('Akkordfragen liefern mindestens drei Töne', () => {
    for (let i = 0; i < 25; i++) {
      const q = buildChordQuestion();
      expect(q.pitchClasses.length).toBeGreaterThanOrEqual(3);
      expect(q.options).toContain(q.correct);
    }
  });

  it('buildEarQuestion mischt die Fragetypen', () => {
    const kinds = new Set<string>();
    for (let i = 0; i < 150; i++) kinds.add(buildEarQuestion().kind);
    expect(kinds.size).toBeGreaterThan(1);
  });
});

describe('sessionSummary', () => {
  it('enthält Level, XP und Sekundärwerte', () => {
    const summary = sessionSummary(emptyProgressLike({ xp: 512, level: 3, streak: 4 }), 'Vaporwave');
    expect(summary).toContain('Level:        3');
    expect(summary).toContain('XP:           512');
    expect(summary).toContain('Streak:       4');
    expect(summary).toContain('Vaporwave');
  });

  it('fällt bei leerem Fortschritt nicht um', () => {
    expect(sessionSummary(emptyProgressLike())).toContain('HARMONIC SCOUT');
  });
});
