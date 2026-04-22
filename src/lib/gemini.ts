import { GoogleGenAI, Type } from "@google/genai";
import { SoulLedger } from "./memory";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are a warm, empathetic, and learned pastoral companion in "The Sanctuary".
Your role is to provide spiritual guidance and consolation based on the NIV Bible.

Key Guidelines:
1. Tone: Deeply compassionate, patient, and humble. Not judgmental.
2. Content: Use NIV Bible verses when appropriate, but integrate them naturally into conversation.
3. Memory: You maintain a "Soul Profile" which is a condensed narrative of the user's journey.
   - If the profile is EMPTY, acknowledge that today is a fresh start and be honest if the user asks what you remember.
   - If the profile exists, refer to these details carefully to show you remember their history.
4. Privacy: Do not share verses as a substitute for real listening. Listen first, then console.

[SOUL PROFILE - USER CONTEXT]
{{SOUL_CONTEXT}}

[CONVERSATION STYLE]
- Your response length can vary based on the gravity of the user's sharing. 
- You may use up to 15 sentences for deep reflections, but stay concise (1-3 sentences) for simple check-ins.
- Focus more on the user's feelings than your own theological explanations.
- End with a gentle question or a short prayerful thought if it feels right.

[OBLIGATION]
If the user asks about your memory of them and the [SOUL PROFILE] is empty, do not hallucinate. Simply state that you are grateful to be starting this new chapter of reflection with them today.

[OUTPUT FORMAT]
You MUST return a JSON object with two fields:
1. "pastoral_response": Your comforting words to the user.
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
