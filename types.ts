
export interface NoteData {
  note: string;
  frequency: number;
  confidence: number;
  timestamp: number;
}

export interface Scale {
  name: string;
  notes: string[];
  intervals: string[]; 
  description: string;
  fretboardPattern?: string; 
}

export interface Mode {
  name: string;
  formula: string; 
  description: string;
  characteristicNote: string; 
  characteristicNotePosition?: {
    string: number; // 1-6 (E to e)
    fret: number;
  };
}

export interface PlaybackNote {
  note: string;
  duration: string;
}

export interface ChordPlayback {
  notes: string[];
  duration: string;
}

export interface ScaleAnalysis {
  detectedKey: string;
  confidence: string;
  scales: Scale[];
  modes: Mode[];
  riffs: {
    title: string;
    tablature: string;
    context: string;
    playbackSequence: PlaybackNote[];
  }[];
  chordProgressions: {
    name: string;
    tablature: string;
    playbackSequence: ChordPlayback[];
  }[];
}

export interface SpeedTrainerConfig {
  startBpm: number;
  targetBpm: number;
  increment: number;
  targetNote: string;
  beatsPerLevel: number;
}
