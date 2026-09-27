import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'payment_due',
        'payment_received',
        'payout_reminder',
        'committee_invite',
        'trust_update',
        'order_update',
      ],
      required: true,
    },
    title: { type: String, required: true },
    titleUr: { type: String, required: true },
    message: { type: String, required: true },
    messageUr: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
