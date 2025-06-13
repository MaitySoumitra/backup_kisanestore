// auth/google.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const { findShopifyCustomerByEmail } = require('../utils/shopify');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails[0].value;
  const shopifyCustomer = await findShopifyCustomerByEmail(email);

  if (shopifyCustomer) {
    const user = await User.findOne({ email });
    return done(null, { email, isNew: false, password: user?.hashedPassword });
  }

  // New customer – ask to set password
  return done(null, { email, isNew: true });
}));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));
