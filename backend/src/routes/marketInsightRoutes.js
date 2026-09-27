import express from 'express';
import { getMarketInsights } from '../services/aiService.js';

const router = express.Router();

// Get market trend insights for a product category (and optionally a region).
// Public — this is informational content any user can view, not tied to a specific storefront.
router.get('/', async (req, res) => {
  try {
    const { category, region } = req.query;
    if (!category) {
      return res.status(400).json({ error: 'category query param is required' });
    }

    const insights = await getMarketInsights(category, region);
    if (!insights) {
      return res.status(503).json({ error: 'Market insights are temporarily unavailable' });
    }

    res.json(insights);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
