const axios = require('axios');

const findCustomer = async (email) => {
  const url = `https://${process.env.SHOPIFY_STORE}/admin/api/2023-01/customers/search.json?query=email:${email}`;
  const response = await axios.get(url, {
    headers: {
      'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
    },
  });

  return response.data.customers[0];
};

const createCustomer = async (user) => {
  const url = `https://${process.env.SHOPIFY_STORE}/admin/api/2023-01/customers.json`;
  const response = await axios.post(
    url,
    {
      customer: {
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone,
        verified_email: true,
        email_marketing_consent: {
          state: 'subscribed',
          opt_in_level: 'single_opt_in',
        },
      },
    },
    {
      headers: {
        'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data.customer;
};

const findOrCreateShopifyCustomer = async (user) => {
  const existing = await findCustomer(user.email);
  return existing || await createCustomer(user);
};

const generateCustomerToken = async (email) => {
  const query = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
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
      email,
      password: "dummy-password",
    },
  };

  const response = await axios.post(
    `https://${process.env.SHOPIFY_STORE}/api/2023-01/graphql.json`,
    { query, variables },
    {
      headers: {
        'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
        'Content-Type': 'application/json',
      },
    }
  );

  const errors = response.data.data.customerAccessTokenCreate.userErrors;
  if (errors.length) {
    throw new Error(errors.map(e => e.message).join(', '));
  }

  return response.data.data.customerAccessTokenCreate.customerAccessToken.accessToken;
};

module.exports = {
  findOrCreateShopifyCustomer,
  generateCustomerToken,
};
