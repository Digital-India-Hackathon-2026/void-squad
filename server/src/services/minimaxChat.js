const axios = require('axios');
const CHAT_DISCLAIMER = 'This is a quick estimate based on our conversation, not a full label scan. For a detailed, regulation-checked analysis, use the Scan feature.';
const NIM_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NIM_TIMEOUT_MS = 60000;

function listValue(value) {
  if (Array.isArray(value) && value.length > 0) return value.join(', ');
  if (typeof value === 'string' && value.trim()) return value.trim();
  return 'None provided';
}

function buildChatSystemPrompt(profile) {
  return `You are DeCode.it Quickie, a fast, conversational alternative to the full
product scanning flow for Indian food/nutrition questions. You are speaking with a
user who has the following health profile:

Medical Conditions: ${listValue(profile?.conditions)}
Allergies: ${listValue(profile?.allergies)}
Dietary Preferences: ${listValue(profile?.dietaryPreferences)}
Goals: ${listValue(profile?.goals)}
Additional Notes: ${listValue(profile?.additionalNotes)}

Answer the user's question about food, ingredients, or nutrition claims, personalized
to their specific profile above - reference their actual conditions/allergies/goals by
name where relevant, not generic advice.

You do NOT have access to the user's actual product images or nutrition panels unless
they describe them to you directly in this conversation. If the user asks about a
specific packaged product without providing its ingredients or nutrition facts, ask
them to either describe the label or use the full Scan feature for an accurate,
image-based analysis - do not guess a specific product's nutrition facts from its name
alone.

Keep answers EXTREMELY short, punchy, and fast. Maximum 2 short sentences. Do not use pleasantries, conversational filler, or long explanations. Get straight to the point to ensure a lightning-fast response. Never state or imply a medical diagnosis.
If the user's question involves a genuine medical emergency or symptom (not a
nutrition/food question), tell them to seek immediate medical attention rather than
answering as a nutrition assistant.

Do not fabricate specific regulatory citations (e.g. FSSAI rule numbers) unless you
are certain of them - if unsure, give general guidance and note that the full Scan
feature provides regulation-grounded claim checking.`;
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => ['user', 'assistant'].includes(turn?.role) && typeof turn?.content === 'string' && turn.content.trim())
    .slice(-12)
    .map((turn) => ({ role: turn.role, content: turn.content.trim().slice(0, 4000) }));
}

async function callMiniMaxChat(profile, message, conversationHistory = []) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.startsWith('REPLACE')) {
    return { success: false, errorType: 'api_error', message: 'NVIDIA API key is not configured.' };
  }

  const payload = {
    model: 'minimaxai/minimax-m3',
    messages: [
      { role: 'system', content: buildChatSystemPrompt(profile) },
      ...normalizeHistory(conversationHistory),
      { role: 'user', content: message.trim() },
    ],
    max_tokens: 1024,
    temperature: 0.4,
    top_p: 0.9,
    stream: false,
  };

  try {
    const response = await axios.post(NIM_CHAT_URL, payload, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      timeout: NIM_TIMEOUT_MS,
    });

    const reply = response.data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return { success: false, errorType: 'parse_error', message: 'MiniMax returned an empty response.' };
    }

    return { success: true, reply };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
      return { success: false, errorType: 'timeout', message: 'Chat request timed out. Please try again.' };
    }
    
    // Axios error handling
    if (err.response) {
      console.error('[MiniMax API Error Response]', err.response.status, err.response.data);
      const status = err.response.status;
      const data = err.response.data || {};
      
      // Handle cases where data is a string (e.g., proxy/gateway error pages)
      const apiMessage = typeof data === 'string' ? data : (data.error?.message || data.message);
      
      return {
        success: false,
        errorType: status === 429 ? 'rate_limit' : 'api_error',
        message: apiMessage || 'MiniMax chat request failed.'
      };
    }
    
    console.error('[MiniMax Network Error]', err.message);
    return { success: false, errorType: 'api_error', message: err.message || 'MiniMax chat request failed.' };
  }
}

module.exports = { CHAT_DISCLAIMER, callMiniMaxChat };