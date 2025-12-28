
import { GoogleGenAI, Type } from "@google/genai";
import { ScaleAnalysis } from "../types";

export const analyzeMusicalContext = async (notes: string[]): Promise<ScaleAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `I am playing the following notes: ${notes.join(", ")}. 
  1. Identify the most likely musical key.
  2. Suggest 3 scales that fit these notes. Provide note names and interval formulas.
  3. Suggest related modes. For each mode, identify the "characteristic note" and provide its most common guitar fretboard position (string 1-6 where 6 is low E, and fret number 0-12).
  4. Provide 2 simple guitar riffs in standard ASCII tablature.
  5. List 3 common chord progressions. For each, provide the ASCII tablature representation and a "playbackSequence" for audio synthesis.
  Return the data in a structured JSON format.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detectedKey: { type: Type.STRING },
          confidence: { type: Type.STRING },
          scales: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                intervals: { type: Type.ARRAY, items: { type: Type.STRING } },
                description: { type: Type.STRING }
              }
            }
          },
          modes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                formula: { type: Type.STRING },
                characteristicNote: { type: Type.STRING },
                description: { type: Type.STRING },
                characteristicNotePosition: {
                  type: Type.OBJECT,
                  properties: {
                    string: { type: Type.INTEGER },
                    fret: { type: Type.INTEGER }
                  }
                }
              }
            }
          },
          riffs: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                tablature: { type: Type.STRING },
                context: { type: Type.STRING },
                playbackSequence: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      note: { type: Type.STRING },
                      duration: { type: Type.STRING }
                    },
                    required: ["note", "duration"]
                  }
                }
              }
            }
          },
          chordProgressions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                tablature: { type: Type.STRING },
                playbackSequence: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      notes: { type: Type.ARRAY, items: { type: Type.STRING } },
                      duration: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        },
        required: ["detectedKey", "scales", "modes", "riffs", "chordProgressions"]
      }
    }
  });

  const jsonStr = response.text || "{}";
  return JSON.parse(jsonStr);
};
