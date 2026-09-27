import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    storefront: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Storefront',
      required: true,
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
    description: {
      type: String,
      default: '',
    },
    descriptionUr: {
      type: String,
      default: '',
    },
    category: {
      type: String,
      default: 'general',
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    unit: {
      type: String,
      default: 'item', // e.g. 'item', 'kg', 'dozen', 'hour'
    },
    stock: {
      type: Number,
      default: null, // null = unlimited / made-to-order (e.g. tailoring)
    },
    image: {
      data: Buffer,
      contentType: String, // e.g. 'image/jpeg'
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

productSchema.index({ storefront: 1, isAvailable: 1 });

export default mongoose.model('Product', productSchema);
