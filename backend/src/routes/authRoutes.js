import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// NOTE: OTP is mocked for the demo/competition build (always '123456').
// Before any real deployment, replace sendOtp with a real SMS provider call
// and store/verify a generated OTP (with expiry) instead of a hardcoded value.
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number required' });
    }

    const otp = '123456'; // mock — replace with real SMS OTP service later
    console.log(`OTP for ${phone}: ${otp}`);

    res.json({
      success: true,
      message: 'OTP sent successfully',
      // only echo the OTP back in non-production so the mobile app can auto-fill during dev/testing
      otp: process.env.NODE_ENV === 'production' ? undefined : otp,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP are required' });
    }
    if (otp !== '123456') {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    let user = await User.findOne({ phone });

    if (!user) {
      user = new User({
        name: name || `User_${phone.slice(-4)}`,
        phone,
        profileComplete: !!name,
      });
      await user.save();
    } else {
      user.lastActive = new Date();
      await user.save();
    }

    const token = jwt.sign({ userId: user._id, phone: user.phone }, process.env.JWT_SECRET, {
      expiresIn: '30d',
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        trustScore: user.trustScore,
        language: user.language,
        profileComplete: user.profileComplete,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-__v');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/update-profile', verifyToken, async (req, res) => {
  try {
    const { name, language } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { ...(name && { name }), ...(language && { language }), profileComplete: true },
      { new: true }
    ).select('-__v');
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
