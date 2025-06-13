const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const Session = require('../models/Session');

router.post('/login', async (req, res) => {
  const { email, password, productId } = req.body;

  try {
    // 1. Create customer access token
    const tokenResponse = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-07/graphql.json`,
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
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-07/graphql.json`,
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
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-07/graphql.json`,
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

   const sessionId = crypto.randomBytes(24).toString('hex');

const existingSession = await Session.findOne({ 'customer.id': customer.id });

if (existingSession && new Date() < existingSession.expiresAt) {
  // Update existing session with new access token, new sessionId and expiry
  existingSession.accessToken = accessToken;
  existingSession.sessionId = sessionId;
  existingSession.expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
  await existingSession.save();
} else {
  // Create new session if none exists or expired
  await Session.create({
    sessionId,
    accessToken,
    customer: {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      tags: customer.tags,
    },
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
  });
}

// Set cookie with the updated or new sessionId
res.cookie('customer_sid', sessionId, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ⬅ only secure in prod
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  maxAge: 3 * 24 * 60 * 60 * 1000,
});


    // ===== END SESSION CREATION & COOKIE SETTING =====

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
router.get('/me', async (req, res) => {
  const sessionId = req.cookies.customer_sid;
  if (!sessionId) return res.status(401).json({ error: 'Not logged in' });

  // Lookup session
  const session = await Session.findOne({ sessionId });
  if (!session || new Date() > session.expiresAt) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  try {
    // Use customerAccessToken to fetch fresh Shopify customer data
    const customerRes = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-07/graphql.json`,
      {
        query: `
          query {
            customer(customerAccessToken: "${session.accessToken}") {
              id
              email
              firstName
              lastName
              tags
            }
          }
        `
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json',
        }
      }
    );

    const customer = customerRes.data.data.customer;
    if (!customer) {
      return res.status(401).json({ error: 'Invalid or expired customer token' });
    }

    // Send Shopify customer data including customerId
    res.json({
      customerId: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      tags: customer.tags,
      userType: customer.tags.some(tag => tag.startsWith('csc_id')) ? 'csc' : 'general',
    });

  } catch (err) {
    console.error('Failed to fetch customer from Shopify:', err.response?.data || err.message);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});
router.get('/session', async (req, res) => {
  const sessionId = req.cookies.customer_sid;
  if (!sessionId) return res.status(401).json({ error: 'Not logged in' });

  const session = await Session.findOne({ sessionId });
  if (!session || new Date() > session.expiresAt) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  res.json({ 
    sessionId: session.sessionId,
    customer: session.customer,
    expiresAt: session.expiresAt,
  });
});


router.post('/logout', async (req, res) => {
  const sessionId = req.cookies.customer_sid;
  if (sessionId) {
    await Session.deleteOne({ sessionId });
    res.clearCookie('customer_sid', { httpOnly: true, secure: true, sameSite: 'None' });
  }
  res.json({ message: 'Logged out' });
});


module.exports = router;
