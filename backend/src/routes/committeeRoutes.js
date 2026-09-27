import express from 'express';
import Committee from '../models/Committee.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { verifyToken } from '../middleware/auth.js';
import { getMlTrustScore } from '../services/aiService.js';

const router = express.Router();

// Get all committees the logged-in user belongs to
router.get('/', verifyToken, async (req, res) => {
  try {
    const committees = await Committee.find({
      members: req.userId,
      status: 'active',
    }).populate('createdBy', 'name phone');

    res.json(committees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new committee
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, nameUr, monthlyAmount, totalMembers, duration, language } = req.body;

    if (!name || !monthlyAmount || !totalMembers) {
      return res.status(400).json({ error: 'Name, monthly amount, and total members are required' });
    }

    const totalDuration = duration || totalMembers;

    const committee = new Committee({
      name,
      nameUr: nameUr || name,
      monthlyAmount,
      totalMembers,
      duration: totalDuration,
      createdBy: req.userId,
      members: [req.userId],
      status: 'active',
      language: language || 'ur',
      payments: [],
    });

    // Generate the creator's payment schedule for the full duration
    for (let month = 1; month <= totalDuration; month++) {
      committee.payments.push({
        userId: req.userId,
        month,
        amount: monthlyAmount,
        dueDate: new Date(Date.now() + month * 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
      });
    }
    committee.nextPayoutDate = new Date(Date.now() + totalDuration * 30 * 24 * 60 * 60 * 1000);

    await committee.save();

    await new Notification({
      userId: req.userId,
      type: 'committee_invite',
      title: 'Committee Created',
      titleUr: 'کمیٹی بن گئی',
      message: `Your committee "${name}" has been created successfully`,
      messageUr: `آپ کی کمیٹی "${committee.nameUr}" کامیابی سے بن گئی`,
      relatedId: committee._id,
    }).save();

    res.status(201).json(committee);
  } catch (error) {
    console.error('Error creating committee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join a committee via invite code
router.post('/join', verifyToken, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) {
      return res.status(400).json({ error: 'Invite code is required' });
    }

    const committee = await Committee.findOne({
      inviteCode: inviteCode.toUpperCase(),
      status: 'active',
    });
    if (!committee) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    if (committee.members.includes(req.userId)) {
      return res.status(400).json({ error: 'Already a member' });
    }
    if (committee.members.length >= committee.totalMembers) {
      return res.status(400).json({ error: 'Committee is full' });
    }

    committee.members.push(req.userId);

    for (let month = committee.currentMonth; month <= committee.duration; month++) {
      committee.payments.push({
        userId: req.userId,
        month,
        amount: committee.monthlyAmount,
        dueDate: new Date(Date.now() + (month - committee.currentMonth + 1) * 30 * 24 * 60 * 60 * 1000),
        status: 'pending',
      });
    }

    await committee.save();

    await new Notification({
      userId: req.userId,
      type: 'committee_invite',
      title: 'Joined Committee',
      titleUr: 'کمیٹی میں شامل ہوگئے',
      message: `You have joined ${committee.name}`,
      messageUr: `آپ ${committee.nameUr} میں شامل ہوگئے ہیں`,
      relatedId: committee._id,
    }).save();

    res.json(committee);
  } catch (error) {
    console.error('Error joining committee:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark a payment as paid — recalculates trust score via User.recalculateTrustScore()
router.post('/:committeeId/pay', verifyToken, async (req, res) => {
  try {
    const { committeeId } = req.params;
    const { month } = req.body;

    const committee = await Committee.findById(committeeId);
    if (!committee) return res.status(404).json({ error: 'Committee not found' });

    const payment = committee.payments.find(
      (p) => p.userId.toString() === req.userId && p.month === month
    );
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status === 'paid') {
      return res.status(400).json({ error: 'Payment already made' });
    }

    payment.status = 'paid';
    payment.paidDate = new Date();
    payment.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await committee.save();

    const user = await User.findById(req.userId);

    // Gather this user's full payment history across all their committees —
    // ai-service's model expects the full history, not just this one payment.
    const allCommittees = await Committee.find({ members: req.userId });
    const paymentHistory = allCommittees.flatMap((c) =>
      c.payments.filter((p) => p.userId.toString() === req.userId)
    );

    const newTrustScore = await getMlTrustScore(req.userId, paymentHistory);
    user.trustScore = newTrustScore;
    await user.save();

    await new Notification({
      userId: req.userId,
      type: 'payment_received',
      title: 'Payment Received',
      titleUr: 'ادائیگی موصول ہوگئی',
      message: `Payment of Rs. ${payment.amount} received for ${committee.name}`,
      messageUr: `${committee.nameUr} کی Rs. ${payment.amount} کی ادائیگی موصول ہوگئی`,
      relatedId: committee._id,
    }).save();

    res.json({
      success: true,
      payment,
      trustScore: newTrustScore,
      message: 'Payment recorded successfully',
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Committee details, including the logged-in user's own payment rows
router.get('/:committeeId', verifyToken, async (req, res) => {
  try {
    const committee = await Committee.findById(req.params.committeeId)
      .populate('members', 'name phone trustScore')
      .populate('createdBy', 'name phone');

    if (!committee) return res.status(404).json({ error: 'Committee not found' });

    const userPayments = committee.payments.filter(
      (p) => p.userId.toString() === req.userId
    );

    res.json({ ...committee.toObject(), userPayments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
