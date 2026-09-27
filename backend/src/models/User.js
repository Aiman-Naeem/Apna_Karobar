import mongoose from 'mongoose';

// Single User model shared across storefronts, orders, and the kameti (committee) feature.
// Anything that used to be a separate "Micro-Nisa User" now just references this model by _id.
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['entrepreneur', 'customer', 'both'],
      default: 'both',
    },
    language: {
      type: String,
      enum: ['ur', 'en'],
      default: 'ur',
    },

    // Kameti-related fields (from Micro-Nisa)
    trustScore: {
      type: Number,
      default: 50,
      min: 0,
      max: 100,
    },

    // Storefront ownership — null if this user hasn't created one
    storefront: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Storefront',
      default: null,
    },

    profilePicture: {
      type: String,
      default: '',
    },
    profileComplete: {
      type: Boolean,
      default: false,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

// NOTE: trustScore is no longer computed here. It's set by the ML model in
// ai-service (see src/services/aiService.js + committeeRoutes.js's /pay route).
// This model just stores whatever value ai-service returns.

export default mongoose.model('User', userSchema);
