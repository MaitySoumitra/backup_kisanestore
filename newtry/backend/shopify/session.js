const { shopifyApi, MemorySessionStorage } = require('@shopify/shopify-api');

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  apiVersion: '2023-04',
  hostName: process.env.SHOPIFY_STORE_DOMAIN.replace(/^https?:\/\//, ''),
  isEmbeddedApp: false,
  adminApiAccessToken: process.env.SHOPIFY_ADMIN_TOKEN,
  sessionStorage: new MemorySessionStorage(), // Correct usage
});
