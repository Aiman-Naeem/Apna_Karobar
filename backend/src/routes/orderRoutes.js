import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Storefront from '../models/Storefront.js';
import Notification from '../models/Notification.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Place an order (customer)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { storefront: storefrontId, items, deliveryAddress, notes } = req.body;

    if (!storefrontId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'storefront and at least one item are required' });
    }

    const storefront = await Storefront.findById(storefrontId);
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });

    // Snapshot product name/price at order time so later price edits don't change past orders
    const orderItems = [];
    let totalAmount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isAvailable) {
        return res.status(400).json({ error: `Product ${item.product} is not available` });
      }
      const quantity = item.quantity || 1;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
      });
      totalAmount += product.price * quantity;
    }

    const order = new Order({
      customer: req.userId,
      storefront: storefrontId,
      items: orderItems,
      totalAmount,
      deliveryAddress,
      notes,
    });
    await order.save();

    await new Notification({
      userId: storefront.owner,
      type: 'order_update',
      title: 'New Order Received',
      titleUr: 'نیا آرڈر موصول ہوا',
      message: `You received a new order worth Rs. ${totalAmount}`,
      messageUr: `آپ کو Rs. ${totalAmount} کا نیا آرڈر ملا ہے`,
      relatedId: order._id,
    }).save();

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders placed BY the logged-in user (as a customer)
router.get('/my-orders', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.userId })
      .populate('storefront', 'name nameUr')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders received BY the logged-in user's storefront (as a seller)
router.get('/storefront/:storefrontId', verifyToken, async (req, res) => {
  try {
    const storefront = await Storefront.findById(req.params.storefrontId);
    if (!storefront) return res.status(404).json({ error: 'Storefront not found' });
    if (storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to view these orders' });
    }

    const orders = await Order.find({ storefront: req.params.storefrontId })
      .populate('customer', 'name phone')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (seller only)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const order = await Order.findById(req.params.id).populate('storefront');
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.storefront.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to update this order' });
    }

    order.status = status;
    await order.save();

    await new Notification({
      userId: order.customer,
      type: 'order_update',
      title: 'Order Status Updated',
      titleUr: 'آرڈر کی صورتحال تبدیل ہوگئی',
      message: `Your order is now: ${status}`,
      messageUr: `آپ کا آرڈر اب: ${status}`,
      relatedId: order._id,
    }).save();

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
