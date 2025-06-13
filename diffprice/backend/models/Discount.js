const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  discountPercentage: { type: Number, required: true },
  couponCode: { type: String },
  shopifyDiscountId: { type: String },
  isActive: { type: Boolean, default: true },
  startsAt: { type: Date, default: Date.now },
  endsAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Discount', discountSchema);
