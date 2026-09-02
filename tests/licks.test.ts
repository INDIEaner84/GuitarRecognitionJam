import { describe, expect, it } from 'vitest';
import {
  BUILTIN_LICKS,
  cloneLick,
  eventById,
  makeEvent,
  normalizeNoteName,
  parseEventText,
  samePitch,
  sortedEvents,
  totalBeats,
} from '../core/licks';
import { LICK_CATEGORIES, genreOfLick, libraryCount, licksInCategory } from '../core/library';

describe('Noten-Helfer', () => {
  it('entfernt Oktavzahlen', () => {
    expect(normalizeNoteName('F#3')).toBe('F#');
    expect(normalizeNoteName('Bb')).toBe('Bb');
  });

  it('vergleicht Tonhöhen unabhängig von der Oktave', () => {
    expect(samePitch('E2', 'E4')).toBe(true);
    expect(samePitch('E2', 'F4')).toBe(false);
  });
});

describe('parseEventText', () => {
  it('liest "Note Beat Dauer Saite-Bund"', () => {
    const events = parseEventText(['E3/A3 0 0.5 6-0', 'G3 1 0.25 6-3']);
    expect(events).toHaveLength(2);
    expect(events[0].notes).toEqual(['E3', 'A3']);
    expect(events[0].beat).toBe(0);
    expect(events[0].durationBeats).toBe(0.5);
    expect(events[0].string).toBe(6);
    expect(events[0].fret).toBe(0);
    expect(events[1].beat).toBe(1);
  });

  it('ignoriert Leerzeilen', () => {
    expect(parseEventText(['', '  ', 'C3 0 1'])).toHaveLength(1);
  });
});

describe('Lick-Helfer', () => {
  it('sortiert Events nach Beat', () => {
    const lick = { ...BUILTIN_LICKS[0], events: [makeEvent({ beat: 2, notes: ['A3'] }), makeEvent({ beat: 0, notes: ['E3'] })] };
    expect(sortedEvents(lick).map((e) => e.beat)).toEqual([0, 2]);
  });

  it('berechnet die Gesamtlänge', () => {
    const lick = { ...BUILTIN_LICKS[0], events: [makeEvent({ beat: 0, durationBeats: 1 }), makeEvent({ beat: 1, durationBeats: 0.5 })] };
    expect(totalBeats(lick)).toBe(1.5);
  });

  it('findet Events per Id', () => {
    const event = makeEvent({ beat: 0, notes: ['E3'] });
    expect(eventById({ ...BUILTIN_LICKS[0], events: [event] }, event.id)?.id).toBe(event.id);
  });

  it('klont tief und ohne Referenz', () => {
    const copy = cloneLick(BUILTIN_LICKS[0]);
    expect(copy).toEqual(BUILTIN_LICKS[0]);
    expect(copy.events).not.toBe(BUILTIN_LICKS[0].events);
  });

  it('vergibt eindeutige Event-Ids', () => {
    const a = makeEvent({ beat: 0, notes: ['E3'] });
    const b = makeEvent({ beat: 1, notes: ['G3'] });
    expect(a.id).not.toBe(b.id);
  });
});

describe('Bibliothek', () => {
  it('enthält Licks und Kategorien', () => {
    expect(libraryCount()).toBeGreaterThan(0);
    expect(licksInCategory('all')).toHaveLength(BUILTIN_LICKS.length);
  });

  it('filtert nach Genre', () => {
    const blues = licksInCategory('blues');
    expect(blues.length).toBeGreaterThan(0);
    blues.forEach((lick) => expect(genreOfLick(lick)).toBe('blues'));
  });

  it('jede Kategorie außer "all" hat ein Label und Icon', () => {
    LICK_CATEGORIES.forEach((c) => {
      expect(c.label).toBeTruthy();
      expect(c.icon).toBeTruthy();
    });
  });

  it('alle Builtin-Licks sind vollständig', () => {
    BUILTIN_LICKS.forEach((lick) => {
      expect(lick.id).toBeTruthy();
      expect(lick.events.length).toBeGreaterThan(0);
      lick.events.forEach((e) => expect(e.notes.length).toBeGreaterThan(0));
      expect(totalBeats(lick)).toBeGreaterThan(0);
    });
  });
});
