const express = require('express');
const router = express.Router();
const axios = require('axios');



router.get('/:orderId', async (req, res) => {
  const { orderId } = req.params;

  try {
    const response = await axios.get(`https://${process.env.SHOPIFY_STORE_DOMAIN }/admin/api/2024-07/orders/${orderId}.json`, {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    const order = response.data.order;
    res.render('order', { order });
  } catch (err) {
    console.error('Failed to fetch order:', err?.response?.data || err.message);
    res.status(500).send('Failed to load order details');
  }
});

module.exports = router;
