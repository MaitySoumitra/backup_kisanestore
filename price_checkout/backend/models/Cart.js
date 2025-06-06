const mongoose = require('mongoose');

// Schema for individual cart items
const cartItemSchema = new mongoose.Schema({
  variantId: {
    type: String,
    required: true, // Shopify ProductVariant GID
  },
  
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  }
}, { _id: false });

// Main Cart Schema
const cartSchema = new mongoose.Schema({
  // Either customerId (logged-in) or sessionId (guest)
  customerId: {
    type: String,
    required: false,
    index: true,
    unique: true,
    sparse: true,// Allow multiple guest carts, only one per customer handled in code
  },
  sessionId: {
    type: String,
    required: false,
    index: true,
    unique: true,
    sparse: true, // Still needed for guest tracking
  },
  cartId: {
    type: String,
    required: true // Shopify cart GID
  },
  checkoutUrl: {
    type: String,
    required: true
  },
  items: [cartItemSchema] // Array of product variant items
}, {
  timestamps: true
});

module.exports = mongoose.model('Cart', cartSchema);
