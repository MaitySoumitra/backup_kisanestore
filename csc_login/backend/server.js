import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';

dotenv.config();
const app = express();
app.use(cookieParser());

const {
  SHOPIFY_STORE_DOMAIN,
  CLIENT_ID,
  CLIENT_SECRET,
  CLIENT_TOKEN,
  CONNECT_SERVER_URI,
  CLIENT_CALLBACK_URI,
  SHOPIFY_ADMIN_TOKEN,
  SHOPIFY_STOREFRONT_TOKEN,
  CUSTOMER_PASSWORD,
} = process.env;

const AUTH_URL = `${CONNECT_SERVER_URI}/authorize`;
const TOKEN_URL = `${CONNECT_SERVER_URI}/token`;
const RESOURCE_URL = `${CONNECT_SERVER_URI}/resource`;

// Utility to encrypt client secret for secure token management
function encryptClientSecret(in_t, token) {
  const iv = Buffer.from('0000000000000000', 'utf8');
  const pre = ':';
  const post = '@';
  const prefix = Math.floor(10 + Math.random() * 90);
  const suffix = Math.floor(10 + Math.random() * 90);
  const plaintext = `${prefix}${pre}${in_t}${post}${suffix}`;
  const blockSize = 16;
  const padLength = blockSize - (plaintext.length % blockSize);
  const padded = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.alloc(padLength, padLength)]);
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(token, 'utf8'), iv);
  let encrypted = cipher.update(padded);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString('hex');
}

// Create or fetch an existing customer from Shopify
const createShopifyCustomer = async (userData) => {
  const email = userData.email;
  console.log(`🔍 Checking if customer exists for email: ${email}`);

  try {
    const response = await axios.get(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers/search.json?query=email:${email}`,
      {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN },
      }
    );

    if (response.data.customers.length > 0) {
      const customer = response.data.customers[0];
      console.log(`👤 Customer already exists: ${customer.id}`);
      return customer; // Return existing customer
    }

    const fullNameParts = userData.fullname?.split(' ') || [];
    const firstName = fullNameParts.slice(0, -1).join(' ') || userData.fullname;
    const lastName = fullNameParts.slice(-1).join('') || '';

    const customerData = {
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: userData.email,
        tags: [
          'CSC',
          `csc_id:${userData.csc_id}`,
          `vle:${userData.vle_check}`,
          `pos:${userData.POS}`,
        ],
        verified_email: true,
        accepts_marketing: false,
        state: 'enabled',
        password: CUSTOMER_PASSWORD,
        password_confirmation: CUSTOMER_PASSWORD,
        metafields: [
          {
            namespace: 'custom',
            key: 'csc_id',
            value: userData.csc_id,
            type: 'single_line_text_field',
          },
          {
            namespace: 'custom',
            key: 'user_type',
            value: userData.user_type,
            type: 'single_line_text_field',
          },
        ],
      },
    };

    const createResponse = await axios.post(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers.json`,
      customerData,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`🎉 New customer created with ID: ${createResponse.data.customer.id}`);
    return createResponse.data.customer; // Return newly created customer
  } catch (err) {
    console.error('❌ Error creating or fetching customer:', err.response?.data || err.message);
    throw err;
  }
};

// Create a customer access token (using email and password)
const createCustomerAccessToken = async (email, password) => {
  console.log(`🔑 Creating customer access token for email: ${email}`);
  try {
    const response = await axios.post(
      `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
      {
        query: `
          mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
            customerAccessTokenCreate(input: $input) {
              customerAccessToken {
                accessToken
                expiresAt
              }
              userErrors {
                message
              }
            }
          }
        `,
        variables: {
          input: {
            email,
            password,
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
      }
    );

    const tokenData = response.data.data.customerAccessTokenCreate;

    if (tokenData.userErrors.length > 0) {
      console.error('❌ Error in token creation:', tokenData.userErrors);
      throw new Error(tokenData.userErrors[0].message);
    }

    console.log('🎉 Shopify Access token created:', tokenData.customerAccessToken.accessToken);
    return tokenData.customerAccessToken;
  } catch (err) {
    console.error('❌ Error creating customer access token:', err.response?.data || err.message);
    throw err;
  }
};

// Route to handle CSC OAuth callback and manage customer access token
app.get('/auth-callback', async (req, res) => {
  const { code } = req.query;
  console.log('🔑 Received code:', code);
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CLIENT_CALLBACK_URI,
      client_id: CLIENT_ID,
      client_secret: encryptClientSecret(CLIENT_SECRET, CLIENT_TOKEN),
    });

    const tokenResponse = await axios.post(TOKEN_URL, tokenPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const cscAccessToken = tokenResponse.data.access_token;
    console.log('🎉 CSC Access Token:', cscAccessToken);

    const userResponse = await axios.get(RESOURCE_URL, {
      headers: { Authorization: `Bearer ${cscAccessToken}` },
    });

    const userData = userResponse.data.User;
    console.log('👤 User data from CSC:', userData);

    const customer = await createShopifyCustomer(userData);

    if (customer.state === 'disabled') {
      console.log('⚠️ Enabling customer...');
      await enableCustomer(customer.id);
    }

    const storefrontToken = await createCustomerAccessToken(userData.email, CUSTOMER_PASSWORD);

    // Store the access token in a cookie for future requests
    console.log('🎉 Setting cookie with storefront token:', storefrontToken.accessToken);
    res.cookie('storefrontToken', storefrontToken.accessToken, {
      httpOnly: true, // Important for security (can't be accessed via JavaScript)
      secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
      maxAge: 1000 * 60 * 60 * 24, // 1 day (adjust based on your session length)
    });

    return res.redirect('/fetch-customer-data'); // Redirect to fetch customer data
  } catch (err) {
    console.error('❌ Error during callback processing:', err.response?.data || err.message);
    return res.status(500).send(`Error: ${err.message}`);
  }
});

// Fetch customer data using the customer access token
const fetchCustomerData = async (customerAccessToken) => {
  try {
    const response = await axios.post(
      `https://${SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
      {
        query: `
          query ($customerAccessToken: String!) {
            customer(customerAccessToken: $customerAccessToken) {
              firstName
              lastName
              email
              phone
              acceptsMarketing
            }
          }
        `,
        variables: {
          customerAccessToken: customerAccessToken,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
      }
    );

    const customer = response.data.data.customer;
    if (!customer) {
      console.error('❌ No customer data found');
      return null;
    }

    console.log('👤 Fetched Customer Data:', customer);
    return customer;
  } catch (err) {
    console.error('❌ Error fetching customer data:', err.response?.data || err.message);
    throw err;
  }
};


// Example Express route to fetch customer data
app.get('/fetch-customer-data', async (req, res) => {
  const { storefrontToken } = req.cookies; // Assuming the token is stored in cookies

  if (!storefrontToken) {
    return res.status(400).send('Customer access token is missing.');
  }

  try {
    const customerData = await fetchCustomerData(storefrontToken);
    if (!customerData) {
      return res.status(404).send('Customer not found.');
    }

    // Send customer data as response (or render it on your frontend)
    return res.json(customerData);
  } catch (err) {
    return res.status(500).send(`Error: ${err.message}`);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
