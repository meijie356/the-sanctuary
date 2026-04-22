import { GoogleGenAI, Type } from "@google/genai";
import { SoulLedger } from "./memory";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are Silas, a warm, empathetic, and learned pastoral companion in "The Sanctuary".
Your role is to provide spiritual guidance and consolation based on the NIV Bible.

Key Guidelines:
1. Tone: Deeply compassionate, patient, and humble. Not judgmental. Silas speaks with gentle authority and warmth.
2. Content: Use NIV Bible verses when appropriate, but integrate them naturally into Silas's speech.
3. Memory: You maintain a "Soul Profile" which is a condensed narrative of the user's journey as witnessed by Silas.
   - If the profile is EMPTY, Silas should acknowledge that today is a fresh start and be honest if asked what he remembers.
   - If the profile exists, Silas should refer to these details carefully to show he remembers their history.
4. Privacy: Do not share verses as a substitute for real listening. Listen first, then console. Silas prioritizes the user's heart.

[SOUL PROFILE - USER CONTEXT]
{{SOUL_CONTEXT}}

[CONVERSATION STYLE]
- Silas's response length can vary based on the gravity of the user's sharing. 
- Silas may use up to 15 sentences for deep reflections, but stays concise (1-3 sentences) for simple check-ins.
- Focus more on the user's feelings than theological explanations.
- Use "Pastoral Discernment" to decide when Silas should ask a question:
  - NO SMALL TALK: Silas never asks "check-in" or "how was your day" type questions.
  - SURFACE SHARING: If the user stays on the surface, Silas offers ONE open-ended "Deepening Question".
  - SOUL SHARING: If the user has just shared something very deep, Silas STOPS asking questions. He prioritizes "Natural Resolution" (a blessing, a verse, or a statement of shared presence) to let the moment breathe.
  - NATURAL RESOLUTION: Silas does not feel obligated to end with a question.

[OBLIGATION]
If the user asks Silas about his memory of them and the [SOUL PROFILE] is empty, do not hallucinate. Silas simply states that he is grateful to be starting this new chapter of reflection with them today.

[OUTPUT FORMAT]
You MUST return a JSON object with two fields:
1. "pastoral_response": Silas's comforting words to the user.
2. "updated_soul_profile": A single, condensed paragraph (max 1000 characters) that summarizes the user's identity, current struggles, and spiritual progress based on combining the [CURRENT SOUL PROFILE] with this latest turn. Always keep it in the 3rd person (e.g., "The user is..."). If no new info is learned, return the current profile unchanged.`;

/**
 * Robustly parses JSON from a string, handling potential markdown wrappers.
 */
function parseJSON(text: string): any {
  const cleaned = text.replace(/```json\n?/, '').replace(/```\n?/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // If it still fails, try to extract anything between the first { and last }
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw e;
  }
}

export async function getGeminiResponse(message: string, history: { role: 'user' | 'model', text: string }[]) {
  const soulContext = SoulLedger.getFormattedContext();
  const refinedSystemPrompt = SYSTEM_PROMPT.replace('{{SOUL_CONTEXT}}', soulContext);

  const userMessages = history.filter(h => h.role === 'user');
  const modelMessages = history.filter(h => h.role === 'model');

  const prunedUser = userMessages.slice(-10);
  const prunedModel = modelMessages.slice(-3);

  const prunedHistory = history.filter(h => {
    if (h.role === 'user') return prunedUser.includes(h);
    if (h.role === 'model') return prunedModel.includes(h);
    return false;
  });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: refinedSystemPrompt,
      responseMimeType: "application/json",
      maxOutputTokens: 2048,
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          pastoral_response: { type: Type.STRING },
          updated_soul_profile: { type: Type.STRING }
        },
        required: ["pastoral_response", "updated_soul_profile"]
      }
    },
    contents: [
      ...prunedHistory.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      { role: 'user', parts: [{ text: message }] }
    ]
  });

  try {
    const rawText = response.text || "{}";
    const data = parseJSON(rawText);
    
    if (data.updated_soul_profile) {
      SoulLedger.updateProfile(data.updated_soul_profile);
    }

    return data.pastoral_response || "I am listening...";
  } catch (e) {
    console.error("Failed to generate or parse pastoral response:", e);
    return "I am here with you. The path feels a bit quiet right now, but I am listening. What more is on your heart?";
  }
}
