const express = require('express');
const router = express.Router();
const Session = require('../models/Session'); // Your session model

router.post('/custom-checkout', async (req, res) => {
  const sessionId = req.cookies.customer_sid;

  if (!sessionId) {
    console.log('❌ No session ID found in cookie');
    return res.status(401).json({ error: 'Not logged in' });
  }

  const session = await Session.findOne({ sessionId });
  if (!session || new Date() > session.expiresAt) {
    console.log('❌ Session expired or invalid:', session);
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  // CSC user check
  if (!req.session || req.session.userType !== 'csc') {
    console.log('❌ Unauthorized access:', req.session);
    return res.status(403).json({ error: 'Unauthorized CSC access' });
  }

  const customer = session.customer;
  console.log('✅ Session valid for:', customer.email);

  try {
    const { variantId, quantity } = req.body;

    const paymentAmount = 100; // Replace with logic for pricing
    const redirectUrl = `${process.env.PAY_URL}/pay?amount=${paymentAmount}&variant=${variantId}&email=${customer.email}`;

    return res.json({ redirectUrl });

  } catch (error) {
    console.error('CSC checkout error:', error);
    return res.status(500).json({ error: 'Server error during checkout' });
  }
});

module.exports = router;
