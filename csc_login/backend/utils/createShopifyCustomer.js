const axios = require('axios');

exports.createShopifyCustomer = async (userData) => {
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
        { namespace: "custom", key: "csc_id", value: userData.csc_id, type: "single_line_text_field" },
        { namespace: "custom", key: "user_type", value: userData.user_type, type: "single_line_text_field" }
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
