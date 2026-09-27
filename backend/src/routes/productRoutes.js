import express from 'express';
import multer from 'multer';
import Product from '../models/Product.js';
import Storefront from '../models/Storefront.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Images are stored directly in MongoDB as binary data, so uploads are handled
// in memory (not written to disk) and saved into the product's `image` field.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per image
});

// List products for a storefront (public).
// Excludes image.data from the list response — binary data would make this
// payload huge. The frontend should render each product's image via the
// separate GET /:id/image endpoint below (e.g. <img src="/api/products/<id>/image">).
router.get('/storefront/:storefrontId', async (req, res) => {
  try {
    const products = await Product.find({
      storefront: req.params.storefrontId,
      isAvailable: true,
    }).select('-image.data');
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve a product's image as an actual image response (public)
router.get('/:id/image', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('image');
    if (!product || !product.image || !product.image.data) {
      return res.status(404).json({ error: 'No image found for this product' });
    }
    res.set('Content-Type', product.image.contentType);
    res.send(product.image.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a product to your own storefront.
// Expects multipart/form-data: text fields + an optional "image" file field.
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { storefront: storefrontId, name, nameUr, description, descriptionUr, category, price, unit, stock } = req.body;

    if (!storefrontId || !name || price === undefined) {
      return res.status(400).json({ error: 'storefront, name, and price are required' });
    }

    const storefront = await Storefront.findById(storefrontId);
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    if (storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to add products to this storefront' });
    }

    const product = new Product({
      storefront: storefrontId,
      name,
      nameUr,
      description,
      descriptionUr,
      category,
      price,
      unit,
      stock,
    });

    if (req.file) {
      product.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await product.save();

    // Don't echo the binary buffer back in the response
    const response = product.toObject();
    delete response.image;

    res.status(201).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit a product (owner only). Image is optional — only replaced if a new file is sent.
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('storefront');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this product' });
    }

    const allowedFields = [
      'name', 'nameUr', 'description', 'descriptionUr', 'category',
      'price', 'unit', 'stock', 'isAvailable',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    if (req.file) {
      product.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    await product.save();

    const response = product.toObject();
    delete response.image;

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('storefront');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    await product.deleteOne();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
