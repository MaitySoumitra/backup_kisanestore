// routes/user.js
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

router.get('/', async (req, res) => {
  const token = req.query.token;

  if (!token) return res.status(400).json({ error: 'Token is required' });

  try {
    const shopifyRes = await fetch('https://kisanestoredev.myshopify.com/api/2024-01/graphql.json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
      },
      
      body: JSON.stringify({
        query: `
          query {
            customer(customerAccessToken: "${token}") {
              email
              firstName
              tags
            }
          }
        `,
      }),
    });

    const { data } = await shopifyRes.json();
    const customer = data?.customer;

    if (!customer) return res.status(401).json({ error: 'Invalid token' });

    res.json(customer);
  } catch (error) {
    console.error('Failed to fetch user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
