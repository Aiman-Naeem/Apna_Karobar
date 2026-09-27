import mongoose from 'mongoose';

const storefrontSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // one storefront per user
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameUr: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      enum: ['tailoring', 'food', 'crafts', 'tutoring', 'other'],
      default: 'other',
    },
    description: {
      type: String,
      default: '',
    },
    descriptionUr: {
      type: String,
      default: '',
    },
    location: {
      city: { type: String, default: '' },
      area: { type: String, default: '' },
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    coverImage: {
      data: Buffer,
      contentType: String, // e.g. 'image/jpeg'
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Storefront', storefrontSchema);
