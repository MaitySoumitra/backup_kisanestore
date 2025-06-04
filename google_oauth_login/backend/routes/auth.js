// routes/auth.js
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const {
  createShopifyCustomer,
  generateCustomerAccessToken
} = require('../utils/shopify');

const router = express.Router();

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', passport.authenticate('google', { session: false }), (req, res) => {
  const { email, isNew } = req.user;

  if (isNew) {
    return res.redirect(`/set-password?email=${encodeURIComponent(email)}`);
  }

  // existing user – generate access token
  return res.redirect(`/auth/existing-login?email=${encodeURIComponent(email)}`);
});

// POST form from set-password page
router.post('/complete-signup', async (req, res) => {
  const { email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.status(400).send('Passwords do not match.');

  const hashedPassword = await bcrypt.hash(password, 10);
  await createShopifyCustomer(email, password);
  await User.create({ email, hashedPassword });

  const token = await generateCustomerAccessToken(email, password);
  res.cookie('customerToken', token, { httpOnly: true });
  res.redirect('/');
});

// For existing users
router.get('/existing-login', async (req, res) => {
  const { email } = req.query;
  const user = await User.findOne({ email });
  const password = user?.hashedPassword;

  if (!user || !password) return res.redirect('/set-password?email=' + email);

  const isValid = await bcrypt.compare(password, password); // password already hashed
  const token = await generateCustomerAccessToken(email, password);
  res.cookie('customerToken', token, { httpOnly: true });
  res.redirect('/');
});

module.exports = router;
