const axios = require('axios');

const SHOPIFY_API_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-01`;
const STOREFRONT_GRAPHQL_URL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/api/2023-01/graphql.json`;

const shopifyAdminRequest = (method, path, data) => {
  return axios({
    method,
    url: `${SHOPIFY_API_URL}${path}`,
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
    },
    data,
  });
};

const storefrontGraphQL = (query, variables = {}) => {
  return axios.post(
    STOREFRONT_GRAPHQL_URL,
    { query, variables },
    {
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );
};

module.exports = { shopifyAdminRequest, storefrontGraphQL };
