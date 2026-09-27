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
