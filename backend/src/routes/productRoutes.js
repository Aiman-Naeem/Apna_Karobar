import express from 'express';
import Product from '../models/Product.js';
import Storefront from '../models/Storefront.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// List products for a storefront (public)
router.get('/storefront/:storefrontId', async (req, res) => {
  try {
    const products = await Product.find({
      storefront: req.params.storefrontId,
      isAvailable: true,
    });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add a product to your own storefront
router.post('/', verifyToken, async (req, res) => {
  try {
    const { storefront: storefrontId, name, nameUr, description, descriptionUr, category, price, unit, stock, imageUrl } = req.body;

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
      imageUrl,
    });
    await product.save();

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Edit / delete a product (owner only)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('storefront');
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to edit this product' });
    }

    const allowedFields = [
      'name', 'nameUr', 'description', 'descriptionUr', 'category',
      'price', 'unit', 'stock', 'imageUrl', 'isAvailable',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) product[field] = req.body[field];
    });

    await product.save();
    res.json(product);
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
