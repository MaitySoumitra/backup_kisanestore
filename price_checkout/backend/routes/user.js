const express = require('express');
const router = express.Router();
const Session = require('../models/Session');
const axios = require('axios');

router.get('/me', async (req, res) => {
  try {
    const sessionId = req.cookies.customer_sid;
    const productId = req.query.productId;

    if (!sessionId) return res.status(401).json({ error: 'No session' });

    const session = await Session.findOne({ sessionId });
    if (!session || new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const customer = session.customer;
    const isCscUser = customer.tags.some(tag => tag.startsWith('csc_id'));

    let productInfo = null;

    if (productId) {
      const productRes = await axios.post(
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
        {
          query: `query getProduct($id: ID!) {
            product(id: $id) {
              title
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    price {
                      amount
                    }
                    compareAtPrice {
                      amount
                    }
                  }
                }
              }
            }
          }`,
          variables: { id: `gid://shopify/Product/${productId}` },
        },
        {
          headers: {
            'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
            'Content-Type': 'application/json',
          },
        }
      );

      const product = productRes.data.data.product;
      if (!product) return res.status(404).json({ error: 'Product not found' });

      // Find matching variant based on user type
      const variantEdge = product.variants.edges.find(edge =>
        isCscUser
          ? edge.node.title.toLowerCase().includes('csc')
          : edge.node.title.toLowerCase().includes('default')
      );

      if (!variantEdge) return res.status(404).json({ error: 'Matching variant not found' });

      const variant = variantEdge.node;
      const price = parseFloat(variant.price.amount).toFixed(2);
      const compareAtPrice = variant.compareAtPrice?.amount
        ? parseFloat(variant.compareAtPrice.amount).toFixed(2)
        : null;

      productInfo = {
        title: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        applicablePrice: price,
        compareAtPrice,
      };
    }

    res.json({
      user: {
        email: customer.email,
        userType: isCscUser ? 'csc' : 'general',
      },
      product: productInfo,
    });
  } catch (err) {
    console.error('Error /me:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
