import express from 'express';
import multer from 'multer';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Storefront from '../models/Storefront.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

const router = express.Router();

const hasLocationInput = (body) =>
  body.location !== undefined || body['location[city]'] !== undefined || body['location[area]'] !== undefined;

const getLocation = (body, current = {}) => {
  const nested = body.location && typeof body.location === 'object' ? body.location : {};
  return {
    city: body['location[city]'] ?? nested.city ?? current.city ?? '',
    area: body['location[area]'] ?? nested.area ?? current.area ?? '',
  };
};

// Browse/search storefronts (public). Excludes coverImage.data for the same
// reason as products — use GET /:id/cover-image to render each one's image.
router.get('/', async (req, res) => {
  try {
    const { category, city, search } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (city) filter['location.city'] = city;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const storefronts = await Storefront.find(filter)
      .select('-coverImage.data')
      .populate('owner', 'name phone');
    res.json(storefronts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.id)
      .select('-coverImage.data')
      .populate('owner', 'name phone');
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    res.json(storefront);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id/stats', verifyToken, async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.id);
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    if (storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to view these stats' });
    }

    const [totalProducts, totalOrders, revenueResult] = await Promise.all([
      Product.countDocuments({ storefront: storefront._id }),
      Order.countDocuments({ storefront: storefront._id }),
      Order.aggregate([
        { $match: { storefront: storefront._id, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } },
      ]),
    ]);

    res.json({
      totalProducts,
      totalOrders,
      totalRevenue: revenueResult[0]?.totalRevenue || 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve a storefront's cover image as an actual image response (public)
router.get('/:id/cover-image', async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.id).select('coverImage');
    if (!storefront || !storefront.coverImage || !storefront.coverImage.data) {
      return res.status(404).json({ error: 'No cover image found for this storefront' });
    }
    res.set('Content-Type', storefront.coverImage.contentType);
    res.send(storefront.coverImage.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a storefront (one per user). multipart/form-data with optional "coverImage" file.
router.post('/', verifyToken, upload.single('coverImage'), async (req, res) => {
  try {
    const existing = await Storefront.findOne({ owner: req.userId });
    if (existing) {
      return res.status(400).json({ error: 'You already have a storefront' });
    }

    const { name, nameUr, category, description, descriptionUr, contactPhone } = req.body;
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
      location: getLocation(req.body),
      contactPhone,
    });

    if (req.file) {
      storefront.coverImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await storefront.save();
    await User.findByIdAndUpdate(req.userId, { storefront: storefront._id });

    const response = storefront.toObject();
    delete response.coverImage;

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update own storefront. Cover image only replaced if a new file is sent.
router.put('/:id', verifyToken, upload.single('coverImage'), async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.id);
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    if (storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this storefront' });
    }

    const allowedFields = [
      'name', 'nameUr', 'category', 'description', 'descriptionUr',
      'location', 'contactPhone', 'isActive',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) storefront[field] = req.body[field];
    });
    if (hasLocationInput(req.body)) storefront.location = getLocation(req.body, storefront.location);

    if (req.file) {
      storefront.coverImage = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await storefront.save();

    const response = storefront.toObject();
    delete response.coverImage;

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
