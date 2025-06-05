const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  const { email, password, productId } = req.body;

  try {
    // 1. Create customer access token
    const tokenResponse = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
              customerAccessToken {
                accessToken
                expiresAt
              }
              customerUserErrors {
                message
              }
            }
          }
        `,
        variables: { input: { email, password } },
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    const tokenData = tokenResponse.data.data.customerAccessTokenCreate;

    if (tokenData.customerUserErrors.length > 0 || !tokenData.customerAccessToken) {
      console.log('❌ Invalid credentials:', tokenData.customerUserErrors);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const accessToken = tokenData.customerAccessToken.accessToken;

    // 2. Fetch customer info
    const customerResponse = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
      {
        query: `
          query {
            customer(customerAccessToken: "${accessToken}") {
              id
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

    const customer = customerResponse.data.data.customer;
    if (!customer) return res.status(404).json({ error: 'Customer not found' });

    const isCscUser = customer.tags.some(tag => tag.startsWith('csc_id'));

    let productInfo = null;

    if (productId) {
      // 3. Fetch product details
      const productRes = await axios.post(
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`,
        {
          query: `
            query getProduct($id: ID!) {
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

      // 4. Match variant based on user type
      const variantEdge = product.variants.edges.find(edge =>
        isCscUser
          ? edge.node.title.toLowerCase().includes('csc')
          : edge.node.title.toLowerCase().includes('default')
      );

      if (!variantEdge) {
        return res.status(404).json({ error: 'Matching variant not found for user type' });
      }

      const variant = variantEdge.node;
      const price = parseFloat(variant.price.amount).toFixed(2);
      const compareAtPrice = variant.compareAtPrice?.amount
        ? parseFloat(variant.compareAtPrice.amount).toFixed(2)
        : null;

      console.log('\n📦 Product Variant Access Log');
      console.log('User:', `${customer.firstName} ${customer.lastName} (${customer.email})`);
      console.log('User Type:', isCscUser ? 'CSC User' : 'General User');
      console.log('Variant:', variant.title);
      console.log('Price:', `$${price}`);
      console.log('Compare At Price:', compareAtPrice ? `$${compareAtPrice}` : 'N/A');
      console.log('---------------------------\n');

      productInfo = {
        title: product.title,
        variantId: variant.id,
        variantTitle: variant.title,
        applicablePrice: price,
        compareAtPrice,
      };
    }

    // 5. Final response
    res.json({
      accessToken,
      user: {
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        tags: customer.tags,
        userType: isCscUser ? 'csc' : 'general',
      },
      product: productInfo, // Can be null if not provided
    });

  } catch (error) {
    console.error('🔥 Login failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
