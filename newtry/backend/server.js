import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import crypto from 'crypto';
import mongoose from 'mongoose';

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
  MONGODB_URI,
  PASSWORD_SECRET_SALT,
} = process.env;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
console.log('✅ MongoDB Connected');

const customerSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  csc_id: { type: String, required: true },
  password: { type: String, required: true },
});
const CustomerCredential = mongoose.model('CustomerCredential', customerSchema);

const generateRandomPassword = (length = 12) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

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

const createShopifyCustomer = async (userData, password) => {
  const email = userData.email;
  console.log(`📩 Checking if Shopify customer exists for: ${email}`);

  try {
    const search = await axios.get(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers/search.json?query=email:${email}`,
      {
        headers: { 'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN },
      }
    );

    if (search.data.customers.length > 0) {
      console.log(`✅ Shopify customer found for ${email}`);
      return search.data.customers[0];
    }

    const [firstName, ...rest] = userData.fullname?.split(' ') || [userData.fullname];
    const lastName = rest.join(' ');

    const customerData = {
      customer: {
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password_confirmation: password,
        verified_email: true,
        state: 'enabled',
        tags: [
          'CSC',
          `csc_id:${userData.csc_id}`,
          `vle:${userData.vle_check}`,
          `pos:${userData.POS}`,
        ],
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

    console.log(`🆕 Creating new Shopify customer for ${email}`);
    const createRes = await axios.post(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/customers.json`,
      customerData,
      {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ADMIN_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`✅ Shopify customer created: ID ${createRes.data.customer.id}`);
    return createRes.data.customer;
  } catch (err) {
    console.error(`❌ Error in createShopifyCustomer: ${err.message}`);
    if (err.response?.data) console.error(err.response.data);
    throw err;
  }
};

const createCustomerAccessToken = async (email, password) => {
  console.log(`🎟️ Creating customer access token for ${email}`);
  console.log(`📨 Email: ${email}`);
  console.log(`🔑 Password used: ${password}`);
  try {
    const res = await axios.post(
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
          input: { email, password },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_TOKEN,
        },
      }
    );

    const tokenData = res.data.data.customerAccessTokenCreate;
    if (tokenData.userErrors.length > 0) {
      console.error(`❌ Shopify token error for ${email}:`, tokenData.userErrors[0].message);
      throw new Error(tokenData.userErrors[0].message);
    }

    console.log(`✅ Token created: Expires ${tokenData.customerAccessToken.expiresAt}`);
    return tokenData.customerAccessToken;
  } catch (err) {
    console.error(`❌ Error in createCustomerAccessToken: ${err.message}`);
    if (err.response?.data) console.error(err.response.data);
    throw err;
  }
};

app.get('/auth-callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing authorization code');
  console.log(`🔄 Auth callback with code: ${code}`);

  try {
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CLIENT_CALLBACK_URI,
      client_id: CLIENT_ID,
      client_secret: encryptClientSecret(CLIENT_SECRET, CLIENT_TOKEN),
    });

    const tokenResponse = await axios.post(`${CONNECT_SERVER_URI}/token`, tokenPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const cscAccessToken = tokenResponse.data.access_token;
    console.log('✅ CSC token received');

    const userResponse = await axios.get(`${CONNECT_SERVER_URI}/resource`, {
      headers: { Authorization: `Bearer ${cscAccessToken}` },
    });

    const userData = userResponse.data.User;
    const { email, csc_id } = userData;
    console.log(`👤 CSC user fetched: ${email} | CSC ID: ${csc_id}`);

    let record = await CustomerCredential.findOne({ email });
    let password;
    let dbPassword;

    if (!record) {
      password = generateRandomPassword();
      dbPassword = password + PASSWORD_SECRET_SALT;

      console.log('--- 🔐 New Password Details ---');
      console.log(`📧 Email           : ${email}`);
      console.log(`🔑 Random Password : ${password}`);
      console.log(`🧂 Secret Salt     : ${PASSWORD_SECRET_SALT}`);
      console.log(`💾 Stored in DB    : ${dbPassword}`);
      console.log('-------------------------------');

      await CustomerCredential.create({ email, csc_id, password: dbPassword });
      console.log('🆕 Salted password saved to DB');
    } else {
      dbPassword = record.password;
      password = dbPassword.replace(PASSWORD_SECRET_SALT, '');

      console.log('--- 🔁 Existing Password Details ---');
      console.log(`📧 Email            : ${email}`);
      console.log(`💾 DB Value         : ${dbPassword}`);
      console.log(`🧂 Removed Salt     : ${PASSWORD_SECRET_SALT}`);
      console.log(`🔓 Original Password: ${password}`);
      console.log('------------------------------------');
    }

    const customer = await createShopifyCustomer(userData, password);
    const storefrontToken = await createCustomerAccessToken(email, password);

    res.cookie('storefrontToken', storefrontToken.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24, 
    });

    console.log(`🔓 Storefront token set in cookie for ${email}`);
    return res.redirect('/fetch-customer-data');
  } catch (err) {
    console.error(`❌ Final error in /auth-callback: ${err.message}`);
    if (err.response?.data) console.error(err.response.data);
    return res.status(500).send(`Error: ${err.message}`);
  }
});

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

app.get('/fetch-customer-data', async (req, res) => {
  const { storefrontToken } = req.cookies;
  if (!storefrontToken) return res.status(400).send('Missing token');

  try {
    const customer = await fetchCustomerData(storefrontToken);
    if (!customer) return res.status(404).send('Customer not found');
    console.log(`📦 Customer data returned for token`);
    return res.json(customer);
  } catch (err) {
    console.error('❌ Error fetching customer:', err.message);
    return res.status(500).send(`Error: ${err.message}`);
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
