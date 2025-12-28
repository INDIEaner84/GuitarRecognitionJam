
export const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const getNoteFromFrequency = (frequency: number) => {
  const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
  const roundedNote = Math.round(noteNum) + 69;
  const name = NOTE_NAMES[roundedNote % 12];
  const octave = Math.floor(roundedNote / 12) - 1;
  return { name, octave, noteNum: roundedNote };
};

export interface ChordDefinition {
  name: string;
  intervals: number[]; // semitones relative to root
  suffix: string;
}

export const CHORD_TYPES: ChordDefinition[] = [
  { name: "Major", intervals: [0, 4, 7], suffix: "" },
  { name: "Minor", intervals: [0, 3, 7], suffix: "m" },
  { name: "Major 7th", intervals: [0, 4, 7, 11], suffix: "Maj7" },
  { name: "Minor 7th", intervals: [0, 3, 7, 10], suffix: "m7" },
  { name: "Dominant 7th", intervals: [0, 4, 7, 10], suffix: "7" },
  { name: "Suspended 4th", intervals: [0, 5, 7], suffix: "sus4" },
  { name: "Suspended 2nd", intervals: [0, 2, 7], suffix: "sus2" },
  { name: "Diminished", intervals: [0, 3, 6], suffix: "dim" },
  { name: "Augmented", intervals: [0, 4, 8], suffix: "aug" },
  { name: "Power Chord", intervals: [0, 7], suffix: "5" },
];

export const identifyChord = (notes: string[]): { name: string; root: string; type: string; notes: string[] } | null => {
  if (notes.length < 2) return null;

  // Convert note names to indices (0-11)
  const noteIndices = Array.from(new Set(notes.map(n => NOTE_NAMES.indexOf(n.split(/\d/)[0]))))
    .sort((a, b) => a - b);

  for (let rootIdx = 0; rootIdx < noteIndices.length; rootIdx++) {
    const root = noteIndices[rootIdx];
    // Normalize relative to this root
    const relativeIntervals = noteIndices.map(idx => (idx - root + 12) % 12).sort((a, b) => a - b);
    
    // Check against known chord types
    for (const type of CHORD_TYPES) {
      // Check if all chord intervals are present in our played notes
      const isMatch = type.intervals.every(int => relativeIntervals.includes(int));
      
      if (isMatch) {
        return {
          name: `${NOTE_NAMES[root]}${type.suffix}`,
          root: NOTE_NAMES[root],
          type: type.name,
          notes: type.intervals.map(int => NOTE_NAMES[(root + int) % 12])
        };
      }
    }
  }

  return null;
};
