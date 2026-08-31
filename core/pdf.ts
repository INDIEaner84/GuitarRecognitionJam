/**
 * PDF import — digital PDFs with a real text layer.
 *
 * Parses ASCII guitar tabs and simple "Note + beat/duration" text into the
 * same LickEvent model that playback, matching and visualisation use.
 */
import { Lick, LickEvent, makeEvent, normalizeNoteName } from './licks';

export interface PdfParseResult {
  lick: Lick;
  warnings: string[];
  rawLines: string[];
}

const STRING_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];
const BASE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const BASE_INDEX: Record<string, number> = { E: 4, B: 11, G: 7, D: 2, A: 9, e: 4 };
const BASE_OCTAVE: Record<string, number> = { e: 4, B: 3, G: 3, D: 3, A: 2, E: 2 };

const noteAt = (stringName: string, fret: number): string => {
  const base = BASE_INDEX[stringName] ?? 4;
  const octave = BASE_OCTAVE[stringName] ?? 3;
  const total = base + Math.max(0, fret);
  const name = BASE_NOTES[total % 12];
  const nextOctave = octave + Math.floor(total / 12);
  return `${name}${nextOctave}`;
};

const isTabLine = (line: string): boolean =>
  STRING_NAMES.some((s) => line.startsWith(s)) && /[0-9-]/.test(line);

const isTextNoteLine = (line: string): boolean =>
  /[A-G](#|b)?\d?/.test(line) && /[0-9]/.test(line);

/** Group the six string rows into columns of played events. */
export const parseAsciiTab = (lines: string[]): LickEvent[] => {
  const normalized = lines
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(isTabLine);

  // find the row order: collect rows whose first token is a string name
  const rows: Array<{ string: number; text: string }> = [];
  const seen = new Set<number>();
  for (const line of normalized) {
    const first = line.split(' ')[0]?.trim();
    const idx = STRING_NAMES.indexOf(first);
    if (idx >= 0 && !seen.has(idx)) {
      seen.add(idx);
      rows.push({ string: idx + 1, text: line });
    }
  }

  if (rows.length === 0) return [];

  const maxLen = Math.max(...rows.map((r) => r.text.length));
  const events: LickEvent[] = [];

  // Each column pair roughly equals an eighth-note step (0.5 beat).
  let beat = 0;
  let previousWasNote = false;

  for (let col = 0; col < maxLen; col++) {
    const hits: Array<{ string: number; fret: number }> = [];
    for (const row of rows) {
      const ch = row.text[col];
      if (ch && ch !== '-' && ch !== ' ' && /\d/.test(ch)) {
        // gather full fret number (may be 1-2 digits)
        let fretStr = ch;
        let next = col + 1;
        while (next < row.text.length && /\d/.test(row.text[next])) {
          fretStr += row.text[next];
          next++;
        }
        hits.push({ string: row.string, fret: Number(fretStr) });
      }
    }

    if (hits.length > 0) {
      // Prefer the lowest string (string 6 = low E) for the audible event,
      // but keep all frets available for visualisation.
      const primary = hits[hits.length - 1];
      events.push(
        makeEvent({
          beat,
          durationBeats: 0.5,
          notes: [noteAt(STRING_NAMES[primary.string - 1], primary.fret)],
          string: primary.string,
          fret: primary.fret,
        }),
      );
      if (previousWasNote) beat = Math.round((beat + 0.5) * 2) / 2;
      else beat = Math.round((beat + 0.5) * 2) / 2;
      previousWasNote = true;
    } else if (/-/.test(rows.map((r) => r.text[col]).join('')) || /[|]/.test(rows.map((r) => r.text[col]).join(''))) {
      previousWasNote = false;
    }
  }

  return events;
};

/** Parse simple text lines like "E3 0 0.5" or "G 2 quarter". */
export const parseTextNoteLines = (lines: string[]): LickEvent[] => {
  const events: LickEvent[] = [];

  for (const line of lines) {
    const tokens = line.replace(/\s+/g, ' ').trim().split(' ');
    if (tokens.length < 2) continue;

    const noteToken = tokens.find((t) => /^[A-G](#|b)?\d?$/.test(t));
    if (!noteToken) continue;

    const num = tokens.filter((t) => /^-?\d+(\.\d+)?$/.test(t)).map(Number);
    let beat = num[0] ?? 0;
    let duration = num[1] ?? 0.5;

    if (tokens.some((t) => /^(whole|half|quarter|eighth|eighth-note|16th)$/i.test(t))) {
      const durToken = tokens.find((t) => /^(whole|half|quarter|eighth|16th)$/i.test(t))!;
      duration =
        durToken.toLowerCase() === 'whole'
          ? 4
          : durToken.toLowerCase() === 'half'
            ? 2
            : durToken.toLowerCase() === 'quarter'
              ? 1
              : durToken.toLowerCase() === 'eighth'
                ? 0.5
                : 0.25;
    }

    events.push(makeEvent({ beat, durationBeats: duration, notes: [normalizeNoteName(noteToken)] }));
  }

  return events.sort((a, b) => a.beat - b.beat);
};

export const parsePdfLines = (rawLines: string[], title: string): PdfParseResult => {
  const warnings: string[] = [];
  const tabEvents = parseAsciiTab(rawLines);
  const textEvents = parseTextNoteLines(rawLines);

  let events: LickEvent[] = [];
  if (tabEvents.length > 0) {
    events = tabEvents;
    warnings.push('ASCII-Tab erkannt. Einige Dauerwerte sind geschätzt.');
  } else if (textEvents.length > 0) {
    events = textEvents;
    warnings.push('Noten/Text erkannt. Bearbeite die Dauerwerte bei Bedarf.');
  }

  if (events.length === 0) {
    throw new Error(
      'Keine lesbaren Licks gefunden. Nutze ein PDF mit Text-Ebene (ASCII-Tab oder Notennamen) oder gib den Lick manuell ein.',
    );
  }

  return {
    lick: {
      id: `pdf-${Date.now()}`,
      title: title || 'PDF-Import',
      description: 'Aus einer PDF-Datei importiert. Bearbeiten und bestätigen…',
      events,
    },
    warnings,
    rawLines,
  };
};

/** Read a PDF from a File and return parsed lick events. */
export const parsePdfFile = async (file: File): Promise<PdfParseResult> => {
  const buffer = await file.arrayBuffer();

  let pdfjsModule: any;
  try {
    pdfjsModule = await import('pdfjs-dist');
  } catch {
    throw new Error('PDF-Bibliothek nicht geladen. Internetverbindung nötig für den ersten Import.');
  }

  const pdfjs = pdfjsModule.default ?? pdfjsModule;
  pdfjs.GlobalWorkerOptions.workerSrc =
    'https://esm.sh/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs';

  const pdf = await pdfjs.getDocument({ data: buffer }).promise;
  const rawLines: string[] = [];

  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
    const page = await pdf.getPage(pageNo);
    const content = await page.getTextContent();
    let line = '';
    let lastY: number | null = null;

    for (const item of content.items as Array<any>) {
      if (!item || typeof item.str !== 'string') continue;
      const y = item.transform?.[5] ?? 0;
      if (lastY !== null && Math.abs(y - lastY) > 6 && line.trim()) {
        rawLines.push(line.trim());
        line = '';
      } else if (item.hasEOL && line.trim()) {
        rawLines.push(line.trim());
        line = '';
      }
      line += item.str;
      lastY = y;
    }
    if (line.trim()) rawLines.push(line.trim());
  }

  const title = file.name.replace(/\.pdf$/i, '');
  return parsePdfLines(rawLines, title);
};
