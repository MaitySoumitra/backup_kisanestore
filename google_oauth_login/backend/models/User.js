// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: String,
  shopifyId: String,
  hashedPassword: String
});

module.exports = mongoose.model('User', userSchema);
