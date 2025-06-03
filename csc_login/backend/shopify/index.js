const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { shopifyAppSessionStorageMemory } = require('@shopify/shopify-app-session-storage-memory');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: LATEST_API_VERSION,
  hostName: process.env.SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, ''),
  isEmbeddedApp: false,
  adminApiAccessToken: process.env.SHOPIFY_ADMIN_TOKEN,
  sessionStorage: shopifyAppSessionStorageMemory(), // 👈✅
});

module.exports = { shopify };

