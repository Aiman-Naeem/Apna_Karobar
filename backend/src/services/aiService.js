// Talks to Person C's ai-service for the ML-based trust score.
// Falls back to a simple rule-based score ONLY if the AI service is unreachable —
// this keeps backend/kameti development unblocked before the model is ready.
// Once ai-service is live and stable, the fallback path should be removed so
// there's a single source of truth for trustScore.

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Requests an updated trust score from the ML model.
 * @param {string} userId
 * @param {Array} paymentHistory - flat list of { month, amount, status, dueDate, paidDate }
 * @returns {Promise<number>} trust score 0-100
 */
export async function getMlTrustScore(userId, paymentHistory) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/trust-score`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, paymentHistory }),
      signal: AbortSignal.timeout(5000), // don't hang the request if ai-service is down
    });

    if (!response.ok) {
      throw new Error(`ai-service returned ${response.status}`);
    }

    const data = await response.json();
    if (typeof data.trustScore !== 'number') {
      throw new Error('ai-service response missing numeric trustScore');
    }
    return data.trustScore;
  } catch (error) {
    console.warn('⚠️ ai-service trust-score call failed, using fallback:', error.message);
    return fallbackTrustScore(paymentHistory);
  }
}

// Simple rule-based fallback — same logic as the original placeholder.
// Remove this once ai-service is confirmed reliable.
function fallbackTrustScore(paymentHistory) {
  const total = paymentHistory.length;
  if (total === 0) return 50; // default starting score

  const onTime = paymentHistory.filter(
    (p) => p.status === 'paid' && p.paidDate && new Date(p.paidDate) <= new Date(p.dueDate)
  ).length;

  return Math.floor((onTime / total) * 100);
}

/**
 * Sends a chat message to the AI business-advice chatbot and gets a reply.
 * @param {string} userId
 * @param {string} message - the user's message
 * @param {Array} history - prior messages in this session, [{ role: 'user'|'assistant', message }]
 * @returns {Promise<string>} the assistant's reply text
 */
export async function getChatbotReply(userId, message, history = []) {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, message, history }),
      signal: AbortSignal.timeout(15000), // LLM calls take longer than the trust-score call
    });

    if (!response.ok) {
      throw new Error(`ai-service returned ${response.status}`);
    }

    const data = await response.json();
    if (typeof data.reply !== 'string') {
      throw new Error('ai-service response missing string reply');
    }
    return data.reply;
  } catch (error) {
    console.warn('⚠️ ai-service chatbot call failed, using fallback:', error.message);
    return "Sorry, the business advisor isn't available right now — please try again in a moment.";
  }
}

/**
 * Gets market trend insights for a product category/region.
 * @param {string} category
 * @param {string} [region]
 * @returns {Promise<object|null>} insight data, or null if unavailable
 */
export async function getMarketInsights(category, region) {
  try {
    const params = new URLSearchParams({ category, ...(region && { region }) });
    const response = await fetch(`${AI_SERVICE_URL}/market-insights?${params}`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`ai-service returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('⚠️ ai-service market-insights call failed:', error.message);
    return null; // frontend should handle "insights not available" gracefully
  }
}
