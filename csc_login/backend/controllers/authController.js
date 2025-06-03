const axios = require('axios');
const { encryptClientSecret } = require('../utils/encryptClientSecret');
const { createShopifyCustomer } = require('../utils/createShopifyCustomer');


const {
  CLIENT_ID,
  CLIENT_SECRET,
  CLIENT_TOKEN,
  CLIENT_CALLBACK_URI,
  CONNECT_SERVER_URI,
  SHOPIFY_STORE_DOMAIN
} = process.env;

const TOKEN_URL = `${CONNECT_SERVER_URI}/token`;
const RESOURCE_URL = `${CONNECT_SERVER_URI}/resource`;

exports.handleAuthCallback = async (req, res) => {
  const { code, state } = req.query;
  let debugLogs = [];

  if (!code) {
    return res.send(`
      <h2>Authorization failed</h2>
      <p>No code returned.</p>
    `);
  }

  try {
    debugLogs.push(`<strong>✅ Code Received:</strong> ${code}`);

    // 🔐 Token Request
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CLIENT_CALLBACK_URI,
      client_id: CLIENT_ID,
      client_secret: encryptClientSecret(CLIENT_SECRET, CLIENT_TOKEN)
    });

    const tokenResponse = await axios.post(TOKEN_URL, tokenPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const accessToken = tokenResponse.data.access_token;

    // 📥 User Info
    const userResponse = await axios.get(RESOURCE_URL, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const userData = userResponse.data.User;

    // 🛍️ Create Shopify customer
    const shopifyCustomer = await createShopifyCustomer(userData);

    debugLogs.push(`<strong>✅ Shopify Customer:</strong><pre>${JSON.stringify(shopifyCustomer, null, 2)}</pre>`);

    // 🧠 Manually create a Shopify-style session to store CSC token
    const sessionId = `csc_${userData.email || userData.csc_id}`;
    const session = new Session(sessionId);
    session.shop = SHOPIFY_STORE_DOMAIN;
    session.state = state;
    session.isOnline = false;
    session.scope = 'csc_custom_session';
    session.accessToken = accessToken; // This is the CSC token
    session.expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

    // 💡 Add any extra custom fields you'd like (not officially typed)
    session.customData = {
      csc_id: userData.csc_id,
      customer_id: shopifyCustomer.id,
      isNew: shopifyCustomer.created_at === shopifyCustomer.updated_at
    };

    await shopify.sessionStorage.storeSession(session);

    debugLogs.push(`<strong>✅ Shopify Session Saved (CSC):</strong><pre>${JSON.stringify(session, null, 2)}</pre>`);

    res.send(`
      <h2>OAuth Success</h2>
      ${debugLogs.join('<br>')}
    `);
  } catch (err) {
    res.send(`
      <h2>Error Occurred</h2>
      <pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>
    `);
  }
};

