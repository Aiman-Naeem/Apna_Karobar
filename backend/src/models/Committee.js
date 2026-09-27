import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    month: Number,
    amount: Number,
    status: { type: String, enum: ['pending', 'paid', 'late'], default: 'pending' },
    dueDate: Date,
    paidDate: Date,
    transactionId: String,
  },
  { _id: false }
);

const committeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameUr: { type: String, trim: true },
    monthlyAmount: { type: Number, required: true, min: 100 },
    totalMembers: { type: Number, required: true, min: 2, max: 50 },
    duration: { type: Number }, // number of months; defaults to totalMembers if not set
    currentMonth: { type: Number, default: 1 },
    inviteCode: { type: String, unique: true, sparse: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['active', 'completed', 'cancelled'], default: 'active' },
    language: { type: String, enum: ['ur', 'en'], default: 'ur' },
    nextPayoutDate: Date,
    payments: [paymentSchema],
  },
  { timestamps: true }
);

// Auto-generate an 8-character invite code before first save
committeeSchema.pre('save', function (next) {
  if (!this.inviteCode) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    this.inviteCode = code;
  }
  next();
});

export default mongoose.model('Committee', committeeSchema);
