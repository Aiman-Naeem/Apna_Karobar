import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Send a message to the AI business-advice chatbot.
// TODO (Person C): replace the placeholder reply below with a real call to your
// chosen LLM API. Keep the request/response shape the same so the frontend doesn't change.
router.post('/message', verifyToken, async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'message and sessionId are required' });
    }

    await new ChatMessage({
      user: req.userId,
      sessionId,
      role: 'user',
      message,
    }).save();

    // --- placeholder reply — swap this block for the real LLM API call ---
    const replyText = "Thanks for your question! (AI response not yet connected.)";
    // -----------------------------------------------------------------------

    const reply = await new ChatMessage({
      user: req.userId,
      sessionId,
      role: 'assistant',
      message: replyText,
    }).save();

    res.json({ reply: reply.message, sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get message history for a chat session
router.get('/history/:sessionId', verifyToken, async (req, res) => {
  try {
    const messages = await ChatMessage.find({
      user: req.userId,
      sessionId: req.params.sessionId,
    }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
