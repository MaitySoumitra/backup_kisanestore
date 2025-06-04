require('dotenv').config();
const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB connection
let db;
const usersCollectionName = 'users';

MongoClient.connect(process.env.MONGO_URI, { useUnifiedTopology: true })
  .then(client => {
    db = client.db();
    console.log('✅ Connected to MongoDB');
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Redirect to Google OAuth
app.get('/auth/google', (req, res) => {
  const redirect = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.GOOGLE_CLIENT_ID}` +
    `&redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&response_type=code&scope=profile email&prompt=select_account`;
  res.redirect(redirect);
});

// Google OAuth callback
app.get('/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');

  try {
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    });

    const access_token = tokenRes.data.access_token;
    const profileRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const { email, name } = profileRes.data;
    console.log(`🔍 Google OAuth login for: ${email} (${name})`);

    const existingCustomer = await findShopifyCustomerByEmail(email);

    if (existingCustomer) {
      console.log(`✅ Existing Shopify customer found: ${email}`);

      const user = await db.collection(usersCollectionName).findOne({ email });
      if (!user || !user.password || !user.salt) {
        console.log('⚠️ No stored password found. Cannot log in.');
        return res.send('Login failed: stored password missing.');
      }

      const password = user.passwordPlain;
      const shopifyToken = await getShopifyAccessToken(email, password);
      const customerData = await fetchShopifyCustomer(shopifyToken);
      return res.redirect(`/welcome?firstName=${encodeURIComponent(customerData.firstName)}`);
    }

    console.log(`🆕 New customer. Redirecting to password setup.`);
    return res.redirect(`/set-password?email=${encodeURIComponent(email)}&name=${encodeURIComponent(name)}`);
  } catch (err) {
    console.error('OAuth callback error:', err.response?.data || err.message);
    res.status(500).send('OAuth error');
  }
});

// Password setup form
app.get('/set-password', (req, res) => {
  const { email, name } = req.query;
  if (!email) return res.send("Invalid access.");

  res.send(`
    <h2>Set Password for ${email}</h2>
    <form method="POST" action="/auth/complete-signup">
      <input type="hidden" name="email" value="${email}" />
      <input type="hidden" name="name" value="${name}" />
      <input name="password" type="password" placeholder="Set password" required /><br/>
      <input name="confirmPassword" type="password" placeholder="Confirm password" required /><br/>
      <button type="submit">Create Account</button>
    </form>
  `);
});

// Complete signup
app.post('/auth/complete-signup', async (req, res) => {
  const { email, name, password, confirmPassword } = req.body;
  if (password !== confirmPassword) return res.send('Passwords do not match.');

  const salt = crypto.randomBytes(8).toString('hex');
  const hashedPassword = hashPassword(password, salt);
  console.log(`🔐 Saving password with salt: ${salt}`);

  await db.collection(usersCollectionName).updateOne(
    { email },
    {
      $set: {
        email,
        name,
        password: hashedPassword,
        salt,
        passwordPlain: password // NOTE: only for testing — remove in production!
      }
    },
    { upsert: true }
  );

  try {
    const existingCustomer = await findShopifyCustomerByEmail(email);
    if (existingCustomer) {
      console.log('🔍 Customer already exists in Shopify:', existingCustomer);
      const shopifyToken = await getShopifyAccessToken(email, password);
      const customerData = await fetchShopifyCustomer(shopifyToken);
      return res.redirect(`/welcome?firstName=${encodeURIComponent(customerData.firstName)}`);
    }

    console.log(`📩 Creating Shopify customer for ${email}...`);
    const createRes = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers.json`,
      {
        customer: {
          email,
          first_name: name?.split(' ')[0],
          last_name: name?.split(' ').slice(1).join(' ') || '',
          password,
          password_confirmation: password,
          send_email_welcome: false
        }
      },
      {
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const createdCustomer = createRes.data.customer;
    if (!createdCustomer) {
      console.error('❌ Customer creation failed. Shopify response:', createRes.data);
      return res.send('Customer creation failed. Please try again.');
    }

    console.log('✅ Customer created:', createdCustomer.id);
    const shopifyToken = await getShopifyAccessToken(email, password);
    const customerData = await fetchShopifyCustomer(shopifyToken);
    return res.redirect(`/welcome?firstName=${encodeURIComponent(customerData.firstName)}`);
  } catch (err) {
    console.error('❌ Shopify error:', err.response?.data?.errors || err.response?.data || err.message);
    res.status(500).send('Error creating or logging in Shopify customer.');
  }
});

// Welcome page
app.get('/welcome', (req, res) => {
  const { firstName } = req.query;
  res.send(`<h1>Welcome, ${firstName || 'user'}!</h1><p>Your account has been successfully created or logged in.</p>`);
});

// Shopify helpers
async function findShopifyCustomerByEmail(email) {
  try {
    const res = await axios.get(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers/search.json`,
      {
        params: { query: `email:${email}` },
        headers: {
          'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );
    return res.data.customers?.[0] || null;
  } catch (err) {
    console.error('❌ Error searching for Shopify customer:', err.response?.data || err.message);
    return null;
  }
}

async function getShopifyAccessToken(email, password) {
  console.log(`🔐 Generating Shopify access token for ${email}...`);
  const res = await axios.post(
    `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
    {
      query: `
        mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
          customerAccessTokenCreate(input: $input) {
            customerAccessToken {
              accessToken
            }
            userErrors {
              message
            }
          }
        }`,
      variables: { input: { email, password } }
    },
    {
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = res.data.data.customerAccessTokenCreate;
  if (data.customerAccessToken?.accessToken) return data.customerAccessToken.accessToken;
  throw new Error(data.userErrors.map(e => e.message).join(', ') || 'Login failed');
}

async function fetchShopifyCustomer(token) {
  console.log(`📡 Fetching customer data with token: ${token}`);
  try {
    const res = await axios.post(
      `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
      {
        query: `
          query ($token: String!) {
            customer(customerAccessToken: $token) {
              id
              firstName
              lastName
              email
            }
          }
        `,
        variables: { token }
      },
      {
        headers: {
          'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
          'Content-Type': 'application/json',
        }
      }
    );

    const customer = res.data.data?.customer;
    if (!customer) {
      console.error('❌ No customer data returned. Full response:', res.data);
      return null;
    }
    console.log('✅ Fetched customer data:', customer);
    return customer;
  } catch (err) {
    console.error('❌ Error fetching customer data:', err.response?.data || err.message);
    throw err;
  }
}


// Helper: salted hash
function hashPassword(password, salt) {
  return password + salt; // Simple hash — replace with crypto.hash for production
}

app.listen(3000, () => console.log('🚀 Server running at http://localhost:3000'));
