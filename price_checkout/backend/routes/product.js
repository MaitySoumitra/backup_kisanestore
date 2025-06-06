const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/:productId', async (req, res) => {
  const { productId } = req.params;  // Get the product ID from the URL
  const shopifyProductId = `gid://shopify/Product/${productId}`;  // Convert to Shopify global ID format

  try {
    // Fetch product details from Shopify's API
    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          query getProduct($id: ID!) {
            product(id: $id) {
              id
              title
              description
              variants(first: 10) {
                edges {
                  node {
                    id
                    title
                    priceV2 {
                      amount
                    }
                  }
                }
              }
            }
          }
        `,
        variables: { id: shopifyProductId },
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const product = response.data.data.product;
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Send the product data in the response
    res.json({
      id: product.id,
      title: product.title,
      description: product.description,
      variants: product.variants.edges.map(edge => ({
        id: edge.node.id,
        title: edge.node.title,
        price: edge.node.priceV2.amount,
      })),
    });
  } catch (error) {
    console.error('Error fetching product from Shopify:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

module.exports = router;
