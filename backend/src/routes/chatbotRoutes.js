import express from 'express';
import ChatMessage from '../models/ChatMessage.js';
import { verifyToken } from '../middleware/auth.js';
import { getChatbotReply } from '../services/aiService.js';

const router = express.Router();

// Send a message to the AI business-advice chatbot (calls ai-service).
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

    // Pull recent history in this session to give ai-service conversational context
    const history = await ChatMessage.find({ user: req.userId, sessionId })
      .sort({ createdAt: 1 })
      .limit(20)
      .select('role message -_id');

    const replyText = await getChatbotReply(req.userId, message, history);

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
