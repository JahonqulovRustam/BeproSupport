
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  async getTutorAdvice(topic: string, question: string) {
    try {
      // Correct initialization using named parameter and process.env.API_KEY directly
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Mavzu: ${topic}\nTalaba savoli: ${question}\n\nSiz Bepro texnik qo'llab-quvvatlash xizmati bo'yicha ekspert mentorsiz. Talabaning texnik savoliga o'zbek tilida aniq, foydali va qisqa javob bering.`,
        config: {
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      
      // Accessing the text property directly as per the latest SDK guidelines
      return response.text;
    } catch (error) {
      console.error("Gemini tutoring error:", error);
      return "Kechirasiz, hozirda bilimlar bazasiga ulanishda muammo bor. Iltimos, keyinroq qayta urinib ko'ring.";
    }
  }
}

export const geminiService = new GeminiService();
