// utils/shopify.js
const axios = require('axios');

const SHOP = process.env.SHOPIFY_SHOP;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

exports.findShopifyCustomerByEmail = async (email) => {
  const res = await axios.get(`https://${SHOP}/admin/api/2023-10/customers/search.json`, {
    headers: {
      'X-Shopify-Access-Token': ADMIN_TOKEN
    },
    params: {
      query: `email:${email}`
    }
  });
  return res.data.customers[0];
};


exports.createShopifyCustomer = async (email, password) => {
  const res = await axios.post(`https://${SHOP}/admin/api/2023-10/customers.json`, {
    customer: {
      email,
      password,
      password_confirmation: password,
      send_email_welcome: false
    }
  }, {
    headers: {
      'X-Shopify-Access-Token': ADMIN_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  return res.data.customer;
};

exports.generateCustomerAccessToken = async (email, password) => {
  const res = await axios.post(`https://${SHOP}/api/2023-10/graphql.json`, {
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
    variables: {
      input: { email, password }
    }
  }, {
    headers: {
      'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      'Content-Type': 'application/json'
    }
  });

  return res.data.data.customerAccessTokenCreate.customerAccessToken.accessToken;
};
