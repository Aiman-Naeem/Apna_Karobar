import express from 'express';
import Storefront from '../models/Storefront.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Browse/search storefronts (public — customers don't need to be logged in to browse)
router.get('/', async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (city) filter['location.city'] = city;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const storefronts = await Storefront.find(filter).populate('owner', 'name phone');
    res.json(storefronts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.id).populate('owner', 'name phone');
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    res.json(storefront);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a storefront (one per user)
router.post('/', verifyToken, async (req, res) => {
  try {
    const existing = await Storefront.findOne({ owner: req.userId });
    if (existing) {
      return res.status(400).json({ error: 'You already have a storefront' });
    }

    const { name, nameUr, category, description, descriptionUr, location, contactPhone } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Storefront name is required' });
    }

    const storefront = new Storefront({
      owner: req.userId,
      name,
      nameUr,
      category,
      description,
      descriptionUr,
      location,
      contactPhone,
    });
    await storefront.save();

    await User.findByIdAndUpdate(req.userId, { storefront: storefront._id });

    res.status(201).json(storefront);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own storefront
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.id);
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    if (storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this storefront' });
    }

    const allowedFields = [
      'name', 'nameUr', 'category', 'description', 'descriptionUr',
      'location', 'contactPhone', 'coverImage', 'isActive',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) storefront[field] = req.body[field];
    });

    await storefront.save();
    res.json(storefront);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
