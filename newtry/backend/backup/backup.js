const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const app = express();
dotenv.config();

const crypto = require('crypto');



const {
  CLIENT_ID,
  CLIENT_SECRET,
  CLIENT_TOKEN,
  CLIENT_CALLBACK_URI,
  CONNECT_SERVER_URI
} = process.env;

const AUTH_URL = `${CONNECT_SERVER_URI}/authorize`;
const TOKEN_URL = `${CONNECT_SERVER_URI}/token`;
const RESOURCE_URL = `${CONNECT_SERVER_URI}/resource`;

function encryptClientSecret(in_t, token) {
  const iv = Buffer.from("0000000000000000", "utf8"); // PHP's fixed IV
  const pre = ":";
  const post = "@";

  // Generate same kind of 2-digit random prefix & suffix
  const prefix = Math.floor(10 + Math.random() * 90); // 10–99
  const suffix = Math.floor(10 + Math.random() * 90); // 10–99

  const plaintext = `${prefix}${pre}${in_t}${post}${suffix}`;

  // PKCS#7-style padding (same as PHP)
  const blockSize = 16;
  const padLength = blockSize - (plaintext.length % blockSize);
  const padded = Buffer.concat([
    Buffer.from(plaintext, 'utf8'),
    Buffer.alloc(padLength, padLength)
  ]);

  // Encrypt using AES-128-CBC with CLIENT_TOKEN as key
  const cipher = crypto.createCipheriv('aes-128-cbc', Buffer.from(token, 'utf8'), iv);
  let encrypted = cipher.update(padded);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  // Return hex string, like PHP's bin2hex()
  return encrypted.toString('hex');
}

const createShopifyCustomer = async (userData) => {
  const shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const adminAccessToken = process.env.SHOPIFY_ADMIN_TOKEN;

  const customerData = {
    customer: {
      first_name: userData.fullname?.split(' ')[0] || userData.fullname,
      last_name: userData.fullname?.split(' ')[1] || '',
      email: userData.email,
      tags: [`csc_id:${userData.csc_id}`, `vle:${userData.vle_check}`, `pos:${userData.POS}`],
      verified_email: true,
      accepts_marketing: false,
      metafields: [
        {
          namespace: "custom",
          key: "csc_id",
          value: userData.csc_id,
          type: "single_line_text_field"
        },
        {
          namespace: "custom",
          key: "user_type",
          value: userData.user_type,
          type: "single_line_text_field"
        }
      ]
    }
  };

  const response = await axios.post(
    `https://${shopifyDomain}/admin/api/2024-01/customers.json`,
    customerData,
    {
      headers: {
        'X-Shopify-Access-Token': adminAccessToken,
        'Content-Type': 'application/json',
      }
    }
  );

  return response.data.customer;
};



// Serve simple HTML
app.get('/', (req, res) => {
    const state = Math.random().toString(36).substring(2);
    const redirectUrl = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(CLIENT_CALLBACK_URI)}&state=${state}`;
    res.send(`
      <html>
        <head>
          <title>Login with CSC</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding-top: 100px; background: #f8f8f8; }
            .btn { background-color: #007BFF; color: white; padding: 14px 28px; border: none; border-radius: 5px; text-decoration: none; font-size: 16px; cursor: pointer; }
            .btn:hover { background-color: #0056b3; }
            .debug-url { margin-top: 30px; word-break: break-all; color: #444; font-size: 14px; background: #fff3cd; padding: 15px; border: 1px dashed #ccc; width: 80%; margin-left: auto; margin-right: auto; border-radius: 6px; }
          </style>
        </head>
        <body>
          <h1>Welcome</h1>
          <a href="${redirectUrl}" class="btn">Login with CSC</a>
          <div class="debug-url">
            <strong>Redirect URL:</strong><br>
            ${redirectUrl}
          </div>
        </body>
      </html>
    `);
  });
  

// Redirect user to CSC OAuth
app.get('/login', (req, res) => {
  const state = Math.random().toString(36).substring(2);
  const redirectUrl = `${AUTH_URL}?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(CLIENT_CALLBACK_URI)}&state=${state}`;
  res.redirect(redirectUrl);
});

// OAuth callback
app.get('/auth-callback', async (req, res) => {
  const { code, state } = req.query;
  let debugLogs = [];

  if (!code) {
    return res.send(`
      <h2>Authorization failed</h2>
      <p>No authorization code returned.</p>
      <p>Query params: ${JSON.stringify(req.query, null, 2)}</p>
    `);
  }

  try {
    debugLogs.push(`<strong>✅ Step 1: Authorization Code Received</strong><br>code: ${code}, state: ${state}`);

    // --- Token Request ---
    const tokenPayload = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: CLIENT_CALLBACK_URI,
      client_id: CLIENT_ID,
      client_secret: encryptClientSecret(CLIENT_SECRET, CLIENT_TOKEN)
    });

    debugLogs.push(`
      <strong>🚀 Step 2: Token Exchange</strong><br>
      <strong>URL:</strong> ${TOKEN_URL}<br>
      <strong>Method:</strong> POST<br>
      <strong>Content-Type:</strong> application/x-www-form-urlencoded<br>
      <strong>Payload:</strong><br>
      <pre>${tokenPayload.toString()}</pre>
    `);

    const tokenResponse = await axios.post(TOKEN_URL, tokenPayload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = tokenResponse.data;
    const accessToken = tokenData.access_token;

    debugLogs.push(`
      <strong>✅ Token Response:</strong><br>
      <pre>${JSON.stringify(tokenData, null, 2)}</pre>
    `);

    // --- User Info Request ---
    debugLogs.push(`
      <strong>📦 Step 3: Fetching User Info</strong><br>
      <strong>URL:</strong> ${RESOURCE_URL}<br>
      <strong>Method:</strong> GET<br>
      <strong>Headers:</strong><br>
      <pre>Authorization: Bearer ${accessToken}</pre>
    `);

    const userResponse = await axios.get(RESOURCE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const userData = userResponse.data.User;

    debugLogs.push(`
      <strong>✅ User Info Response:</strong><br>
      <pre>${JSON.stringify(userData, null, 2)}</pre>
    `);

    // ✅ Create Shopify customer BEFORE sending the response
    const shopifyCustomer = await createShopifyCustomer(userData);

    debugLogs.push(`
      <strong>✅ Shopify Customer Created</strong><br>
      <pre>${JSON.stringify(shopifyCustomer, null, 2)}</pre>
    `);

    // ✅ Send the final debug log HTML
    res.send(`
      <html>
        <head>
          <title>CSC Debug Logs</title>
          <style>
            body { font-family: sans-serif; background: #f9f9f9; padding: 40px; }
            h2 { color: #333; }
            .log-box { background: #fff; padding: 20px; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.1); margin-bottom: 20px; }
            pre { background: #f4f4f4; padding: 10px; border-radius: 4px; overflow-x: auto; }
          </style>
        </head>
        <body>
          <h2>OAuth Callback Debug Logs</h2>
          ${debugLogs.map(log => `<div class="log-box">${log}</div>`).join('')}
        </body>
      </html>
    `);
  } catch (err) {
    const errorDetails = err.response?.data || err.message;

    debugLogs.push(`
      <strong>❌ Error Occurred</strong><br>
      <pre>${JSON.stringify(errorDetails, null, 2)}</pre>
    `);

    res.send(`
      <html>
        <head>
          <title>CSC Debug Logs - Error</title>
          <style>
            body { font-family: sans-serif; background: #fff5f5; padding: 40px; }
            h2 { color: #c00; }
            .log-box { background: #fff; padding: 20px; border-radius: 6px; border: 1px solid #f99; margin-bottom: 20px; }
            pre { background: #ffecec; padding: 10px; border-radius: 4px; color: #b00; }
          </style>
        </head>
        <body>
          <h2>OAuth Callback Debug Logs (Error)</h2>
          ${debugLogs.map(log => `<div class="log-box">${log}</div>`).join('')}
        </body>
      </html>
    `);
  }
});



const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
