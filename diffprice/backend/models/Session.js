const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true },
  customer: {
    id: String,
    email: String,
    firstName: String,
    lastName: String,
    tags: [String],
  },
  expiresAt: { type: Date, required: true },

  // ✅ Add this if missing
  paymentInfo: {
    orderId: String,
    transactionId: String,
    cscTxn: String,
    amount: String,
    status: String,
    updatedAt: Date
  }
}, { timestamps: true });

module.exports = mongoose.model('Session', sessionSchema);
