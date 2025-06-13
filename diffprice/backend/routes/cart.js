const express = require('express');
const router = express.Router();
const axios = require('axios');
const Cart = require('../models/Cart');
const Session = require('../models/Session');


// Helper: identify customer or guest session


// POST /api/cart/add
router.post('/add', async (req, res) => {
  const { variantId, quantity = 1 } = req.body;

  const sessionId = req.cookies?.customer_sid || req.sessionID;

  if (!variantId) {
    return res.status(400).json({ error: 'variantId is required' });
  }

  try {
    // Fetch session to get customerId (if logged in)
    const session = await Session.findOne({ sessionId });
    const customerId = session?.customer?.id || null;

    // Step 1: Look for an existing cart for this customer or session
    let cart = await Cart.findOne({
      ...(customerId ? { customerId } : { sessionId })
    });

    // Step 2: Create a new Shopify cart if none found
    if (!cart) {
      const createRes = await axios.post(
        `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`,
        {
          query: `
            mutation {
              cartCreate {
                cart {
                  id
                  checkoutUrl
                }
              }
            }
          `
        },
        {
          headers: {
            'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
            'Content-Type': 'application/json'
          }
        }
      );

      const createdCart = createRes.data.data.cartCreate.cart;

      cart = await Cart.create({
        cartId: createdCart.id,
        checkoutUrl: createdCart.checkoutUrl,
        customerId,
        sessionId,
        items: []
      });
    }

    // Step 3: Add item to Shopify cart
    const shopifyAddRes = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`,
      {
        query: `
          mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
            cartLinesAdd(cartId: $cartId, lines: $lines) {
              cart {
                id
              }
              userErrors {
                message
              }
            }
          }
        `,
        variables: {
          cartId: cart.cartId,
          lines: [{ quantity, merchandiseId: variantId }]
        }
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const userErrors = shopifyAddRes.data.data.cartLinesAdd?.userErrors || [];
    if (userErrors.length > 0) {
      return res.status(400).json({ error: 'Shopify cartLinesAdd error', details: userErrors });
    }

    // Step 4: Update MongoDB cart
    const existingItem = cart.items.find(item => item.variantId === variantId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ variantId, quantity });
    }

    await cart.save();

    res.json(cart);
  } catch (error) {
    console.error('Add to cart failed:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to add to cart' });
  }
});

// GET or POST /api/cart/fetch
router.post('/fetch', async (req, res) => {
  const customerId = req.user?.id || null;
  const sessionId = req.sessionID;

  try {
    const cart = await Cart.findOne({
      $or: [
        { customerId: customerId || null },
        { sessionId: sessionId || null }
      ]
    });

    if (!cart) {
      return res.json({ items: [], cartId: null });
    }

    res.json({
      cartId: cart.cartId,
      checkoutUrl: cart.checkoutUrl,
      items: cart.items
    });
  } catch (err) {
    console.error('Fetch cart error:', err.message);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});


router.post('/checkout', async (req, res) => {
  const sessionId = req.cookies?.customer_sid;

  if (!sessionId) {
    return res.status(401).json({ error: 'Session ID missing' });
  }

  try {
    // Find session by sessionId from cookie
    const session = await Session.findOne({ sessionId });

    if (!session || !session.accessToken) {
      return res.status(401).json({ error: 'Session or access token not found' });
    }

    const customerAccessToken = session.accessToken;

    // Try to find cart by customerId if logged in
    let cart = null;
    if (session.customer?.id) {
      cart = await Cart.findOne({ customerId: session.customer.id });
    }

    // Fallback: find cart by sessionId if no cart found for customerId
    if (!cart) {
      cart = await Cart.findOne({ sessionId });
    }

    console.log('Checkout cart query:', session.customer?.id ? { customerId: session.customer.id } : { sessionId });
    console.log('Found cart:', cart);

    if (!cart || !cart.items.length) {
      return res.status(400).json({ error: 'Cart is empty or not found' });
    }

    // Prepare lines for Shopify GraphQL mutation
    const lines = cart.items.map(item => ({
      merchandiseId: item.variantId,
      quantity: item.quantity
    }));

    const mutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        lines,
        buyerIdentity: {
          customerAccessToken
        }
      }
    };

    // Call Shopify Storefront API
    const response = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-10/graphql.json`,
      { query: mutation, variables },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;

    if (data.errors) {
      console.error('GraphQL errors:', data.errors);
      return res.status(500).json({ error: 'GraphQL error', details: data.errors });
    }

    const result = data.data?.cartCreate;

    if (!result || result.userErrors?.length > 0) {
      console.error('User errors:', result?.userErrors);
      return res.status(400).json({
        error: 'Cart creation failed',
        details: result?.userErrors || 'Unknown error'
      });
    }

    return res.status(200).json({ success: true, checkoutUrl: result.cart.checkoutUrl });

  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
});
module.exports = router;
