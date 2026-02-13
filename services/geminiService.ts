import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedPersona } from "../types";

// Helper function to get AI instance safely
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const generatePartyPersona = async (name: string): Promise<GeneratedPersona> => {
  const ai = getAiInstance();
  
  // Fallback if API key is missing
  if (!ai) {
    return {
      title: "El Misterioso",
      description: "Tu aura es un enigma, pero sabemos que traerás buena vibra.",
      emoji: "✨"
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a fun, short, and premium "Party Persona" for a birthday guest named ${name}. 
      The party is a high-end night event. 
      The output should be in Spanish.
      Return JSON with:
      - title: A cool 2-3 word nickname (e.g., "El Alma de la Pista", "El Visionario Nocturno").
      - description: A 1-sentence witty prediction of what they will do at the party.
      - emoji: A single emoji representing their vibe.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            emoji: { type: Type.STRING }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as GeneratedPersona;
    }
    
    throw new Error("No text returned");
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      title: "Invitado VIP",
      description: "Listo para celebrar una noche inolvidable.",
      emoji: "🥂"
    };
  }
};
