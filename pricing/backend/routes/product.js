const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  const { accessToken, productId } = req.body;

  if (!accessToken || !productId) {
    return res.status(400).json({ error: 'Missing accessToken or productId' });
  }

  try {
    // 1. Fetch customer data
    const customerRes = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          query {
            customer(customerAccessToken: "${accessToken}") {
              email
              firstName
              lastName
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

    const customer = customerRes.data.data.customer;
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const isCSCUser = customer.tags.some(tag => tag.startsWith('csc_id'));

    // 2. Fetch product data by ID
    const productRes = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          query getProduct($id: ID!) {
            product(id: $id) {
              title
              variants(first: 1) {
                edges {
                  node {
                    id
                    price {
                      amount
                    }
                  }
                }
              }
            }
          }
        `,
        variables: {
          id: `gid://shopify/Product/${productId}`,
        },
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

    const originalPrice = parseFloat(product.variants.edges[0].node.price.amount);
    const generalUserPrice = originalPrice.toFixed(2);
    const cscUserPrice = (originalPrice * 0.8).toFixed(2); // 20% discount

    // Log everything in console
    console.log('\n📦 Product Access Log');
    console.log('Customer:', `${customer.firstName} ${customer.lastName} (${customer.email})`);
    console.log('User Type:', isCSCUser ? 'CSC User' : 'General User');
    console.log('Product Title:', product.title);
    console.log('General Price:', `$${generalUserPrice}`);
    console.log('CSC Price (20% off):', `$${cscUserPrice}`);
    console.log('---------------------------\n');

    // Return info to frontend
    res.json({
      customer: {
        name: `${customer.firstName} ${customer.lastName}`,
        email: customer.email,
        type: isCSCUser ? 'csc' : 'general',
      },
      product: {
        title: product.title,
        generalUserPrice,
        cscUserPrice,
      },
      applicablePrice: isCSCUser ? cscUserPrice : generalUserPrice,
    });

  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
