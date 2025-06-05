const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/tags', async (req, res) => {
  const { accessToken } = req.body;

  try {
    const result = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          query {
            customer(customerAccessToken: "${accessToken}") {
              tags
            }
          }
        `,
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const tags = result.data.data.customer?.tags || [];
    res.json({ tags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tags' });
  }
});

module.exports = router;
